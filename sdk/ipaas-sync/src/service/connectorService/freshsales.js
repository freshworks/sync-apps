const integrationService = require('../integrationService/integration');
const httpConstants = require('../../converter/http-constants');
const ApiClient = require('../../ApiClient');

// TODO: Get the page size from the user 
const DEFAULT_PAGE_SIZE = 2;

const defaultClient = ApiClient.instance;

function updateFreshsalesViewIds() {
    return new Promise(function(resolve, reject) {

        integrationService.getKey("FRESHSALES_CONNECTOR").then(
            function(connector) {
                if (connector['lead_view_id'] != null && connector['contact_view_id'] != null) {
                    resolve("success")
                    return;
                }
                console.log("Going to fetch the filter ids")
                var url = connector.domain + '/api/leads/filters';
                var headers = {
                    [httpConstants.AUTHORIZATION]: connector.token
                }
                defaultClient.makeApiCall(httpConstants.GET, url, { "headers": headers }).then(
                    function(leadFilterResponse) {
                        leadFilterResponse = JSON.parse(leadFilterResponse.response)['filters'];
                        for (var index in leadFilterResponse) {
                            console.log(leadFilterResponse[index]['name'])
                            if (leadFilterResponse[index]['name'] === 'All Leads') {
                                connector['lead_view_id'] = leadFilterResponse[index]['id']
                                break;
                            }
                        }

                        url = connector.domain + '/api/contacts/filters';
                        defaultClient.makeApiCall(httpConstants.GET, url, { "headers": headers }).then(
                            function(contactFilterResponse) {
                                contactFilterResponse = JSON.parse(contactFilterResponse.response)['filters'];
                                for (var index in contactFilterResponse) {
                                    console.log(contactFilterResponse[index]['name'])
                                    if (contactFilterResponse[index]['name'] === 'All Contacts') {
                                        connector['contact_view_id'] = contactFilterResponse[index]['id']
                                        break;
                                    }
                                }

                                url = connector.domain + '/api/sales_accounts/filters';
                                defaultClient.makeApiCall(httpConstants.GET, url, { "headers": headers }).then(
                                    function(accountFilterResponse) {
                                        accountFilterResponse = JSON.parse(accountFilterResponse.response)['filters'];
                                        for (var index in accountFilterResponse) {
                                            console.log(accountFilterResponse[index]['name'])
                                            if (accountFilterResponse[index]['name'] === 'All Accounts') {
                                                connector['sales_account_view_id'] = accountFilterResponse[index]['id']
                                                break;
                                            }
                                        }
                                        integrationService.setKey("FRESHSALES_CONNECTOR", connector).then(
                                            function(success) {
                                                console.log("Updated the filter ids successfully");
                                                resolve(success)
                                            },
                                            function(error) {
                                                console.log("Error while updating the filter ids");
                                                reject(error)
                                            }
                                        )
                                    },
                                    function(error) {
                                        console.log('Error while fetching the account filter', error)
                                        reject(error)
                                    }
                                )
                            },
                            function(error) {
                                console.log('Error while fetching the contact filter', error)
                                reject(error)
                            }
                        )
                    },
                    function(error) {
                        console.log('Error while fetching the lead filter', error)
                        reject(error)
                    }
                )
            },
            function(error) {
                console.log('Error while fetching the freshsales connector details', error)
                reject(error)
            }
        )
    })
}

function getNextPageData(entity, entityToSyncMeta) {
    return new Promise(function(resolve, reject) {
        var pageToFetch = entityToSyncMeta.current_page;
        integrationService.getKey("FRESHSALES_CONNECTOR").then(
            function(connector) {
                var url = connector.domain + '/api/';
                switch(entity) {
                    case 'fs_lead':
                        url += 'leads/view/' + connector['lead_view_id'].toString()
                        break;
                    case 'fs_contact':
                        url += 'contacts/view/' + connector['contact_view_id'].toString()
                        break;
                    case 'fs_sales_account':
                        url += 'sales_accounts/view/' + connector['sales_account_view_id'].toString()
                        break;
                }

                url += `?sort=updated_at&sort_type=asc&per_page=${DEFAULT_PAGE_SIZE}&page=` + pageToFetch.toString()
                console.log("Going to get data using url: ", url);
                var headers = {
                    [httpConstants.AUTHORIZATION]: connector.token
                }

                defaultClient.makeApiCall(httpConstants.GET, url, { 'headers' :headers }).then(
                    function(freshsalesResponse){
                        console.log('Fetched the next page successfully');
                        var response = JSON.parse(freshsalesResponse.response)
                        switch(entity) {
                            case 'fs_lead':
                                resolve(response['leads'])
                                break;
                            case 'fs_contact':
                                resolve(response['contacts'])
                                break;
                            case 'fs_sales_account':
                                resolve(response['sales_accounts'])
                                break;
                        }
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
    updateFreshsalesViewIds,
    getNextPageData
}
