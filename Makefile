.PHONY: install build lint lint-fix format type-check check test test-parallel test-shard report clean clear docker-build docker-push k8s-apply k8s-delete

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
	npm run type-check || npm exec tsc --noEmit

check: format lint type-check test

test:
	npm test

test-parallel:
	npm run test:parallel

test-shard:
	npm run test:shard

report:
	npm run report:allure
	npm run report:serve

clean:
	npm run clean

clear: clean

docker-build:
	docker build -t e2e-tests:latest .

docker-push:
	docker tag e2e-tests:latest my-local-registry/e2e-tests:latest
	docker push my-local-registry/e2e-tests:latest

k8s-apply:
	kubectl apply -f k8s/namespace.yaml
	kubectl apply -f k8s/serviceaccount.yaml
	kubectl apply -f k8s/job-example.yaml

k8s-delete:
	kubectl delete -f k8s/job-example.yaml
	kubectl delete -f k8s/serviceaccount.yaml
	kubectl delete -f k8s/namespace.yaml
