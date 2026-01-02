#!/bin/bash
#
# Script that runs e2e tests in minikube as a Kubernetes Job.
#
# Flag legend:
# -e: exit immediately if one of the commands fails
# -u: throw an error if one of the inputs is not set
# -o pipefail: result is the value of the last command
# +x: do not print all executed commands to terminal
set -euo pipefail
set +x

get_namespace() {
    local namespace=$(kubectl config view --minify -o jsonpath='{..namespace}')
    echo "${namespace:-default}"
}

build_image() {
    echo "Building Docker image in minikube..."
    eval "$(minikube docker-env)" && docker build -t e2e-tests .
}

cleanup_existing_job() {
    echo "Cleaning up existing job..."
    kubectl delete job e2e-tests --ignore-not-found=true
}

cleanup_artifacts() {
    echo "Cleaning up previous artifacts..."
    minikube ssh "rm -rf /tmp/e2e-allure-results" 2>/dev/null || true
}

apply_manifest() {
    local namespace=$1
    echo "Applying test job manifests to namespace: $namespace"
    export NAMESPACE="$namespace"

    kubectl apply -f manifests/serviceaccount.yaml
    kubectl apply -f manifests/clusterrole.yaml
    envsubst < manifests/clusterrolebinding.yaml | kubectl apply -f -
    kubectl apply -f manifests/job-minikube.yaml
}

wait_for_job() {
    echo "Waiting for job to complete..."
    kubectl wait --for=condition=complete --timeout=600s job/e2e-tests || true
}

get_logs() {
    echo ""
    echo "==================== Pod Logs ===================="
    kubectl logs job/e2e-tests || true
}

check_job_status() {
    echo ""
    echo "==================== Job Status =================="
    if kubectl get job e2e-tests -o jsonpath='{.status.conditions[?(@.type=="Complete")].status}' | grep -q "True"; then
        echo "Tests PASSED"
        return 0
    elif kubectl get job e2e-tests -o jsonpath='{.status.conditions[?(@.type=="Failed")].status}' | grep -q "True"; then
        echo "Tests FAILED"
        return 1
    else
        echo "Job status UNKNOWN"
        kubectl get job e2e-tests
        return 1
    fi
}

download_allure_results() {
    echo ""
    echo "Downloading Allure results from minikube node..."

    rm -rf ./allure-results
    mkdir -p ./allure-results

    minikube ssh "cd /tmp/e2e-allure-results && tar cf /tmp/allure-results.tar ."
    minikube cp minikube:/tmp/allure-results.tar ./allure-results.tar
    tar xf ./allure-results.tar -C ./allure-results
    rm -f ./allure-results.tar
    minikube ssh "rm -f /tmp/allure-results.tar"
}

generate_allure_report() {
    echo ""
    echo "Generating Allure report..."
    npm run report:generate
}

open_allure_report() {
    echo ""
    echo "Opening Allure report..."
    xdg-open ./allure-report/index.html
}

cleanup() {
    echo ""
    echo "Cleaning up Kubernetes resources..."
    local namespace=$(get_namespace)
    kubectl delete job e2e-tests -n "$namespace" --ignore-not-found=true
    kubectl delete serviceaccount e2e-tests -n "$namespace" --ignore-not-found=true
    kubectl delete clusterrole e2e-tests --ignore-not-found=true
    kubectl delete clusterrolebinding e2e-tests --ignore-not-found=true
    echo "Cleanup complete"
}

main() {
    local namespace=$(get_namespace)

    build_image
    cleanup_existing_job
    cleanup_artifacts
    apply_manifest "$namespace"
    wait_for_job
    get_logs
    check_job_status
    download_allure_results
    generate_allure_report
    open_allure_report
}

# Register cleanup function to run on exit
trap cleanup EXIT

# Entrypoint
main
