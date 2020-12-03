const connectorService = require('./connector');
const integrationService = require('../integrationService/integration');
const Converter = require('../../converter/converter');
const ConnectorApi = require('../../api/ConnectorApi');
const Schema = require('../../model/Schema');
const constants = require('../../constants');

var connectorApi = new ConnectorApi();

/**
 * Create Schema for the given connector details and entity pair
 * @param {Object<String>} payload 
 * payload properties: 
 *  - entity -> entity for which schema is to be created for e.g.: lead, contact, etc.
 *  - connector -> the connector details { id:"", name:"", details:"{}" }
 */
function createSchema(payload) {
    return new Promise(function(resolve, reject) {
        connectorService.getEntityStatus().then(
            function(entitiesStatus) {
                callSchemaService(payload).then(
                    function(schema) {
                        console.log("created the schema: ", payload.entity);
                        saveSchemaMeta(payload.connector.name, payload.entity, schema, entitiesStatus).then(
                            function(success) {
                                console.log("successfully saved the schema meta", success);
                                resolve({"message":"schema save successful"});
                                return;
                            },
                            function(error) {
                                reject(error);
                            }
                        );
                    },
                    function(error) {
                        if(error.status == 409) {
                            saveSchemaMeta(payload.connector.name, payload.entity, schema).then(
                                function(success) {
                                    console.log("successfully saved the schema meta", success);
                                    resolve({"message":"schema save successful"});
                                    return;
                                },
                                function(error) {
                                    reject(error);
                                }
                            );
                        }
                        else {
                            reject(error);
                        }
                    }
                );
            },
            function(error) {
                console.log("Error while fetching the entity status", error);
                reject(error);
                return;
            }
        );
    });
}

/**
 * Construct schema for the entity using the converter class obtained for the connector
 * @param {Object<String>} connector 
 * @param {String} entity 
 */
function constructSchema(payload, entity) {
    return new Promise(function(resolve, reject) {
        var connectorId = payload.connector.id;
        var connectorDetails = payload.connector.details;
        console.log('Going to create schema for ', entity);
        if (payload.connector.name == constants.FRESHDESK) {
            connectorDetails.token = connectorDetails.username;
        }
        var converter = Converter.getInstance(payload.connector.name, entity, connectorDetails.domain, connectorDetails.token);
        converter.convertSchema().then(
            function(convertedSchema) {
                console.log('Fetched the converted schema')
                payload.properties = convertedSchema.properties
                connectorService.getEntityStatus().then(
                    function(entitiesStatus) {
                        console.log(entitiesStatus)
                        if (entitiesStatus[entity] == null) {
                            entitiesStatus[entity] = {}
                        }
                        
                        if ( entitiesStatus[entity].is_created) {
                            var schema = Schema.constructFromObject(payload);
                            schema.setConnectorId(connectorId);
                            let opts = { 'schema': schema };
                            console.log("Going to update schema");
                            connectorApi.updateSchema(entitiesStatus[entity].schema_id, opts).then(
                                function(schema) {
                                    console.log("Schema update successful");
                                    entitiesStatus[entity]["is_updated"] = true;
                                    integrationService.setKey("created_entities", entitiesStatus).then (
                                        function(data) {
                                          console.log("updated that the entity has been modified.", data);
                                        },
                                        function(error) {
                                          console.log("failed to update the schema update in store", error);
                                          reject(error);
                                        });
                                    resolve(schema.data);
                                },
                                function(error) {
                                    console.log("Error in updating schema", JSON.stringify(error));
                                    reject(error);
                                }
                            );

                        } else {
                            var schema = Schema.constructFromObject(payload);
                            schema.setConnectorId(connectorId);
                            let opts = {
                                'schema': schema
                            };
                            connectorApi.createSchema(opts).then(
                                function(schema) {
                                    console.log("Schema create successful");
                                    resolve(schema.data);
                                },
                                function(error) {
                                    console.log("Error in creating schema", JSON.stringify(error));
                                    reject(error);
                                }
                            )
                        }

                    }, function(error) {
                        console.log("Error in fetching the entity stats ", error);
                        reject(error);
                    }
                );
            },
            function(error) {
                console.log("Error while creating the schema", error)
                reject(error);
            }
        );
    });
}

/**
 * Set the name of the connector to match the nme in the converter classes for converter instance creation
 * @param {Object<String>} payload 
 */
function callSchemaService(payload) {
    return new Promise(function(resolve, reject) {
        constructSchema(payload, payload.entity).then(
            function(schema) {
                resolve(schema);
            },
            function(error) {
                reject(error);
            }
        );
    });
}

/**
 * Save the schema meta information of the entity in the Appdata along with all the other entities
 * @param {String} connector
 * @param {String} entity 
 * @param {Schema} schema 
 * @param {Object} entitiesStatus 
 */
function saveSchemaMeta(connector, entity, schema, entitiesStatus) {
    return new Promise(function(resolve, reject) {
        var meta = {
            'is_created': true,
            'is_updated': false,
            'schema_id': schema.id,
            'entity_type': schema.entityType,
            'entity_name': schema.entityName,
            'connector_id': schema.connectorId,
            'connector_name': connector
        }
        entitiesStatus[entity] = meta
        integrationService.setKey("created_entities", entitiesStatus).then (
            function() {
                console.log("updated that the entity has been created.");
                resolve({"message": "updated successfully"});
                return;
            },
            function(error) {
                console.log("failed to update the schema create in store", error);
                reject(error);
                return;
            });
    });
}

module.exports = {
    createSchema
}
