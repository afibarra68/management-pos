import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

// Optimizaciones de Express
app.disable('x-powered-by'); // Ocultar información del servidor
app.set('trust proxy', true); // Confiar en proxies reversos para obtener IP real

// Nota: El proxy para /mt-api se maneja con Nginx en producción
// En desarrollo, Angular CLI usa proxy.conf.json
// Node.js solo maneja SSR y archivos estáticos

/**
 * Serve static files from /browser con optimizaciones
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
    etag: true, // Habilitar ETags para mejor cacheo
    lastModified: true, // Habilitar Last-Modified headers
  }),
);

/**
 * Middleware para manejo de errores optimizado
 */
const handleSSRRequest = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const response = await angularApp.handle(req);
    if (response) {
      writeResponseToNodeResponse(response, res);
    } else {
      next();
    }
  } catch (error) {
    // Log del error para debugging
    console.error('SSR Error:', error);
    // Pasar al siguiente middleware o manejar error apropiadamente
    next(error);
  }
};

/**
 * Handle all other requests by rendering the Angular application (SSR).
 */
app.use(handleSSRRequest);

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build).
 */
export const reqHandler = createNodeRequestHandler(app);
