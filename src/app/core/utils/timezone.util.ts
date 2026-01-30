/**
 * Utilidad para manejar el timezone del usuario desde el token JWT
 */

/**
 * Decodifica un token JWT y extrae los claims del payload
 * @param token Token JWT
 * @returns Claims del token o null si hay error
 */
export function decodeJwtToken(token: string): any | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    // El payload es la segunda parte (índice 1)
    const payload = parts[1];

    // Decodificar base64url (JWT usa base64url, no base64 estándar)
    // Reemplazar caracteres específicos de base64url
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');

    // Decodificar y parsear JSON
    const decoded = atob(padded);
    return JSON.parse(decoded);
  } catch (error) {
    console.error('Error al decodificar token JWT:', error);
    return null;
  }
}

/**
 * Extrae el timezone del token JWT
 * @param token Token JWT
 * @returns Timezone (ej: "America/Bogota") o null si no está disponible
 */
export function getTimezoneFromToken(token: string | null): string | null {
  if (!token) {
    return null;
  }

  const claims = decodeJwtToken(token);
  if (!claims || !claims.timezone) {
    return null;
  }

  return claims.timezone;
}

/**
 * Configura el timezone del sistema usando el timezone del token
 * @param timezone Timezone a configurar (ej: "America/Bogota")
 */
export function configureTimezone(timezone: string | null): void {
  if (!timezone) {
    // Si no hay timezone, usar el del sistema por defecto
    return;
  }

  try {
    // Guardar el timezone en localStorage para uso futuro
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('user_timezone', timezone);
    }

    // Nota: JavaScript no permite cambiar el timezone del sistema directamente
    // Pero podemos usar librerías como date-fns-tz o moment-timezone para trabajar con timezones específicos
    // Por ahora, guardamos el timezone para que los componentes puedan usarlo
    console.log(`Timezone configurado: ${timezone}`);
  } catch (error) {
    console.error('Error al configurar timezone:', error);
  }
}

/**
 * Obtiene el timezone configurado del usuario
 * @returns Timezone configurado o el timezone del sistema por defecto
 */
export function getUserTimezone(): string {
  if (typeof localStorage !== 'undefined') {
    const storedTimezone = localStorage.getItem('user_timezone');
    if (storedTimezone) {
      return storedTimezone;
    }
  }

  // Fallback: usar el timezone del sistema
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}
