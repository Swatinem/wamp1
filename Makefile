test: lint
	NODE_ENV=test ./node_modules/.bin/mocha --harmony

lint:
	-./node_modules/.bin/jshint ./lib ./test ./index.js

lib-cov: clean-cov
	./node_modules/.bin/jscoverage lib lib-cov

clean-cov:
	rm -rf lib-cov

test-cov: lib-cov
	WAMP1_COV=1 NODE_ENV=test ./node_modules/.bin/mocha --harmony --reporter html-cov 1> coverage.html

test-coveralls: lib-cov
	WAMP1_COV=1 NODE_ENV=test ./node_modules/.bin/mocha --harmony --reporter mocha-lcov-reporter | ./node_modules/.bin/coveralls

.PHONY: test lint test-cov test-coveralls clean-cov
