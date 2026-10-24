// ─── Domain models ───────────────────────────────────────────────────────────

/** Geographic coordinates returned by the Geocoding API. */
export interface Coordinates {
  latitude: number;
  longitude: number;
  /** Canonical city name returned by the Geocoding API. */
  cityName: string;
}

/** Weather forecast data returned by the Weather API. */
export interface ForecastData {
  cityName: string;
  temperatureCelsius: number;
  relativeHumidityPercent: number;
  precipitationMm: number;
}

// ─── Error kinds ─────────────────────────────────────────────────────────────

export type GeocodingErrorKind = 'NOT_FOUND' | 'NETWORK';
export type WeatherErrorKind = 'INCOMPLETE_DATA' | 'NETWORK';

// ─── Error classes ────────────────────────────────────────────────────────────

/** Error thrown by GeocodingService. */
export class GeocodingError extends Error {
  readonly kind: GeocodingErrorKind;

  constructor(kind: GeocodingErrorKind, message?: string) {
    super(message ?? kind);
    this.kind = kind;
    this.name = 'GeocodingError';
    // Restore prototype chain (needed when targeting ES5 or earlier)
    Object.setPrototypeOf(this, GeocodingError.prototype);
  }
}

/** Error thrown by WeatherService. */
export class WeatherError extends Error {
  readonly kind: WeatherErrorKind;

  constructor(kind: WeatherErrorKind, message?: string) {
    super(message ?? kind);
    this.kind = kind;
    this.name = 'WeatherError';
    Object.setPrototypeOf(this, WeatherError.prototype);
  }
}

// ─── Application state ───────────────────────────────────────────────────────

/** Reactive state of the SPA. */
export interface AppState {
  /** True while any HTTP request is in flight. */
  isLoading: boolean;
  /** Validation error for the city input (empty/whitespace). Null when valid. */
  validationError: string | null;
  /** Error returned by external services (geocoding / weather). Null when none. */
  serviceError: string | null;
  /** The latest successfully retrieved forecast. Null when not yet loaded or on error. */
  forecast: ForecastData | null;
}

// ─── Service interfaces ───────────────────────────────────────────────────────

/** Converts a city name into geographic coordinates. */
export interface GeocodingService {
  /**
   * Geocodes a city name to coordinates.
   * @throws {GeocodingError} with kind='NOT_FOUND' if the city is not found.
   * @throws {GeocodingError} with kind='NETWORK' on network or HTTP errors.
   */
  geocode(cityName: string): Promise<Coordinates>;
}

/** Retrieves weather forecast data for given coordinates. */
export interface WeatherService {
  /**
   * Returns the current forecast for the given coordinates.
   * @throws {WeatherError} with kind='INCOMPLETE_DATA' if any required field is missing/non-numeric.
   * @throws {WeatherError} with kind='NETWORK' on network errors, timeouts, or non-2xx responses.
   */
  getForecast(coords: Coordinates): Promise<ForecastData>;
}

/** Validates user input for the city search field. */
export interface InputValidator {
  /**
   * Validates the city name.
   * @returns null if valid, or a localised error message string if invalid.
   */
  validate(cityName: string): string | null;
}

/** Orchestrates the weather search flow. */
export interface WeatherController {
  /**
   * Entry point for the city search flow.
   * Validates input → clears previous errors → shows loading →
   * geocodes → fetches forecast → updates state → hides loading.
   */
  search(cityName: string): Promise<void>;
}
