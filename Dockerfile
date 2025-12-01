# Dockerfile para Angular POS Frontend
FROM node:20-alpine AS build
WORKDIR /app

# Copiar archivos de configuración
COPY package*.json ./
RUN npm ci

# Copiar código fuente
COPY . .

# Compilar la aplicación para producción
RUN npm run build -- --configuration production

# Imagen final con Nginx
FROM nginx:alpine
WORKDIR /usr/share/nginx/html

# Copiar archivos compilados
COPY --from=build /app/dist/management-pos/browser .

# Copiar configuración de Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

