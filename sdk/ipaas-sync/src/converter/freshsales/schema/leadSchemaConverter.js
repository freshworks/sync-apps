var platformConstants = require('../../platformConstants');
var httpConstants = require('../../http-constants');
const GROUP_FIELD = "group_field";
var freshsalesService = require("../freshsalesService")
var ApiClient = require("../../../ApiClient");

// LeadSchemaConverter used to convert Freshsales lead schema to IPaaS platform schema
class LeadSchemaConverter extends freshsalesService.FreshsalesConverter {
    
    constructor(authToken, domain) {
        super(authToken, domain, ApiClient.instance);
    }
    
    // Retrives all fields of Freshsales lead using fields API
    getLeadFields() {
        var leadSchemaConverter = this;
        return new Promise(function(resolve, reject) {
            var domain = leadSchemaConverter.getDomain();
            var authToken = leadSchemaConverter.getToken();
            var url = String(domain + '/api/settings/leads/fields');
            var headers = {
                [httpConstants.CONTENT_TYPE]: httpConstants.APPLICATION_JSON,
                [httpConstants.AUTHORIZATION]: authToken
            }
            leadSchemaConverter.apiClient.makeApiCall(url, 'GET', headers).then(
                function(leadFieldsResponse) {
                    var leadFields = JSON.parse(leadFieldsResponse.response);
                    resolve(leadFields.fields);
                },
                function(error) {
                    console.log('Error while fetching lead fields', error);
                    reject(error);
                }
            );
        });
    }
    
    // Converts lead fields API response schema to IPaaS platform schema
    convertSchema() {
        var leadSchemaConverter = this;
        return new Promise(function(resolve, reject) {

            // Id and email fields are added mandatorily that are not part of the lead fields API
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
                    }
                ]
            };

            // Added company field which is of object type which comes under view lead API
            var company = {
                [platformConstants.LABEL]: "Company",
                [platformConstants.NAME]: "company",
                [platformConstants.TYPE]: platformConstants.OBJECT,
                [platformConstants.PROPERTIES]: []
            };

            // Added deal field which is of object type which comes under view lead API
            var deal = {
                [platformConstants.LABEL]: "Deal",
                [platformConstants.NAME]: "deal",
                [platformConstants.TYPE]: platformConstants.OBJECT,
                [platformConstants.PROPERTIES]: []
            };

            // Added custom field which is of object type which comes under view lead API
            var customFields = {
                [platformConstants.LABEL]: "Custom Field",
                [platformConstants.NAME]: "custom_field",
                [platformConstants.TYPE]: platformConstants.OBJECT,
                [platformConstants.PROPERTIES]: []
            };

            leadSchemaConverter.getLeadFields().then(function(leadFields) {
                leadFields.forEach(element => {
                    if(element.type != GROUP_FIELD) {
                        var platformField = {
                            [platformConstants.LABEL]: element.label,
                            [platformConstants.NAME]: element.name,
                            [platformConstants.TYPE]: leadSchemaConverter.getPlatformDataType(element.type),
                            [platformConstants.REQUIRED]: element.required
                        };
                        if(element.default) {
                            switch(element.base_model) {
                                case "LeadCompany":
                                    company.properties.push(platformField);
                                    break;
                                case "LeadDeal":
                                    deal.properties.push(platformField);
                                    break;
                                case "Lead":
                                    platformSchema.properties.push(platformField);
                                    break;
                                default:
                                    throw new Error("Unsupported base model " + element.base_model + " found");
                            }
                        }
                        else {
                            customFields.properties.push(platformField);
                        }
                    }
                });
                if(company.properties.length > 0) {
                    platformSchema.properties.push(company);
                }
                if(deal.properties.length > 0) {
                    platformSchema.properties.push(deal);
                }
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
        var url = this.domain + `/api/lookup?q=${encodeURI(value)}&f=${encodeURI(field)}&entities=lead`;
        console.log("Going to get data using url: ", url);
       
        var headers = {
            [httpConstants.CONTENT_TYPE]: httpConstants.APPLICATION_JSON,
            [httpConstants.AUTHORIZATION]: this.getToken()
        }
        var response = await this.apiClient.makeApiCall(url, 'GET', headers);
        response = JSON.parse(response.response)
        if (response['leads'] == null || response['leads']['leads'].length == 0){
            return null;
        }
        return response['leads']['leads'][0];
    }

    async getObjectById(objectId) {
        var url = this.domain + `/api/leads/${objectId}`;
        console.log("Going to get data using url: ", url);
       
        var headers = {
            [httpConstants.CONTENT_TYPE]: httpConstants.APPLICATION_JSON,
            [httpConstants.AUTHORIZATION]: this.getToken()
        }
        var response = await this.apiClient.makeApiCall(url, 'GET', headers);
        response = JSON.parse(response.response)
        if (response['lead'] == null){
            return null;
        }
        return response['lead'];
    }

    async getPage(viewId, pageToFetch) {
        return await super.getPage('lead', viewId, pageToFetch);
    }

    async getViewId() {
        return await super.getViewId('lead');
    }
}

module.exports = {
    LeadSchemaConverter: LeadSchemaConverter
}
