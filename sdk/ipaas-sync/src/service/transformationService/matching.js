const transformationService = require('./transformation');
const integrationService = require('../integrationService/integration');
const constants = require('../../constants');

const TransformationApi = require('../../api/TransformationApi');
const MatchingSettings = require('../../model/MatchingSettings');

var transformationApi = new TransformationApi();

function createMatchingSettingsForSchema(payload) {
    return new Promise(function(resolve, reject) {
        console.log('createMatchingSettings payload', JSON.stringify(payload))
        transformationService.getTransformationStatus().then(
            function(transformationStatus) {
                console.log('transformation status', JSON.stringify(transformationStatus))
                if (transformationStatus.transformation_group == null) {
                    transformationStatus.transformation_group = {}
                }
                
                if (transformationStatus.transformation_group[payload.transformation_group_id] == null) {
                    transformationStatus.transformation_group[payload.transformation_group_id] = {}
                }

                if (transformationStatus.transformation_group[payload.transformation_group_id][payload.schema_id] === constants.CREATED) {
                    resolve(constants.CREATED);
                    return;
                }
                console.log('Creating matching settings ');
                var matchingSettings = new MatchingSettings();
                matchingSettings.setSchemaId(payload.schema_id);
                matchingSettings.setTransformationGroupId(payload.transformation_group_id);
                matchingSettings.setFields(payload.fields);
                console.log('matching payload', JSON.stringify(matchingSettings));
                transformationApi.saveMatchingSettings(payload.transformation_group_id, { 'matchingSettings': matchingSettings }).then(
                    function(success) {
                        console.log('Successfully created the matching settings', success);
                        transformationStatus.transformation_group[payload.transformation_group_id][payload.schema_id] = constants.CREATED;
                        integrationService.setKey("transformations", transformationStatus).then(
                            function(success) {
                                console.log("successfully updated the matching settings status");
                                resolve(success);
                            },
                            function(error) {
                                console.log("error while updating the matching settings status");
                                reject(error);
                            }
                        )
                    },
                    function(error) {
                        console.log('Error while creating matching settings', JSON.stringify(error));
                        reject(error);
                    }
                );     
            },
            function(error) {
                console.log('Error while creating matching settings', error)
                reject(error);
            }
        );
    });
}

/**
 * Create Matching Settings for the source and destination schema of the transformation
 * @param {Object} payload 
 * payload - { 
 *  'transformation_group_id': <integer>,
 *  'source_schema_id': <integer>,
 *  'destination_schema_id': <integer>,
 *  'source_fields': <Array<String>>,
 *  'destination_fields': <Array<String>>
 * }
 */
function createMatchingSettings(payload) {
    return new Promise(function(resolve, reject) {
        var matching_payload = {
            'fields' : payload.source_fields,
            'transformation_group_id': payload.transformation_group_id,
            'schema_id': payload.source_schema_id
        }
        createMatchingSettingsForSchema(matching_payload).then(
            function() {
                console.log('updated the source schema matching settings');
                matching_payload.fields = payload.destination_fields;
                matching_payload.schema_id = payload.destination_schema_id;
                createMatchingSettingsForSchema(matching_payload).then(
                    function() {
                        console.log("successfully created the destination entity matching settings")
                        resolve({"message": "success"});
                    },
                    function(error) {
                        console.log("Error while creating the matching settings for destination entity", error)
                        reject(error);
                    }
                )
            },
            function(error) {
                console.log("Error while creating the matching settings for source entity", error)
                reject(error);
            }
        )
    });
}

module.exports = {
    createMatchingSettings
}
