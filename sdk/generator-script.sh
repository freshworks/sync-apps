#!/bin/bash

function usage()
{
    echo "Supported Commands"
    echo ""
    echo "--generate-js -> Generates JS SDK"
    echo ""
    echo "--build-openapi -> Builds Open API Image "
    echo ""
}

function build_open_api_image()
{
    docker build -t openapi-generator .
}

function generate_js_client()
{
    sh ./scripts/generate-js-client.sh
}

while [[ $# > 0 ]] ; do
    case $1 in
        --help)
            usage
            exit
            ;;
        --build-openapi)
            build_open_api_image
            exit
            ;;
        --generate-js)
            generate_js_client
            exit
            ;;
        *)
            echo "Unknown option $1"
            usage
            ;;
    esac
    shift
done
