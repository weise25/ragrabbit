#!/bin/bash

set -e

VARS=`node ../../packages/db/scripts/extractVars.js`

cd ../../packages/db

if [ "$1" == "seed" ]; then
    env $VARS ./node_modules/.bin/tsx ./seeds.ts
elif [ "$1" == "reset" ]; then
    env $VARS ./node_modules/.bin/tsx ./scripts/resetDb.ts
else
    env $VARS pnpm drizzle-kit $@
fi
