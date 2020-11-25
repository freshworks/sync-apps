var platformConstants = require("../../platformConstants.js");
var httpConstants = require('../../http-constants');
var ApiClient = require("../../../ApiClient");

// MemberSchemaConverter used to convert Mailchimp member schema to IPaaS platform schema
class MemberSchemaConverter {

    constructor(authToken, domain) {
        this.authToken = authToken;
        this.domain = domain;
        this.apiClient = ApiClient.instance;
    }

    getAPIToken() {
        return this.authToken;
    }

    getDomainName(){
        return this.domain;
    }

    //Retrives all merge fields of Mailchimp account using merge_fields API
    getMergeFields(listId) {
        var memberSchemaConverterObject = this;
        return new Promise(function(resolve, reject){
            
            var url = String(memberSchemaConverterObject.getDomainName()+"/3.0/lists/"+listId+"/merge-fields");
            var headers = {
                [httpConstants.CONTENT_TYPE]: httpConstants.APPLICATION_JSON,
                [httpConstants.AUTHORIZATION]: "Bearer " + memberSchemaConverterObject.getAPIToken()
            }
            memberSchemaConverterObject.apiClient.request.get(url, { "headers": headers}).then(
                function(memberFieldsResponse) {
                    memberFieldsResponse = memberFieldsResponse.response;
                    console.log("merge fields response: ", memberFieldsResponse);
                    memberFieldsResponse = JSON.parse(memberFieldsResponse);
                    resolve(memberFieldsResponse['merge_fields']);
                },
                function(error) {
                    console.log('Error while fetching member fields', error);
                    reject(error);
                }
            );
        });
    }

    //Converts member fields schema to IPaaS platform schema
    convertSchema(listId) {
        var memberSchemaConverterObject = this;
        return new Promise(function(resolve, reject){
            if(!listId){
                throw new Error("Resource Not Found");
            }
            var platformSchema = {
                [platformConstants.PROPERTIES]:[
                    {
                        [platformConstants.LABEL]: "Email Address", 
                        [platformConstants.NAME]: "email_address", 
                        [platformConstants.TYPE]: platformConstants.STRING
                    },
                    {
                        [platformConstants.LABEL]: "Status", 
                        [platformConstants.NAME]: "status", 
                        [platformConstants.TYPE]: platformConstants.STRING,
                        [platformConstants.OPTIONS]: [
                            {
                                "name": "subscribed",
                                "value": "subscribed"
                            },
                            {
                                "name": "unsubscribed",
                                "value": "unsubscribed"
                            },
                            {
                                "name": "cleaned",
                                "value": "cleaned"
                            },
                            {
                                "name": "pending",
                                "value": "pending"
                            },
                            {
                                "name": "transactional",
                                "value": "transactional"
                            }
                        ]
                    },
                    {
                        [platformConstants.LABEL]: "Email Type", 
                        [platformConstants.NAME]: "email_type", 
                        [platformConstants.TYPE]: platformConstants.STRING
                    },
                    {
                        [platformConstants.LABEL]: "Opt-in IP", 
                        [platformConstants.NAME]: "ip_opt", 
                        [platformConstants.TYPE]: platformConstants.STRING
                    },
                    {
                        [platformConstants.LABEL]: "Opt-in Timestamp", 
                        [platformConstants.NAME]: "timestamp_opt", 
                        [platformConstants.TYPE]: platformConstants.STRING
                    },
                    {
                        [platformConstants.LABEL]: "Signup IP", 
                        [platformConstants.NAME]: "ip_signup", 
                        [platformConstants.TYPE]: platformConstants.STRING
                    },
                    {
                        [platformConstants.LABEL]: "Signup Timestamp", 
                        [platformConstants.NAME]: "timestamp_signup", 
                        [platformConstants.TYPE]: platformConstants.STRING
                    },
                    {
                        [platformConstants.LABEL]: "VIP", 
                        [platformConstants.NAME]: "vip", 
                        [platformConstants.TYPE]: platformConstants.BOOLEAN
                    },
                    {
                        [platformConstants.LABEL]: "Member Rating", 
                        [platformConstants.NAME]: "member_rating", 
                        [platformConstants.TYPE]: platformConstants.NUMBER
                    },
                    {
                        [platformConstants.LABEL]: "Last Changed Date", 
                        [platformConstants.NAME]: "last_changed", 
                        [platformConstants.TYPE]: platformConstants.STRING
                    },
                    {
                        [platformConstants.LABEL]: "Language", 
                        [platformConstants.NAME]: "language", 
                        [platformConstants.TYPE]: platformConstants.STRING
                    },
                    {
                        [platformConstants.LABEL]: "Email Client", 
                        [platformConstants.NAME]: "email_client", 
                        [platformConstants.TYPE]: platformConstants.STRING
                    },
                    {
                        [platformConstants.LABEL]: "Location",
                        [platformConstants.NAME]: "location",
                        [platformConstants.TYPE]: platformConstants.OBJECT,
                        [platformConstants.PROPERTIES]: [
                            {
                                [platformConstants.LABEL]: "Latitude", 
                                [platformConstants.NAME]: "latitude", 
                                [platformConstants.TYPE]: platformConstants.NUMBER
                            },
                            {
                                [platformConstants.LABEL]: "Longitude", 
                                [platformConstants.NAME]: "longitude", 
                                [platformConstants.TYPE]: platformConstants.NUMBER
                            },
                            {
                                [platformConstants.LABEL]: "GMT Offset", 
                                [platformConstants.NAME]: "gmtoff", 
                                [platformConstants.TYPE]: platformConstants.NUMBER
                            },
                            {
                                [platformConstants.LABEL]: "GMT Offset", 
                                [platformConstants.NAME]: "gmtoff", 
                                [platformConstants.TYPE]: platformConstants.NUMBER
                            },
                            {
                                [platformConstants.LABEL]: "DST Offset", 
                                [platformConstants.NAME]: "dstoff", 
                                [platformConstants.TYPE]: platformConstants.NUMBER
                            },
                            {
                                [platformConstants.LABEL]: "Country Code", 
                                [platformConstants.NAME]: "country_code", 
                                [platformConstants.TYPE]: platformConstants.STRING
                            },
                            {
                                [platformConstants.LABEL]: "Timezone", 
                                [platformConstants.NAME]: "timezone", 
                                [platformConstants.TYPE]: platformConstants.STRING
                            }
                        ]
                    },
                    {
                        [platformConstants.LABEL]: "Subscriber Source", 
                        [platformConstants.NAME]: "source", 
                        [platformConstants.TYPE]: platformConstants.STRING
                    },
                    {
                        [platformConstants.LABEL]: "Tags Count", 
                        [platformConstants.NAME]: "tags_count", 
                        [platformConstants.TYPE]: platformConstants.NUMBER
                    },
                    {
                        [platformConstants.LABEL]: "Tags", 
                        [platformConstants.NAME]: "tags", 
                        [platformConstants.TYPE]: platformConstants.OBJECT,
                        [platformConstants.PROPERTIES]: [
                            {
                                [platformConstants.LABEL]: "Tag ID", 
                                [platformConstants.NAME]: "id", 
                                [platformConstants.TYPE]: platformConstants.NUMBER
                            },
                            {
                                [platformConstants.LABEL]: "Tag Name", 
                                [platformConstants.NAME]: "name", 
                                [platformConstants.TYPE]: platformConstants.STRING
                            }
                        ]
                    }
                ]
            };
            var addressField = [
                {
                    [platformConstants.LABEL]: "addr1", 
                    [platformConstants.NAME]: "addr1", 
                    [platformConstants.TYPE]: platformConstants.STRING
                },
                {
                    [platformConstants.LABEL]: "addr2", 
                    [platformConstants.NAME]: "addr2", 
                    [platformConstants.TYPE]: platformConstants.STRING
                },
                {
                    [platformConstants.LABEL]: "city", 
                    [platformConstants.NAME]: "city", 
                    [platformConstants.TYPE]: platformConstants.STRING
                },
                {
                    [platformConstants.LABEL]: "state", 
                    [platformConstants.NAME]: "state", 
                    [platformConstants.TYPE]: platformConstants.STRING
                },
                {
                    [platformConstants.LABEL]: "zip", 
                    [platformConstants.NAME]: "zip", 
                    [platformConstants.TYPE]: platformConstants.STRING
                },
                {
                    [platformConstants.LABEL]: "country", 
                    [platformConstants.NAME]: "country", 
                    [platformConstants.TYPE]: platformConstants.STRING
                }
            ];
            var convertedMergeFields = []
            memberSchemaConverterObject.getMergeFields(listId).then(function(mergeFields){
                mergeFields.forEach(element => {
                    var platformField = {
                        [platformConstants.LABEL]: element.name,
                        [platformConstants.NAME]: element.tag,
                        [platformConstants.TYPE]: memberSchemaConverterObject.getPlatformDataType(element.type)
                    }
                    if(element.type === "address"){ 
                        platformField[platformConstants.PROPERTIES] = addressField;
                    }
                    convertedMergeFields.push(platformField);
                });
                
                if (convertedMergeFields.length > 0) {
                    var mergeField = {
                        [platformConstants.LABEL]: 'MERGE FIELDS',
                        [platformConstants.NAME]: 'merge_fields',
                        [platformConstants.TYPE]: platformConstants.OBJECT,
                        [platformConstants.PROPERTIES] : convertedMergeFields
                    }
                    
                    platformSchema.properties.push(mergeField);
                }
                resolve(platformSchema);
            }).catch(function(error){
                reject(error);
            });
        });
    }

    getPlatformDataType(dataType) {
        switch(dataType) {
            case "address":
                return platformConstants.OBJECT;
            case platformConstants.NUMBER:
                return platformConstants.NUMBER;
            case "text":
            case "birthday":
            case "phone":
            case "imageurl":
            case "url":
            case "date":
            case "radio":
            case "dropdown":
                return platformConstants.STRING;
            default:
                throw new Error("Unsupported data type " + dataType + " found");
        }
    }

    async registerWebhook(listId, callbackUrl){
        try {
            var url = this.domain + '/3.0/lists/' + listId + '/webhooks'
            var payload = {
                'url': callbackUrl,
                'events': {
                    'subscribe': true,  
                    'unsubscribe': true, 
                    'profile': true, 
                },
                'sources': {
                    'user': true,
                    'admin': true,
                    'api': true
                }
            }
            var options = {
                "headers": { [httpConstants.AUTHORIZATION]: 'Bearer ' + this.authToken, [httpConstants.CONTENT_TYPE]: 'application/json'},
                "body": JSON.stringify(payload)
            }
            var webhookCreateResponse = await this.apiClient.request.post(url, options);
            console.log('Webhook created successfully', webhookCreateResponse.response);
            var resp = JSON.parse(webhookCreateResponse.response)
            return resp;
        } catch(e) {
            console.log('Error while creating the webhook', e);
            throw e;
        }
    }

    async deleteWebhook(listId, webhookId){
        try {
            var url = this.domain + '/3.0/lists/' + listId + '/webhooks/' +  webhookId;
            
            var options = {
                "headers": { [httpConstants.AUTHORIZATION]: 'Bearer ' + this.authToken, [httpConstants.CONTENT_TYPE]: 'application/json'},
            }
            var webhookDeleteResponse = await this.apiClient.request.delete(url, options);
            console.log('Webhook deleted successfully', webhookDeleteResponse.response);
            var resp = webhookDeleteResponse.response
            return resp;
        } catch(e) {
            console.log('Error while deleting the webhook', e);
            throw e;
        }
    }

    async getMailchimpLists(){
        try {
            var url = this.domain + '/3.0/lists/'
            console.log("Going to get lists using url: ", url);
            var options = {
                "headers": {[httpConstants.AUTHORIZATION]: 'Bearer ' + this.authToken}
            }
            var lists = await this.apiClient.request.get(url, options)
            lists = JSON.parse(lists.response)
            lists = lists['lists']
            var listMap = {};
            for(var index in lists){
                listMap[lists[index].name] = lists[index].id;
            }
            return listMap;
        } catch(e) {
            console.log('Error while fetching lists', e);
            return null;
        }
            
    }

    async getMember(email){
        try {
            var url = this.domain + '/3.0/search-members?query=' + email;
            var options = {
                "headers": {[httpConstants.AUTHORIZATION]: 'Bearer ' + this.authToken},
            }
            console.log('Going to fetch mailchimp member using url', url)
            var memberData = await this.apiClient.request.get(url, options)
            memberData = memberData.response
            return JSON.parse(memberData)['exact_matches']['members'][0];
        } catch(e) {
            console.log('Error while fetching the mailchimp member', e)
        }
    }

    async getObject(field, value){
        if (field === 'email_address') {
            return await this.getMember(value);
        } else {
            throw 'operation not supported';
        }
    }

    async getPage(listId, pageToFetch) {
        try{
            var offset = (pageToFetch - 1) * 10 
            var url = connector.domain + '/3.0/lists/' + listId + '/members?sort_field=last_changed&sort_dir=ASC&count=10&offset=' + offset.toString()
            console.log("Going to get members using url: ", url);
            var options = {
                "headers": {[httpConstants.AUTHORIZATION]: 'Bearer ' + this.authToken}
            }
            var memberResponse = await this.apiClient.request.get(url, options)
            memberResponse = JSON.parse(memberResponse.response)
            return response['members'];
        } catch(e) {
            console.log('Error while fetching the page data', e)
        }
        
        return null;
    }
}

module.exports = {
    MemberSchemaConverter: MemberSchemaConverter
};
