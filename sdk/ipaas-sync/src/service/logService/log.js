const connectorService = require('../connectorService/connector');
const transformationService = require('../transformationService/transformation');

function checkLogsPageRequired() {
    var isLogsPageRequired = false;
    return new Promise(function(resolve, reject){
        checkInitialSyncRequired().then(
            function(isInitialSyncRequired) {
                if(!isInitialSyncRequired) {
                    isLogsPageRequired = true;
                    console.log("Is logs page required: ", isLogsPageRequired);
                    resolve(isLogsPageRequired);
                    return;
                }
                transformationService.getTransformationStatus().then(
                    function(transformationStatus) {
                        if(Object.keys(transformationStatus).length > 0) {
                            var transformationGroups = transformationStatus.transformation_group;
                            Object.keys(transformationGroups).forEach(
                                function(transformationGroupId) {
                                    var transformationGroup = transformationGroups[transformationGroupId];
                                    var schemaIds = Object.keys(transformationGroup);
                                    var mappingKey = schemaIds[0].toString() + "_" + schemaIds[1].toString();
                                    /*
                                    * Checked for both direct and reverse transformation mapping
                                    * For example, fs_contact <-> fd_contact & fd_contact <-> fs_contact
                                    */
                                    for(var i = 0; i < 2; i++) {
                                        if(transformationStatus.hasOwnProperty(mappingKey)
                                            && transformationStatus[mappingKey].is_mapping_saved) {
                                                isLogsPageRequired = true;
                                                return false;
                                        }
                                        mappingKey = schemaIds[1].toString() + "_" + schemaIds[0].toString();
                                    }
                                }
                            );
                        }
                        console.log("Is logs page required: ", isLogsPageRequired);
                        resolve(isLogsPageRequired);
                    },
                    function(error) {
                        console.log("Error in fetching transformation data ", error);
                        reject(error);
                    }
                );
            },
            function(error) {
                console.log("Error in checking initial sync required ", error);
                reject(error);
            }
        );
    });
}

function checkInitialSyncRequired() {
    return new Promise(function(resolve, reject) {
        var isInitialSyncRequired = true;
        connectorService.getEntityStatus().then(
            function(entitiesStatus) {
                Object.keys(entitiesStatus).forEach(
                    (entity, index, array) => {
                        if(entitiesStatus[entity].initial_sync_status === 'done') {
                            isInitialSyncRequired = false;
                        }
                        if(index === array.length-1) {
                            console.log("Is initial sync required: ", isInitialSyncRequired);
                            resolve(isInitialSyncRequired);
                        }
                    }
                );
            }, function(error) {
                console.log("Error in fetching entity status", error);
                reject(error);
            }
        );
    });
}

module.exports = {
    checkInitialSyncRequired,
    checkLogsPageRequired
}
