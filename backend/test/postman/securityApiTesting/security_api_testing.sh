#!/usr/bin/env bash

newman run ./test/postman/securityApiTesting/security_api_testing_collection.json -e ./test/postman/securityApiTesting/security_api_testing_environment.json --delay-request 50
