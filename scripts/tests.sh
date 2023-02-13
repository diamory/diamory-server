#!/bin/bash

cd local && ./setup.sh && cd - && tsc && jest; exitCode=$?; cd local; ./teardown.sh && exit $exitCode
