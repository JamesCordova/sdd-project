import type {
  GeocodingService,
  InputValidator,
  WeatherController,
  WeatherService,
} from '../types.js';
import { GeocodingError, WeatherError } from '../types.js';
import type { StateManager } from './StateManager.js';
import {
  GEOCODING_ERROR_MESSAGES,
  UNKNOWN_ERROR_MESSAGE,
  WEATHER_ERROR_MESSAGES,
} from '../errorMessages.js';

// ── Implementation ────────────────────────────────────────────────────────────

/**
 * Orchestrates the weather search flow.
 *
 * Flow (per design sequence diagram):
 *   1. Validate cityName → show validation error and abort if invalid.
 *   2. Clear validation error (valid input confirmed).
 *   3. startSearch() → clears serviceError + sets isLoading = true (Req 5.2, 2.6).
 *   4. try:
 *        a. geocode(cityName)  → Coordinates
 *        b. getForecast(coords) → ForecastData
 *        c. setForecast(data)  → updates state (Req 3.1, 3.2, 4.1)
 *   5. catch:
 *        - GeocodingError  → mapped service error message (Req 2.4, 2.5)
 *        - WeatherError    → mapped service error message (Req 3.3, 3.4)
 *        - Unknown error   → generic fallback message (Req 5.6)
 *   6. finally:
 *        endSearch() → isLoading = false regardless of outcome (Req 5.5)
 *
 * Requirements: 1.5, 2.1, 2.4, 2.5, 3.1, 3.3, 3.4, 5.2, 5.4, 5.5
 */
export class WeatherControllerImpl implements WeatherController {
  constructor(
    private readonly validator: InputValidator,
    private readonly geocodingService: GeocodingService,
    private readonly weatherService: WeatherService,
    private readonly stateManager: StateManager,
  ) {}

  async search(cityName: string): Promise<void> {
    // Step 1: Validate input
    const validationError = this.validator.validate(cityName);
    if (validationError !== null) {
      // Invalid input — show error and abort; no HTTP request is made (Req 1.5)
      this.stateManager.setValidationError(validationError);
      return;
    }

    // Step 2: Clear any previous validation error (input is valid)
    this.stateManager.setValidationError(null);

    // Step 3: Begin search — clears serviceError + sets isLoading = true (Req 5.2, 2.6)
    this.stateManager.startSearch();

    try {
      // Step 4a: Geocode the city name to coordinates (Req 2.1, 2.2, 2.3)
      const coords = await this.geocodingService.geocode(cityName);

      // Step 4b: Fetch forecast data for the resolved coordinates (Req 3.1)
      const forecast = await this.weatherService.getForecast(coords);

      // Step 4c: Persist the successful forecast in state (Req 3.2, 4.1)
      this.stateManager.setForecast(forecast);
    } catch (error) {
      // Step 5: Map the error to a user-facing message
      if (error instanceof GeocodingError) {
        this.stateManager.setServiceError(GEOCODING_ERROR_MESSAGES[error.kind]);
      } else if (error instanceof WeatherError) {
        this.stateManager.setServiceError(WEATHER_ERROR_MESSAGES[error.kind]);
      } else {
        // Unknown / unexpected error (Req 5.6)
        this.stateManager.setServiceError(UNKNOWN_ERROR_MESSAGE);
      }
    } finally {
      // Step 6: Always hide the loading indicator (Req 5.5)
      this.stateManager.endSearch();
    }
  }
}

export default WeatherControllerImpl;
