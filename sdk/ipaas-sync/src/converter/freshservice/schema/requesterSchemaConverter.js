
var platformConstants = require("../../platformConstants.js");
var httpConstants = require('../../http-constants');
var ApiClient = require("../../../ApiClient");

//RequesterSchemaConverter class is used to convert Freshservice requester schema to IPaaS platform schema
class RequesterSchemaConverter{

    constructor(authToken, domain) {
        this.authToken = authToken;
        this.domain = domain;
        this.apiClient = ApiClient.instance;
    }

    getAPIToken(){
        return Buffer.from(this.authToken + ":X").toString('base64');
    }
    
    getDomain(){
        return this.domain;
    }

    //retrieves the requester fields of Freshservice using fields API call
    getRequesterFields() {
        var requesterSchemaConverterObject = this;
        return new Promise(function(resolve, reject){
            
            var url = String(requesterSchemaConverterObject.getDomain() + "/api/v2/requester_fields");
            var headers = {
                [httpConstants.CONTENT_TYPE]: httpConstants.APPLICATION_JSON,
                [httpConstants.AUTHORIZATION]: "Basic " + requesterSchemaConverterObject.getAPIToken()
            }
            requesterSchemaConverterObject.apiClient.request.get(url, { "headers": headers}).then(
                function(requesterFieldsResponse) {
                    resolve(JSON.parse(requesterFieldsResponse.response));
                },
                function(error) {
                    console.log('Error while fetching requester fields', error);
                    reject(error);
                }
            );
        });
    }   

    //Converts requester fields of Freshservice API response schema to IPaaS platform schema
    convertSchema() {
        var requesterSchemaConverterObject = this;
        
        //this field is mandatory field which is not a part of API
        var platformSchema = {
                [platformConstants.PROPERTIES] : [
                    {
                        [platformConstants.LABEL] : "Id", 
                        [platformConstants.NAME] : "id", 
                        [platformConstants.TYPE] : platformConstants.NUMBER
                    },
                    {   
                        [platformConstants.LABEL] : 'Email', 
                        [platformConstants.NAME] : 'primary_email', 
                        [platformConstants.TYPE] : platformConstants.STRING
                    },
                    {   
                        [platformConstants.LABEL] : 'Work Phone',
                        [platformConstants.NAME] : 'work_phone_number',
                        [platformConstants.TYPE] : platformConstants.NUMBER 
                    },
                    {
                        [platformConstants.LABEL] : 'Mobile Phone',
                        [platformConstants.NAME] : 'mobile_phone_number',
                        [platformConstants.TYPE] : platformConstants.NUMBER 
                    },
                    { 
                        [platformConstants.LABEL] : 'Can see all tickets from this department',
                        [platformConstants.NAME] : 'can_see_all_tickets_from_associated_departments',
                        [platformConstants.TYPE] : platformConstants.BOOLEAN
                    },
                    { 
                        [platformConstants.LABEL] : 'Reporting Manager',
                        [platformConstants.NAME] : 'reporting_manager_id',
                        [platformConstants.TYPE] : platformConstants.NUMBER 
                    }
                ]
            };

        //Added customFields which is of object type which comes under view requester API
        var customFields = {
            [platformConstants.LABEL] : "Custom Fields", 
            [platformConstants.NAME] : "custom_fields", 
            [platformConstants.TYPE] : platformConstants.OBJECT, 
            [platformConstants.PROPERTIES] : []
        };

        return new Promise(function (resolve, reject) {
            requesterSchemaConverterObject.getRequesterFields().then(function(requesterFields)
            {
                var supportedRequesterFields = requesterFields.requester_fields.filter(requesterSchemaConverterObject.isFieldSupported);
                supportedRequesterFields.forEach(element => {
                    var platformField = {
                        [platformConstants.LABEL] : element.label,
                        [platformConstants.NAME] : element.name,
                        [platformConstants.TYPE] : requesterSchemaConverterObject.getPlatformDataType(element.type)
                    }
                    if(element.default){// Converting fixed schema to IPaaS platform schema
                        platformSchema[platformConstants.PROPERTIES].push(platformField);
                    }
                    else{//Converting custom field schema to IPaaS platform schema 
                        customFields[platformConstants.PROPERTIES].push(platformField);
                    }
                });
                if(customFields[platformConstants.PROPERTIES].length > 0){
                    platformSchema[platformConstants.PROPERTIES].push(customFields);
                }
                resolve(platformSchema);
            }).catch(function (error){
                reject(error);
            });
        });
    }
    
    getPlatformDataType(datatype){  
        switch(datatype){
        	case "default_first_name":
        	case "default_last_name":
        	case "default_email":
        	case "default_job_title":
        	case "default_address":
        	case "default_time_zone":
        	case "default_description":
        	case "default_language":
        	case "default_time_format":
        	case "custom_text":
        	case "custom_dropdown":
        	case "custom_paragraph":
        	case "custom_url":
        	case "custom_date":
        		return platformConstants.STRING;
        	case "default_phone":
        	case "default_mobile":
        	case "default_reporting_manager":
        	case "default_location_id":
        	case "custom_phone_number":
        	case "custom_number":
        		return platformConstants.NUMBER;
        	case "default_department_head":
        	case "custom_checkbox":
        		return platformConstants.BOOLEAN;
        	default:
        		throw new Error("Unsupported data type " + datatype + " found");
        }
    }

    isFieldSupported(field) {

        /*
        These fields are unsupported due to the following reasons:
            1. Department field is omitted due to array datatype is not supported
            2. Remaining fields are already added as a mandatory fields
        */
        var unSupportedFields = [
            "email",
            "phone",
            "mobile",
            "department_head",
            "reporting_manager",
            "background_information",
            "department"
        ];
        return !unSupportedFields.includes(field.name);
    }

    async getObject(field, value) {
        if (field === 'primary_email') {
            field = 'email';
        }
        var url = this.getDomain() + `/api/v2/requesters?${field}=${encodeURI(value)}`;
        var headers = {
            [httpConstants.CONTENT_TYPE]: httpConstants.APPLICATION_JSON,
            [httpConstants.AUTHORIZATION]: "Basic " + this.getAPIToken()
        }
        
        var response = await this.apiClient.request.get(url, { "headers": headers});
        response = JSON.parse(response.response)
        if (response['requesters'].length == 0){
            return null;
        }
        return response['requesters'][0];
    }

    async getObjectById(value) {
        
        var url = this.getDomain() + `/api/v2/requesters/${value}`;
        var headers = {
            [httpConstants.CONTENT_TYPE]: httpConstants.APPLICATION_JSON,
            [httpConstants.AUTHORIZATION]: "Basic " + this.getAPIToken()
        }
        
        var response = await this.apiClient.request.get(url, { "headers": headers});
        response = JSON.parse(response.response)
        
        return response['requester'];
    }

    async registerWebhook(webhookUrl, entity) {
        if (entity !== 'requester'){
            throw "Entity not supported for webhook create"
        }

        var url = this.getDomain() + '/webhooks/subscription.json'

        var payload = {
            "url": webhookUrl,
            "name": "IPaaS event hook",
            "description": "IPaaS event hook",
            "event_data": [{"name": "user_action" ,"value": "create"}, {"name": "user_action" ,"value": "update"}]
        }

        var reqData = {
            "headers": {
                [httpConstants.CONTENT_TYPE]: httpConstants.APPLICATION_JSON,
                [httpConstants.AUTHORIZATION]: "Basic " + this.getAPIToken()
            },
            "body": JSON.stringify(payload)
          };

        var response = await this.apiClient.request.post(url, reqData);
        response = JSON.parse(response.response)
        
        return response;
    }

    async deleteWebhook(webhookId) {
        if (entity !== 'requester'){
            throw "Entity not supported for webhook create"
        }

        var url = this.getDomain() + `/webhooks/subscription/${webhookId}.json`

        var reqData = {
            "headers": {
                [httpConstants.CONTENT_TYPE]: httpConstants.APPLICATION_JSON,
                [httpConstants.AUTHORIZATION]: "Basic " + this.getAPIToken()
            }
        };

        var response = await this.apiClient.request.delete(url, reqData);
        response = JSON.parse(response.response)
        
        return response;
    }
}

module.exports = {
    RequesterSchemaConverter: RequesterSchemaConverter
};
