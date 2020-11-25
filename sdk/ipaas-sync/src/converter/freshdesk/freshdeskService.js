var Buffer = require('buffer').Buffer;

class FreshdeskConverter {

    constructor(apiKey, domain) {
        this.apiKey = apiKey;
        this.domain = domain;
    }

    getApiToken() {
        return Buffer.from(this.apiKey+":X").toString('base64');
    }

    getApiKey() {
        return this.apiKey;
    }

    getDomain() {
        return this.domain;
    }
}

module.exports = {
    FreshdeskConverter: FreshdeskConverter
}
