var platformConstants = require('../../platformConstants');
var httpConstants = require('../../http-constants');
var freshdesk = require('../freshdeskService')
var ApiClient = require("../../../ApiClient");
//key as freshdesk schema field type and value as platform schema field type 
const MAP_FIELD_TYPE = {"default_name" : platformConstants.STRING, "default_description" : platformConstants.STRING, "default_note" : platformConstants.STRING, "default_health_score" : platformConstants.STRING,
                        "default_account_tier" : platformConstants.STRING, "default_renewal_date" : platformConstants.STRING, "default_industry" : platformConstants.STRING, "custom_text": platformConstants.STRING,
                        "custom_phone_number": platformConstants.STRING, "custom_dropdown": platformConstants.STRING, "custom_number": platformConstants.NUMBER, "custom_checkbox": platformConstants.BOOLEAN,
                        "custom_paragraph": platformConstants.STRING, "custom_url": platformConstants.STRING, "custom_date": platformConstants.STRING};

//CompanySchemaConverter class is used to convert Freshdesk company schema to IPaaS platform schema
class CompanySchemaConverter extends freshdesk.FreshdeskConverter{

    constructor(authToken, domain) {
        super(authToken, domain);
        this.apiClient = ApiClient.instance;
    }

    //retrieves the company fields of Freshdesk using fields API call
    getCompanyFields() {
        var companySchemaConverterObject = this;
        return new Promise(function(resolve, reject) {
            var url = String(companySchemaConverterObject.getDomain() + "/api/v2/company_fields");
            var headers = {
                [httpConstants.CONTENT_TYPE]: httpConstants.APPLICATION_JSON,
                [httpConstants.AUTHORIZATION]: companySchemaConverterObject.getApiToken()
            }
            companySchemaConverterObject.apiClient.makeApiCall(url, 'GET', headers).then(
                function(companyFieldsResponse) {
                    resolve(JSON.parse(companyFieldsResponse.response));
                },
                function(error) {
                    console.log('Error while fetching company fields', error);
                    reject(error);
                }
            );
        });
    }   

    //Converts company fields of Freshdesk API response schema to IPaaS platform schema
    convertSchema() {
        var companySchemaConverterObject = this;
        
        //this field is mandatory field which is not a part of API
        var platformSchema = {
                [platformConstants.PROPERTIES] : [{
                    [platformConstants.LABEL] : "Id", 
                    [platformConstants.NAME] : "id", 
                    [platformConstants.TYPE] : platformConstants.INTEGER,
                    [platformConstants.REQUIRED]: false
                }]
            };
        var customFields = {
            [platformConstants.LABEL] : "Custom Fields", 
            [platformConstants.NAME] : "custom_fields", 
            [platformConstants.TYPE] : platformConstants.OBJECT, 
            [platformConstants.PROPERTIES] : []
        };
        return new Promise(function (resolve, reject) {
            companySchemaConverterObject.getCompanyFields().then(function(companyFields)
            {
                companyFields.forEach(element => {
                    
                    if(element.name === "domains" || MAP_FIELD_TYPE[element.type] == null) {// The field domains is not supported because field type array is not supported
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
                    } else {//Converting custom field schema to IPaaS platform schema 
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

    getPage(pageToFetch) {
        var contact = this;
        return new Promise(function(resolve, reject) {
            var url = contact.domain + '/api/v2/companies?per_page=10&page=' + pageToFetch.toString();
            console.log("Going to get data using url: ", url);
            var headers = {[httpConstants.AUTHORIZATION]: contact.getApiToken()}
            contact.apiClient.makeApiCall(url, 'GET', headers).then(
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

    async getObject(field, value) {
        var url = this.domain + "/api/v2/companies/autocomplete?name=" + encodeURI(value.toString());
        console.log("Going to get data using url: ", url);
        var headers = {[httpConstants.AUTHORIZATION]: this.getApiToken()}
        var response = await this.apiClient.makeApiCall(url, 'GET', headers);
        response = JSON.parse(response.response)
        response = response['companies'];
        for (var index in response){
            var company = response[index]
            if (company['name'] === value){
                return company;
            }
        }
        return null;
    }

    async getObjectById(objectId) {
        var url = this.domain + '/api/v2/companies/' + objectId.toString();
        console.log("Going to get data using url: ", url);
        var headers = {[httpConstants.AUTHORIZATION]: this.getApiToken()}
        var response = await this.apiClient.makeApiCall(url, 'GET', headers);
        response = JSON.parse(response.response)
        return response;       
    }
}

module.exports = {
    CompanySchemaConverter: CompanySchemaConverter
};
