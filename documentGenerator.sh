#!/bin/bash
# npm install -D vuepress
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
# docker stop doc_server || true
# docker system prune -f
# docker run -itd -p 10000:80 -v "$(pwd)/documentation/.vuepress/dist":/usr/local/apache2/htdocs --name doc_server httpd