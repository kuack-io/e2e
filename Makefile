.PHONY: install build lint lint-fix format type-check check test-local test-local-parallel test-minikube report clean clear docker-build docker-build-minikube

install:
	npm install

build:
	npm run build

lint:
	npm run lint

lint-fix:
	npm run lint -- --fix

format:
	npm run format

type-check:
	npm run type-check

audit:
	npm audit

check: format lint type-check audit

test-cleanup:
	rm -rf allure-results allure-report

test-local: test-cleanup build
	npm run cleanup:cluster
	npm test

test-local-parallel: test-cleanup build
	npm run cleanup:cluster
	npm run test:parallel

test-minikube: test-cleanup
	./scripts/test-in-minikube.sh

report:
	npm run report:generate
	npm run report:open

clean:
	npm run clean

clear: clean

docker-build:
	docker build -t e2e-tests .

docker-build-minikube:
	eval $$(minikube docker-env) && docker build -t e2e-tests .
