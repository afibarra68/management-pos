# Multi-stage build para optimizar el tamaño de la imagen
FROM node:20-alpine AS builder

# Establecer directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias (regenera package-lock.json si está desactualizado)
RUN if [ -f package-lock.json ]; then \
      npm ci || (echo "⚠️  package-lock.json desactualizado, regenerando..." && npm install); \
    else \
      echo "⚠️  package-lock.json no existe, generando..." && npm install; \
    fi

# Copiar código fuente
COPY . .

# Construir la aplicación para producción con SSR
RUN npm run build

# Stage 2: Imagen de producción con Node.js (soporta SSR y contenido dinámico)
FROM node:20-alpine

# Establecer directorio de trabajo
WORKDIR /app

# Copiar package.json y package-lock.json para instalar dependencias
COPY --from=builder /app/package*.json /app/

# Instalar solo dependencias de producción necesarias para el servidor
# Usa npm install como fallback si npm ci falla (cuando el lock file está desactualizado)
RUN if [ -f package-lock.json ]; then \
      npm ci --only=production || (echo "⚠️  package-lock.json desactualizado, usando npm install..." && npm install --only=production); \
    else \
      echo "⚠️  package-lock.json no encontrado, usando npm install..." && npm install --only=production; \
    fi && \
    npm cache clean --force

# Verificar que las dependencias críticas estén instaladas
RUN echo "Verificando dependencias del servidor..." && \
    npm list express @angular/ssr 2>/dev/null || echo "Algunas dependencias pueden estar en el bundle" && \
    # Verificar que los módulos pueden ser requeridos
    node -e "try { require('express'); console.log('✅ Dependencias del servidor verificadas correctamente'); } catch(e) { console.error('❌ Error:', e.message); process.exit(1); }"

# Copiar archivos construidos desde el stage anterior
COPY --from=builder /app/dist/management-pos /app/dist/management-pos

# Verificar que el servidor compilado existe y es ejecutable
RUN test -f dist/management-pos/server/server.mjs && \
    echo "✅ Servidor compilado encontrado" || \
    (echo "❌ Error: Servidor compilado no encontrado" && exit 1)

# Crear usuario no-root para seguridad
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Cambiar ownership de los archivos
RUN chown -R nodejs:nodejs /app

# Cambiar a usuario no-root
USER nodejs

# Exponer puerto (por defecto 4000, configurable con variable de entorno)
EXPOSE 4000

# Variables de entorno
ENV PORT=4000
ENV NODE_ENV=production
ENV API_URL=http://10.116.0.5:9000

# Comando para iniciar el servidor Node.js con SSR
CMD ["node", "dist/management-pos/server/server.mjs"]
