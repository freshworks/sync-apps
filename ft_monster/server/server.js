const APP_UUID = "fc88bf70-400a-424a-8e69-bef265001f19";
const CONNECTOR_A = "FRESHTEAM";
const CONNECTOR_B = "MONSTER"
const ENTITIES = ['FT_JOB_POSTING', 'MONSTER_JOB_POSTING']
const DUMMY_ACCOUNT_ID = '13';

var IpaasSync = require('ipaas-sync');
var monsterSchema = require('./monsterSchema')
IpaasSync.ApiClient.instance.setRequest($request)
IpaasSync.ApiClient.instance.setBasePath('https://ipaas-v2-demo.pipestage.com')
IpaasSync.ApiClient.instance.setProduct('FRESHTEAM')

var app = new IpaasSync.App(APP_UUID, CONNECTOR_A, CONNECTOR_B, [])
IpaasSync.ApiClient.instance.setApp(app)

//Update freshteam connector
async function connectFreshteam(payload) {
    IpaasSync.ApiClient.instance.setVendorAccountId(payload.account_id);;
    var integrationApi = new IpaasSync.IntegrationApi()
    var integrations = await integrationApi.getIntegrations(APP_UUID);
    console.log('Integration data ', JSON.stringify(integrations));
    integrations = integrations['data']
    var freshteamConnectorId = integrations[0].sourceConnectorId;
    var connectorApi = new IpaasSync.ConnectorApi()
    var connectPayload = {
        "details": {
            "domain": payload.domain,
            "token": payload.api_key,
            "healthCheckPath": '/api/employees',
            "expectedStatusCode": 200,
            "authType": 'bearer'
        }
    }
    var connectorResponse = await connectorApi.updateConnector(freshteamConnectorId, connectPayload, {'isOauthRegister': false});
    console.log("updated the connector", JSON.stringify(connectorResponse));
    await updateLocalCache({'freshteamConnectorId': connectorResponse['data']['id'], 'integrationId': integrations[0]['id']})
    renderData();
}

async function createJobPostingSchema(payload) {
    var entity = 'ft_job_posting';
    IpaasSync.ApiClient.instance.setVendorAccountId(payload.account_id);;
    var integrationApi = new IpaasSync.IntegrationApi()
    var integrations = await integrationApi.getIntegrations(APP_UUID)
    console.log('Integration data ', JSON.stringify(integrations));
    integrations = integrations['data']
    var freshteamConnectorId = integrations[0].sourceConnectorId;
    var converter = IpaasSync.Converter.getInstance("FRESHTEAM", entity, payload.domain, payload.api_key);
    var convertedSchema = await converter.convertSchema();
    var schemaApi = new IpaasSync.ConnectorApi()
    var schema = {}
    schema['schema'] = {
        "connectorId": freshteamConnectorId,
        "properties": convertedSchema['properties'],
        "entityType":"job_postings",
        "entityName":"job_postings",
        "responseEntityName":"",
        "entityIdColumn":"id",
        "entityCreateEndpointUrl":"/job_postings",
        "entityUpdateEndpointUrl":"/job_postings/{id}"
    }
    console.log('Printing the schema: ', JSON.stringify(schema))
    var connectorApi = new IpaasSync.ConnectorApi()
    var schemas = await connectorApi.getSchemasByConnectorId(freshteamConnectorId);
    schemas = schemas['data']
    if (schemas.length == 0){
        var schemaResponse = await schemaApi.createSchema(schema)
        await updateLocalCache({'freshteamJobPostingId': schemaResponse['data']['id']})
    } else {
        var schemaId = schemas[0].id;
        var schemaResponse = await schemaApi.updateSchema(schemaId, schema);
        await updateLocalCache({'freshteamJobPostingId': schemaResponse['data']['id']})
    }          
    renderData(); 
}

async function connectMonster(payload) {
    IpaasSync.ApiClient.instance.setVendorAccountId(payload.account_id);;
    var integrationApi = new IpaasSync.IntegrationApi()
    var integrations = await integrationApi.getIntegrations(APP_UUID);
    console.log('Integration data ', JSON.stringify(integrations));
    integrations = integrations['data']
    var monsterConnectorId = integrations[0].destinationConnectorId;
    var connectorApi = new IpaasSync.ConnectorApi()
    var connectPayload = {
        "details": {
            "domain": payload.domain,
            "username": payload.username,
            "password": payload.password,
            "healthCheckPath": '/bgwBroker',
            "expectedStatusCode": 200,
            "authType": 'basic',
            "useSoapProtocol": true,
            "soapMsgParseParams": {
                "responseXpath": "JobsResponse.JobResponse",
                "statusXpath":"Status.ReturnCode.@returnCodeType",
                "successCode": "success",
                "idPath": "JobReference.@jobRefCode"
            }
        }
    }
    var connectorResponse = await connectorApi.updateConnector(monsterConnectorId, connectPayload, {'isOauthRegister': false});
    console.log("updated the connector", connectorResponse);
    await updateLocalCache({'monsterConnectorId': connectorResponse['data']['id']})
    renderData();       
}

async function createMonsterJobPostingSchema(payload) {
    console.log('Going to create monster jobposting');
    IpaasSync.ApiClient.instance.setVendorAccountId(payload.account_id);
    var integrationApi = new IpaasSync.IntegrationApi()
    var integrations = await integrationApi.getIntegrations(APP_UUID)
    console.log('Integration data ', JSON.stringify(integrations));
    integrations = integrations['data']
    var monsterConnectorId = integrations[0].destinationConnectorId;
    var schemaApi = new IpaasSync.ConnectorApi()
    var schema = {}
    schema['schema'] = {
        "connectorId": monsterConnectorId,
        "properties": monsterSchema.properties,
        "entityType":"Job",
        "entityName":"Job",
        "responseEntityName":"",
        "entityIdColumn":"@jobRefCode",
        "entityCreateEndpointUrl":"/bgwBroker",
        "entityUpdateEndpointUrl":"/bgwBroker"
    }
    console.log('Printing the schema: ', JSON.stringify(schema))
    var connectorApi = new IpaasSync.ConnectorApi()
    var schemas = await connectorApi.getSchemasByConnectorId(monsterConnectorId);
    schemas = schemas['data']
    if (schemas.length == 0){
        await schemaApi.createSchema(schema);
    } else {
        var schemaId = schemas[0].id;
        await schemaApi.updateSchema(schemaId, schema);
    }
    renderData()
}

async function createMapping(payload) {
    console.log('Going to create mapping');
    IpaasSync.ApiClient.instance.setVendorAccountId(payload.account_id);
    var integrationApi = new IpaasSync.IntegrationApi()
    var integrations = await integrationApi.getIntegrations(APP_UUID);
    console.log('Integration data ', JSON.stringify(integrations));
    integrations = integrations['data']
    var integrationId = integrations[0].id;
    var freshteamConnectorId = integrations[0].sourceConnectorId;
    var monsterConnectorId = integrations[0].destinationConnectorId;
    var connectorApi = new IpaasSync.ConnectorApi()
    var sourceSchemaId = null;
    var destinationSchemaId = null;
    var schemas = await connectorApi.getSchemasByConnectorId(freshteamConnectorId);
    schemas = schemas['data']
    sourceSchemaId = schemas[0].id;
    schemas = await connectorApi.getSchemasByConnectorId(monsterConnectorId);
    schemas = schemas['data']
    destinationSchemaId = schemas[0].id;
    var mappingPayload = {
        "sourceSchemaId":sourceSchemaId,
        "destinationSchemaId":destinationSchemaId,
        "sourceEntityType":"job_postings",
        "destinationEntityType":"Job",
        "sourceEntityName":"job_postings",
        "destinationEntityName":"Job",
        "integrationId": integrationId,
        "mapping": monsterSchema.constructFTMonMapping(),
    }
    console.log('mapping payload:', JSON.stringify(mappingPayload));
    var transformationApi = new IpaasSync.TransformationApi()
    var mappingResponse = await transformationApi.createMapping({'mapping':mappingPayload});
    await updateLocalCache({'transformationId': mappingResponse.data.id})
    renderData();
}

async function syncData(payload) {
    var syncApi = new IpaasSync.SyncApi()
    IpaasSync.ApiClient.instance.setVendorAccountId(payload.account_id);
    var configs = await $db.get('configs');
    payload['username'] = 'xrtpjobsx01';
    var syncApiPayload = {
        'payload': payload,
        'integrationId': configs.integrationId,
        'connectorId': configs.freshteamConnectorId,
        'schemaId': configs.freshteamJobPostingId,
        'nonce': (new Date()).getTime()
    }
    try {
        console.log(JSON.stringify(syncApiPayload))
        var syncResponse = await syncApi.startSync({'sync':syncApiPayload});
        console.log('SyncResponse:', JSON.stringify(syncResponse))
    } catch (e){
        console.log('Error in synching', e);
    }
    renderData();
}

async function updateCache(payload){
    $db.update('configs',"set", payload.data).then(
        function(){
            console.log('updated the details in cache successfully.');
            renderData()
        },
        function(error){
            console.log('update of the details in cache failed.');
            renderData(error)
        }
    );
}

async function updateLocalCache(payload){
    $db.update('configs',"set", payload).then(
        function(){
            console.log('updated the details in cache successfully.');
        },
        function(error){
            console.log('update of the details in cache failed.', error);
        }
    );
}

function getCache(payload){
    console.log(payload)
    $db.get('configs').then(
        function(data){
            console.log('server: fetched the details in cache successfully.');
            renderData(null, data)
        },
        function(error){
            console.log('server: update of the details in cache failed.');
            renderData(error)
        }
    );
}

async function getSyncStatus(payload) {
    IpaasSync.ApiClient.instance.setVendorAccountId(payload.account_id);;
    var configs = await $db.get('configs');
    var logs = {}
    var syncApi = new IpaasSync.SyncApi();
    try {
        console.log('configs', JSON.stringify(configs))
        var requestPayload = {'transformationId' : configs.transformationId}
        var syncStatusResponse = await syncApi.getSyncStatus(requestPayload);
        syncStatusResponse = syncStatusResponse.data;
        logs = syncStatusResponse;
        renderData(null, logs);
    } catch(e) {
        console.log('Error while fetching the syncStatus', e);
    }
}


exports = {

  events: [
    { event: 'onAppInstall', callback: 'installApp' },
    { event: 'onJobPostingUpdate', callback: 'updateJobIfExists' },
    { event: 'onAppUninstall', callback: 'uninstallApp' }
  ],

  connectFreshteam: connectFreshteam,
  createJobPostingSchema: createJobPostingSchema,
  connectMonster:connectMonster,
  createMonsterJobPostingSchema: createMonsterJobPostingSchema,
  createMapping:createMapping,
  syncData: syncData,
  updateCache:updateCache,
  getSyncStatus: getSyncStatus,
  getCache:getCache,
  installApp: async function(payload) {
    //create the integration
    try {
        IpaasSync.ApiClient.instance.setVendorAccountId(payload.account_id);
        await IpaasSync.ApiClient.instance.app.setupApp()
        console.log('Installed the app successfully');
        renderData(null, {"message": "app installed successfully"})
    } catch(e) {
        console.log('Error while installing the app', error)
        renderData(error)
    }
  },
  uninstallApp: function(payload){
    IpaasSync.ApiClient.instance.setVendorAccountId(payload.account_id);
    IpaasSync.ApiClient.instance.app.uninstallApp()
    .then(
        function(){ 
            console.log('Uninstalled the app successfully');
            renderData()
        },
        function(error) {
            console.log('Error while Uninstalled the app', error)
            renderData(error)
        }
    )
  },
  updateJobIfExists: async function(payload){
      try {
        console.log("got the event for job update", JSON.stringify(payload));
        var job = payload.data.jobposting;
        
        var data = await $db.get('configs')
        if (data['job_postings'].hasOwnProperty(job.id)){
            var cachedData = data['job_postings'][job.id];
            // console.log(cachedData)
            job['job_category'] = cachedData.job_category;
            job['job_occupation'] = cachedData.job_occupation;
            // console.log('Printing the job: ', JSON.stringify(job))
            job.account_id = payload.account_id;
            job['branch'] = payload['data']['associations']['branch']
            job['department'] = payload['data']['associations']['department']
            console.log("got the event for job update", JSON.stringify(payload));
            await syncData(job);
        } else {
            console.log('Job not already published');
        }
      } catch(e) {
            console.log('Error while updating the job posting', e)
      }
  }

};
