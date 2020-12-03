var platformConstants = require("../../platformConstants.js");
var httpConstants = require('../../http-constants');
var ApiClient = require("../../../ApiClient");
var freshteam = require("../freshteamService")

// EmployeeSchemaConverter used to convert Freshteam Employee schema to IPaaS platform schema
class EmployeeSchemaConverter extends freshteam.FreshteamConverter {

    constructor(authToken, domain) {
        super(authToken, domain);
        this.apiClient = ApiClient.instance;
    }

    //Retrives all Employee fields of Freshteam account using fields API
    getEmployeeFields() {
        var employeeSchemaConverterObject = this;
        return new Promise(function(resolve, reject){

            var url = String(employeeSchemaConverterObject.getDomainName() + "/api/employee_fields");
            var headers = {
                [httpConstants.CONTENT_TYPE]: httpConstants.APPLICATION_JSON,
                [httpConstants.AUTHORIZATION]: "Bearer " + employeeSchemaConverterObject.getAPIToken()
            }
            employeeSchemaConverterObject.apiClient.request.get(url, { "headers": headers}).then(
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

    async getObject(field, value) {
        var url = this.getDomainName() + `/api/employees?${field}=${encodeURI(value)}`;
        var headers = {
            [httpConstants.CONTENT_TYPE]: httpConstants.APPLICATION_JSON,
            [httpConstants.AUTHORIZATION]: "Bearer " + this.getAPIToken()
        }
        var response = await this.apiClient.request.get(url, { "headers": headers});
        response = JSON.parse(response.response)
        if (response.length == 0){
            return null;
        }
        return response[0];
    }

    async getObjectById(value) {
        var url = this.getDomainName() + `/api/employees/${value}`;
        var headers = {
            [httpConstants.CONTENT_TYPE]: httpConstants.APPLICATION_JSON,
            [httpConstants.AUTHORIZATION]: "Bearer " + this.getAPIToken()
        }
        var response = await this.apiClient.request.get(url, { "headers": headers});
        response = JSON.parse(response.response)
        return response;
    }

    //Converts Freshteam employee fields schema to IPaaS platform schema
    convertSchema() {
        var employeeSchemaConverterObject = this;
        return new Promise(function(resolve, reject){
            employeeSchemaConverterObject.getEmployeeFields().then(function(employeeFields){
                var platformSchema = {
                    [platformConstants.PROPERTIES]: [
                        {
                            [platformConstants.TYPE]: platformConstants.OBJECT,
                            [platformConstants.NAME]: 'role_ids',
                            [platformConstants.LABEL]: 'Roles'
                        }
                    ]
                };
                platformSchema[platformConstants.PROPERTIES].push(employeeSchemaConverterObject.constructField("Id", "id", platformConstants.NUMBER));
                var customFields = employeeSchemaConverterObject.constructField("Custom Fields", "custom_fields", platformConstants.OBJECT);
                customFields[platformConstants.PROPERTIES] = [];
                
                var supportedEmployeeFields = employeeFields.filter(employeeSchemaConverterObject.isFieldSupported);
                supportedEmployeeFields.forEach(element => {
                    var platformType = employeeSchemaConverterObject.getPlatformDataType(element.field_type)
                    if (element.name === 'reporting_to_id') {
                        platformType = platformConstants.NUMBER;
                    }
                    if (platformType == null){
                        return;
                    }  
                    var platformField = employeeSchemaConverterObject.constructField(element.label, element.name, platformType);
                    if(platformField[platformConstants.TYPE] === platformConstants.OBJECT){
                        platformField[platformConstants.PROPERTIES] = employeeSchemaConverterObject.getAttributes(element);
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
        var employeeSchemaConverterObject = this;
        switch(field.field_type){
            case "address":
                switch(field.name){
                    case "address": 
                        var address = [];
                        address.push(employeeSchemaConverterObject.constructField("street", "street", platformConstants.STRING));
                        address.push(employeeSchemaConverterObject.constructField("city", "city", platformConstants.STRING));
                        address.push(employeeSchemaConverterObject.constructField("state", "state", platformConstants.STRING));
                        address.push(employeeSchemaConverterObject.constructField("country", "country", platformConstants.STRING));
                        address.push(employeeSchemaConverterObject.constructField("zip_code", "zip_code", platformConstants.STRING));
                        return address;
                    case "communication_address": 
                        var communication_address = [];
                        communication_address.push(employeeSchemaConverterObject.constructField("communication_street", "communication_street", platformConstants.STRING));
                        communication_address.push(employeeSchemaConverterObject.constructField("communication_city", "communication_city", platformConstants.STRING));
                        communication_address.push(employeeSchemaConverterObject.constructField("communication_state", "communication_state", platformConstants.STRING));
                        communication_address.push(employeeSchemaConverterObject.constructField("communication_country", "communication_country", platformConstants.STRING));
                        communication_address.push(employeeSchemaConverterObject.constructField("communication_zip_code", "communication_zip_code", platformConstants.STRING));
                        communication_address.push(employeeSchemaConverterObject.constructField("same_as_residential", "same_as_residential", platformConstants.BOOLEAN)); //same_as_residential attribute is part of the response object only if the attribute value is false.
                        return communication_address;
                }
            default:
                throw new Error("Unsupported data type " + field.field_type + " found");
        }
    }

    isFieldSupported(field){
        var supportedFields = [
            "nick_name",
            "gender",
            "date_of_birth",
            "address",
            "communication_address",
            "personal_email",
            "first_name",
            "middle_name",
            "last_name",
            "employee_id",
            "status",
            "joining_date",
            "department_id",
            "designation",
            "sub_department_id",
            "shift_id",
            "workstation_number",
            "termination_date",
            "branch_id",
            "hr_incharge_id",
            "team_id",
            "reporting_to_id",
            "official_email",
            "employee_type",
            "blood_group",
            "marital_status",
            "business_unit_id",
            "level_id",
            "cost_center_id",
            "id_card_details",
            "probation_start_date",
            "probation_end_date",
            "eeo_ethnicity",
            "eeo_job_category",
            "notice_period",
            "notice_start_date",
            "notice_end_date",
            "termination_category_id",
            "termination_reason"
        ];
        if(field.default)
            return supportedFields.includes(field.name)
        else
            return true
    }
}

module.exports = {
    EmployeeSchemaConverter: EmployeeSchemaConverter
};
