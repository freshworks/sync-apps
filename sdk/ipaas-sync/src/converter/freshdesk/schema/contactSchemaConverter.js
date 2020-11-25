var platformConstants = require("../../platformConstants");
var httpConstants = require('../../http-constants')
var freshdesk = require('../freshdeskService')
var ApiClient = require("../../../ApiClient");
//key as freshdesk schema field type and value as platform schema field type 
const MAP_FIELD_TYPE = {"default_name" : platformConstants.STRING, "default_email" : platformConstants.STRING, "default_job_title" : platformConstants.STRING, "default_phone" : platformConstants.STRING, 
                    "default_mobile" : platformConstants.STRING, "default_twitter_id" : platformConstants.STRING, "default_address" : platformConstants.STRING, "default_time_zone" : platformConstants.STRING, 
                    "default_language" : platformConstants.STRING, "default_description" : platformConstants.STRING, "default_unique_external_id" : platformConstants.STRING,  "custom_text" : platformConstants.STRING, 
                    "custom_phone_number" : platformConstants.STRING, "custom_dropdown" : platformConstants.STRING, "custom_number" : platformConstants.NUMBER, "custom_checkbox" : platformConstants.BOOLEAN, 
                    "custom_paragraph" : platformConstants.STRING, "custom_url" : platformConstants.STRING, "custom_date" : platformConstants.STRING};

//ContactSchemaConverter class is used to convert Freshdesk contact schema to IPaaS platform schema
class ContactSchemaConverter extends freshdesk.FreshdeskConverter {

    constructor(authToken, domain) {
        super(authToken, domain);
        this.apiClient = ApiClient.instance;
    }

    //retrieves the contact fields of Freshdesk using fields API call
    getContactFields() {
        var contactSchemaConverterObject = this;
        return new Promise(function(resolve, reject) {
            var url = String(contactSchemaConverterObject.getDomain() + "/api/v2/contact_fields");
            var headers = {
                [httpConstants.CONTENT_TYPE]: httpConstants.APPLICATION_JSON,
                [httpConstants.AUTHORIZATION]: contactSchemaConverterObject.getApiToken()
            }
            contactSchemaConverterObject.apiClient.request.get(url, { "headers": headers }).then(
                function(contactFieldsResponse) {
                    resolve(JSON.parse(contactFieldsResponse.response));
                },
                function(error) {
                    console.log('Error while fetching contact fields', error);
                    reject(error);
                }
            );
        });
    }   

    //Converts contact fields of Freshdesk API response schema to IPaaS platform schema
    convertSchema() {
        var contactSchemaConverterObject = this;
        
        //this field is mandatory field which is not a part of API
        var platformSchema = {
                [platformConstants.PROPERTIES] : [{
                    [platformConstants.LABEL] : "Id", 
                    [platformConstants.NAME] : "id", 
                    [platformConstants.TYPE] : platformConstants.NUMBER,
                    [platformConstants.REQUIRED]: false
                },
                {
                    [platformConstants.LABEL] : "Company Id", 
                    [platformConstants.NAME] : "company_id", 
                    [platformConstants.TYPE] : platformConstants.NUMBER
                }]
            };

        //Added customFields which is of object type which comes under view contact API
        var customFields = {
            [platformConstants.LABEL] : "Custom Fields", 
            [platformConstants.NAME] : "custom_fields", 
            [platformConstants.TYPE] : platformConstants.OBJECT, 
            [platformConstants.PROPERTIES] : []
        };

        return new Promise(function (resolve, reject) {
            contactSchemaConverterObject.getContactFields().then(function(contactFields)
            {
                contactFields.forEach(element => {
                    
                    // The company_name field is omitted because the contact payload contains company_id field and not company_name field and field type array is not supported, so the tag_names field also omitted
                    if(element.name === "company_name" || element.name === "tag_names" || MAP_FIELD_TYPE[element.type] == null) { 
                        return;
                    }

                    var platformField = {
                        [platformConstants.LABEL] : element.label,
                        [platformConstants.NAME] : element.name,
                        [platformConstants.TYPE] : MAP_FIELD_TYPE[element.type],
                        [platformConstants.REQUIRED]: element.required_for_agents
                    }
                    if(element.default) {// Converting fixed schema to IPaaS platform schema
                        platformSchema[platformConstants.PROPERTIES].push(platformField);
                    }
                    else{//Converting custom field schema to IPaaS platform schema 
                        customFields[platformConstants.PROPERTIES].push(platformField);
                    }
                });
                if(customFields[platformConstants.PROPERTIES].length > 0) {
                    platformSchema[platformConstants.PROPERTIES].push(customFields);
                }
                resolve(platformSchema);
            }).catch(function (error) {
                reject(error);
            });
        });
    }

    async searchObject(params) {
        var url = this.domain + `/api/v2/search/contacts?query=`;
        var query = '"'
        for (var param of params) {
            if (param.value != null && param.value != undefined) {
                query += `${param.field}:'${encodeURI(param.value)}' AND `
            }
        }
        if (query.length < 5) {
            return null;
        }
        query = query.substring(0, query.lastIndexOf(' AND '))
        query += '"'
        url += query;
        console.log("Going to get data using url: ", url);
        var options = {
            "headers": {[httpConstants.AUTHORIZATION]: this.getApiToken()}
        }
        var response = await this.apiClient.request.get(url, options)
        response = JSON.parse(response.response)
        if (response['results'].length == 0){
            return null;
        }
        return response['results'][0];
    }

    async getObject(field, value) {
        var url = this.domain + `/api/v2/search/contacts?query="${field}:'${encodeURI(value)}'"`;
        console.log("Going to get data using url: ", url);
        var options = {
            "headers": {[httpConstants.AUTHORIZATION]: this.getApiToken()}
        }
        var response = await this.apiClient.request.get(url, options)
        response = JSON.parse(response.response)
        if (response['results'].length == 0){
            return null;
        }
        return response['results'][0];
    }

    async getObjectById(objectId) {
        var url = this.domain + '/api/v2/contacts/' + objectId.toString();
        console.log("Going to get data using url: ", url);
        var options = {
            "headers": {[httpConstants.AUTHORIZATION]: this.getApiToken()}
        }
        var response = await this.apiClient.request.get(url, options)
        response = JSON.parse(response.response)
        return response;
    }

    getPage(pageToFetch) {
        var contact = this;
        return new Promise(function(resolve, reject) {
            var url = contact.domain + '/api/v2/contacts?per_page=10&page=' + pageToFetch.toString();
            console.log("Going to get data using url: ", url);
            var options = {
                "headers": {[httpConstants.AUTHORIZATION]: contact.getApiToken()}
            }
            contact.apiClient.request.get(url, options).then(
                function(contactsResponse){
                    console.log('Fetched the next page successfully');
                    var response = JSON.parse(contactsResponse.response)
                    resolve(response)
                }, 
                function(error) {
                    console.log('Error while fetching the next page', error);
                    reject(error)
                }
            );
        })
    }
}

module.exports = {
    ContactSchemaConverter: ContactSchemaConverter
};
