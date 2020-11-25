const IntegrationApi = require('../../api/IntegrationApi');
const ApiClient = require('../../ApiClient');

var integrationService = require('../integrationService/integration');
var connectorService = require('../connectorService/connector');
var transformationService = require('../transformationService/transformation');

var integrationApi = new IntegrationApi();

class App {

    constructor(appuuid, connectorA, connectorB, entities_list) {
        this.appuuid = appuuid;
        this.connectorA = connectorA;
        this.connectorB = connectorB;
        this.entities_list = entities_list;
    }

    /**
     * App setup - run during the app's installation
     * Does the following :
     *  - create integration 
     *  - create connect form for both of the connectors
     *  - create the Transformation select form
     */
    setupApp() {
        var app = this;
        return new Promise(function(resolve, reject) {
            integrationService.createIntegration().then(
                function(integration) {
                    console.log("Integration response data: ", JSON.stringify(integration));
                    connectorService.createConnectForm(app.connectorA, true).then(
                        function(sourceConnector) {
                            console.log("Source Form creation response: ", sourceConnector);
                            connectorService.createConnectForm(app.connectorB, false).then(
                                function(destinationConnector) {
                                    console.log("Destination Form creation response: ", destinationConnector);
                                    transformationService.createTransformationSelectForm(app.entities_list).then(
                                        function(success) {
                                            console.log('Created the transformation selection form successfully.', success);
                                            resolve({"message":"success"});
                                        },
                                        function(error) {
                                            console.log('Failed to create the transformation selection form.');
                                            reject(error);
                                        }
                                    )
                                },
                                function(error) {
                                    console.log('Error while creating the destination connect form', error);
                                    reject(error);
                                }
                            );
                        },
                        function(error) {
                            console.log('Error while creating the source connect form', error);
                            reject(error);
                        }
                    );
                },
                function(error) {
                    console.log("Error while creating integration", error);
                    reject(error);
                }
            );
        }); 
    }
    
    /**
     * Unintsall app by the external App ID
     * Method moved under app to make it more specific to the app.
     */
    uninstallApp() {
        var app = this;
        return new Promise(function(resolve, reject) {
            integrationApi.deleteApp(app.appuuid).then(
                function() {
                    console.log("Successfully uninstalled app..");
                    resolve({ "success": true } );
                }, function(error) {
                    reject(error);
                }
            );
        });
    }
}

module.exports = {
    App
}
