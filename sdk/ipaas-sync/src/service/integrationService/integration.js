// Config JSON
const configs = require('../../config');

const AppApi = require('../../api/AppApi');
const IntegrationApi = require('../../api/IntegrationApi');
const AccountAppDetails = require('../../model/AccountAppDetails');
const HTTP_CONSTANTS = require('../../converter/http-constants');
var ApiClient = require("../../ApiClient");

var appApi = new AppApi();
var integrationApi = new IntegrationApi();

/**
 * Create integration and store the details in the AccountAppDetails
 */
function create() {
    return new Promise(function (resolve, reject) {
        var opts = {
            'createReverseIntegration': true,
            'vendorAccountId': ApiClient.instance.vendorAccountId,
            'product': ApiClient.instance.product,
            'internal': configs.INTERNAL_HEADER,
            'internalSecret': configs.INTERNAL_SECRET_HEADER
        };
        integrationApi.createIntegration(ApiClient.instance.app.appuuid, opts).then(function (response) {
            console.log(response);
            var integration = response.data;
            setKey("integrations", {'integrations': integration}).then(function (success) {
                console.log("Updated the integrations locally", success);
                resolve(integration);
            }, function (error) {
                console.log("Error while updating the integrations locally", JSON.stringify(error));
                reject(error);
            });
        }, function (error) {
            console.log("Error in creating integration", JSON.stringify(error));
            reject(error);
        });
    });
}

/**
 * Create Integration for the given app details
 */
function createIntegration() {
  return new Promise(function (resolve, reject) {
    getIntegrations().then(function (integrations) {
        if (integrations.length > 0){
            resolve(integrations);
        } else {
            console.log("Going to create integrations");
            create().then(function(integration){
                resolve(integration);
            }, function(error){
                console.log('Error while creating integrations', JSON.stringify(error));
                reject(error);
            });
        }
    }, function (error) {
        console.log(JSON.stringify(error));
        if(error.status == 401 || (error.status == 404 && JSON.parse(error.data).message == "Account does not exist")) {
            console.log("Going to create integrations");
            create().then(function(integration){
                resolve(integration);
            }, function(error){
                console.log('Error while creating integrations', JSON.stringify(error));
                reject(error);
            });
        }
    });
  });
}

/**
 * Fetch a particular key in the AccountAppDetails
 * @param {String} key 
 */
function getKey(key) {
    return new Promise(function(resolve,reject) {
        console.log('Fetching the app details with key: ', key);
        appApi.getAppDetails(ApiClient.instance.app.appuuid).then((response) => {
            var stringValue = response.data['details'][key]
            console.log('Fetched the key');

            if(!key.endsWith("_connector")) {
                console.log('value: ', stringValue);
            }

            if (stringValue == null || stringValue == undefined) {
                reject('Key not found')
            } else {
                resolve(JSON.parse(stringValue));
            }
        }, (error) => {
            console.log("Error in fetching app details", JSON.stringify(error));
            reject(error);
        });
    })
}

/**
 * Set the value to the particular key in the AccountAppDetails
 * @param {String} key 
 * @param {Object} value 
 */
function setKey(key, value) {
    return new Promise(function(resolve,reject) {
        console.log('Saving the app details');
        value = JSON.stringify(value)

        var accountAppDetails = new AccountAppDetails();
        accountAppDetails.setAppuuid(ApiClient.instance.app.appuuid);
        accountAppDetails.setDetails({[key]: value});

        let opts = {
            'accountAppDetails': accountAppDetails
        };
        appApi.updateAppDetails(ApiClient.instance.app.appuuid, opts).then((response) => {
            resolve(response.data);
        }, (error) => {
            console.log("Error in fetching app details", JSON.stringify(error));
            reject(error);
        });
    })
}

/**
 * Get Integrations from the GET /integrations endpoint
 */
function getIntegrationsFromServer() {
    return new Promise(function(resolve,reject) {
        console.log('Going to fetch integration data');
        integrationApi.getIntegrations(ApiClient.instance.app.appuuid).then((response) => {
            
            setKey("integrations", {'integrations':response.data} ).then(
                function(success) {
                    console.log("Updated the integrations locally", JSON.stringify(success));
                    resolve(success);
                },
                function(error) {
                    console.log("Error while updating the integrations locally", JSON.stringify(error));
                    reject(error);
                }
            );
        }, (error) => {
            console.log("Error while fetching integration data", JSON.stringify(error));
            reject(error);
        });
    })
}

/**
 * Get all the integrations for the vendorAccountId and product pair
 *  - Try fetching the integrations from the /details endpoint if present
 *  - If not, then fetch them using the GET /integrations
 */
function getIntegrations() {
    return new Promise(function(resolve, reject) {
        getKey("integrations").then(
            function(integrations) {
                console.log("Fetched the integrations locally");
                if (integrations.integrations.length == 0) {
                    console.log('There are no integrations')
                    getIntegrationsFromServer().then(
                        function(success) {
                            console.log("Updated the integrations locally",success);
                            resolve(success);
                        },
                        function(error) {
                            console.log("Error while updating the integrations locally", JSON.stringify(error));
                            reject(error);
                        }
                    )
                } else {
                    resolve(integrations.integrations)
                }
            },
            function() {
                getIntegrationsFromServer().then(
                    function(success) {
                        console.log("Updated the integrations locally",success);
                        resolve(success);
                    },
                    function(error) {
                        console.log("Error while updating the integrations locally", JSON.stringify(error));
                        reject(error);
                    }
                )
            }
        );       
    });
}

/**
 * To fetch the HTML form given the form's name
 * @param {String} name 
 */
function getForm(name) {
    return new Promise(function(resolve, reject) {
        let url = `${ApiClient.instance.basePath}/integration-rest/forms?appuuid=${ApiClient.instance.app.appuuid}&name=${name}`;
        let headers = {
            [HTTP_CONSTANTS.ACCEPT]: [HTTP_CONSTANTS.TEXT_HTML],
            "vendorAccountId": ApiClient.instance.vendorAccountId,
            "product": ApiClient.instance.product
        }; 
        ApiClient.instance.request.get(url, { "headers": headers }).then(
            function(formResponse) {
                resolve(formResponse.response);
            }, function(error) {
                reject(error);
            }
        );
    });
}

/**
 * Get the App's webhook url from the cache 
 */
function getAppWebhookUrl() {
    return new Promise(function(resolve, reject) {
        getKey("webhook").then(
            function(webhook) {
                console.log("Fetched the webhook details", webhook);
                resolve(webhook.webhook)
            },
            function(error) {
                console.log('Webhook details not available', error)
                reject(error)
            }
        );
    })
}

/**
 * Delete the configuration details of an app 
 */
async function deleteAppDetails() {    
    try{
        await appApi.deleteAppDetails(ApiClient.instance.app.appuuid);
        console.log("App details successfully deleted.");
        return { "status": "success" };
    } catch(error) {
        console.log("Error while deleting app details: ", JSON.stringify(error));
        throw error;
    }
}

/**
 * Install Backend App 
 * @param {Object} opts => { {BackendApp} backendApp } 
 */
async function installBackendApp(opts) {   
    try{
        var backendApp = await integrationApi.installBackendApp(opts);
        console.log("Successfully installed backend app ", JSON.stringify(backendApp));
        return backendApp;
    } catch(error) {
        console.log("Error while deleting app details: ", JSON.stringify(error));
        throw error;
    }
}

module.exports = {
    createIntegration,
    getForm,
    setKey,
    getIntegrations,
    getIntegrationsFromServer,
    getKey,
    getAppWebhookUrl,
    deleteAppDetails,
    installBackendApp
};
