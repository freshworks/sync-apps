#!/bin/bash
rm -rf documentation/
mkdir documentation
cd sdk
rm -rf ipaas-sync/dist
rm -rf ipaas-sync/docs
rm -rf ipaas-sync/node_modules
rm -rf ipaas-sync/test
rm -rf ipaas-sync/src/api
rm -rf ipaas-sync/src/model
rm ipaas-sync/src/ApiClient.js
rm ipaas-sync/src/index.js
rm ipaas-sync/package.json
rm ipaas-sync/package-lock.json
rm -rf ipaas-sync/.openapi-generator
rm ipaas-sync/README.md
rm ipaas-sync/mocha.opts
rm ipaas-sync/.babelrc
./generator-script.sh --generate-js
cd ..
mv sdk/ipaas-sync/docs documentation/
mv sdk/ipaas-sync/README.md documentation/
npm run docs:build
cp ./sdk/doc_config/* ./documentation/.vuepress
npm run docs:build
