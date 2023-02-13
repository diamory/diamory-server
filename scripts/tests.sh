#!/bin/bash

cd local && ./setup.sh && cd - && npm run compile_ && npm run unit_; exitCode=$?; cd local; ./teardown.sh && exit $exitCode
