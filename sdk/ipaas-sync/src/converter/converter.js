// Constants
const constants = require('../constants');

var mailChimpConverter = require('./mailchimp/schema/memberSchemaConverter');

var freshsalesLeadConverter = require('./freshsales/schema/leadSchemaConverter');
var freshsalesContactConverter = require('./freshsales/schema/contactSchemaConverter');
var freshsalesAccountConverter = require('./freshsales/schema/accountSchemaConverter');

var hubspotConverter = require('./hubspot/schema/contactSchemaConverter');

var freshdeskContactConverter = require('./freshdesk/schema/contactSchemaConverter');
var freshdeskCompanyConverter = require('./freshdesk/schema/companySchemaConverter');

var freshteamEmployeeConverter = require('./freshteam/schema/employeeSchemaConverter');
var freshteamJobPostingConverter = require('./freshteam/schema/jobPostingConverter');

var freshserviceConverter = require('./freshservice/schema/requesterSchemaConverter');

var salesforceContactConverter = require('./salesforce/schema/contactSchemaService');

var salesforceAccountConverter = require('./salesforce/schema/accountSchemaService');

class Converter {

    constructor(connector, entity, domain, authToken, clientId, clientSecret, refreshToken) {
        this.connector = connector;
        this.entity = entity;
        this.domain = domain;
        this.authToken = authToken;
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.refreshToken = refreshToken;
    }

    getConverter() {
        switch(this.connector) {
            case constants.FRESHDESK:
                switch(this.entity) {
                    case "fd_contact":
                        return new freshdeskContactConverter.ContactSchemaConverter(this.authToken, this.domain);
                    case "fd_company":
                        return new freshdeskCompanyConverter.CompanySchemaConverter(this.authToken, this.domain);
                }
                break;
            case constants.FRESHSALES:
                switch(this.entity) {
                    case "fs_contact":
                        return new freshsalesContactConverter.ContactSchemaConverter(this.authToken, this.domain);
                    case "fs_lead":
                        return new freshsalesLeadConverter.LeadSchemaConverter(this.authToken, this.domain);
                    case "fs_sales_account":
                        return new freshsalesAccountConverter.AccountSchemaConverter(this.authToken, this.domain);
                }
                break;
            case constants.MAILCHIMP:
                switch(this.entity) {
                    case "mc_member":
                    return new mailChimpConverter.MemberSchemaConverter(this.authToken, this.domain);
                }
                break;
            case constants.HUBSPOT:
                switch(this.entity) {
                    case "hs_contact":
                    return new hubspotConverter.ContactSchemaConverter(this.clientId, this.clientSecret, this.refreshToken, this.authToken, this.domain);
                }
                break;
            case constants.FRESHTEAM:
                switch(this.entity) {
                    case "ft_employee": 
                        return new freshteamEmployeeConverter.EmployeeSchemaConverter(this.authToken, this.domain);
                    case "ft_job_posting":
                        return new freshteamJobPostingConverter.JobPostingSchemaConverter(this.authToken, this.domain);
                }
                break;
            case constants.FRESHSERVICE:
                switch(this.entity) {
                    case "fsr_requester": 
                        return new freshserviceConverter.RequesterSchemaConverter(this.authToken, this.domain);
                }
                break;
            case constants.SALESFORCE:
                switch(this.entity) {
                    case "sf_contact":
                        return new salesforceContactConverter.ContactSchemaConverter(this.clientId, this.clientSecret, this.refreshToken, this.authToken, this.domain);
                    case "sf_account":
                        return new salesforceAccountConverter.AccountSchemaConverter(this.clientId, this.clientSecret, this.refreshToken, this.authToken, this.domain);
                }
                break;
        }
        return null;
    }

}

function getInstance(connector, entity, domain, authToken, clientId=null, clientSecret=null, refreshToken=null) {
    var converter = new Converter(connector, entity, domain, authToken, clientId, clientSecret, refreshToken);
    return converter.getConverter();
}

module.exports = {
    getInstance
}

