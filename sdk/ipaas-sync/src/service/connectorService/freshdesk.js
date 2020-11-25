const integrationService = require('../integrationService/integration');
const ApiClient = require('../../ApiClient');
const httpConstants = require('../../converter/http-constants');

// TODO: Get the page size from the user 
const DEFAULT_PAGE_SIZE = 2;

const defaultClient = ApiClient.instance;

function getNextPageData(entity, entityToSyncMeta) {
    return new Promise(function(resolve, reject) {
        var pageToFetch = entityToSyncMeta.current_page;
        integrationService.getKey("FRESHDESK_CONNECTOR").then(
            function(connector) {
                console.log('Connector details', connector)
                var url = connector.domain + '/api/v2/';
                if (entity === 'fd_company') {
                    url += 'companies'
                } else {
                    url += 'contacts'
                }

                url += `?per_page=${DEFAULT_PAGE_SIZE}&page=` + pageToFetch.toString()
                console.log("Going to get data using url: ", url);
                var headers = {
                    [httpConstants.CONTENT_TYPE]: httpConstants.APPLICATION_JSON,
                    [httpConstants.AUTHORIZATION]: Buffer.from(`${connector.username}:${connector.password}`).toString('base64')
                }
                console.log(headers);

                defaultClient.makeApiCall(httpConstants.GET, url, { 'headers': headers }).then(
                    function(freshdeskResponse){
                        console.log('Fetched the next page successfully');
                        var response = JSON.parse(freshdeskResponse.response)
                        resolve(response);
                    },
                    function(error) {
                        console.log('Error while fetching the next page', error);
                        reject(error)
                    }
                );
            }
        )
    });
}

module.exports = {
    getNextPageData
}
