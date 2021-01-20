var platformConstants = require("../../platformConstants");
var httpConstants = require('../../http-constants');
var freshsalesService = require("../freshsalesService")
var ApiClient = require("../../../ApiClient");

// AccountSchemaConverter used to convert Freshsales account schema to IPaaS platform schema
class AccountSchemaConverter extends freshsalesService.FreshsalesConverter {

    constructor(authToken, domain) {
        super(authToken, domain, ApiClient.instance);
    }
    
    // Retrives all fields of Freshsales account using fields API
    getAccountFields() {
        var accountSchemaConverter = this;
        return new Promise(function(resolve, reject) {
            var url = String(accountSchemaConverter.getDomain() + '/api/settings/sales_accounts/fields');
            var headers = {
                [httpConstants.CONTENT_TYPE]: httpConstants.APPLICATION_JSON,
                [httpConstants.AUTHORIZATION]: accountSchemaConverter.getToken()
            }
            accountSchemaConverter.apiClient.makeApiCall(url, 'GET', headers).then(
                function(accountFieldsResponse) {
                    var accountFields = JSON.parse(accountFieldsResponse.response);
                    resolve(accountFields.fields);
                },
                function(error) {
                    console.log('Error while fetching account fields', error);
                    reject(error);
                }
            );
        });
    }
    
    // Converts account fields API response schema to IPaaS platform schema
    convertSchema() {
        var accountSchemaConverter = this;
        return new Promise(function(resolve, reject) {

            // Id is added mandatorily that is not part of the account fields API
            var platformSchema = {
                [platformConstants.PROPERTIES]:[
                    {
                        [platformConstants.LABEL]: "Id", 
                        [platformConstants.NAME]: "id", 
                        [platformConstants.TYPE]: platformConstants.NUMBER,
                        [platformConstants.REQUIRED]: false
                    }
                ]
            };

            // Added customFields which is of object type which comes under view account API
            var customFields = {
                [platformConstants.LABEL]: "Custom Field",
                [platformConstants.NAME]: "custom_field",
                [platformConstants.TYPE]: platformConstants.OBJECT,
                [platformConstants.PROPERTIES]: []
            };

            accountSchemaConverter.getAccountFields().then(function(accountFields) {
                accountFields.forEach(element => {
                    var platformField = {
                        [platformConstants.LABEL]: element.label,
                        [platformConstants.NAME]: element.name,
                        [platformConstants.TYPE]: accountSchemaConverter.getPlatformDataType(element.type),
                        [platformConstants.REQUIRED]: element.required
                    };
                    if(element.default) {
                        platformSchema.properties.push(platformField);
                    }
                    else {
                        customFields.properties.push(platformField);
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

    async getObject(field, value) {
        var url = this.domain + `/api/lookup?q=${encodeURI(value)}&f=${encodeURI(field)}&entities=sales_account`;
        console.log("Going to get data using url: ", url);
       
        var headers = {
            [httpConstants.CONTENT_TYPE]: httpConstants.APPLICATION_JSON,
            [httpConstants.AUTHORIZATION]: this.getToken()
        }
        var response = await this.apiClient.makeApiCall(url, 'GET', headers);
        response = JSON.parse(response.response)
        if (response['sales_accounts'] == null || response['sales_accounts']['sales_accounts'].length == 0){
            return null;
        }
        return response['sales_accounts']['sales_accounts'][0];
    }

    async getObjectById(objectId) {
        var url = this.domain + `/api/sales_accounts/${objectId}`;
        console.log("Going to get data using url: ", url);
       
        var headers = {
            [httpConstants.CONTENT_TYPE]: httpConstants.APPLICATION_JSON,
            [httpConstants.AUTHORIZATION]: this.getToken()
        }
        var response = await this.apiClient.makeApiCall(url, 'GET', headers);
        response = JSON.parse(response.response)
        if (response['sales_account'] == null){
            return null;
        }
        return response['sales_account'];
    }
}

module.exports = {
    AccountSchemaConverter: AccountSchemaConverter
}
