var platformConstants = require("../../platformConstants");
var httpConstants = require('../../http-constants');
var salesforce = require('../salesforceService')
var ApiClient = require("../../../ApiClient");

//AccountSchemaConverter class is used to convert Salesforce account schema to IPaaS platform schema
class AccountSchemaConverter extends salesforce.SalesForceConverter {

    constructor(clientId, clientSecret, refreshToken, authToken, domain) {
        super(clientId, clientSecret, refreshToken, authToken, domain, ApiClient.instance);
    }

    //retrieves the contact fields of Freshdesk using fields API call
    getAccountFields() {
        var accountSchemaConverterObject = this;
        return new Promise(function(resolve, reject){
            /*
            TODO when this code has been included in marketplace app,
            make this request using 'Request API' feature in marketplace platform instead of using 'request' library
            */
            accountSchemaConverterObject.getApiToken().then(
                function(token) {
                    var url = accountSchemaConverterObject.getDomain()+"/services/data/v48.0/sobjects/Account/describe";
                    var headers = {
                        [httpConstants.CONTENT_TYPE]: httpConstants.APPLICATION_JSON,
                        [httpConstants.AUTHORIZATION]: 'Bearer ' + token
                    }
                    accountSchemaConverterObject.apiClient.makeApiCall(url, 'GET', headers).then(
                        function(response) {
                            console.log('Fetched the contact fields: ', response.response)
                            resolve(JSON.parse(response.response).fields)
                        },
                        function(error){
                            var errorData = {
                                'error': error,
                                'url': url
                            }
                            console.log('Failed to fetch the contact fields: ', JSON.stringify(error), url, JSON.stringify(headers))
                            reject(errorData);
                        }
                    )
                },
                function(error) {
                    reject(error)
                }
            )
            
        });
    }   

    getAccountFieldNames(){
        var accountSchemaConverterObject = this;
        return new Promise(function (resolve, reject) {
            accountSchemaConverterObject.getAccountFields().then(
                function(accountFields)
                {
                    var fields = []
                    accountFields.forEach(element => {
                        fields.push(element.name)
                    })
                    console.log('Salesforce contact fields ', JSON.stringify(fields))
                    resolve(fields);
                },
                function(error){
                    reject(error)
                }
            )
        })
    }

    createOutBound(webhookUrl) {
        var accountSchemaConverterObject = this;
        console.log('Going to create outbound message');
        return new Promise(function (resolve, reject) {
            accountSchemaConverterObject.getAccountFieldNames().then(
                function(fields) {
                    accountSchemaConverterObject.createOutBoundMessage('Account', 'freshdesk_sync_app_account_outbound', fields, webhookUrl).then(
                        function(){
                            resolve('success')
                        },
                        function(error){
                            console.log('Error while creating the outbound message', error);
                            reject(error)
                        }
                    )
                },
                function(error) {
                    console.log('Error while fetching the contact fields from salesforce', error)
                    reject(error)
                }
            )
        })
    }

    createRule(){
        var accountSchemaConverterObject = this;
        console.log('Going to create workflow rule');
        return new Promise(function (resolve, reject) {
            accountSchemaConverterObject.createWorkflowRule('Account', 'freshdesk_sync_app_account_outbound', 'freshdesk_account_update_event_trigger_wf').then(
                function(success) {
                    console.log('successfully created the workflow rule')
                    resolve(success)
                },
                function(error){
                    console.log('Error while creating the workflow rule', error)
                    reject(error)
                }
            )
        })
    }
    
    async createApex(webhookUrl){
        var fields = await this.getAccountFieldNames();
        await this.createApexClass('Account', fields, webhookUrl);
    }

    async createTrigger(){
        await this.createApexTrigger('Account', 'AccountChangeFreshdeskTrigger', 'AccountChangeEvent');
    }

    async deleteApex(){
        await this.deleteApexDetails('Account', 'AccountChangeFreshdeskTrigger');
    }
    
    getAccounts(offset) {
        var accountSchemaConverterObject = this;
        return new Promise(function (resolve, reject) {
            accountSchemaConverterObject.getAccountFieldNames().then(
                function(fields) {
                    var query = 'SELECT '
                    for (var index in fields){
                        query += fields[index] + ' ,'
                    }
                    query = query.substring(0, query.length-1)
                    query += 'FROM Account order by LastModifiedDate LIMIT 10 OFFSET ' + offset.toString()
                    var url = accountSchemaConverterObject.getDomain() + '/services/data/v48.0/query/?q=' +  query 
                    accountSchemaConverterObject.getApiToken().then(
                        function(apiToken) {
                            var headers = {"Authorization": 'Bearer ' + apiToken, 'content-type': 'application/json'};
                            accountSchemaConverterObject.apiClient.makeApiCall(url, 'GET', headers).then(
                                function(response) {
                                    console.log('Fetched the accounts', response.response)
                                    resolve(JSON.parse(response.response)['records'])
                                },
                                function(error) {
                                    var errorData = {
                                        'error': error,
                                        'url': url
                                    }
                                    console.log('Failed to fetch accounts', error)
                                    reject(errorData)
                                }
                            )
                        },
                        function(error){
                            console.log('Error while fetching the api token')
                            reject(error)
                        }
                    )
                },
                function(error){
                    console.log('Error while fetching contacts', error);
                    reject(error)
                }
            )
        })
    }

    //Converts contact fields of Freshdesk API response schema to IPaaS platform schema
    convertSchema() {
        var accountSchemaConverterObject = this;
        
        //this field is mandatory field which is not a part of API
        var platformSchema = {
            [platformConstants.PROPERTIES]: []
        };

        return new Promise(function (resolve, reject) {
            accountSchemaConverterObject.getAccountFields().then(
                function(contactFields)
                {
                    contactFields.forEach(element => {
                    
                    if(accountSchemaConverterObject.getPlatformDataType(element.type) == null){ 
                        return;
                    }

                    var platformField = {
                        [platformConstants.LABEL] : element.label,
                        [platformConstants.NAME] : element.name,
                        [platformConstants.TYPE] : accountSchemaConverterObject.getPlatformDataType(element.type)
                    }
                    switch(element.type) {
                        case "address": 
                            platformField[platformConstants.PROPERTIES] = accountSchemaConverterObject.getAddressFields();
                            break;
                        case "location":
                            platformField[platformConstants.PROPERTIES] = accountSchemaConverterObject.getLocationFields();
                            break;
                    }
                    platformSchema[platformConstants.PROPERTIES].push(platformField);
                });
                
                resolve(platformSchema);
            }).catch(function (error){
                reject(error);
            });
        });
    }

    async getObject(field, value) {
        var query = `SELECT Id,Name FROM Account where ${field.toString()} like '${value.toString()}'`;
        var url = this.getDomain() + '/services/data/v48.0/query?q=' + encodeURI(query);
        var apiToken = await this.getApiToken();
        var headers = {"Authorization": 'Bearer ' + apiToken, 'content-type': 'application/json'}
        var response = await this.apiClient.makeApiCall(url, 'GET', headers)
        response = JSON.parse(response.response)['records']
        return response[0];
    }

    async getObjectById(objectId) {
        var url = this.getDomain() + '/services/data/v48.0/sobjects/Account/' +  objectId; 
        var apiToken = await this.getApiToken()
        var headers = {"Authorization": 'Bearer ' + apiToken, 'content-type': 'application/json'};
        var response =  await this.apiClient.makeApiCall(url, 'GET', headers);
        response = JSON.parse(response.response);
        return response;
    }
}

module.exports = {
    AccountSchemaConverter: AccountSchemaConverter
};
