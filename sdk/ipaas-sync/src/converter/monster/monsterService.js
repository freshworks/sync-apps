"use strict";

var platformConstants = require("../platformConstants");

var httpConstants = require('../http-constants');

var monsterRequestOptions = {
  "headers": {
    [httpConstants.CONTENT_TYPE]: "application/xml"
  }
};

class MonsterConverter {
  constructor(domain, username, password) {
    this.domain = domain;
    this.username = username;
    this.password = password;
  }

  getHeader() {
    return `<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/">
        <SOAP-ENV:Header>
            <MonsterHeader xmlns="http://schemas.monster.com/MonsterHeader">
                <From>
                    <PartyId partyType="organization">237431</PartyId>
                    <Authentication>
                        <SharedSecret>
                            <UserName>${this.username}</UserName>
                            <Password>${this.password}</Password>
                        </SharedSecret>
                    </Authentication>
                </From>
                <To>
                    <PartyId partyType="organization">Monster</PartyId>
                </To>
                <MessageData>
                    <MessageId>90805_090855AM_90805_090855AM</MessageId>
                    <Timestamp>2005-09-08T08:45:34Z</Timestamp>
                </MessageData>
            </MonsterHeader>
        </SOAP-ENV:Header>`;
  }

  getBody(endpoint, params) {
    var xmlBody = '';

    switch (endpoint) {
      case "industries":
        {
          xmlBody += `<SOAP-ENV:Body xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/">
                                    <Query xmlns="http://schemas.monster.com/Monster" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
                                        <Target>MonsterIndustries</Target>
                                    </Query>
                                </SOAP-ENV:Body>
                            </SOAP-ENV:Envelope>`;
          break;
        }

      case "jobCategories":
        {
          xmlBody += `<SOAP-ENV:Body xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/">
                                    <Query xmlns="http://schemas.monster.com/Monster" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
                                        <Target>JobCategoriesByCountry</Target>
                                        <SelectBy>
                                            <Criteria>CountryAbbrev</Criteria>
                                            <Value>US</Value>
                                            <Criteria>CompanyXCode</Criteria>
                                            <Value>xtestx</Value>
                                        </SelectBy>
                                    </Query>
                                </SOAP-ENV:Body>
                            </SOAP-ENV:Envelope>`;
          break;
        }

      case "jobPostingStatus":
        {
          xmlBody += `<SOAP-ENV:Body xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/">
                                    <Query xmlns="http://schemas.monster.com/Monster" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
                                        <Target>Jobs</Target>
                                        <SelectBy>
                                        <Criteria>JobRefCode</Criteria>
                                        <Value>${params.jobReferenceCode}</Value>
                                        <Criteria>RecruiterName</Criteria>
                                        <Value>xrtpjobsx01</Value>
                                    </SelectBy>
                                    </Query>
                                </SOAP-ENV:Body>
                            </SOAP-ENV:Envelope>`;
          break;
        }

      case "deleteJob":
        {
          xmlBody += `<SOAP-ENV:Body>
                                <Monster:Delete xmlns:Monster="http://schemas.monster.com/Monster" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://schemas.monster.com/Monster http://schemas.monster.com/Current/xsd/Monster.xsd">
                                    <Monster:Target>JobPosting</Monster:Target>
                                        <Monster:DeleteBy>
                                            <Monster:Criteria>RecruiterName</Monster:Criteria>
                                            <Monster:Value>xrtpjobsx01</Monster:Value>
                                        </Monster:DeleteBy>
                                        <Monster:DeleteBy>
                                            <Monster:Criteria>RefCode</Monster:Criteria>
                                            <Monster:Value>${params.jobReferenceCode}</Monster:Value>
                                        </Monster:DeleteBy>
                                    </Monster:Delete>
                                </SOAP-ENV:Body>
                            </SOAP-ENV:Envelope>`;
        }
    }

    return xmlBody;
  }

  async getIndustries() {
    monsterRequestOptions.body = this.getHeader() + this.getBody("industries");
    return await this.apiClient.makeApiCall(this.domain, 'POST', monsterRequestOptions.headers, monsterRequestOptions.body);
  }

  async getJobCategories() {
    monsterRequestOptions.body = this.getHeader() + this.getBody("jobCategories");
    return await this.apiClient.makeApiCall(this.domain, 'POST', monsterRequestOptions.headers, monsterRequestOptions.body);
  }

  async getJobPostingStatus(jobReferenceCode) {
    monsterRequestOptions.body = this.getHeader() + this.getBody("jobPostingStatus", {
      jobReferenceCode: jobReferenceCode
    });
    return await this.apiClient.makeApiCall(this.domain, 'POST', monsterRequestOptions.headers, monsterRequestOptions.body);
  }

  async deleteJob(jobReferenceCode) {
    monsterRequestOptions.body = this.getHeader() + this.getBody("deleteJob", {
      jobReferenceCode: jobReferenceCode
    });
    return await this.apiClient.makeApiCall(this.domain, 'POST', monsterRequestOptions.headers, monsterRequestOptions.body);
  }

}

module.exports = {
  MonsterConverter: MonsterConverter
};
