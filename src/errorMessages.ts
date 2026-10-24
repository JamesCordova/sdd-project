import type { GeocodingErrorKind, WeatherErrorKind } from './types';

/**
 * Localised (es) user-facing error messages, each with the cause and a
 * suggested action (Design — Error Handling table; Req 5.3, 5.6, 5.7).
 */
/** Exact text mandated by task 14.2; the suggested action is the input placeholder. */
export const VALIDATION_EMPTY_INPUT = 'El nombre de la ciudad es requerido.';

export const GEOCODING_ERROR_MESSAGES: Record<GeocodingErrorKind, string> = {
  NOT_FOUND: 'No se encontró la ciudad ingresada. Verifica el nombre y vuelve a intentarlo.',
  NETWORK:
    'El servicio de geocodificación no está disponible. Verifica tu conexión a internet e inténtalo de nuevo.',
};

export const WEATHER_ERROR_MESSAGES: Record<WeatherErrorKind, string> = {
  NETWORK:
    'El servicio meteorológico no está disponible. Verifica tu conexión a internet e inténtalo de nuevo.',
  INCOMPLETE_DATA:
    'Los datos meteorológicos recibidos están incompletos. Inténtalo de nuevo en unos momentos.',
};

export const UNKNOWN_ERROR_MESSAGE = 'Error desconocido. Inténtalo de nuevo.';
