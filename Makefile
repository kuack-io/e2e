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

test-local: build
	npm test

test-local-parallel: build
	npm run test:parallel

test-minikube:
	./scripts/test-in-minikube.sh

report:
	npm run report:serve

clean:
	npm run clean

clear: clean

docker-build:
	docker build -t e2e-tests .

docker-build-minikube:
	eval $$(minikube docker-env) && docker build -t e2e-tests .
