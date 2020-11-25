var platformConstants = require('../platformConstants');
var httpConstants = require('../http-constants');

class SalesForceConverter {

    constructor(clientId, clientSecret, refreshToken, authToken, domain, apiClient) {
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.refreshToken = refreshToken;
        this.authToken = authToken;
        this.domain = domain;
        this.apiClient = apiClient;
        this.isRefreshed = false;
    }

    getApexClass(entity, webhookUrl, fields){
        return `public class FreshdeskApp${entity}Trigger {    
                    @future(callout=true)    
                    public static void makeApiCall(Set<String> entityIds){        
                        Http http = new Http();        
                        HttpRequest request = new HttpRequest();        
                        request.setEndpoint('${webhookUrl}');        
                        request.setMethod('POST');        
                        request.setHeader('Content-Type', 'application/json;charset=UTF-8');        
                        List<${entity}> entities = [SELECT ${fields} FROM ${entity} WHERE Id in :entityIds];        
                        for (${entity} entity: entities) {            
                            String entityJSON = JSON.serializePretty(entity);            
                            request.setBody(entityJSON);           
                            HttpResponse response = http.send(request);                        
                            if (response.getStatusCode() != 200) {            
                                System.debug('The status code returned was not expected: ' + 
                                response.getStatusCode() + ' ' + response.getStatus());            
                            } else {                
                                System.debug(response.getBody());            
                            }        
                        }    
                    }
                }`
    }

    getApexTrigger(entity, name, event){
        return `trigger ${name} on ${event} (after insert) {
                    Set<String> entityIds = new Set<String>();
                    for(${event} event: Trigger.New){
                        entityIds.addAll(event.ChangeEventHeader.getRecordIds());
                    }
                    FreshdeskApp${entity}Trigger.makeApiCall(entityIds);
                }`
    }

    getApiToken() {
        var salesforce = this;
        return new Promise(function(resolve, reject){
            salesforce.getUserInfo().then(
                function() {
                    resolve(salesforce.authToken);
                }, function() {
                    salesforce.getTokenByRefresh().then(
                        function(token) {
                            salesforce.authToken = token;
                            salesforce.isRefreshed = true;
                            resolve(salesforce.authToken);
                        },
                        function(error){
                            reject(error)
                        }
                    )}
                )
            }
        ) 
    }

    getTokenByRefresh() {
        var refresh_url = 'https://login.salesforce.com/services/oauth2/token?grant_type=refresh_token' + 
        '&refresh_token=' + this.refreshToken + 
        '&redirect_uri=' +  platformConstants.OAUTH_REDIRECT_URL +
        '&client_id=' + this.clientId +
        '&client_secret=' + this.clientSecret;
        var salesforce = this;
        console.log('Fetching the access token using refresh token.');
        return new Promise(function(resolve, reject){
            salesforce.apiClient.request.get(refresh_url).then(
                function(response){
                    console.log("Access token fetch successful.")
                    resolve(JSON.parse(response.response).access_token);
                },
                function(error){
                    var errorData = {
                        'error': error,
                        'url': refresh_url
                    }
                    reject(errorData);
                }
            )
        })  
    }

    getUserInfo() {
        var salesforce = this
        return new Promise(function(resolve,reject){
            var headers = {
                [httpConstants.CONTENT_TYPE]: httpConstants.APPLICATION_JSON,
                [httpConstants.AUTHORIZATION]: 'Bearer ' + salesforce.authToken
            }
            salesforce.apiClient.request.get('https://login.salesforce.com/services/oauth2/userinfo', {'headers': headers}).then(
                function(response) {
                    console.log('User info fetch successful.')
                    resolve(JSON.parse(response.response));
                },
                function(error) {
                    console.log('User info fetch failed. Access token might have expired.')
                    reject(error);
                }
            )
        })
        
    }
    getApiKey(){
        return this.apiKey;
    }

    getDomain() {
        return this.domain;
    }

    getAddressFields() {
        const ADDRESS_FIELDS = [
        {
          "name": "Accuracy",
          "type": platformConstants.STRING,
          "label": "Accuracy"
        },
        {
          "name": "City",
          "type": platformConstants.STRING,
          "label": "City"
        },
        {
          "name": "Country",
          "type": platformConstants.STRING,
          "label": "Country"
        },
        {
          "name": "CountryCode",
          "type": platformConstants.STRING,
          "label": "CountryCode"
        },
        {
          "name": "Latitude",
          "type": platformConstants.NUMBER,
          "label": "Latitude"
        },
        {
          "name": "Longitude",
          "type": platformConstants.NUMBER,
          "label": "Longitude"
        },
        {
          "name": "PostalCode",
          "type": platformConstants.STRING,
          "label": "PostalCode"
        },
        {
          "name": "State",
          "type": platformConstants.STRING,
          "label": "State"
        },
        {
          "name": "StateCode",
          "type": platformConstants.STRING,
          "label": "StateCode"
        },
        {
          "name": "Street",
          "type": platformConstants.STRING,
          "label": "Street"
        }
      ]
      return ADDRESS_FIELDS;
    }
    
    getLocationFields() {
      const GEO_LOCATION_FIELDS = [
            {
            "name": "Latitude",
            "type": platformConstants.NUMBER,
            "label": "Latitude"
            },
            {
            "name": "Longitude",
            "type": platformConstants.NUMBER,
            "label": "Longitude"
            }
      ]

      return GEO_LOCATION_FIELDS;
    }

    createOutBoundMessage(entity, name, fields, webhookUrl) {
        var salesforce = this
        return new Promise(function(resolve,reject){
            salesforce.getApiToken().then(
                function(apiToken){
                    var url = salesforce.domain + "/services/data/v48.0/tooling/query?q=select name from WorkflowOutboundMessage where name='" + name + "'"
                    var reqData = {
                        "headers": {"Authorization": 'Bearer ' + apiToken, 'content-type': 'application/json'},
                    }
                    salesforce.apiClient.request.get(url, reqData).then(
                        function(response) {
                            console.log('fetched the outbound data', response.response)
                            response = JSON.parse(response.response)
                            if (response.size == 1){
                                resolve(response)
                                return;
                            }
                            salesforce.getUserInfo().then(
                                function(userInfo){
                                    console.log('Salesforce userinfo', JSON.stringify(userInfo));
                                    var user = userInfo.email;
                                    var url = salesforce.domain + '/services/data/v48.0/tooling/sobjects/WorkflowOutboundMessage'
                                    var body = {
                                        "Metadata": {
                                            "apiVersion": 48.0,
                                            "fields": fields,
                                            "endpointUrl": webhookUrl,
                                            "integrationUser": user,
                                            "name": name
                                        },
                                        "FullName": entity + "." + name
                                    }
                                    var reqData = {
                                        "headers": {"Authorization": 'Bearer ' + apiToken, 'content-type': 'application/json'},
                                        "body": JSON.stringify(body)
                                    }
                                    console.log(reqData)
                                    salesforce.apiClient.request.post(url, reqData).then(
                                        function(response) {
                                            console.log('created the outbound message')
                                            resolve(response.response)
                                        },
                                        function(error) {
                                            console.log('Failed to create the outbound message', error)
                                            reject(error)
                                        }
                                    )
                                }
                            )
                        },
                        function(error) {
                            console.log('Failed to fetch the workflow rule', error)
                            reject(error)
                        }
                    )
                }
            )
        })
    }

    createWorkflowRule(entity, actionName, name) {
        var salesforce = this
        return new Promise(function(resolve,reject){
            salesforce.getApiToken().then(
                function(apiToken){
                    var url = salesforce.domain + "/services/data/v48.0/tooling/query?q=select name from workflowrule where name='" + name + "'"
                    var reqData = {
                        "headers": {"Authorization": 'Bearer ' + apiToken, 'content-type': 'application/json'},
                    }
                    salesforce.apiClient.request.get(url, reqData).then(
                        function(response) {
                            console.log('fetched the workflow rule data', response.response)
                            response = JSON.parse(response.response)
                            if (response.size == 1){
                                resolve(response)
                                return;
                            }
                            var url = salesforce.domain + '/services/data/v48.0/tooling/sobjects/WorkflowRule'
                            var body = {
                                "Metadata": {
                                    "actions": [
                                        {
                                            "name": actionName,
                                            "type": "OutboundMessage"
                                        }
                                    ],
                                    
                                    "criteriaItems": [
                                        {
                                            "field": entity + ".CreatedDate",
                                            "operation": "greaterThan",
                                            "value": "1/1/1700"
                                        }
                                    ],
                                    "active": true,
                                    "triggerType": "onAllChanges"
                                },
                                "FullName": entity + "." + name
                            }
                            var reqData = {
                                "headers": {"Authorization": 'Bearer ' + apiToken, 'content-type': 'application/json'},
                                "body": JSON.stringify(body)
                            }
                            console.log('request body', reqData)
                            salesforce.apiClient.request.post(url, reqData).then(
                                function(response) {
                                    console.log('created the workflow rule')
                                    resolve(response)
                                },
                                function(error) {
                                    console.log('Failed to create the workflow rule', error)
                                    reject(error)
                                }
                            )   
                        },
                        function(error) {
                            console.log('Failed to fetch the workflow rule', error)
                            reject(error)
                        }
                    )
                    
                }
            )
        })
    }

    async deleteApexDetails(entity, apexTriggerName){
        //delete created Apex
        var name = `FreshdeskApp${entity}Trigger`;
        var apiToken = await this.getApiToken()
        var url = this.domain + "/services/data/v48.0/tooling/query?q=select Id from ApexClass where name='" + name + "'"
        var reqData = {
            "headers": {"Authorization": 'Bearer ' + apiToken, 'content-type': 'application/json'},
        }
        var response = await this.apiClient.request.get(url, reqData)
        console.log('fetched the apex class data', response.response)
        response = JSON.parse(response.response)
        if (response.size == 1){
            var record = response.records[0]
            url = this.domain + "/services/data/v48.0/tooling/sobjects/ApexClass/" + record.Id
            response = await this.apiClient.request.delete(url, reqData)
        }

        //delete created Apex trigger
        var url = this.domain + "/services/data/v48.0/tooling/query?q=select Id from ApexTrigger where name='" + apexTriggerName + "'"
        var reqData = {
            "headers": {"Authorization": 'Bearer ' + apiToken, 'content-type': 'application/json'},
        }
        var response = await this.apiClient.request.get(url, reqData)
        console.log('fetched the apex Trigger data', response.response)
        response = JSON.parse(response.response)
        if (response.size == 1){
            var record = response.records[0]
            url = this.domain + "/services/data/v48.0/tooling/sobjects/ApexTrigger/" + record.Id
            await this.apiClient.request.delete(url, reqData)
        }
    }

    async createApexClass(entity, fields, webhookUrl) {
        var name = `FreshdeskApp${entity}Trigger`;
        var apiToken = await this.getApiToken()
        var url = this.domain + "/services/data/v48.0/tooling/query?q=select name from ApexClass where name='" + name + "'"
        var reqData = {
            "headers": {"Authorization": 'Bearer ' + apiToken, 'content-type': 'application/json'},
        }
        var response = await this.apiClient.request.get(url, reqData)
        console.log('fetched the apex class data', response.response)
        response = JSON.parse(response.response)
        if (response.size == 1){
            return response;
        }
         
        url = this.domain + '/services/data/v48.0/tooling/sobjects/ApexClass';
        fields = fields.join(',')
        var body = {
            "Name": name,
            "Body": this.getApexClass(entity, webhookUrl, fields)
        }
        var reqData = {
            "headers": {"Authorization": 'Bearer ' + apiToken, 'content-type': 'application/json'},
            "body": JSON.stringify(body)
        }
        console.log(reqData)
        var response = await this.apiClient.request.post(url, reqData)
        console.log('created the apex class for entity.')                     
    }

    async createApexTrigger(entity, name, event){
        var apiToken = await this.getApiToken()
        var url = this.domain + "/services/data/v48.0/tooling/query?q=select name from ApexTrigger where name='" + name + "'"
        var reqData = {
            "headers": {"Authorization": 'Bearer ' + apiToken, 'content-type': 'application/json'},
        }
        var response = await this.apiClient.request.get(url, reqData)
        console.log('fetched the apex class data', response.response)
        response = JSON.parse(response.response)
        if (response.size == 1){
            return response;
        }
        var body = {
            "Name": name,
            "TableEnumOrId": event,
            "Body": this.getApexTrigger(entity, name, event),
            "EntityDefinitionId": event
        }
        var url = this.domain + '/services/data/v48.0/tooling/sobjects/ApexTrigger';
        var reqData = {
            "headers": {"Authorization": 'Bearer ' + apiToken, 'content-type': 'application/json'},
            "body": JSON.stringify(body)
        }
        console.log(reqData)
        var response = await this.apiClient.request.post(url, reqData)
        console.log('created the apex class for entity.')  
    }

    async createWebhookDomainSecurityException(webhookUrl){
        const name = 'FreshdeskWebhookUrl';
        var apiToken = await this.getApiToken()
        var url = this.domain + "/services/data/v48.0/tooling/query?q=select SiteName from RemoteProxy where SiteName='" + name + "'"
        var reqData = {
            "headers": {"Authorization": 'Bearer ' + apiToken, 'content-type': 'application/json'},
        }
        var response = await this.apiClient.request.get(url, reqData)
        console.log('fetched the apex class data', response.response)
        response = JSON.parse(response.response)
        if (response.size == 1){
            return response;
        }
        var body = {
            "Metadata": {
                "disableProtocolSecurity": false,
                "isActive": true,
                "url": webhookUrl,
                "urls": null,
                "description": null
            },
            "FullName": name
        }
        
        var url = this.domain + '/services/data/v48.0/tooling/sobjects/RemoteProxy';
        var reqData = {
            "headers": {"Authorization": 'Bearer ' + apiToken, 'content-type': 'application/json'},
            "body": JSON.stringify(body)
        }
        console.log(reqData)
        var response = await this.apiClient.request.post(url, reqData)
        console.log('created the apex class for entity.') 
    }

    async addChannelMembers(){
        var apiToken = await this.getApiToken()
        var url = this.domain + "/services/data/v48.0/tooling/query?q=select MasterLabel from PlatformEventChannelMember where MasterLabel in ('AccountChangeEvent', 'ContactChangeEvent')"
        var reqData = {
            "headers": {"Authorization": 'Bearer ' + apiToken, 'content-type': 'application/json'},
        }
        var response = await this.apiClient.request.get(url, reqData)
        console.log('fetched the apex class data', response.response)
        response = JSON.parse(response.response)
        if (response.size == 2){
            return response;
        }
        var createdMembers = []
        for (var recordIndex in response['records']){
            var record = response['records'][recordIndex]
            createdMembers.push(record['MasterLabel'])
        }

        const membersToCreate = ['AccountChangeEvent', 'ContactChangeEvent']
        for (var memberIndex in membersToCreate){
            if (!createdMembers.includes(membersToCreate[memberIndex])){
                var name = `ChangeEvents_${membersToCreate[memberIndex]}`
                var body = {
                    "FullName": name,
                    "Metadata": {
                        "enrichedFields": null,
                        "eventChannel": "ChangeEvents",
                        "selectedEntity": membersToCreate[memberIndex],
                        "urls": null
                    }
                }
                
                var url = this.domain + '/services/data/v48.0/tooling/sobjects/PlatformEventChannelMember';
                var reqData = {
                    "headers": {"Authorization": 'Bearer ' + apiToken, 'content-type': 'application/json'},
                    "body": JSON.stringify(body)
                }
                console.log(reqData)
                var response = await this.apiClient.request.post(url, reqData)
                console.log('created the apex class for entity.') 
            }
        }
        
    }
    // Retrives the IPaaS platform supported data type
    getPlatformDataType(dataType) {
        switch(dataType) {
            case "double":
            case "int":
            case "percent":
                return platformConstants.NUMBER;
            case "checkbox":
            case "boolean":
                return platformConstants.BOOLEAN;
            case "autonumber":
            case "email":
            case "phone":
            case "picklist":
            case "textarea":
            case "text":
            case "reference":
            case "date":
            case "datetime":
            case "id":
            case "string":
            case "url":
                return platformConstants.STRING;
            case "address":
            case "location":
                return platformConstants.OBJECT;
            case "multipicklist":
                return platformConstants.ARRAY;
            default:
                return null;
        }
    }
}

module.exports = {
    SalesForceConverter: SalesForceConverter
}