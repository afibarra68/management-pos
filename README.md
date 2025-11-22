# T-Parking - Frontend

Frontend Angular para el sistema de gestión de parking.

## 🚀 Tecnologías

- **Angular** 20.3.0
- **TypeScript** 5.9.2
- **RxJS** 7.8.0
- **Angular SSR** (Server-Side Rendering)

## 📋 Requisitos Previos

- Node.js (versión 18 o superior)
- npm o yarn
- Backend Spring Boot corriendo en `http://localhost:9000`

## 🛠️ Instalación

```bash
# Instalar dependencias
npm install
```

## ▶️ Ejecutar en Desarrollo

```bash
# Iniciar servidor de desarrollo con proxy
npm start
```

La aplicación estará disponible en `http://localhost:4200`

## 📁 Estructura del Proyecto

```
src/app/
├── components/
│   ├── login/          # Componente de autenticación
│   └── dashboard/      # Panel principal después del login
├── services/
│   └── auth.service.ts # Servicio de autenticación
├── interceptors/
│   └── auth.interceptor.ts # Interceptor para agregar JWT token
├── app.routes.ts       # Configuración de rutas
└── app.config.ts       # Configuración de la aplicación
```

## 🔐 Autenticación

El sistema utiliza JWT (JSON Web Tokens) para la autenticación:

- **Login**: `/api/auth/login`
- El token se guarda automáticamente en `localStorage`
- El interceptor HTTP agrega el token a todas las peticiones protegidas

### Endpoints Públicos (sin token)
- `/api/auth/login`
- `/api/users/create_public_user`

## 🔄 Proxy Configuration

El proyecto utiliza un proxy para evitar problemas de CORS:

- **Archivo**: `proxy.conf.json`
- **Configuración**: Redirige `/api` → `http://localhost:9000`
- **Secure**: `false` (permite HTTP)

## 🎨 Características

- ✅ Login con validación de formularios
- ✅ Dashboard con información del usuario
- ✅ Manejo de tokens JWT automático
- ✅ Interceptor HTTP para autenticación
- ✅ Gestión de roles de usuario
- ✅ Manejo de errores

## 📝 Scripts Disponibles

```bash
npm start              # Servidor de desarrollo con proxy
npm run build          # Compilar para producción
npm test              # Ejecutar tests
npm run watch         # Build en modo watch
```

## 🔗 Integración con Backend

- **URL Base**: `http://localhost:9000`
- **Proxy**: `/api` → `http://localhost:9000`
- **Puerto Frontend**: `4200`
- **Puerto Backend**: `9000`

## 📦 Build para Producción

```bash
npm run build
```

Los archivos compilados se generan en `dist/t-parking/`

## 🧪 Testing

```bash
npm test
```

## 📄 Licencia

Proyecto privado - Sistema de Gestión de Parking
