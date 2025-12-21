# Guía para Levantar Management-POS en Red Local

Esta guía explica cómo configurar y ejecutar la aplicación **management-pos** en un entorno de red local, permitiendo que otros dispositivos en la misma red puedan acceder a la aplicación.

## 📋 Requisitos Previos

- **Node.js**: Versión 20 o superior
- **npm**: Incluido con Node.js
- **Angular CLI**: Se instalará automáticamente con las dependencias
- **Backend API**: Debe estar corriendo en `http://localhost:9000` (o configurar el proxy según tu entorno)

## 🚀 Instalación

### 1. Instalar Dependencias

Navega al directorio del proyecto y ejecuta:

```bash
cd management-pos
npm install
```

Esto instalará todas las dependencias necesarias, incluyendo:
- Angular 20.3.0
- PrimeNG 20.0.0
- Express 5.1.0 (para SSR)
- Otras dependencias del proyecto

### 2. Verificar Instalación

Verifica que todo esté correcto:

```bash
npm run ng version
```

Deberías ver la versión de Angular CLI instalada.

## ⚙️ Configuración

### Configuración del Proxy

La aplicación está configurada para usar un proxy que redirige las peticiones al backend. El archivo `proxy.conf.json` contiene:

```json
{
  "/mt-api": {
    "target": "http://localhost:9000",
    "secure": false,
    "changeOrigin": true,
    "logLevel": "debug",
    "pathRewrite": {
      "^/mt-api": ""
    }
  },
  "/api": {
    "target": "http://localhost:9000",
    "secure": false,
    "changeOrigin": true,
    "logLevel": "debug",
    "pathRewrite": {
      "^/api": ""
    }
  }
}
```

**Nota**: Si tu backend está en otra dirección o puerto, modifica el `target` en `proxy.conf.json`.

### Configuración para Red Local

Por defecto, Angular CLI solo permite conexiones desde `localhost`. Para permitir acceso desde otros dispositivos en la red local, necesitas usar la opción `--host`.

## 🏃 Ejecutar la Aplicación

### Opción 1: Modo Desarrollo (Recomendado para Red Local)

Para levantar la aplicación y permitir acceso desde otros dispositivos en la red:

```bash
npm start -- --host 0.0.0.0
```

O usando el comando completo:

```bash
ng serve --port 4202 --proxy-config proxy.conf.json --host 0.0.0.0
```

**Explicación de parámetros:**
- `--port 4202`: Puerto donde se ejecutará la aplicación
- `--proxy-config proxy.conf.json`: Configuración del proxy para el backend
- `--host 0.0.0.0`: Permite conexiones desde cualquier IP de la red local

### Opción 2: Modo Desarrollo (Solo Localhost)

Si solo necesitas acceso desde la misma máquina:

```bash
npm start
```

O:

```bash
ng serve --port 4202 --proxy-config proxy.conf.json
```

### Opción 3: Modo SSR (Server-Side Rendering)

Si necesitas ejecutar con SSR:

```bash
# 1. Primero compilar
npm run build -- --configuration development

# 2. Luego ejecutar el servidor SSR
npm run serve:ssr:management-pos
```

**Nota**: El servidor SSR se ejecutará en el puerto 4000 por defecto (configurable con variable de entorno `PORT`).

## 🌐 Acceso desde la Red Local

### Obtener tu IP Local

**Windows:**
```powershell
ipconfig
```
Busca la dirección IPv4 (ejemplo: `192.168.1.100`)

**Linux/Mac:**
```bash
ifconfig
# o
ip addr show
```

### Acceder desde Otros Dispositivos

Una vez que la aplicación esté corriendo con `--host 0.0.0.0`, podrás acceder desde otros dispositivos usando:

```
http://TU_IP_LOCAL:4202
```

**Ejemplo:**
```
http://192.168.1.100:4202
```

### Verificar que Funciona

1. **Desde la misma máquina:**
   - Abre: `http://localhost:4202`

2. **Desde otro dispositivo en la red:**
   - Abre: `http://TU_IP_LOCAL:4202`
   - Asegúrate de que ambos dispositivos estén en la misma red

## 🔧 Scripts Disponibles

El proyecto incluye los siguientes scripts en `package.json`:

```json
{
  "start": "ng serve --port 4202 --proxy-config proxy.conf.json",
  "build": "ng build",
  "watch": "ng build --watch --configuration development",
  "test": "ng test",
  "serve:ssr:management-pos": "node dist/management-pos/server/server.mjs"
}
```

### Comandos Útiles

```bash
# Iniciar servidor de desarrollo
npm start

# Iniciar servidor accesible desde red local
npm start -- --host 0.0.0.0

# Compilar para producción
npm run build

# Compilar en modo watch (desarrollo)
npm run watch

# Ejecutar tests
npm test
```

## 🛠️ Solución de Problemas

### Error: "Port 4202 is already in use"

**Solución:**
```bash
# Cambiar el puerto
ng serve --port 4203 --proxy-config proxy.conf.json --host 0.0.0.0
```

O encontrar y cerrar el proceso que está usando el puerto:

**Windows:**
```powershell
netstat -ano | findstr :4202
taskkill /PID <PID> /F
```

**Linux/Mac:**
```bash
lsof -ti:4202 | xargs kill -9
```

### No puedo acceder desde otro dispositivo

**Verificaciones:**

1. **Firewall:**
   - Asegúrate de que el firewall permite conexiones en el puerto 4202
   - Windows: Agregar excepción en Firewall de Windows
   - Linux: `sudo ufw allow 4202`

2. **Host configurado:**
   - Verifica que ejecutaste con `--host 0.0.0.0`
   - Sin esta opción, solo `localhost` puede acceder

3. **Misma red:**
   - Ambos dispositivos deben estar en la misma red local
   - Verifica que no estás usando una VPN que aísle los dispositivos

4. **IP correcta:**
   - Verifica tu IP local con `ipconfig` (Windows) o `ifconfig` (Linux/Mac)

### Error: "Could not resolve './server'" o similar

**Solución:**
```bash
# Limpiar caché y reconstruir
Remove-Item -Path ".angular" -Recurse -Force
Remove-Item -Path "dist" -Recurse -Force
npm install
npm run build -- --configuration development
```

### El proxy no funciona

**Verificaciones:**

1. **Backend corriendo:**
   - Verifica que el backend está en `http://localhost:9000`
   - Prueba: `curl http://localhost:9000/health` (o endpoint de tu API)

2. **Configuración del proxy:**
   - Verifica que `proxy.conf.json` tiene la configuración correcta
   - El `target` debe apuntar a donde está tu backend

3. **Logs del proxy:**
   - Con `logLevel: "debug"` en `proxy.conf.json`, verás logs en la consola

## 📝 Configuración Avanzada

### Cambiar el Puerto

Edita `package.json`:

```json
{
  "scripts": {
    "start": "ng serve --port 4203 --proxy-config proxy.conf.json"
  }
}
```

### Cambiar la IP del Backend

Edita `proxy.conf.json`:

```json
{
  "/api": {
    "target": "http://192.168.1.50:9000",  // IP de tu backend en la red
    "secure": false,
    "changeOrigin": true
  }
}
```

### Variables de Entorno

Puedes crear un archivo `.env` para configuraciones:

```env
BACKEND_URL=http://localhost:9000
PORT=4202
```

Y usar en `proxy.conf.json` (requiere configuración adicional).

## 🔒 Seguridad

**Importante para producción:**

- ⚠️ **NO uses `--host 0.0.0.0` en producción** sin medidas de seguridad adecuadas
- 🔐 Usa HTTPS en producción
- 🛡️ Configura autenticación y autorización
- 🚫 Limita el acceso con firewall
- 📝 Revisa los logs regularmente

## 📚 Recursos Adicionales

- [Angular CLI Documentation](https://angular.dev/tools/cli)
- [Angular SSR Guide](https://angular.dev/guide/ssr)
- [Proxy Configuration](https://angular.dev/tools/cli/serve#proxying-to-a-backend-server)

## ✅ Checklist de Inicio

- [ ] Node.js 20+ instalado
- [ ] Dependencias instaladas (`npm install`)
- [ ] Backend corriendo en puerto 9000
- [ ] Proxy configurado correctamente
- [ ] Firewall configurado (si es necesario)
- [ ] IP local identificada
- [ ] Aplicación corriendo con `--host 0.0.0.0`
- [ ] Acceso verificado desde otro dispositivo

---

**Última actualización**: Diciembre 2024  
**Versión de Angular**: 20.3.0  
**Puerto por defecto**: 4202






