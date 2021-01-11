var platformConstants = require('../platformConstants');
var httpConstants = require('../http-constants')

class FreshsalesConverter {

    constructor(authToken, domain, apiClient) {
        this.authToken = authToken;
        this.domain = domain;
        this.apiClient = apiClient;
    }

    getAuthToken() {
        return this.authToken;
    }
    
    getToken () {
        return 'Token token=' + this.authToken; 
    }
    
    getDomain() {
        return this.domain;
    }

    // Retrives the IPaaS platform supported data type
    getPlatformDataType(dataType) {
        switch(dataType) {
            case platformConstants.NUMBER:
                return platformConstants.NUMBER;
            case "checkbox":
                return platformConstants.BOOLEAN;
            case "text":
            case "dropdown":
            case "date":
            case "multi_select_dropdown":
            case "textarea":
            case "auto_complete":
            case "radio":
                return platformConstants.STRING;
            default:
                throw new Error("Unsupported data type " + dataType + " found");
        }
    }

    async getPage(entity, viewId, pageToFetch) {
        try{
            var url = this.domain + '/api/';
            if (entity === 'lead') {
                url += 'leads/view/' + viewId
            } else {
                url += 'contacts/view/' + viewId
            }

            url += '?sort=updated_at&sort_type=asc&per_page=10&page=' + pageToFetch.toString()
            console.log("Going to get data using url: ", url);
            var headers = { [httpConstants.AUTHORIZATION]: this.authToken};

            var freshsalesResponse = await this.apiClient.makeApiCall(url, 'GET', headers);
            console.log('Fetched the next page successfully');
            freshsalesResponse = JSON.parse(freshsalesResponse.response)
            if (entity === 'lead') {
                return response['leads'];
            } else {
                return response['contacts']
            }
        } catch(e) {
            console.log('Error while fetching the next page data', e)
        }
        return null;
    }

    async getViewId(entity) {
        switch(entity){
            case 'lead': 
            var url = this.domain + '/api/leads/filters';
            var headers = {[httpConstants.AUTHORIZATION]: this.authToken};
            var leadFilterResponse = await this.apiClient.makeApiCall(url, 'GET', headers);
            leadFilterResponse = JSON.parse(leadFilterResponse.response)['filters'];
            for (var index in leadFilterResponse){
                console.log(leadFilterResponse[index]['name'])
                if (leadFilterResponse[index]['name'] === 'All Leads'){
                    return leadFilterResponse[index]['id'];
                }
            }
            break;
            case 'contact':
            var url = this.domain + '/api/contacts/filters';
            var headers = {[httpConstants.AUTHORIZATION]: this.authToken};
            var contactFilterResponse = await this.apiClient.makeApiCall(url, 'GET', headers);
            contactFilterResponse = JSON.parse(contactFilterResponse.response)['filters'];
            for (var index in contactFilterResponse){
                console.log(contactFilterResponse[index]['name'])
                if (contactFilterResponse[index]['name'] === 'All Contacts'){
                    return contactFilterResponse[index]['id'];
                }
            }
            break;

        }
    }

    preprocessFreshsalesEventPayload(payload) {
        var source_payload = {}
    
        for(var key in payload){
            if (payload[key] != null) {
                source_payload[key] = payload[key].value;
            }
        }
    
        source_payload['id'] = payload.id
        var custom_fields = payload["custom_fields"]
    
        console.log('custom fields', JSON.stringify(custom_fields))
        var parsed_custom_fields = {}
        if (custom_fields != null){
            for (var index in custom_fields){
                var custom_field = custom_fields[index]
                if (custom_field != null) {
                    parsed_custom_fields[custom_field['name']] = custom_field['value'];
                }
            }
            //since in the API the object is custom_field only
            source_payload['custom_field'] = parsed_custom_fields
        }
    
        if (source_payload.emails != null && source_payload.emails.length > 0 ) {
            for( var index in source_payload.emails) {
                var email_data = source_payload.emails[index]
                if (email_data.is_primary) {
                    source_payload.email = email_data.email
                    break;
                }
            }
        } else {
            source_payload.email = null
        }
        console.log('Source payload', source_payload)
        return source_payload;
    }
}

module.exports = {
    FreshsalesConverter: FreshsalesConverter
}
