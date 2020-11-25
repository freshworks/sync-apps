const transformationService = require('../transformationService/transformation');
const connectorService = require('../connectorService/connector');
const integrationService = require('../integrationService/integration');
const SyncApi = require('../../api/SyncApi');
const ApiClient = require('../../ApiClient');
const httpConstants = require('../../converter/http-constants');

const SyncRequest = require('../../model/SyncRequest');
const BulkSyncRequest = require('../../model/BulkSyncRequest');

var syncApi = new SyncApi();
var defaultClient = ApiClient.instance;

function getObjectStatus(transformationId, page, per_page) {
    return new Promise(function(resolve, reject) {
        var opts = {
            "page": page,
            "per_page": per_page
        }
        syncApi.getObjectSyncStatus(transformationId, opts).then(
            function(success) {
                console.log("Sucessfully fetched the sync status", success.data)
                resolve(success.data);
            },
            function(error) {
                console.log("Error while fetching the sync status", error)
                reject(error);
            }
        )
    })
}

function getObjectSyncStatus(integration_id, page, per_page) {
    return new Promise(function(resolve, reject) {
        console.log("Getting transformations for the integration");
        transformationService.getTransformationDetails(integration_id).then(
            function(transformations) {
                console.log("Fetched transformation : ", transformations);
                var integrationLogs = [];
                var transformationFetch = new Promise(function(resolve1){
                    if(transformations.length == 0) {
                        resolve1();
                    }
                    transformations.forEach(
                        (transformation, index, array) => {
                            console.log("Fetching log for the transformation : ", transformation);
                            var log = {};
                            log.transformation = transformation;
                            getObjectStatus(transformation.id, page, per_page).then(function(paginatedStatus) {
                                log.logs = paginatedStatus['sync_statuses'];
                                integrationLogs.push(log);
                                if (index === array.length -1) {
                                    resolve1();
                                }
                            }, function(){
                                log.logs = [];
                                integrationLogs.push(log);
                            });
                        }
                    );
                });
                transformationFetch.then(
                    function() {
                        resolve(integrationLogs);
                    }
                );
            },
            function(error) {
                console.log("Error in fetching logs", error);
                resolve([]);
            }
        );
    });
}

function bulkSync(connector, payload) {
    return new Promise(function(resolve, reject) {
        var bulkSyncRequest = new BulkSyncRequest();
        console.log('Bulk sync payload', payload)
        connectorService.getNextPage(connector, payload.entity, payload.entity_to_sync_meta).then(
            function(nextPageEntities) {
                if (nextPageEntities.length == 0) {
                    console.log('No more entities to sync for the entity')
                    resolve({"status": "done"});
                    return;
                }

                console.log('Entities fetched to sync for the entity', nextPageEntities.length);
                var integrations = payload.integrations;
                var integrationId = "";
                if (integrations[0].sourceConnectorId === payload.entity_to_sync_meta.connector_id) {
                    integrationId = integrations[0].id;
                } else {
                    integrationId = integrations[1].id;
                }
                var syncRequests = []
                for(var entityIndex in nextPageEntities) {
                    var entityToSync = nextPageEntities[entityIndex]
                    var syncRequest = new SyncRequest();
                    syncRequest.setIntegrationId(integrationId);
                    syncRequest.setConnectorId(payload.entity_to_sync_meta.connector_id);
                    syncRequest.setSchemaId(payload.entity_to_sync_meta.schema_id);
                    syncRequest.setNonce(new Date().getTime());
                    syncRequest.setPayload(entityToSync);
                    syncRequests.push(syncRequest);
                }
                
                bulkSyncRequest.setSyncRequests(syncRequests);
                integrationService.getAppWebhookUrl().then(
                    function(webhook) {
                        console.log('Successfully fetched the webhook', webhook);
                        bulkSyncRequest.setCallback(webhook);
                        var bulk_sync_type = payload.entity_to_sync_meta.initial_sync_type
                        var isObjectReference = 'false';
                        if (bulk_sync_type === 'objectReference') {
                            isObjectReference = 'true';
                        }
                        let opts = {
                            "sync": bulkSyncRequest,
                            "isObjectReference": isObjectReference
                        };
                        syncApi.startBulkSync(opts).then(
                            function(success) {
                                console.log("Sucessfully initialized the bulk data sync", success)
                                resolve({"status": "inprogress"});
                            },
                            function(error) {
                                console.log("Error while initializing the bulk data sync", error)
                                reject(error);
                            }
                        );
                    },
                    function(error) {
                        console.log('Failed to save the webhook', error);
                        reject(error)
                    }
                )
            },
            function(error) {
                console.log('Error while fetching the next page entities for ', error);
                reject(error);
            }
        );
    });
}

function callInitialSyncViaWebhook() {
    return new Promise(function(resolve, reject) {
        integrationService.getAppWebhookUrl().then(
            function(webhook) {
                console.log('Successfully fetched the webhook', webhook);
                var headers = {
                    [httpConstants.CONTENT_TYPE]: httpConstants.APPLICATION_JSON,
                }
                var requestPayload = {
                    'status' : 'done'
                }
                var body = JSON.stringify(requestPayload)
                console.log('payload: ', body)

                defaultClient.makeApiCall(httpConstants.POST, webhook, { 'headers': headers, 'body': body }).then(
                    function(callback) {
                        console.log('Sucessfully sent callback')
                        resolve(callback.response);
                    },
                    function(error) {
                        console.log('Error while sending callback', error);
                        reject(error);
                    }
                )
            },
            function(error) {
                console.log('Error while fetching webhook url', error);
                resolve(error)
            }
        );
    })
}

function performSync(payload, entitiesStatus) {
    return new Promise(function(resolve, reject) {
        var initialSyncPendingList = []
        var initialReferenceSyncPendingList = []
        var entityToSync = "";
        for(var entity in entitiesStatus) {
            var status = entitiesStatus[entity]
            var syncStatus = status.initial_sync_status
            var syncRequired = status.is_initial_sync_required
            var syncType = status.initial_sync_type

            if ( syncStatus === 'inprogress') {
                entityToSync = entity;
            } else if ( syncRequired !=null && syncRequired && syncStatus === 'yet_to_start' ) {
                if (syncType === 'objectReference') {
                    initialReferenceSyncPendingList.push(entity)
                } else {
                    initialSyncPendingList.push(entity)
                }
            }
        }

        if (entityToSync === "" && initialReferenceSyncPendingList.length > 0) {
            entityToSync = initialReferenceSyncPendingList[0]
        } else if (entityToSync === "" && initialSyncPendingList.length > 0) {
            entityToSync = initialSyncPendingList[0]
        }

        console.log("Initial sync pending list ", JSON.stringify(initialSyncPendingList))
        console.log("Initial Reference pending list ", JSON.stringify(initialReferenceSyncPendingList))
        if ( entityToSync === "" ) {
            resolve("initial sync done.");
            return;
        }

        integrationService.getIntegrations().then(
            function(integrations) {
                payload = {
                    'integrations': integrations,
                    'entity_to_sync_meta': entitiesStatus[entityToSync],
                    'entity': entityToSync
                }

                bulkSync(entitiesStatus[entityToSync].connector_name, payload).then(
                    function(bulkSyncStatus) {
                        console.log('Bulk sync status', bulkSyncStatus)
                        console.log('entity status', JSON.stringify(entitiesStatus[entityToSync]))
                        entitiesStatus[entityToSync].initial_sync_status = bulkSyncStatus.status
                        if (bulkSyncStatus.status === 'done' && entitiesStatus[entityToSync].initial_sync_type === 'objectReference') {
                            entitiesStatus[entityToSync].initial_sync_type = 'bulkSync'
                            entitiesStatus[entityToSync].initial_sync_status = 'yet_to_start'
                            entitiesStatus[entityToSync].current_page = 1
                        }
                        console.log('Entities status update data', entitiesStatus)
                        integrationService.setKey("created_entities", entitiesStatus).then(
                            function() {
                                console.log('Updated the entity status as ', bulkSyncStatus);
                                if (bulkSyncStatus.status === 'done') {
                                    callInitialSyncViaWebhook().then(
                                        function() {
                                            console.log('Initial webhook sync intiated successfully');
                                            resolve("success");
                                        },
                                        function(error) {
                                            console.log('Initial webhook sync intiation failed', error);
                                            reject(error);
                                        }
                                    )
                                } else {
                                    console.log('Initiated bulk sync');
                                    resolve("success")
                                }
                            },
                            function(error) {
                                console.log('Failed to update the entity status', error);
                                reject(error)
                            }
                        );
                    },
                    function(error) {
                        console.log('Failed to start the initial sync', error)
                        reject(error)
                    }
                );
            },
            function(error) {
                console.log('Failed to fetch the integrations', error)
                reject(error)
            }
        );
    });
}

function initialSyncCallBack(payload) {
    return new Promise(function(resolve, reject) {
        console.log('Initial sync call back invoked');
        connectorService.getEntityStatus().then(
            function(entitiesStatus) {
                if (payload['data']['status'] === 'done') {
                    console.log('Going to perform sync of initialSyncCallBack');
                    performSync(payload, entitiesStatus).then(
                        function(status) {
                            resolve(status);
                        }, function(error) {
                            console.log("Error while performing the sync ", JSON.stringify(error));
                            reject(error);
                        }
                    );
                } else {
                    console.log('Going to perform initial sync call back')
                    for(var entity in entitiesStatus) {
                        if (entitiesStatus[entity].initial_sync_status === 'inprogress') {
                            entitiesStatus[entity].current_page = entitiesStatus[entity].current_page + 1;
                            connectorService.updateEntityStatus(entitiesStatus).then(
                                function() {
                                    performSync(payload, entitiesStatus).then(
                                        function(status) {
                                            resolve(status);
                                        }, function(error) {
                                            console.log("Error while performing the sync ", JSON.stringify(error));
                                            reject(error);
                                        }
                                    );
                                },
                                function(error) {
                                    console.log('Error while updating the entity status in intial sync callback', error);
                                    reject(error)
                                }
                            )
                        }
                    }
                }
            },
            function(error) {
                console.log('Error while fetching the created entity status.', error)
                reject(error)
            }
        );
    });
}

function intializeInitialSyncData(entitiesStatus, schemaId) {
    for(var entity in entitiesStatus) {
        if (entitiesStatus[entity]['schema_id'] === schemaId) {
            entitiesStatus[entity].initial_sync_type = 'objectReference'
            entitiesStatus[entity].is_initial_sync_required = true
            entitiesStatus[entity].initial_sync_status = 'yet_to_start'
            entitiesStatus[entity].current_page = 1
            break;
        }
    }
    return entitiesStatus;
}

function updateInitialSyncTodo() {
    return new Promise(function(resolve, reject) {
        transformationService.getTransformationStatus().then(
            function(transformationStatus) {
                var initialSyncTodoTrans = []
                
                for(var transformation in transformationStatus) {
                    var detail = transformationStatus[transformation];
                    if (!detail.hasOwnProperty('transformation_id')) {
                        continue
                    }
                    var sourceSchemaId = detail.source_schema_id
                    var destinationSchemaId = detail.destination_schema_id
                    var key =  sourceSchemaId.toString() + '_' + destinationSchemaId.toString()
                    var revKey =  destinationSchemaId.toString() + '_' + sourceSchemaId.toString()
                    if (initialSyncTodoTrans.includes(key) || initialSyncTodoTrans.includes(revKey)) {
                        continue;
                    }
                    initialSyncTodoTrans.push(key);
                    console.log('Initial sync pending transformations', initialSyncTodoTrans);
                }
                connectorService.getEntityStatus().then(
                    function(entitiesStatus) {
                        for(var index in initialSyncTodoTrans) {
                            console.log(index)
                            var key = initialSyncTodoTrans[index]
                            console.log(key)
                            var srcSchemaId = transformationStatus[key].source_schema_id
                            var destSchemaId = transformationStatus[key].destination_schema_id
                            
                            entitiesStatus = intializeInitialSyncData(entitiesStatus, srcSchemaId);
                            console.log('Initialized the sync stats ', entitiesStatus)
                            entitiesStatus = intializeInitialSyncData(entitiesStatus, destSchemaId);
                            console.log('Initialized the sync stats ', entitiesStatus)
                        }

                        connectorService.updateEntityStatus(entitiesStatus).then(
                            function() {
                                console.log('Successfully updated the entity initial sync todo status')
                                resolve(entitiesStatus)
                            },
                            function(error) {
                                console.log('Failed to update the entity initial sync todo status', error)
                                reject(error)
                            }
                        )
                    },
                    function(error) {
                        console.log('Error while updating the entity todo sync status');
                        reject(error);
                    }
                )
            }
        )
    });
}

function initialSync(payload) {
    return new Promise(function(resolve, reject){
        updateInitialSyncTodo().then(
            function(entitiesStatus) {
                performSync(payload, entitiesStatus).then(
                    function(status) {
                        resolve(status);
                    }, function(error) {
                        console.log("Error while performing the sync ", JSON.stringify(error));
                        reject(error);
                    }
                );
            },
            function(error) {
                console.log("Error in initial sync", error);
                reject(error);
            }
        );
    });
}

module.exports = {
    getObjectSyncStatus,
    initialSyncCallBack,
    initialSync
}
