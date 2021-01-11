var platformConstants = require("../../platformConstants");
var httpConstants = require('../../http-constants');
const GROUP_FIELD = "group_field";
var freshsalesService = require("../freshsalesService")
var ApiClient = require("../../../ApiClient");

// ContactSchemaConverter used to convert Freshsales contact schema to IPaaS platform schema
class ContactSchemaConverter extends freshsalesService.FreshsalesConverter {

    constructor(authToken, domain) {
        super(authToken, domain, ApiClient.instance);
    }
    
    // Retrives all fields of Freshsales contact using fields API
    getContactFields() {
        var contactSchemaConverter = this;
        return new Promise(function(resolve, reject) {
            var domain = contactSchemaConverter.getDomain();
            var authToken = contactSchemaConverter.getToken();
            var url = String(domain + '/api/settings/contacts/fields');
            var headers = {
                [httpConstants.CONTENT_TYPE]: httpConstants.APPLICATION_JSON,
                [httpConstants.AUTHORIZATION]: authToken
            }
            contactSchemaConverter.apiClient.makeApiCall(url, 'GET', headers).then(
                function(contactFieldsResponse) {
                    var contactFields = JSON.parse(contactFieldsResponse.response);
                    resolve(contactFields.fields);
                },
                function(error) {
                    console.log('Error while fetching contact fields', error);
                    reject(error);
                }
            );
        });
    }
    
    // Converts contact fields API response schema to IPaaS platform schema
    convertSchema() {
        var contactSchemaConverter = this;
        return new Promise(function(resolve, reject) {

            // Id and email fields are added mandatorily that are not part of the contact fields API
            var platformSchema = {
                [platformConstants.PROPERTIES]:[
                    {
                        [platformConstants.LABEL]: "Id", 
                        [platformConstants.NAME]: "id", 
                        [platformConstants.TYPE]: platformConstants.NUMBER,
                        [platformConstants.REQUIRED]: false
                    },
                    {
                        [platformConstants.LABEL]: "Email", 
                        [platformConstants.NAME]: "email", 
                        [platformConstants.TYPE]: platformConstants.STRING,
                        [platformConstants.REQUIRED]: true
                    },
                    {
                        [platformConstants.LABEL]: "Sales account", 
                        [platformConstants.NAME]: "sales_account_id", 
                        [platformConstants.TYPE]: platformConstants.NUMBER,
                        [platformConstants.REQUIRED]: false
                    }
                ]
            };

            // Added customFields which is of object type which comes under view contact API
            var customFields = {
                [platformConstants.LABEL]: "Custom Field",
                [platformConstants.NAME]: "custom_field",
                [platformConstants.TYPE]: platformConstants.OBJECT,
                [platformConstants.PROPERTIES]: []
            };

            contactSchemaConverter.getContactFields().then(function(contactFields) {
                contactFields.forEach(element => {
                    if(element.type != GROUP_FIELD) {
                        var platformField = {
                            [platformConstants.LABEL]: element.label,
                            [platformConstants.NAME]: element.name,
                            [platformConstants.TYPE]: contactSchemaConverter.getPlatformDataType(element.type),
                            [platformConstants.REQUIRED]: element.required
                        };
                        if (element.hasOwnProperty("choices")) {
                            platformField[platformConstants.OPTIONS] = []
                            for (var choice of element['choices']) {
                                platformField[platformConstants.OPTIONS].push({"name": choice['value'], "value": choice["id"]})
                            }
                        }
                        if(element.default) {
                            platformSchema.properties.push(platformField);
                        }
                        else {
                            customFields.properties.push(platformField);
                        }
                    }
                });
                if(customFields.properties.length > 0) {
                    platformSchema.properties.push(customFields);
                }
                resolve(platformSchema);
            }).catch(function(error) {
                reject(error);
            });
        });
    }

    async getPage(viewId, pageToFetch) {
        return await super.getPage('contact', viewId, pageToFetch);
    }

    async getViewId() {
        return await super.getViewId('contact');
    }

    async searchObject(params) {
        var response = null;
        for (var param of params) {
            if (param.value != null) {
                response = await this.queryData(param.field, param.value)
                if (response['contacts'] == null || response['contacts']['contacts'].length == 0){
                    return null;
                }
                response = response['contacts']['contacts'];
                break;
            }
        }

        var filteredContact = null;

        for (var contact of response) {
            var isValid = true;
            for (var param of params) {
                if (param.value != null && contact[param.field] !== param.value) {
                    isValid = false;
                    break;
                }
            }
            if (isValid) {
                filteredContact = contact;
                break;
            }
        }

        return filteredContact;
    }

    async queryData(field, value) {
        var url = this.domain + `/api/lookup?q=${encodeURI(value)}&f=${encodeURI(field)}&entities=contact`;
        console.log("Going to get data using url: ", url);
       
        var headers = {
            [httpConstants.CONTENT_TYPE]: httpConstants.APPLICATION_JSON,
            [httpConstants.AUTHORIZATION]: this.getToken()
        }
        var response = await this.apiClient.makeApiCall(url, 'GET', headers);
        response = JSON.parse(response.response)
        return response;
    }

    async getObject(field, value) {
        var response = await this.queryData(field, value)
        if (response['contacts'] == null || response['contacts']['contacts'].length == 0){
            return null;
        }
        return response['contacts']['contacts'][0];
    }

    async getObjectById(objectId) {
        var url = this.domain + `/api/contacts/${objectId}`;
        console.log("Going to get data using url: ", url);
       
        var headers = {
            [httpConstants.CONTENT_TYPE]: httpConstants.APPLICATION_JSON,
            [httpConstants.AUTHORIZATION]: this.getToken()
        }
        var response = await this.apiClient.makeApiCall(url, 'GET', headers);
        response = JSON.parse(response.response)
        if (response['contact'] == null){
            return null;
        }
        return response['contact'];
    }
}

module.exports = {
    ContactSchemaConverter: ContactSchemaConverter
}
