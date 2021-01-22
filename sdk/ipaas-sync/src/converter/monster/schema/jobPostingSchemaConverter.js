"use strict";

var platformConstants = require("../../platformConstants.js");

var httpConstants = require('../../http-constants');

var ApiClient = require("../../../ApiClient");

var monster = require("../monsterService");

class JobPostingSchemaConverter extends monster.MonsterConverter {
  constructor(domain, username, password) {
    super(domain, username, password);
    this.apiClient = ApiClient.instance;
  }

  convertSchema() {
    var platformSchema = {
      [platformConstants.PROPERTIES]: [{
        "label": "@jobAction",
        "name": "@jobAction",
        "type": "string"
      }, {
        "label": "@jobRefCode",
        "name": "@jobRefCode",
        "type": "string"
      }, {
        "label": "JobInformation",
        "name": "JobInformation",
        "type": "object",
        "properties": [{
          "label": "JobBody",
          "name": "JobBody",
          "type": "string"
        }, {
          "label": "JobTitle",
          "name": "JobTitle",
          "type": "string"
        }, {
          "label": "JobLevel",
          "name": "JobLevel",
          "type": "object",
          "properties": [{
            "label": "@monsterId",
            "name": "@monsterId",
            "type": "string"
          }]
        }, {
          "label": "JobType",
          "name": "JobType",
          "type": "object",
          "properties": [{
            "label": "@monsterId",
            "name": "@monsterId",
            "type": "string"
          }]
        }, {
          "label": "JobStatus",
          "name": "JobStatus",
          "type": "object",
          "properties": [{
            "label": "@monsterId",
            "name": "@monsterId",
            "type": "string"
          }]
        }, {
          "label": "Salary",
          "name": "Salary",
          "type": "object",
          "properties": [{
            "label": "Currency",
            "name": "Currency",
            "type": "object",
            "properties": [{
              "label": "@monsterId",
              "name": "@monsterId",
              "type": "string"
            }]
          }, {
            "label": "SalaryMin",
            "name": "SalaryMin",
            "type": "string"
          }, {
            "label": "SalaryMax",
            "name": "SalaryMax",
            "type": "string"
          }]
        }, {
          "label": "CustomApplyOnlineURL",
          "name": "CustomApplyOnlineURL",
          "type": "string"
        }, {
          "label": "ApplyWithMonster",
          "name": "ApplyWithMonster",
          "type": "object",
          "properties": [{
            "label": "DeliveryMethod",
            "name": "DeliveryMethod",
            "type": "object",
            "properties": [{
              "label": "@monsterId",
              "name": "@monsterId",
              "type": "string"
            }]
          }, {
            "label": "DeliveryFormat",
            "name": "DeliveryFormat",
            "type": "object",
            "properties": [{
              "label": "@monsterId",
              "name": "@monsterId",
              "type": "string"
            }]
          }, {
            "label": "VendorText",
            "name": "VendorText",
            "type": "string"
          }, {
            "label": "PostURL",
            "name": "PostURL",
            "type": "string"
          }, {
            "label": "ApiKey",
            "name": "ApiKey",
            "type": "string"
          }]
        }]
      }, {
        "label": "JobPostings",
        "name": "JobPostings",
        "type": "object",
        "properties": [{
          "label": "JobPosting",
          "name": "JobPosting",
          "type": "object",
          "properties": [{
            "label": "@desiredDuration",
            "name": "@desiredDuration",
            "type": "string"
          }, {
            "label": "JobCategory",
            "name": "JobCategory",
            "type": "object",
            "properties": [{
              "label": "@monsterId",
              "name": "@monsterId",
              "type": "string"
            }]
          }, {
            "label": "BoardName",
            "name": "BoardName",
            "type": "object",
            "properties": [{
              "label": "@monsterId",
              "name": "@monsterId",
              "type": "string"
            }]
          }, {
            "label": "JobOccupations",
            "name": "JobOccupations",
            "type": "object",
            "properties": [{
              "label": "JobOccupation",
              "name": "JobOccupation",
              "type": "object",
              "properties": [{
                "label": "@monsterId",
                "name": "@monsterId",
                "type": "string"
              }]
            }]
          }, {
            "label": "Location",
            "name": "Location",
            "type": "object",
            "properties": [{
              "label": "City",
              "name": "City",
              "type": "string"
            }, {
              "label": "State",
              "name": "State",
              "type": "string"
            }, {
              "label": "CountryCode",
              "name": "CountryCode",
              "type": "string"
            }, {
              "label": "PostalCode",
              "name": "PostalCode",
              "type": "string"
            }]
          }, {
            "label": "Industries",
            "name": "Indsustries",
            "type": "object",
            "properties": [{
              "label": "Industry",
              "name": "Industry",
              "type": "object",
              "properties": [{
                "label": "IndustryName",
                "name": "IndustryName",
                "type": "object",
                "properties": [{
                  "label": "@monsterId",
                  "name": "@monsterId",
                  "type": "string"
                }]
              }]
            }]
          }]
        }]
      }, {
        "label": "RecruiterReference",
        "name": "RecruiterReference",
        "type": "object",
        "properties": [{
          "label": "UserName",
          "name": "UserName",
          "type": "string"
        }]
      }]
    };
    return platformSchema;
  }

  constructMapping(sourceField, destinationField, sourceFieldType = 'string', destinationFieldType = 'string', mappingType = 'field_to_field', expression = null) {
    var mapping = {
      "sourceField": sourceField,
      "destinationField": destinationField,
      "sourceFieldType": sourceFieldType,
      "destinationFieldType": destinationFieldType,
      "mappingType": mappingType
    };

    if (mappingType === 'expression') {
      mapping['expression'] = {
        "script": expression
      };
    }

    return mapping;
  }

}

module.exports = {
  JobPostingSchemaConverter: JobPostingSchemaConverter
};
