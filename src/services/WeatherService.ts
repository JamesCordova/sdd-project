import type { Coordinates, ForecastData, WeatherService } from '../types';
import { WeatherError } from '../types';

const WEATHER_API_BASE = 'https://api.open-meteo.com/v1/forecast';
const TIMEOUT_MS = 10_000;

/** Implementation of WeatherService using the Open-Meteo Forecast API. */
export class WeatherServiceImpl implements WeatherService {
  /**
   * Fetches the current weather forecast for the given coordinates.
   *
   * @throws {WeatherError} kind='NETWORK'         on network error, timeout, or non-2xx HTTP response.
   * @throws {WeatherError} kind='INCOMPLETE_DATA' if any of the three required numeric fields is
   *                                               missing or non-numeric in the response.
   */
  async getForecast(coords: Coordinates): Promise<ForecastData> {
    const url = new URL(WEATHER_API_BASE);
    url.searchParams.set('latitude', String(coords.latitude));
    url.searchParams.set('longitude', String(coords.longitude));
    url.searchParams.set('current', 'temperature_2m,relative_humidity_2m,precipitation');

    // 10-second timeout via AbortController
    const controller = new AbortController();
    const timerId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(url.toString(), { signal: controller.signal });
    } catch {
      // fetch() rejects on network errors AND on AbortError (timeout)
      throw new WeatherError('NETWORK', 'El servicio meteorológico no está disponible.');
    } finally {
      clearTimeout(timerId);
    }

    if (!response.ok) {
      throw new WeatherError('NETWORK', 'El servicio meteorológico no está disponible.');
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new WeatherError('INCOMPLETE_DATA', 'Los datos meteorológicos recibidos están incompletos.');
    }

    // Validate that the three required fields are present and numeric
    const current = (body as Record<string, unknown>)?.['current'];
    if (current === null || typeof current !== 'object') {
      throw new WeatherError('INCOMPLETE_DATA', 'Los datos meteorológicos recibidos están incompletos.');
    }

    const currentObj = current as Record<string, unknown>;
    const temp = currentObj['temperature_2m'];
    const humidity = currentObj['relative_humidity_2m'];
    const precip = currentObj['precipitation'];

    if (typeof temp !== 'number' || typeof humidity !== 'number' || typeof precip !== 'number') {
      throw new WeatherError('INCOMPLETE_DATA', 'Los datos meteorológicos recibidos están incompletos.');
    }

    return {
      cityName: coords.cityName,
      temperatureCelsius: temp,
      relativeHumidityPercent: humidity,
      precipitationMm: precip,
    };
  }
}

export default WeatherServiceImpl;
