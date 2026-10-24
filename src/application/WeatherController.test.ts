import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WeatherControllerImpl } from './WeatherController.js';
import { StateManager } from './StateManager.js';
import { GeocodingError, WeatherError } from '../types.js';
import type {
  GeocodingService,
  InputValidator,
  WeatherService,
  Coordinates,
  ForecastData,
} from '../types.js';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const sampleCoords: Coordinates = {
  latitude: 52.52437,
  longitude: 13.41053,
  cityName: 'Berlin',
};

const sampleForecast: ForecastData = {
  cityName: 'Berlin',
  temperatureCelsius: 12.5,
  relativeHumidityPercent: 72,
  precipitationMm: 0.0,
};

// ── Factory helpers ───────────────────────────────────────────────────────────

function makeValidator(returnValue: string | null = null): InputValidator {
  return { validate: vi.fn().mockReturnValue(returnValue) };
}

function makeGeocoding(result: Promise<Coordinates> = Promise.resolve(sampleCoords)): GeocodingService {
  return { geocode: vi.fn().mockReturnValue(result) };
}

function makeWeatherService(result: Promise<ForecastData> = Promise.resolve(sampleForecast)): WeatherService {
  return { getForecast: vi.fn().mockReturnValue(result) };
}

function makeController(
  validator: InputValidator,
  geocoding: GeocodingService,
  weather: WeatherService,
  stateManager: StateManager,
): WeatherControllerImpl {
  return new WeatherControllerImpl(validator, geocoding, weather, stateManager);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('WeatherController', () => {
  let stateManager: StateManager;

  beforeEach(() => {
    stateManager = new StateManager();
    vi.spyOn(stateManager, 'setValidationError');
    vi.spyOn(stateManager, 'startSearch');
    vi.spyOn(stateManager, 'setForecast');
    vi.spyOn(stateManager, 'setServiceError');
    vi.spyOn(stateManager, 'endSearch');
  });

  // ── Scenario 1: Full success flow ──────────────────────────────────────────

  describe('full success flow', () => {
    it('calls setValidationError(null) to clear any previous validation error before searching', async () => {
      const validator = makeValidator(null); // valid input
      const geocoding = makeGeocoding();
      const weather = makeWeatherService();
      const controller = makeController(validator, geocoding, weather, stateManager);

      await controller.search('Berlin');

      expect(stateManager.setValidationError).toHaveBeenCalledWith(null);
    });

    it('calls startSearch() to enable the loading indicator (Req 2.6, 5.2)', async () => {
      const validator = makeValidator(null);
      const geocoding = makeGeocoding();
      const weather = makeWeatherService();
      const controller = makeController(validator, geocoding, weather, stateManager);

      await controller.search('Berlin');

      expect(stateManager.startSearch).toHaveBeenCalledOnce();
    });

    it('calls geocode() with the provided city name (Req 2.1)', async () => {
      const validator = makeValidator(null);
      const geocoding = makeGeocoding();
      const weather = makeWeatherService();
      const controller = makeController(validator, geocoding, weather, stateManager);

      await controller.search('Berlin');

      expect(geocoding.geocode).toHaveBeenCalledWith('Berlin');
    });

    it('calls getForecast() with the coordinates returned by geocode() (Req 3.1)', async () => {
      const validator = makeValidator(null);
      const geocoding = makeGeocoding();
      const weather = makeWeatherService();
      const controller = makeController(validator, geocoding, weather, stateManager);

      await controller.search('Berlin');

      expect(weather.getForecast).toHaveBeenCalledWith(sampleCoords);
    });

    it('calls setForecast() with the data returned by getForecast() (Req 3.2, 4.1)', async () => {
      const validator = makeValidator(null);
      const geocoding = makeGeocoding();
      const weather = makeWeatherService();
      const controller = makeController(validator, geocoding, weather, stateManager);

      await controller.search('Berlin');

      expect(stateManager.setForecast).toHaveBeenCalledWith(sampleForecast);
    });

    it('calls endSearch() after success to hide the loading indicator (Req 5.5)', async () => {
      const validator = makeValidator(null);
      const geocoding = makeGeocoding();
      const weather = makeWeatherService();
      const controller = makeController(validator, geocoding, weather, stateManager);

      await controller.search('Berlin');

      expect(stateManager.endSearch).toHaveBeenCalledOnce();
    });

    it('does not set any service error on success', async () => {
      const validator = makeValidator(null);
      const geocoding = makeGeocoding();
      const weather = makeWeatherService();
      const controller = makeController(validator, geocoding, weather, stateManager);

      await controller.search('Berlin');

      expect(stateManager.setServiceError).not.toHaveBeenCalled();
    });

    it('leaves isLoading as false in the final state', async () => {
      const validator = makeValidator(null);
      const geocoding = makeGeocoding();
      const weather = makeWeatherService();
      const controller = makeController(validator, geocoding, weather, stateManager);

      await controller.search('Berlin');

      expect(stateManager.getState().isLoading).toBe(false);
    });
  });

  // ── Scenario 2: GeocodingError clears loading ──────────────────────────────

  describe('geocoding error clears loading (Req 2.4, 5.5)', () => {
    it('calls setServiceError() with the NOT_FOUND user-facing message when geocoding returns NOT_FOUND (Req 2.4)', async () => {
      const validator = makeValidator(null);
      const geocoding = makeGeocoding(Promise.reject(new GeocodingError('NOT_FOUND')));
      const weather = makeWeatherService();
      const controller = makeController(validator, geocoding, weather, stateManager);

      await controller.search('UnknownCity');

      expect(stateManager.setServiceError).toHaveBeenCalledOnce();
      const [message] = vi.mocked(stateManager.setServiceError).mock.calls[0];
      // Design error table: "No se encontró la ciudad ingresada. Verifica el nombre y vuelve a intentarlo."
      expect(message).toContain('No se encontró la ciudad ingresada');
    });

    it('calls setServiceError() with the NETWORK user-facing message when geocoding returns NETWORK (Req 2.5)', async () => {
      const validator = makeValidator(null);
      const geocoding = makeGeocoding(Promise.reject(new GeocodingError('NETWORK')));
      const weather = makeWeatherService();
      const controller = makeController(validator, geocoding, weather, stateManager);

      await controller.search('Berlin');

      expect(stateManager.setServiceError).toHaveBeenCalledOnce();
      const [message] = vi.mocked(stateManager.setServiceError).mock.calls[0];
      // Design error table: "El servicio de geocodificación no está disponible. Verifica tu conexión..."
      expect(message).toContain('servicio de geocodificación no está disponible');
    });

    it('calls endSearch() even when geocoding throws (Req 5.5 — loading cleared on error)', async () => {
      const validator = makeValidator(null);
      const geocoding = makeGeocoding(Promise.reject(new GeocodingError('NOT_FOUND')));
      const weather = makeWeatherService();
      const controller = makeController(validator, geocoding, weather, stateManager);

      await controller.search('UnknownCity');

      expect(stateManager.endSearch).toHaveBeenCalledOnce();
    });

    it('leaves isLoading as false after a geocoding error', async () => {
      const validator = makeValidator(null);
      const geocoding = makeGeocoding(Promise.reject(new GeocodingError('NOT_FOUND')));
      const weather = makeWeatherService();
      const controller = makeController(validator, geocoding, weather, stateManager);

      await controller.search('UnknownCity');

      expect(stateManager.getState().isLoading).toBe(false);
    });

    it('does not call getForecast() when geocoding fails', async () => {
      const validator = makeValidator(null);
      const geocoding = makeGeocoding(Promise.reject(new GeocodingError('NOT_FOUND')));
      const weather = makeWeatherService();
      const controller = makeController(validator, geocoding, weather, stateManager);

      await controller.search('UnknownCity');

      expect(weather.getForecast).not.toHaveBeenCalled();
    });
  });

  // ── Scenario 3: WeatherError clears loading ────────────────────────────────

  describe('weather error clears loading (Req 3.3, 3.4, 5.5)', () => {
    it('calls setServiceError() with the NETWORK user-facing message when weather returns NETWORK (Req 3.4)', async () => {
      const validator = makeValidator(null);
      const geocoding = makeGeocoding();
      const weather = makeWeatherService(Promise.reject(new WeatherError('NETWORK')));
      const controller = makeController(validator, geocoding, weather, stateManager);

      await controller.search('Berlin');

      expect(stateManager.setServiceError).toHaveBeenCalledOnce();
      const [message] = vi.mocked(stateManager.setServiceError).mock.calls[0];
      // Design error table: "El servicio meteorológico no está disponible. Verifica tu conexión..."
      expect(message).toContain('servicio meteorológico no está disponible');
    });

    it('calls setServiceError() with the INCOMPLETE_DATA user-facing message when weather returns INCOMPLETE_DATA (Req 3.3)', async () => {
      const validator = makeValidator(null);
      const geocoding = makeGeocoding();
      const weather = makeWeatherService(Promise.reject(new WeatherError('INCOMPLETE_DATA')));
      const controller = makeController(validator, geocoding, weather, stateManager);

      await controller.search('Berlin');

      expect(stateManager.setServiceError).toHaveBeenCalledOnce();
      const [message] = vi.mocked(stateManager.setServiceError).mock.calls[0];
      // Design error table: "Los datos meteorológicos recibidos están incompletos. Inténtalo de nuevo..."
      expect(message).toContain('datos meteorológicos recibidos están incompletos');
    });

    it('calls endSearch() even when weather throws (Req 5.5 — loading cleared on error)', async () => {
      const validator = makeValidator(null);
      const geocoding = makeGeocoding();
      const weather = makeWeatherService(Promise.reject(new WeatherError('NETWORK')));
      const controller = makeController(validator, geocoding, weather, stateManager);

      await controller.search('Berlin');

      expect(stateManager.endSearch).toHaveBeenCalledOnce();
    });

    it('leaves isLoading as false after a weather error', async () => {
      const validator = makeValidator(null);
      const geocoding = makeGeocoding();
      const weather = makeWeatherService(Promise.reject(new WeatherError('NETWORK')));
      const controller = makeController(validator, geocoding, weather, stateManager);

      await controller.search('Berlin');

      expect(stateManager.getState().isLoading).toBe(false);
    });

    it('does not call setForecast() when weather fails', async () => {
      const validator = makeValidator(null);
      const geocoding = makeGeocoding();
      const weather = makeWeatherService(Promise.reject(new WeatherError('INCOMPLETE_DATA')));
      const controller = makeController(validator, geocoding, weather, stateManager);

      await controller.search('Berlin');

      expect(stateManager.setForecast).not.toHaveBeenCalled();
    });
  });

  // ── Scenario 4: Invalid input does not call Geocoding API ─────────────────

  describe('invalid input does not call Geocoding API (Req 1.5)', () => {
    it('calls setValidationError() with the error message when input is empty', async () => {
      const errorMsg = 'El nombre de la ciudad es requerido.';
      const validator = makeValidator(errorMsg);
      const geocoding = makeGeocoding();
      const weather = makeWeatherService();
      const controller = makeController(validator, geocoding, weather, stateManager);

      await controller.search('');

      expect(stateManager.setValidationError).toHaveBeenCalledWith(errorMsg);
    });

    it('does NOT call geocode() when the validator returns an error', async () => {
      const validator = makeValidator('El nombre de la ciudad es requerido.');
      const geocoding = makeGeocoding();
      const weather = makeWeatherService();
      const controller = makeController(validator, geocoding, weather, stateManager);

      await controller.search('   ');

      expect(geocoding.geocode).not.toHaveBeenCalled();
    });

    it('does NOT call startSearch() (no loading indicator) when input is invalid', async () => {
      const validator = makeValidator('El nombre de la ciudad es requerido.');
      const geocoding = makeGeocoding();
      const weather = makeWeatherService();
      const controller = makeController(validator, geocoding, weather, stateManager);

      await controller.search('');

      expect(stateManager.startSearch).not.toHaveBeenCalled();
    });

    it('does NOT call endSearch() when input is invalid (no search was started)', async () => {
      const validator = makeValidator('El nombre de la ciudad es requerido.');
      const geocoding = makeGeocoding();
      const weather = makeWeatherService();
      const controller = makeController(validator, geocoding, weather, stateManager);

      await controller.search('');

      expect(stateManager.endSearch).not.toHaveBeenCalled();
    });

    it('does NOT call getForecast() when input is invalid', async () => {
      const validator = makeValidator('El nombre de la ciudad es requerido.');
      const geocoding = makeGeocoding();
      const weather = makeWeatherService();
      const controller = makeController(validator, geocoding, weather, stateManager);

      await controller.search('\t\n');

      expect(weather.getForecast).not.toHaveBeenCalled();
    });
  });

  // ── Scenario 5: Unknown error fallback ────────────────────────────────────

  describe('unknown error fallback (Req 5.6)', () => {
    it('calls setServiceError() with a generic fallback message for unexpected errors', async () => {
      const validator = makeValidator(null);
      const geocoding = makeGeocoding(Promise.reject(new Error('Something unexpected')));
      const weather = makeWeatherService();
      const controller = makeController(validator, geocoding, weather, stateManager);

      await controller.search('Berlin');

      expect(stateManager.setServiceError).toHaveBeenCalledOnce();
    });

    it('still calls endSearch() after an unknown error', async () => {
      const validator = makeValidator(null);
      const geocoding = makeGeocoding(Promise.reject(new Error('Something unexpected')));
      const weather = makeWeatherService();
      const controller = makeController(validator, geocoding, weather, stateManager);

      await controller.search('Berlin');

      expect(stateManager.endSearch).toHaveBeenCalledOnce();
    });
  });
});
