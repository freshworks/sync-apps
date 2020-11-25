var platformConstants = require("../../platformConstants");
var httpConstants = require('../../http-constants');
var salesforce = require('../salesforceService')
var ApiClient = require("../../../ApiClient");

//ContactSchemaConverter class is used to convert Salesforce contact schema to IPaaS platform schema
class ContactSchemaConverter extends salesforce.SalesForceConverter {

    constructor(clientId, clientSecret, refreshToken, authToken, domain) {
        super(clientId, clientSecret, refreshToken, authToken, domain, ApiClient.instance);
    }

    //retrieves the contact fields of Freshdesk using fields API call
    getContactFields() {
        var contactSchemaConverterObject = this;
        return new Promise(function(resolve, reject){
            /*
            TODO when this code has been included in marketplace app,
            make this request using 'Request API' feature in marketplace platform instead of using 'request' library
            */
            contactSchemaConverterObject.getApiToken().then(
                function(token) {
                    var url = contactSchemaConverterObject.getDomain()+"/services/data/v48.0/sobjects/Contact/describe";
                    var headers = {
                        [httpConstants.CONTENT_TYPE]: httpConstants.APPLICATION_JSON,
                        [httpConstants.AUTHORIZATION]: 'Bearer ' + token
                    }
                    contactSchemaConverterObject.apiClient.request.get(url, {'headers': headers}).then(
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

    getContactFieldNames(){
        var contactSchemaConverterObject = this;
        return new Promise(function (resolve, reject) {
            contactSchemaConverterObject.getContactFields().then(
                function(contactFields)
                {
                    var fields = []
                    contactFields.forEach(element => {
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
        var contactSchemaConverterObject = this;
        console.log('Going to create outbound message');
        return new Promise(function (resolve, reject) {
            contactSchemaConverterObject.getContactFieldNames().then(
                function(fields) {
                    contactSchemaConverterObject.createOutBoundMessage('Contact', 'freshdesk_sync_app_outbound', fields, webhookUrl).then(
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
        var contactSchemaConverterObject = this;
        console.log('Going to create workflow rule');
        return new Promise(function (resolve, reject) {
            contactSchemaConverterObject.createWorkflowRule('Contact', 'freshdesk_sync_app_outbound', 'freshdesk_contact_update_event_trigger_wf').then(
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
    
    async getObject(field, value) {
        var query = `SELECT Id,Email FROM Contact where ${field.toString()} like '${value.toString()}'`;
        var url = this.getDomain() + '/services/data/v48.0/query?q=' + encodeURI(query);
        var apiToken = await this.getApiToken();
        var reqData = {
            "headers": {"Authorization": 'Bearer ' + apiToken, 'content-type': 'application/json'},
        }
        console.log('request: ', url, JSON.stringify(reqData));
        var response = await this.apiClient.request.get(url, reqData)
        response = JSON.parse(response.response)['records']
        return response[0];
    }

    async getObjectById(objectId) {
        var url = this.getDomain() + '/services/data/v48.0/sobjects/Contact/' +  objectId; 
        var apiToken = await this.getApiToken()
        var reqData = {
            "headers": {"Authorization": 'Bearer ' + apiToken, 'content-type': 'application/json'},
        }
        var response =  await this.apiClient.request.get(url, reqData);
        response = JSON.parse(response.response);
        return response;
    }

    getContacts(offset) {
        var contactSchemaConverterObject = this;
        return new Promise(function (resolve, reject) {
            contactSchemaConverterObject.getContactFieldNames().then(
                function(fields) {
                    var query = 'SELECT '
                    for (var index in fields){
                        query += fields[index] + ' ,'
                    }
                    query = query.substring(0, query.length-1)
                    query += 'FROM Contact order by LastModifiedDate LIMIT 10 OFFSET ' + offset.toString()
                    var url = contactSchemaConverterObject.getDomain() + '/services/data/v48.0/query/?q=' +  query 
                    contactSchemaConverterObject.getApiToken().then(
                        function(apiToken) {
                            var reqData = {
                                "headers": {"Authorization": 'Bearer ' + apiToken, 'content-type': 'application/json'},
                            }
                            console.log('request body', reqData)
                            contactSchemaConverterObject.apiClient.request.get(url, reqData).then(
                                function(response) {
                                    console.log('Fetched the contacts', response.response)
                                    resolve(JSON.parse(response.response)['records'])
                                },
                                function(error) {
                                    var errorData = {
                                        'error': error,
                                        'url': url
                                    }
                                    console.log('Failed to fetch the contacts', error)
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

    async createApex(webhookUrl){
        var fields = await this.getContactFieldNames();
        await this.createApexClass('Contact', fields, webhookUrl);
    }

    async createTrigger(){
        await this.createApexTrigger('Contact', 'ContactChangeFreshdeskTrigger', 'ContactChangeEvent');
    }

    async deleteApex(){
        await this.deleteApexDetails('Contact', 'ContactChangeFreshdeskTrigger');
    }

    //Converts contact fields of Freshdesk API response schema to IPaaS platform schema
    convertSchema() {
        var contactSchemaConverterObject = this;
        
        //this field is mandatory field which is not a part of API
        var platformSchema = {
            [platformConstants.PROPERTIES]: []
        };

        return new Promise(function (resolve, reject) {
            contactSchemaConverterObject.getContactFields().then(
                function(contactFields)
                {
                    contactFields.forEach(element => {
                    
                    if(contactSchemaConverterObject.getPlatformDataType(element.type) == null){ 
                        return;
                    }

                    var platformField = {
                        [platformConstants.LABEL] : element.label,
                        [platformConstants.NAME] : element.name,
                        [platformConstants.TYPE] : contactSchemaConverterObject.getPlatformDataType(element.type)
                    }
                    switch(element.type) {
                        case "address": 
                            platformField[platformConstants.PROPERTIES] = contactSchemaConverterObject.getAddressFields();
                            break;
                        case "location":
                            platformField[platformConstants.PROPERTIES] = contactSchemaConverterObject.getLocationFields();
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
}

module.exports = {
    ContactSchemaConverter: ContactSchemaConverter
};
