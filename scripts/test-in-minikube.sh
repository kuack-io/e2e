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
    # Use sudo to handle permission issues with files created by pods running as different user
    # Redirect stderr to avoid showing permission errors if cleanup fails
    minikube ssh "sudo rm -rf /tmp/e2e-allure-results" 2>/dev/null || true
}

prepare_helm_chart() {
    # If HELM_CHART is set, assume it's a local path and copy it to minikube
    if [ -n "${HELM_CHART:-}" ]; then
        echo "Copying helm chart to minikube: $HELM_CHART"
        local chart_name=$(basename "$HELM_CHART")
        local chart_dir=$(dirname "$HELM_CHART")
        local temp_tar=$(mktemp)
        tar -czf "$temp_tar" -C "$chart_dir" "$chart_name"

        # Copy to minikube
        local minikube_tar="/tmp/helm-chart-$$.tar"
        minikube cp "$temp_tar" "$minikube_tar"
        minikube ssh "mkdir -p /tmp/helm-chart && cd /tmp/helm-chart && tar -xzf $minikube_tar && sudo rm -f $minikube_tar"
        rm -f "$temp_tar"

        # Update HELM_CHART to point to the mounted path
        export HELM_CHART="/tmp/helm-chart/$chart_name"
    fi
}

apply_manifest() {
    local namespace=$1
    echo "Applying test job manifests to namespace: $namespace"
    export NAMESPACE="$namespace"

    # Export helm-related environment variables for envsubst
    export HELM_CHART="${HELM_CHART:-}"
    export HELM_CHART_VERSION="${HELM_CHART_VERSION:-}"
    export AGENT_VERSION="${AGENT_VERSION:-}"
    export NODE_VERSION="${NODE_VERSION:-}"
    export AGENT_URL="${AGENT_URL:-}"
    export NODE_URL="${NODE_URL:-}"

    kubectl apply -f manifests/serviceaccount.yaml
    kubectl apply -f manifests/clusterrole.yaml
    envsubst < manifests/clusterrolebinding.yaml | kubectl apply -f -
    envsubst < manifests/job-minikube.yaml | kubectl apply -f -
}

wait_for_job() {
    echo "Waiting for job to complete..."
    local timeout=600
    local elapsed=0
    local interval=5

    while [ $elapsed -lt $timeout ]; do
        local complete=$(kubectl get job e2e-tests -o jsonpath='{.status.conditions[?(@.type=="Complete")].status}' 2>/dev/null)
        local failed=$(kubectl get job e2e-tests -o jsonpath='{.status.conditions[?(@.type=="Failed")].status}' 2>/dev/null)

        if [ "$complete" = "True" ] || [ "$failed" = "True" ]; then
            return 0
        fi

        sleep $interval
        elapsed=$((elapsed + interval))
    done

    echo "Timeout waiting for job to complete"
    return 0
}

get_logs() {
    echo ""
    echo "==================== Pod Logs ===================="
    kubectl logs job/e2e-tests || true
}

check_job_status() {
    echo ""
    echo "==================== Job Status =================="
    local complete=$(kubectl get job e2e-tests -o jsonpath='{.status.conditions[?(@.type=="Complete")].status}' 2>/dev/null)
    local failed=$(kubectl get job e2e-tests -o jsonpath='{.status.conditions[?(@.type=="Failed")].status}' 2>/dev/null)

    # Check pod exit code for more accurate status
    local pod_name=$(kubectl get pods -l job-name=e2e-tests -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
    if [ -n "$pod_name" ]; then
        local exit_code=$(kubectl get pod "$pod_name" -o jsonpath='{.status.containerStatuses[0].state.terminated.exitCode}' 2>/dev/null)
        if [ -n "$exit_code" ]; then
            if [ "$exit_code" = "0" ]; then
                echo "Tests PASSED (pod exited with code 0)"
                return 0
            else
                echo "Tests FAILED (pod exited with code $exit_code)"
                return 1
            fi
        fi
    fi

    # Fallback to job conditions
    if [ "$complete" = "True" ]; then
        echo "Tests PASSED"
        return 0
    elif [ "$failed" = "True" ]; then
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

cleanup() {
    echo ""
    echo "Cleaning up Kubernetes resources..."
    local namespace=$(get_namespace)
    # Keep the job for debugging - only clean up RBAC resources
    # kubectl delete job e2e-tests -n "$namespace" --ignore-not-found=true
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
    prepare_helm_chart
    apply_manifest "$namespace"
    wait_for_job
    get_logs
    download_allure_results
    check_job_status
}

# Register cleanup function to run on exit
trap cleanup EXIT SIGINT SIGTERM

# Entrypoint
main
