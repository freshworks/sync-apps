const FormApi = require('../../api/FormApi');
const TransformationApi = require('../../api/TransformationApi');
const integrationService = require('../integrationService/integration');
const connectorService = require('../connectorService/connector');
const ApiClient = require('../../ApiClient');
const MappingForm = require('../../model/MappingForm');
const FormServMapping = require('../../model/FormServMapping');
const Mapping = require('../../model/Mapping');

// Constants
const constants = require('../../constants');

var formApi = new FormApi();
var transformationApi = new TransformationApi();

/**
 * Create Transformation Select form for the given list of entities of both the connectors in the app
 * @param {Array<String>} List of Entities 
 */
function createTransformationSelectForm(entities_list) {
    return new Promise(function(resolve, reject) {
        if (entities_list == null || entities_list.length == 0){
            resolve({"success": "true"})
            return;
        }
        integrationService.getForm(constants.TRANSFORMATION_SELECTION_FORM).then(
            function(form) {
                if (form == constants.REQUEST_PROCESS_ERROR_MESSAGE) {
                    console.log('Form not yet created. Creating...');
                    var form = getTransSelectFormPayload(entities_list);
                    formApi.createForm(form).then(
                        function() {
                            console.log('Created the transformation selection form.')
                            resolve({"success": "true"})
                        },
                        function(error) {
                            console.log("Error in transformation selection form", JSON.stringify(error));
                            reject(error);
                        }
                    );
                } else {
                    console.log('Transformation selection form already exists...')
                    resolve({"success": "true"})
                }
            },
            function(error) {
                console.log('Rejecting the transformation select form.');
                reject(error);
            }
        )
    })
}

/**
 * Construct the transformation select form payload for the list of entities
 * @param {ArrayList<String>} entities_list 
 */
function getTransSelectFormPayload(entities_list) {
    var choices = []
    for (var entity in entities_list) {
        choices.push({'value': entity})
    }
    console.log("Choices ", choices);
    var field1 = connectorService.constructField("Source Entity", "source_entity", 2, 1, true, choices)
    var field2 = connectorService.constructField("Destination Entity", "destination_entity", 2, 1, true, choices)
    let formServObject = connectorService.constructFormServObject([field1, field2], 'javascript:getMappingPage()');
    var form =  connectorService.constructForm(constants.TRANSFORMATION_SELECTION_FORM, ApiClient.instance.app.appuuid, formServObject);
    return form;
}

function getMappingKey(srcMeta, destMeta) {
    return srcMeta.schema_id.toString() + '_' + destMeta.schema_id.toString();
}

function createTransformation(payload) {
    return new Promise(function(resolve, reject) {
        var mappingKey = getMappingKey(payload.src_meta, payload.dest_meta);

        getTransformationStatus().then(
            function(transformationStatus) {
                if (transformationStatus[mappingKey] != null) {
                    resolve(transformationStatus[mappingKey]);
                    return;
                }
                var mapping = constructMappingPayload(payload.integration_id, payload.src_meta, payload.dest_meta);
                console.log("Going to create transformation");
                transformationApi.createMapping( { 'mapping': mapping } ).then(
                    function(transformation) {
                        console.log('Created the transformation')
                        var status = constructMappingStatus(transformation.data);
                        transformationStatus[mappingKey] = status
                        integrationService.setKey("transformations", transformationStatus).then(
                            function() { console.log("Updated transformation created status.") },
                            function(error) { console.log("Error while updating the key", error) }
                        );
                        resolve(status);
                    },
                    function(error) {
                        console.log('Error while creating the transformation', JSON.stringify(error));
                        reject(error);
                    }
                )
            }, function(error) {
                console.log('Error while fetching the transformation status details', error);
                reject(error);
            });
        }
    );
}

function getTransformationStatus(key) {
    return new Promise(function(resolve) {
        integrationService.getKey("transformations").then(
            function(transformationStatus) {
                console.log('transformation status', JSON.stringify(transformationStatus))
                if (key != null) {
                    resolve(transformationStatus[key]);
                } else {
                    resolve(transformationStatus);
                }
            }, function() {
                resolve({})
            }
        );
    });
}

function constructMappingFormReqPayload(sourceEntity, srcEntityMeta, destinationEntity, destEntityMeta, isExpressionForm) {
    var mappingForm = new MappingForm();
    mappingForm.setSourceConnectorId(srcEntityMeta.connector_id);
    mappingForm.setSourceSchemaId(srcEntityMeta.schema_id);
    mappingForm.setSourceSchemaName(sourceEntity);
    mappingForm.setDestinationConnectorId(destEntityMeta.connector_id);
    mappingForm.setDestinationSchemaId(destEntityMeta.schema_id);
    mappingForm.setDestinationSchemaName(destinationEntity);
    mappingForm.setAppuuid(ApiClient.instance.app.appuuid);
    mappingForm.setIsExpressionForm(isExpressionForm);
    return mappingForm;
}

function createTransformationPage(payload) {
    return new Promise(function(resolve, reject) {
        connectorService.getEntityStatus().then(
            function(entities) {
                var srcEntity = payload.source_entity;
                var destEntity = payload.destination_entity;
                payload.src_meta = entities[srcEntity];
                payload.dest_meta = entities[destEntity];
                var formName = payload.src_meta.connector_id.toString() + "_" + payload.dest_meta.connector_id.toString() + "_" + srcEntity + "_" + destEntity;     
                if (payload.isExpressionForm) {
                    formName += '_expression';
                }
                getTransformationStatus().then(
                    function(transformationStatus) {
                        integrationService.getForm(formName).then(
                            function(formData) {
                                var isFormCreated = true
                                if (formData === constants.REQUEST_PROCESS_ERROR_MESSAGE) {
                                    isFormCreated = false
                                }
                                connectorService.getEntityStatus().then(
                                    function(entitiesStatus) {
                                        if(!isFormCreated || entitiesStatus[payload.source_entity].is_updated || entitiesStatus[payload.destination_entity].is_updated) {
                                            var mappingForm = constructMappingFormReqPayload(payload.source_entity, payload.src_meta, payload.destination_entity, payload.dest_meta, payload.isExpressionForm);
                                            console.log('transformation form update');
                                            console.log('Mapping form payload: ', JSON.stringify(mappingForm));
                                            if(!isFormCreated) {
                                                formApi.createMappingForm(mappingForm).then(
                                                    function(success) {
                                                        console.log('Created the form successfully', success);
                                                        entitiesStatus[payload.source_entity].is_updated = false;
                                                        entitiesStatus[payload.destination_entity].is_updated = false;
                                                        connectorService.updateEntityStatus(entitiesStatus).then(
                                                            function(success) {
                                                                console.log("Updated entity stats ", success);
                                                                transformationStatus[formName] = constants.CREATED;
                                                                integrationService.setKey("transformations", transformationStatus).then(
                                                                    function() {
                                                                        console.log("Updated form create status.")
                                                                        resolve({ formStatus: constants.CREATED, formName: formName });
                                                                    },
                                                                    function(error) {
                                                                        console.log("Error while updating the form create status key", error);
                                                                        reject(error);
                                                                    }
                                                                );
                                                            },
                                                            function(error) {
                                                                console.log("Error while updating the entity stats ", error);
                                                            }
                                                        );
                                                    },
                                                    function(error) {
                                                        console.log('Error while updating the transformation form ', JSON.stringify(error));
                                                        reject(error);
                                                    }
                                                );
                                            } else {
                                                formApi.updateMappingForm(mappingForm).then(
                                                    function(success) {
                                                        console.log('Updated the form successfully', success);
                                                        entitiesStatus[payload.source_entity].is_updated = false;
                                                        entitiesStatus[payload.destination_entity].is_updated = false;
                                                        connectorService.updateEntityStatus(entitiesStatus).then(
                                                            function(success) {
                                                                console.log("Updated entity stats ", success);
                                                                transformationStatus[formName] = constants.CREATED;
                                                                integrationService.setKey("transformations", transformationStatus).then(
                                                                    function() {
                                                                        console.log("Updated form update status.")
                                                                        resolve({ formStatus: constants.CREATED, formName: formName });
                                                                    },
                                                                    function(error) {
                                                                        console.log("Error while updating the form create status key", error);
                                                                        reject(error);
                                                                    }
                                                                );
                                                            },
                                                            function(error) {
                                                                console.log("Error while updating the entity stats ", error);
                                                            }
                                                        );
                                                    },
                                                    function(error) {
                                                        console.log('Error while updating the transformation form ', JSON.stringify(error));
                                                        reject(error);
                                                    }
                                                );
                                            }
                                        } else {
                                            transformationStatus[formName] = constants.CREATED;
                                            integrationService.setKey("transformations", transformationStatus).then(
                                                function() {
                                                    console.log("Updated form created status.")
                                                    resolve({ formStatus: constants.CREATED, formName: formName });
                                                },
                                                function(error) {
                                                    console.log("Error while updating the form create status key", error);
                                                    reject(error);
                                                }
                                            );
                                        }
                                    }, function(error) {
                                        console.log("Error fetching entity stats ", error);
                                    }
                                );
                            },
                            function(error) {
                                console.log('Error while fetching the form', error);
                            }
                        );
                    }, 
                    function(error) {
                        console.log('Error while fetching the transformation status details', error);
                        reject(error);
                    }
                );
            },
            function(error) {
                console.log("Error while fetching the entity status", error)
                reject(error);
            }
        );
    });
}

/**
 * Save mappings for the transformation
 * @param {Object} payload 
 * payload -> {
 *       'src_entity': {String},
 *       'dest_entity': {String},
 *       'mapping': {Object},
 *       'expr_field_meta': {Object}
 *   }
 */
function saveMapping(payload) {
    return new Promise(function(resolve, reject) {
        connectorService.getEntityStatus().then(
            function(entitiesStatus) {
                var srcEntityMeta = entitiesStatus[payload.src_entity]
                var destEntityMeta = entitiesStatus[payload.dest_entity]
                saveTransformationMapping(srcEntityMeta, destEntityMeta, payload.mapping, payload.expr_field_meta).then(
                    function(savedMapping) {
                        console.log('Saved the mapping successfully');
                        resolve(savedMapping);
                    }, function(error) {
                        console.log('Error while saving the mapping.');
                        reject(error);
                    }
                )
            },
            function(error) {
                console.log("Error while fetching created entities status", error)
                reject(error);
            }
        );
    });
}

/**
 * Save the mapping for the given transformation 
 * @param {Object} srcMeta 
 * @param {Object} destMeta 
 * @param {Object} mapping 
 * @param {Object} expr_field_meta 
 */
function saveTransformationMapping(srcMeta, destMeta, mapping, expr_field_meta) {
    return new Promise(function(resolve, reject) {
        var mappingKey = getMappingKey(srcMeta, destMeta);
        getTransformationStatus().then(
            function(transformationStatus) {
                var transformation = transformationStatus[mappingKey];
                var formServMapping = new FormServMapping();
                formServMapping.setMapping(mapping);
                formServMapping.setMeta(expr_field_meta);
                formServMapping.setTransformationId(transformation.transformation_id);
                formServMapping.setSourceSchemaId(transformation.source_schema_id);
                formServMapping.setDestinationSchemaId(transformation.destination_schema_id);
                formServMapping.setIntegrationId(transformation.integration_id);
                console.log("Going to save the mapping data");
                transformationApi.saveMapping(transformation.transformation_id, { "formServMapping": formServMapping }).then(
                    function(mappingSaveResponse) {
                        transformationStatus[mappingKey].is_mapping_saved = true;
                        integrationService.setKey("transformations", transformationStatus).then(
                            function() {
                                console.log('Successfully saved the mapping');
                                resolve(mappingSaveResponse.data);
                            },
                            function(error) {
                                console.log("Error while updating the transformation mapping status", error);
                                reject(error);
                            }
                        );
                    },
                    function(error) {
                        console.log('Error while saving mapping', JSON.stringify(error));
                        reject(error);
                    }   
                );
            },
            function(error) {
                console.log('Error while fetching the transformation status details', error);
                reject(error);
            }
        );
    });
}

/**
 * Get Mappings for the given pair of entities meta from the app data
 * @param {Object} srcMeta 
 * @param {Object} destMeta 
 */
function getMappings(srcMeta, destMeta) {
    return new Promise(function(resolve, reject) {
        var mappingKey = getMappingKey(srcMeta, destMeta);
        getTransformationStatus().then(
            function(transformationStatus) {
                console.log("mapping key",mappingKey)
                var transformationId = transformationStatus[mappingKey].transformation_id
                console.log("Going to fetch the mapping data");
                transformationApi.getMappings(transformationId).then(
                    function(response) {
                        console.log('Successfully fetched the form');
                        resolve(response.data);
                    },
                    function(error) {
                        console.log('Error while fetching mapping data', JSON.stringify(error));
                        reject(error);
                    }
                );
            }, 
            function(error) {
                console.log('Error while fetching the transformation status details', error);
                reject(error);
            }
        );
    })
}

/**
 * Get the Mappings for a transformation between two entities
 * @param {Object} payload 
 * payload - {
 *      "source_entity": <String>
 *      "destination_entity": <String>
 * }
 */
function getMappingData(payload) {
    return new Promise(function(resolve, reject) {
        console.log("Going to fetch the transformation mapping data")
        connectorService.getEntityStatus().then(
            function(entitiesStatus) {
                var srcEntityMeta = entitiesStatus[payload.source_entity]
                var destEntityMeta = entitiesStatus[payload.destination_entity]
                getMappings(srcEntityMeta, destEntityMeta).then(
                    function(savedMapping) {
                        console.log('Fetched the mapping successfully');
                        resolve(savedMapping);
                    }, function(error) {
                        console.log('Error while fetching the mapping.');
                        reject(error);
                    }
                )
            },
            function(error) {
                console.log("Error while fetching created entities status", error);
                reject(error);
            }
        );
    });
}

/**
 * Create Mapping for the given pair of entities
 * @param {Object} payload 
 *  payload -> {
 *       source_entity = {String},
 *       destination_entity = {String},
 *       integrations: {Array<Integration>}
 * }
 */
function createMapping(payload) {
    return new Promise(function(resolve, reject) {
        connectorService.getEntityStatus().then(
            function(entities) {
                var srcEntity = payload.source_entity;
                var destEntity = payload.destination_entity;
                var srcEntityMeta = entities[srcEntity];
                var destEntityMeta = entities[destEntity];
                payload.src_meta = srcEntityMeta;
                payload.dest_meta = destEntityMeta;
                var integrations = payload.integrations;
                var srcConnectorId = srcEntityMeta.connector_id;
                if (integrations[0].sourceConnectorId == srcConnectorId) {
                    payload.integration_id = integrations[0].id;
                } else {
                    payload.integration_id = integrations[1].id;
                }
                createTransformation(payload).then(
                    function(transformation) {
                        console.log('Created the transformation');
                        resolve(transformation)
                    },
                    function(error) {
                        console.log("Error while creating the transformation", error);
                        reject(error)
                    }
                );
            },
            function(error) {
                console.log("Error while fetching the entity status", error);
                reject(error)
            }
        );
    });
}

/**
 * Construct Mapping object from the source and destination meta objects
 * @param {Integer} integrationId 
 * @param {Object} srcEntityMeta 
 * @param {Object} destEntityMeta 
 */
function constructMappingPayload(integrationId, srcEntityMeta, destEntityMeta) {
    var mapping = new Mapping();
    mapping.setSourceSchemaId(srcEntityMeta.schema_id);
    mapping.setDestinationSchemaId(destEntityMeta.schema_id);
    mapping.setSourceEntityType(srcEntityMeta.entity_type);
    mapping.setDestinationEntityType(destEntityMeta.entity_type);
    mapping.setSourceEntityName(srcEntityMeta.entity_name);
    mapping.setDestinationEntityName(destEntityMeta.entity_name);
    mapping.setIntegrationId(integrationId);
    mapping.setMapping([]);
    return mapping;
}

/**
 * Construct mapping sttaus for app data from te mapping create response
 * @param {Mapping} transformationResp 
 */
function constructMappingStatus(transformationResp) {
    var status = {
        'status': 'created',
        'transformation_id': transformationResp.id,
        'integration_id': transformationResp.integrationId,
        'source_schema_id': transformationResp.sourceSchemaId,
        'destination_schema_id': transformationResp.destinationSchemaId,
        'transformation_group_id': transformationResp.groupId,
        'is_mapping_saved': false
    }
    return status;
}

/**
 * Get all the transformations for the given integration_id
 * @param {Integer} integration_id 
 */
function getTransformationsForIntegration(integration_id) {
    return new Promise(function(resolve, reject) {
        console.log("Going to get the transformation data");
        transformationApi.getMappingsOfIntegration(integration_id).then((response) => {
            console.log('Successfully got the mapping');
            integrationService.setKey("mappings", {[integration_id]: response.data}).then(
                function() { console.log("Mappings successfully set to db" ); },
                function(error) { console.log("Mappings update to db unsuccessful"); reject(error); }
            );
            resolve(response.data);
        }, (error) => {
            console.log('Error while getting mapping', JSON.stringify(error));
            reject(error);
        });
    });
}

/**
 * Populate the app data using the data from the server for the transformations
 * @param {Integer} integration_id 
 */
function populateMappingsCache(integration_id) {
    return new Promise(function(resolve, reject) {
        getTransformationsForIntegration(integration_id).then(
            function(transformation) { resolve(transformation); },
            function(error) { console.log("Error fetching transformation", JSON.stringify(error)); reject(error);}
        );
    });
}

/**
 * Get the transformations from the cache key if present or from the server
 * @param {Integer} integrationId 
 */
function getTransformations(integrationId) {
    return new Promise(function(resolve, reject) {
        console.log("Getting the transformations of the integration id : ", integrationId);
        integrationService.getKey("mappings").then(
            function(mappings) {
                if(mappings.integration_id == null) {
                    getTransformationsForIntegration(integrationId).then(
                        function(transformation) { resolve(transformation); },
                        function(error) { console.log("Error fetching transformation"); reject(error);}
                    );
                } else {
                    resolve(mappings.integration_id);
                }
            },
            function() {
                console.log("Error fetching mappings from the cache.. populating them..");
                populateMappingsCache(integrationId).then(
                    function(transformation) { console.log("mapping population successful ", transformation); resolve(transformation); },
                    function(error) { console.log("Error populating mappings"); reject(error);}
                );
            }
        );
    });
}

/**
 * Get Transformations of the given integration
 * @param {Integer} integration_id 
 */
function getTransformationDetails(integration_id) {
    return new Promise(function(resolve, reject) {
        getTransformations(integration_id).then(
            function(transformations) {
                console.log("Fetched transformation : ", transformations);
                resolve(transformations);
            },
            function(error) {
                console.log("Error in fetching transformation data ", error);
                reject(error);
            }
        );
    });
}

/**
 * Delete the transformation forms for the given connector pair
 * @param {Object} payload 
 * payload - {
 *  src_meta - {Array<Object>} - {
 *     connector_id
 *      }
 * }
 */
function deleteTransformationForms(payload) {
    return new Promise(function(resolve, reject) {
        var formName = payload.src_meta.connector_id.toString() + "_" + payload.dest_meta.connector_id.toString() + "_" + payload.source_entity + "_" + payload.destination_entity;
        let opts = {
            'name': formName
        };
        console.log('Deleting transformation form');
        formApi.deleteForm(ApiClient.instance.app.appuuid, opts).then((success) => {
            console.log('Deleted the form successfully', success);
            opts.name += "_expression";
            console.log('Deleting expression form');
            formApi.deleteForm(ApiClient.instance.app.appuuid, opts).then((success) => {
                console.log('Deleted the form successfully', success);
                resolve();
              }, (error) => {
                console.log('Error while deleting the transformation form', JSON.stringify(error));
                reject(error);
            });
          }, (error) => {
            console.log('Error while deleting the transformation form', JSON.stringify(error));
            reject(error);
        });
    });
}

function deleteTransformationAppData(payload) {
    return new Promise(function(resolve, reject) {
        getTransformationStatus().then(
            function(transformationStatus) {
                deleteTransformationForms(payload).then(
                    function() {
                        console.log('transformation status', JSON.stringify(transformationStatus));
                        var mappingKey = getMappingKey(payload.src_meta, payload.dest_meta);
                        var mappingForm = payload.src_meta.connector_id.toString() + "_" + payload.dest_meta.connector_id.toString() + "_" + payload.source_entity + "_" + payload.destination_entity;
                        var expressionForm = mappingForm + "_expression";
                        delete transformationStatus.transformation_group[payload.transformation_group_id];
                        delete transformationStatus[mappingKey];
                        delete transformationStatus[mappingForm];
                        delete transformationStatus[expressionForm];
                        console.log('Updated Transformation Status: ', transformationStatus);
                        integrationService.setKey("transformations", transformationStatus).then(
                            function(success) {
                                console.log("Successfully deleted transformation data");
                                console.log("successfully updated the matching settings status");
                                resolve(success);
                            },
                            function(error) {
                                console.log("error while updating the matching settings status");
                                reject(error);
                            }
                        )
                    }, function(error) {
                        console.log("Error while clearing transformation forms", JSON.stringify(error));
                        reject(error);
                    }
                );
            }, function(error) {
                console.log("Error while fetching transformation status ", JSON.stringify(error));
                reject(error);
            }
        );
    });
}

/**
 * Delete a transformation and its related details
 * @param {String} source_entity,
 * @param {String} destination_entity
 */
function deleteTransformation(source_entity, destination_entity) {
    return new Promise(function(resolve, reject) {
        connectorService.getEntityStatus().then(
            function(entities) {
                var payload = {};
                var srcEntityMeta = entities[source_entity];
                var destEntityMeta = entities[destination_entity];
                payload.source_entity = source_entity;
                payload.destination_entity = destination_entity;
                payload.src_meta = srcEntityMeta;
                payload.dest_meta = destEntityMeta;
                payload.source_entity = source_entity;
                payload.destination_entity = destination_entity;
                deleteTransformationBySchemaIds(payload).then(
                    function(response) {
                        console.log("Deleted the transformation.. status", response);
                        resolve(response);
                    },
                    function(error) {
                        console.log("Error in deleting transformation ", error);
                        reject(error);
                    }
                );
            }, function(error) {
                console.log("Error while fetching entity status", error);
                reject(error);
            }
        );
    });
}

function deleteTransformationBySchemaIds(payload) {
    return new Promise(function(resolve, reject) {
        console.log(`Fetching the details for the transformations for srcSchemaId ${payload.src_meta.schema_id} and ${payload.dest_meta.schema_id}`);
        transformationApi.getMappingsBySchemaIds(payload.src_meta.schema_id, payload.dest_meta.schema_id).then((response) => {
            console.log('Successfully got the mapping', response);
            var transformation = response.data;
            payload.transformation_group_id = transformation.groupId;
            transformationApi.deleteMappingById(transformation.id).then(
                function() {
                    console.log('Successfully deleted the mapping');
                    deleteTransformationAppData(payload).then(
                        function() {
                            console.log("Successfully deleted transformation stats from app Data");
                            resolve({"success": true});
                        }, function(error) {
                            console.log("Error while deleting transformation app data", error);
                            reject(error);
                        }
                );
            },
            function(error) {
                console.log('Error while deleting mapping', JSON.stringify(error));
                reject(error);
            }
        )
        }, (error) => {
            console.log('Error while getting mapping', JSON.stringify(error));
            reject(error);
        });
    });
}

function constructSubObject(fields, level_no, prefix, dropDownChoices){
    const supportedTypes = ['number', 'string', 'boolean', 'integer']
    var mappingHtml = '';
    var level = 'level-' + level_no;
    for(var field in fields){ 
        var fieldData = fields[field];
        if (supportedTypes.includes(fieldData.type)) {
            var name = prefix + '.' + fieldData.name;
            var label = fieldData.label;
            mappingHtml += `<div class=${level}><label style="display: inline-block;width:20%;padding-right: 3%;" >${label}</label><fw-select style="display: inline-block;width: 50%;" name="${name}">${dropDownChoices}</fw-select></div>`
        } else if (fieldData.type === 'object') {
            var name = prefix + '.' + fieldData.name;
            var label = fieldData.label;
            mappingHtml += `<div class=${level}><label style="display: inline-block;width:20%;padding-right: 3%;" >${label}</label>`
            mappingHtml += constructSubObject(fieldData.properties, level_no+1, name, dropDownChoices);
            mappingHtml += '</div>'
        }
    }
    return mappingHtml;
}

function constructDropDownForObject(fields, prefixValue, prefixLabel){
    var dropdownHtml = '';
    for(var field in fields){ 
        var fieldData = fields[field]; 
        const supportedTypes = ['number', 'string', 'boolean', 'integer']
        
        if (supportedTypes.includes(fieldData.type)) {
            var value = prefixValue + '.' + fieldData.name;
            var label = prefixLabel + '.' + fieldData.label;
            dropdownHtml += `<fw-select-option value="${value}">${label}</fw-select-option>`
        } else if (fieldData.type === 'object') {
            var value = prefixValue + '.' + fieldData.name;
            var label = prefixLabel + '.' + fieldData.label;
            dropdownHtml += constructDropDownForObject(fieldData.fields, value, label)
        }
    }
    return dropdownHtml;
}

function getMappingUI(sourceSchema, destinationSchema, submitButtonName){
    var dropDownChoices = `<fw-select-option value="">------ Select -----</fw-select-option>`;
    for(var field in sourceSchema){ 
        var fieldData = sourceSchema[field]; 
        const supportedTypes = ['number', 'string', 'boolean', 'integer']
        if (supportedTypes.includes(fieldData.type)) {
            var value = fieldData.name;
            var label = fieldData.label;
            dropDownChoices += `<fw-select-option value="${value}">${label}</fw-select-option>`
        } else if (fieldData.type === 'object') {
            var value = fieldData.name;
            var label = fieldData.label;
            dropDownChoices += constructDropDownForObject(fieldData.properties, value, label)
        }
    }

    var mappingHtml = '<div id="mappingForm" style="padding: 2%">';
    for(var field in destinationSchema){ 
        var fieldData = destinationSchema[field]; 
        const supportedTypes = ['number', 'string', 'boolean', 'integer']
        if (supportedTypes.includes(fieldData.type)) {
            var name = fieldData.name;
            var label = fieldData.label;
            mappingHtml += `<div name="${name}"><label style="display: inline-block;width:20%;padding-right: 3%;" >${label}</label><fw-select style="display: inline-block;width: 50%;" name="${name}">${dropDownChoices}</fw-select></div>`
        } else if (fieldData.type === 'object') {
            var level_no = 1;
            var level = 'level-' + level_no;
            var label = fieldData.label;
            var name = fieldData.name;
            mappingHtml += `<div class=${level} name="${name}"><label style="display: inline-block;width:20%;padding-right: 3%;" >${label}</label>`
            mappingHtml += constructSubObject(fieldData.properties, level_no+1, name, dropDownChoices);
            mappingHtml += '</div>'
        }
    }
    mappingHtml += `<fw-button id=${submitButtonName}> Save Mapping </fw-button></div>`;
    console.log('Mapping rendered successfully.')
    return mappingHtml;
}

module.exports = {
    createTransformationSelectForm,
    createTransformation,
    createTransformationPage,
    getTransformationStatus,
    getMappingKey,
    saveMapping,
    getMappingData,
    createMapping,
    getTransformationDetails,
    deleteTransformation,
    getMappingUI
};
