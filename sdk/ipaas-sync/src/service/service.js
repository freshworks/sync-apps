var ConnectorService = require('./connectorService/connector');
var IntegrationService = require('./integrationService/integration');
var TransformationService = require('./transformationService/transformation');
var AppService = require('./appService/app');
var SchemaService = require('./connectorService/schema');
var MatchingService = require('./transformationService/matching');
var LogService = require('./logService/log');
var SyncService = require('./syncService/sync');
var FreshsalesService = require('./connectorService/freshsales');

module.exports = {
    ConnectorService,
    IntegrationService,
    TransformationService,
    App: AppService.App,
    SchemaService,
    MatchingService,
    LogService,
    SyncService,
    FreshsalesService
}

