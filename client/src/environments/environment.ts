// The file contents for the current environment will overwrite these during build.
// The build system defaults to the dev environment which uses `environment.ts`, but if you do
// `ng build --env=prod` then `environment.prod.ts` will be used instead.
// The list of which env maps to which file can be found in `.angular-cli.json`.

export const environment = {
  service:'SMART_INFRASTRUCTURE',
  production: false,
  baseApi: 'https://dev.aitheon.com',
  orchestratorURI: '/orchestrator',
  addverbURI: '/interfaces/ril-addverb',
  itemManagerURI: '/item-manager',
  deviceManagerURI: '/device-manager',
  smartInfrastructureURI: '',
  googleMapKey: 'AIzaSyCvbpFXw0Npp-7cXeBunUClUWh0KF9CPLo',
  usersURI: '/users',
  omsURI:'/oms'
};

