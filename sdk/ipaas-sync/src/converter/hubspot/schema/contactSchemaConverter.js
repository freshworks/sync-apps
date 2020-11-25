var platformConstants = require("../../platformConstants.js");
var httpConstants = require('../../http-constants');
var ApiClient = require("../../../ApiClient");

// ContactSchemaConverter used to convert HubSpot contact schema to IPaaS platform schema
class ContactSchemaConverter {

    constructor(clientId, clientSecret, refreshToken, authToken, domain) {
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.refreshToken = refreshToken;
        this.authToken = authToken;
        this.domain = domain;
        this.apiClient = ApiClient.instance;
    }

    getDomain(){
        return this.domain;
    }

    getAuthToken() {
        var contactSchemaConverter = this;
        return new Promise(function (resolve, reject) {
            contactSchemaConverter.healthCheck().then(
                function(){
                    resolve(contactSchemaConverter.authToken);
                }, 
                function(){
                    contactSchemaConverter.getTokenByRefresh().then(
                        function (token) {
                            contactSchemaConverter.authToken = token;
                            resolve(contactSchemaConverter.authToken);
                        }, 
                        function (error) {
                            reject(error);
                        }
                    );
                }
            );
        });
    }

    healthCheck(){
        var contactSchemaConverter = this;
        return new Promise(function (resolve, reject) {
            contactSchemaConverter.getContactFields().then(
                function(response) {
                    console.log("Health check is done. Access token have not expired");
                    resolve(response);
                },
                function(error) {
                    console.log('Health check is failed. Access token might have expired.')
                    reject(error);
                }
            );
        });
    }

    getTokenByRefresh() {        
        var contactSchemaConverter = this;
        var refresh_url = 'https://api.hubapi.com/oauth/v1/token?grant_type=refresh_token' + 
            '&refresh_token=' + contactSchemaConverter.refreshToken + 
            '&client_id=' + contactSchemaConverter.clientId + 
            '&client_secret=' + contactSchemaConverter.clientSecret;
        var headers = {
            [httpConstants.CONTENT_TYPE]: "application/x-www-form-urlencoded"
        }
        console.log('Fetching the access token using refresh token.');
        return new Promise(function (resolve, reject) {
            contactSchemaConverter.apiClient.request.post(refresh_url, {"headers": headers}).then(
                function (response) {
                    console.log("Access token fetch successful.");
                    resolve(JSON.parse(response.response).access_token);
                }, 
                function (error) {
                    var errorData = {
                        'error': error,
                        'url': refresh_url
                    };
                    reject(errorData);
                }
            );
        });
    } 

    // Retrives all fields of HubSpot contact using fields API
    getContactFields() {
        var contactSchemaConverter = this;
        return new Promise(function(resolve, reject) {
            var url = String(contactSchemaConverter.domain + '/properties/v1/contacts/properties');
            var headers = {
                [httpConstants.CONTENT_TYPE]: httpConstants.APPLICATION_JSON,
                [httpConstants.AUTHORIZATION]: 'Bearer ' + contactSchemaConverter.authToken
            }
            contactSchemaConverter.apiClient.request.get(url, { "headers": headers} ).then(
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
    
    // Converts contact fields API response schema to IPaaS platform schema
    convertSchema() {
        var contactSchemaConverter = this;
        return new Promise(function(resolve, reject) {
            var platformSchema = {
                [platformConstants.PROPERTIES]: []
            };

            contactSchemaConverter.getContactFields().then(function(contactFields) {
                var supportedContactFields = contactFields.filter(contactSchemaConverter.isFieldSupported);
                supportedContactFields.forEach(element => {
                    var platformField = {
                        [platformConstants.LABEL]: element.label,
                        [platformConstants.NAME]: element.name,
                        [platformConstants.TYPE]: contactSchemaConverter.getPlatformDataType(element.type)
                    };
                    platformSchema[platformConstants.PROPERTIES].push(platformField);
                });
                resolve(platformSchema);
            }).catch(function(error) {
                reject(error);
            });
        });
    }

    // Retrives the IPaaS platform supported data type
    getPlatformDataType(dataType) {
        switch(dataType) {
            case platformConstants.NUMBER:
                return platformConstants.NUMBER;
            case "bool":
                return platformConstants.BOOLEAN;
            case platformConstants.STRING:
            case "date":
            case "datetime":
            case "enumeration":
            case "phone_number":
                return platformConstants.STRING;
            default:
                throw new Error("Unsupported data type " + dataType + " found");
        }
    }

    // Used to filter unsupported HubSpot contact fields
    isFieldSupported(field) {

        /*
        These fields are unsupported due to the following reasons:
            1. Field cannot be subscribed for webhook events
            2. It is not visible under user view and documentation
        */
        var unsupportedFields = [
            "days_to_close",
            "first_conversion_date",
            "first_conversion_event_name",
            "hs_additional_emails",
            "hs_all_contact_vids",
            "hs_avatar_filemanager_key",
            "hs_calculated_form_submissions",
            "hs_calculated_merged_vids",
            "hs_calculated_mobile_number",
            "hs_calculated_phone_number",
            "hs_calculated_phone_number_area_code",
            "hs_calculated_phone_number_country_code",
            "hs_calculated_phone_number_region_code",
            "hs_conversations_visitor_email",
            "hs_created_by_conversations",
            "hs_created_by_user_id",
            "hs_document_last_revisited",
            "hs_facebook_ad_clicked",
            "hs_first_engagement_date",
            "hs_google_click_id",
            "hs_is_contact",
            "hs_last_sales_activity_date",
            "hs_merged_object_ids",
            "hs_searchable_calculated_international_mobile_number",
            "hs_searchable_calculated_international_phone_number",
            "hs_searchable_calculated_mobile_number",
            "hs_time_to_first_engagement",
            "hs_updated_by_user_id",
            "ip_latlon",
            "ip_zipcode",
            "num_conversion_events",
            "num_unique_conversion_events",
            "recent_conversion_date",
            "recent_conversion_event_name",
            "hs_latest_meeting_activity",
            "surveymonkeyeventlastupdated",
            "webinareventlastupdated",
            "hs_all_owner_ids",
            "hs_all_team_ids",
            "hs_all_accessible_team_ids",
            "hs_email_is_ineligible",
            "associatedcompanyid",
            "associatedcompanylastupdated"
        ];
        return !unsupportedFields.includes(field.name);
    }
}

module.exports = {
    ContactSchemaConverter: ContactSchemaConverter
};
