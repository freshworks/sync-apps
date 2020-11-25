var platformConstants = require("../platformConstants");
var httpConstants = require('../http-constants');

class FreshteamConverter {

    constructor(authToken, domain) {
        this.authToken = authToken;
        this.domain = domain;
    }

    getAPIToken() {
        return this.authToken;
    }

    getDomainName(){
        return this.domain;
    }

    constructField(label, name, type){
        var platformField = {
            [platformConstants.LABEL] : label,
            [platformConstants.NAME] : name,
            [platformConstants.TYPE] : type
        }
        return platformField;
    }

    async getEmployeeRoleId() {
        var url = this.getDomainName() + `/api/roles`;
        var headers = {
            [httpConstants.CONTENT_TYPE]: httpConstants.APPLICATION_JSON,
            [httpConstants.AUTHORIZATION]: "Bearer " + this.getAPIToken()
        }
        var response = await this.apiClient.request.get(url, { "headers": headers});
        response = JSON.parse(response.response)
        
        for (var i in response){
            var role = response[i];
            if (role.name === 'Employee') {
                return role.id;
            }
        }
        return null;
    }

    getPlatformDataType(dataType) {
        switch(dataType) {
            case "checkbox": 
                return platformConstants.BOOLEAN;
            case "address":
            case "object":
                return platformConstants.OBJECT;
            case platformConstants.NUMBER:
            case "attachment":
                return platformConstants.NUMBER;
            case "text":
            case "dropdown":
            case "email":
            case "phone_number":
            case "paragraph":
            case "date_time":
            case "url_set":
            case "url":
            case "field_group":
            case "radio":
            case "standard_email":
            case "standard_dropdown":
            case "time":
            case "avatar":
            case platformConstants.LABEL:
                return platformConstants.STRING;
            default:
                console.log("Unsupported data type " + dataType + " found");
                return null;
        }
    }
}

module.exports = {
    FreshteamConverter: FreshteamConverter
}
