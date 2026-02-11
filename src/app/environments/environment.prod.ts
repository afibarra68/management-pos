// Configuración para producción
export const environment = {
    production: true,
    applicationTimeout: 300000,
    rowsPerPage: 10,
    activeMocks: false,
    // Conexión directa al backend sin pasar por Nginx (evita 302)
    // Las peticiones van directamente al backend sin proxy
    apiAuthJwt: 'https://api-flux.alparquear.com',
    apiUrl: 'https://api-flux.alparquear.com',
    /** URL del servicio de impresión en producción (parking-printing); ajustar si va por otro dominio/puerto */
    printApiUrl: '/print',
    serviceCode: '100000001', // Código de servicio para transacciones de parqueadero
    /** Si true, la app usa el módulo POS v2 (/v2pos); si false, usa el POS actual (/pos) */
    seeVersion2: true,
    /** Ruta por defecto del POS (debe coincidir con seeVersion2) */
    get defaultPosPath(): string { return this.seeVersion2 ? '/v2pos' : '/pos'; }
};

