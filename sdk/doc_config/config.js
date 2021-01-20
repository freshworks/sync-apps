module.exports = {
    title: 'IPaaS SDK',
    description: "Documentation for the API's that are available in IPaaS",
    themeConfig: {
      sidebar: [
        ['/docs/AppApi', 'App'],
        ['/docs/ConnectorApi', 'Connector'],
        ['/docs/IntegrationApi', 'Integration'],
        ['/docs/MatchingApi', 'Matching'],
        ['/docs/LogApi', 'Log'],
        ['/docs/SyncApi', 'Sync'],
        ['/docs/TransformationApi', 'Transformation']
      ],
      smoothScroll: true
    },
    base: '/sdk/'
  }