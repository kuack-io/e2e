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
	npm run type-check

audit:
	npm audit

check: format lint type-check audit

test:
	npm test

test-parallel:
	npm run test:parallel

report:
	npm run report:serve

clean:
	npm run clean

clear: clean

docker-build:
	docker build -t e2e-tests .
