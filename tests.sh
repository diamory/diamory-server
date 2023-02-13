#!/bin/bash

cd functions/local && ./setup.sh && cd .. && npm run test; exitCode=$?; cd local; ./teardown.sh && exit $exitCode
