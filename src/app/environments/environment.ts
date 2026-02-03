// This file can be replaced during build by using the `fileReplacements` array.
// `ng build --prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
    production: false,
    applicationTimeout: 300000,
    rowsPerPage: 10,
    activeMocks: false,
    apiAuthJwt: '/mt-api',
    apiUrl: '/mt-api',
    /** URL del servicio de impresión: relativa para usar proxy en dev (/print -> localhost:8080) */
    printApiUrl: '/print',
    serviceCode: '100000001' // Código de servicio para transacciones de parqueadero
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/dist/zone-error';  // Included with Angular CLI.
