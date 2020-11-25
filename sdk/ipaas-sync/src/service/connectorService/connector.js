// third-party dependencies
const url = require("url");

// Services
const integrationService = require('../integrationService/integration');
const freshdeskService = require('./freshdesk');
const freshsalesService = require('./freshsales');

//API classes
const FormApi = require('../../api/FormApi');
const ConnectorApi = require('../../api/ConnectorApi');

// Models
const Form = require('../../model/Form');
const FormServField = require('../../model/FormServField');
const FormServObject = require('../../model/FormServObject');
const Connector = require('../../model/Connector');
const ApiClient = require('../../ApiClient');

// Constants
const constants = require('../../constants');

//API classe instances
var connectorApi = new ConnectorApi();
var formApi = new FormApi();

/**
 * To create the connect form for the connectors
 * @param {String} product 
 * @param {Boolean} isSource 
 */
function createConnectForm(product, isSource) {
    return new Promise(function(resolve, reject) {
        if (!constants.CONNECT_FORM_SUPPORTED_PRODUCTS.includes(product)) {
            console.log("Skipping connect form creation. Unsupported product ", product);
            resolve({"success": "true", "message": "product not supported"});
            return;
        }
        console.log("Going to create connect form for ", product);
        var formName = isSource ? constants.SOURCE_CONNECTOR_FORM: constants.DESTINATION_CONNECTOR_FORM;
        integrationService.getForm(formName).then(
            function(form) {
                if (form == constants.REQUEST_PROCESS_ERROR_MESSAGE) {
                    console.log('Form not available. Creating...')
                    var form = null;
                    var callback = isSource ? constants.SOURCE_CONNECTOR_CALLBACK: constants.DESTINATION_CONNECTOR_CALLBACK;
                    switch(product){
                        case constants.FRESHSALES:
                            form = constructFreshSalesConnectForm(ApiClient.instance.app.appuuid, callback, formName);
                            break;
                        case constants.FRESHDESK:
                            form = constructFreshDeskConnectForm(ApiClient.instance.app.appuuid, callback, formName);
                            break;
                        case constants.HUBSPOT:
                            form = constructHubSpotConnectForm(ApiClient.instance.app.appuuid, callback, formName);
                            break;
                    }
                    formApi.createForm(form).then(
                        function(response) {
                            console.log('Created the connect form.')
                            resolve(response.data);
                            console.log('Resolved the connect form.')
                            return;
                        },
                        function(error) {
                            console.log("Error in creating connector form", JSON.stringify(error));
                            reject(error);
                    });
                } else {
                    console.log("Connect form already exists...")
                    resolve({"success": "true"})
                }
            },
            function(error) {
                console.log('Rejecting the connect form.')
                reject(error);
            }
        );
    });
}

/**
 * Construct FormservField for the given details of the field
 * @param {String} label 
 * @param {String} name 
 * @param {Integer} type 
 * @param {Integer} position 
 * @param {Boolean} visible 
 * @param {Array<Choice>} choices 
 */
function constructField(label, name, type, position, visible, choices) {
    var formServField = new FormServField();
    formServField.setLabel(label);
    formServField.setName(name);
    formServField.setType(type);
    formServField.setPosition(position);
    formServField.setVisible(visible);
    if (choices != null) {
        formServField.setChoices(choices);
    }
    return formServField;
}

/**
 * Construct FormservObject with the given list of FormServFields and the form action
 * @param {Array<FormServField>} fields 
 * @param {String} form_action 
 */
function constructFormServObject(fields, form_action) {
    var formServObject = new FormServObject();
    formServObject.setFields(fields);
    var formOptions = {};
    formOptions[constants.FORM_ACTION] = form_action;
    formServObject.setFormOptions(formOptions);
    return formServObject;
}

/**
 * Construct the Form Object for the given formServObject
 * @param {String} formName 
 * @param {String} appuuid 
 * @param {FormServObject} formServObject 
 */
function constructForm(formName, appuuid, formServObject) {
    var form = new Form();
    form.setName(formName);
    form.setAppuuid(appuuid);
    form.setFormServObject(formServObject);
    return form;
} 

/**
 * Construct Freshsales Form Object
 * @param {String} appuuid 
 */
function constructFreshSalesConnectForm(appuuid, callback_funtion, formName) {
    // Domain Field
    var domainField = constructField(constants.DOMAIN_LABEL, constants.DOMAIN, 1, 1, true);

    // API Key Field
    var apiKeyField = constructField(constants.API_KEY_LABEL, constants.TOKEN, 1, 2, true);

    var formServObject = constructFormServObject([domainField, apiKeyField], callback_funtion);
    
    return constructForm(formName, appuuid ,formServObject);
}

/**
 * Construct Freshsales Form Object
 * @param {String} appuuid 
 */
function constructFreshDeskConnectForm(appuuid, callback_funtion, formName) {
    // Domain Field
    var domainField = constructField(constants.DOMAIN_LABEL, constants.DOMAIN, 1, 1, true);

    // API Key Field
    var apiKeyField = constructField(constants.API_KEY_LABEL, constants.TOKEN, 1, 2, true);

    var formServObject = constructFormServObject([domainField, apiKeyField], callback_funtion);
    
    return constructForm(formName, appuuid ,formServObject);
}

function constructHubSpotConnectForm(appuuid, callback_funtion, formName) {

    var formServObject = constructFormServObject([], callback_funtion);

    return constructForm(formName, appuuid ,formServObject);
}

/**
 * Construct cache save key for the connectors
 * @param {Boolean} isSource 
 */
function getCacheSaveKey(isSource) {
    if (isSource) {
        return ApiClient.instance.app.connectorA + '_CONNECTOR';
    }
    return ApiClient.instance.app.connectorB + '_CONNECTOR'
}

/**
 * Get the source or destination connectorId from the list of integrations
 * @param {Array<Integration>} integrations 
 * @param {Boolean} isSource 
 */
function getConnectorId(integrations, isSource) {
    var srcConnectorId = integrations[0]['sourceConnectorId']
    var destConnectorId = integrations[0]['destinationConnectorId']
    //Minimum id is considered as freshsales connector
    if (srcConnectorId > destConnectorId) {
        srcConnectorId = integrations[0]['destinationConnectorId']
        destConnectorId = integrations[0]['sourceConnectorId']
    }
    if (isSource) {
        return srcConnectorId;
    }
    return destConnectorId;
}

/**
 * Get connector details from either the cache if present or from the server and set it in cache too
 * @param {Array<Integration>} integrations 
 * @param {Boolean} isSource 
 */
function getConnector(integrations, isSource) {
    return new Promise(function(resolve) {
        var cacheSaveKey = getCacheSaveKey(isSource)
        integrationService.getKey(cacheSaveKey).then(
            function(connector) {
                console.log(`Got ${cacheSaveKey} from cache`);
                resolve(connector);
            },
            function() {
                var connectorId = getConnectorId(integrations, isSource)
                connectorApi.getConnectorById(connectorId).then(
                    function(connector) {
                        console.log(`Fetched ${cacheSaveKey} details`);
                        var cacheData = connector.data;
                        integrationService.setKey(cacheSaveKey, cacheData).then(function() {
                            console.log(`Successfully added ${cacheSaveKey} details to cache`);
                            resolve(connector.data);
                        }, function(error) {
                            console.log(`Error in setting ${cacheSaveKey} details to cache`, JSON.stringify(error));
                            resolve(null);
                        });
                    },
                    function(error) {
                        console.log(`First time setup of the ${cacheSaveKey} details`, JSON.stringify(error));
                        resolve(FIRST_TIME_SETUP);
                    }
                );
            }
        );
    });
}

/**
 * Get the connector details for the app
 */
function getConnectorDetails() {
    return new Promise(function(resolve, reject) {
        var connectorDetails = {};
        integrationService.getIntegrations().then(
            function (integrations) {
                console.log("Integration fetched ", integrations);
                getConnector(integrations, true).then(
                    function(sourceConnector) {
                        connectorDetails.source = sourceConnector;
                        console.log('Source connector details fetched');
                        getConnector(integrations, false).then(
                            function(destinationConnector) {
                                connectorDetails.destination = destinationConnector;
                                console.log('Destination connector details fetched');
                                resolve(connectorDetails);
                            },
                            function(error) {
                                console.log('Error while fetching the destination connector details', JSON.stringify(error));
                                reject(error);
                            }
                        );
                    },
                    function(error) {
                        console.log('Error while fetching the source connector details', JSON.stringify(error));
                        reject(error);
                    }
                );
            },
            function(error) {
                console.log('Error while fetching the integration details', JSON.stringify(error));
                reject(error);
            }
        );
    });
}

function constructConnectorPayload(domain, healthCheckPath, expectedStatusCode, authType, token, password=null, oAuthDetails=null) {
    var payload = {}
    payload['domain'] = domain
    payload['healthCheckPath'] = healthCheckPath
    payload['expectedStatusCode'] = expectedStatusCode
    payload['authType'] = authType
    switch(authType){
        case "basic":
            payload['username'] = token
            payload['password'] = password
            break
        case "oauth2":
            payload["platformOAuthConfig"] = oAuthDetails
            payload["token"] = token
            break
        default:
            payload['token'] = token
    }

    return payload;
}

function initializeEntityStatus() {
    return new Promise(function(resolve, reject) {
        integrationService.getKey("created_entities").then(
            function(success) {
                console.log('Entity status already exists hence not updating', success)
                resolve("success");
            },
            function(error) {
                console.log('Entity status not available', error);
                console.log('Updating the entity status')
                integrationService.setKey("created_entities", ApiClient.instance.app.entities_list).then(
                    function() {
                        console.log("Successfully set the key");
                        resolve("success");
                    },
                    function(error) {
                        console.log("Failed to set the key", error);
                        reject(error);
                    }
                )
            }
        )
    });
}

/**
 * Update the connector with the given details of the connector
 * @param {Object} payload 
 * payload {
 *  "integrations": {Array<Integration>},
 *  "domain": {String},
 *  "token": {String},
 *  "healthCheckPath": {String},
 *  "expectedStatusCode": {Integer},
 *  "auth_type": {String},
 *  "password": {String},
 *  "isSource": {Boolean},
 *  "isOauthRegister": {Boolean},
 *  "oauth_details": {
 *          "client_id" : {string},
            "client_secret" : {string},
            "scopes" : {string},
            "auth_url" : {string},
            "token_url" : {string}   
 *      }
 * }
 */
function updateConnector(payload) {
    return new Promise(function(resolve, reject) {
        console.log("Update connector called")
        var integrations = payload.integrations;

        var isSource = payload['isSource'];
        var updatePayload = null;
        var cacheSaveKey = getCacheSaveKey(isSource);
        var connectorId = getConnectorId(integrations, isSource);
        var domainUrl = url.parse(payload['domain'], true);
        payload['domain'] = domainUrl.protocol + "//" + domainUrl.hostname;
        console.log(`Updating ${cacheSaveKey}`);
        updatePayload = constructConnectorPayload(payload['domain'], payload['healthCheckPath'], payload['expectedStatusCode'],
                                payload['authType'], payload['token'], payload['password'], payload['oauth_details']);

        var updateConnectorPayload = Connector.constructFromObject({"details": updatePayload});
        if (payload['isOauthRegister'] == undefined) {
            payload['isOauthRegister'] = false;
        }
        let opts = {
            'isOauthRegister': payload['isOauthRegister']
        }
        connectorApi.updateConnector(connectorId, updateConnectorPayload, opts).then(
            function(response) {
                console.log(`Successfully updated the ${cacheSaveKey}.`);
                updatePayload['id'] = response.data.id;
                updatePayload['status'] = response.data.status;
                integrationService.setKey(cacheSaveKey, updatePayload).then(
                    function() {
                        console.log(`Successfully updated ${cacheSaveKey} details in cache`);
                        initializeEntityStatus().then(
                            function(success) {
                                console.log("Successfully updated the entity status", success);
                                resolve(response.data);
                            },
                            function(error) {
                                console.log("Error while updating the entity status", error);
                                reject(error);
                            }
                        );
                    },
                    function(error) {
                        console.log(`Failed to update ${cacheSaveKey} details in cache`, error);
                        reject(error);
                    }
                );
            },
            function(error) {
                console.log(`Error in updating ${cacheSaveKey}.`, JSON.stringify(error));
                reject(error);
            }
        );
    });
}

/**
 * Get Entity Status from the cache
 */
function getEntityStatus() {
    return new Promise(function(resolve, reject) {
        integrationService.getKey("created_entities").then(
            function(entitiesStatus) {
                console.log('Successfully fetched the entity status', JSON.stringify(entitiesStatus));
                resolve(entitiesStatus);
            },
            function(error) {
                console.log("Error while fetching the entity status", JSON.stringify(error));
                reject(error);
            }
        )
    });
}

/**
 * Set the entities status in the app data
 * @param {Object} entitiesStatus 
 */
function updateEntityStatus(entitiesStatus) {
    return new Promise(function(resolve, reject) {
        integrationService.setKey(ApiClient.instance.app.externalAppId, "created_entities", entitiesStatus).then(
            function() {
                console.log('Successfully updated the entity initial sync todo status')
                resolve(entitiesStatus)
            },
            function(error) {
                console.log('Failed to update the entity initial sync todo status', error)
                reject(error)
            }
        )
    })
}

function getNextPage(connector, entity, entityToSyncMeta) {
    return new Promise(function(resolve, reject) {
        switch (connector) {
            case constants.FRESHSALES:
                resolve(freshsalesService.getNextPageData(entity, entityToSyncMeta));
            case constants.FRESHDESK:
                resolve(freshdeskService.getNextPageData(entity, entityToSyncMeta));   
            default:
                reject("Cannot find suitable page iterator for the product");
        }
    });
}

module.exports = {
    createConnectForm,
    constructFreshSalesConnectForm,
    constructField,
    constructFormServObject,
    constructForm,
    getConnectorDetails,
    updateConnector,
    getEntityStatus,
    updateEntityStatus,
    getNextPage
};
