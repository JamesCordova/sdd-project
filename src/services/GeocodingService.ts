import type { Coordinates, GeocodingService } from '../types';
import { GeocodingError } from '../types';

/** Shape of a single result entry from the Open-Meteo Geocoding API. */
interface GeocodingResult {
  name: string;
  latitude: number;
  longitude: number;
}

/** Shape of the Geocoding API JSON response. */
interface GeocodingApiResponse {
  results?: GeocodingResult[];
}

const GEOCODING_BASE_URL = 'https://geocoding-api.open-meteo.com/v1/search';

/**
 * Implements GeocodingService using the Open-Meteo Geocoding API.
 * Converts a city name into geographic coordinates.
 */
export class GeocodingServiceImpl implements GeocodingService {
  /**
   * Geocodes a city name to coordinates.
   * @throws {GeocodingError} with kind='NOT_FOUND' if results is absent or empty.
   * @throws {GeocodingError} with kind='NETWORK' on network errors or non-2xx HTTP responses.
   */
  async geocode(cityName: string): Promise<Coordinates> {
    const url = `${GEOCODING_BASE_URL}?name=${encodeURIComponent(cityName)}&count=1&language=es&format=json`;

    let response: Response;
    try {
      response = await fetch(url);
    } catch {
      // fetch() itself threw — network error, DNS failure, etc.
      throw new GeocodingError('NETWORK', 'Error de red al contactar el servicio de geocodificación.');
    }

    if (!response.ok) {
      throw new GeocodingError('NETWORK', `El servicio de geocodificación respondió con el estado ${response.status}.`);
    }

    let data: GeocodingApiResponse;
    try {
      data = (await response.json()) as GeocodingApiResponse;
    } catch {
      throw new GeocodingError('NETWORK', 'La respuesta del servicio de geocodificación no es válida.');
    }

    if (!data.results || data.results.length === 0) {
      throw new GeocodingError('NOT_FOUND', 'No se encontró la ciudad ingresada.');
    }

    const { latitude, longitude, name } = data.results[0];

    return { latitude, longitude, cityName: name };
  }
}

export default GeocodingServiceImpl;
