// Configuración para producción en Google Cloud
export const environment = {
    production: true,
    applicationTimeout: 300000,
    rowsPerPage: 10,
    activeMocks: false,
    // URL del backend en Cloud Run (actualizar con la URL real después del despliegue)
    apiAuthJwt: 'https://parking-app-backend-XXXXX.run.app',
    apiUrl: 'https://parking-app-backend-XXXXX.run.app',
    serviceCode: '100000001' // Código de servicio para transacciones de parqueadero
};

