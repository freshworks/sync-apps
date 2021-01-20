var platformConstants = require("../../platformConstants.js");
var httpConstants = require('../../http-constants');
var ApiClient = require("../../../ApiClient");
var freshteam = require("../freshteamService")

// EmployeeSchemaConverter used to convert Freshteam Employee schema to IPaaS platform schema
class JobPostingSchemaConverter extends freshteam.FreshteamConverter {

    constructor(authToken, domain) {
        super(authToken, domain);
        this.apiClient = ApiClient.instance;
    }

    //Retrives all Employee fields of Freshteam account using fields API
    getJobPostingFields() {
        var jobPostingSchemaConverterObject = this;
        return new Promise(function(resolve, reject){

            var url = String(jobPostingSchemaConverterObject.getDomainName() + "/api/job_posting_fields");
            var headers = {
                [httpConstants.CONTENT_TYPE]: httpConstants.APPLICATION_JSON,
                [httpConstants.AUTHORIZATION]: "Bearer " + jobPostingSchemaConverterObject.getAPIToken()
            }
            jobPostingSchemaConverterObject.apiClient.makeApiCall(url, 'GET', headers).then(
                function(employeeFieldsResponse) {
                    resolve(JSON.parse(employeeFieldsResponse.response));
                },
                function(error) {
                    console.log('Error while fetching employee fields', error);
                    reject(error);
                }
            );
        });
    }

    //Converts Freshteam employee fields schema to IPaaS platform schema
    convertSchema() {
        var jobPostingSchemaConverterObject = this;
        return new Promise(function(resolve, reject){
            jobPostingSchemaConverterObject.getJobPostingFields().then(function(jobPostingFields){
                var platformSchema = {
                    [platformConstants.PROPERTIES]: []
                };
                platformSchema[platformConstants.PROPERTIES].push(jobPostingSchemaConverterObject.constructField("Id", "id", platformConstants.NUMBER));
                var customFields = jobPostingSchemaConverterObject.constructField("Custom Fields", "custom_fields", platformConstants.OBJECT);
                customFields[platformConstants.PROPERTIES] = [];
                
                jobPostingFields.forEach(element => {
                    var platformField = jobPostingSchemaConverterObject.constructField(element.label, element.name, jobPostingSchemaConverterObject.getPlatformDataType(element.field_type));
                    if(platformField[platformConstants.TYPE] === platformConstants.OBJECT){
                        platformField[platformConstants.PROPERTIES] = jobPostingSchemaConverterObject.getAttributes(element);
                    }
                    if(element.default){
                        platformSchema[platformConstants.PROPERTIES].push(platformField);
                    }
                    else{
                        customFields[platformConstants.PROPERTIES].push(platformField);
                    }
                });
                if(customFields[platformConstants.PROPERTIES].length > 0){
                    platformSchema[platformConstants.PROPERTIES].push(customFields);
                }
                resolve(platformSchema);
            }).catch(function(error){
                reject(error);
            });
        });
    }

    getAttributes(field){
        var jobPostingSchemaConverterObject = this;
        switch(field.field_type){
            case "object":
                switch(field.name){
                    case "salary": 
                        var salary = [];
                        salary.push(jobPostingSchemaConverterObject.constructField("Minimum", "min", platformConstants.NUMBER));
                        salary.push(jobPostingSchemaConverterObject.constructField("Maximum", "max", platformConstants.NUMBER));
                        salary.push(jobPostingSchemaConverterObject.constructField("Currency", "currency", platformConstants.STRING));
                        return salary;
                    default:
                        throw new Error("Unsupported data type " + field.name + " found");
                }
            default:
                throw new Error("Unsupported data type " + field.field_type + " found");
        }
    }
}

module.exports = {
    JobPostingSchemaConverter: JobPostingSchemaConverter
};
