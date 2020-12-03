#!/bin/bash

docker run --rm --network="host" \
    -v ${PWD}:/local openapi-generator generate --skip-validate-spec \
    -i /local/freshpipe.yaml \
    -g javascript \
    -o /local/ipaas-sync \
    -c /local/config.json \
    -t /local/templates
