/**
 * ForecastPanel component
 *
 * Displays the weather forecast for a city: name, temperature in °C,
 * relative humidity in %, and precipitation in mm.
 *
 * When `data` is null the panel is hidden (display: none). When `data` is
 * non-null the panel is visible and each field is rendered with its unit.
 *
 * Data attributes are added to each value element so tests (and CSS) can
 * query them reliably:
 *   [data-field="city-name"]
 *   [data-field="temperature"]
 *   [data-field="humidity"]
 *   [data-field="precipitation"]
 *
 * The panel uses role="region" with an aria-labelledby pointing to its
 * heading so assistive technologies announce it as a named landmark.
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4
 */

import type { ForecastData } from '../types.js';

/** Unique ID counter so multiple ForecastPanel instances don't share IDs. */
let instanceCount = 0;

export class ForecastPanel {
  private readonly container: HTMLElement;
  private readonly cityNameEl: HTMLHeadingElement;
  private readonly temperatureEl: HTMLElement;
  private readonly humidityEl: HTMLElement;
  private readonly precipitationEl: HTMLElement;
  private readonly headingId: string;

  constructor() {
    instanceCount += 1;
    this.headingId = `forecast-panel-heading-${instanceCount}`;

    // ── Container ────────────────────────────────────────────────────────────
    this.container = document.createElement('section');
    this.container.setAttribute('role', 'region');
    this.container.setAttribute('aria-labelledby', this.headingId);

    // ── City name ────────────────────────────────────────────────────────────
    this.cityNameEl = document.createElement('h2');
    this.cityNameEl.id = this.headingId;
    this.cityNameEl.setAttribute('data-field', 'city-name');

    // ── Forecast list ────────────────────────────────────────────────────────
    const list = document.createElement('dl');

    // Temperature
    const tempTerm = document.createElement('dt');
    tempTerm.textContent = 'Temperatura';
    this.temperatureEl = document.createElement('dd');
    this.temperatureEl.setAttribute('data-field', 'temperature');

    // Humidity
    const humidityTerm = document.createElement('dt');
    humidityTerm.textContent = 'Humedad relativa';
    this.humidityEl = document.createElement('dd');
    this.humidityEl.setAttribute('data-field', 'humidity');

    // Precipitation
    const precipTerm = document.createElement('dt');
    precipTerm.textContent = 'Precipitación';
    this.precipitationEl = document.createElement('dd');
    this.precipitationEl.setAttribute('data-field', 'precipitation');

    list.append(
      tempTerm,
      this.temperatureEl,
      humidityTerm,
      this.humidityEl,
      precipTerm,
      this.precipitationEl,
    );

    // ── Assemble ─────────────────────────────────────────────────────────────
    this.container.append(this.cityNameEl, list);

    // Start hidden — no data yet.
    this.container.style.display = 'none';
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Updates the panel with the supplied forecast data.
   *
   * Passing `null` hides the panel; passing a `ForecastData` object shows it
   * and renders each field with its unit string.
   */
  update(data: ForecastData | null): void {
    if (data === null) {
      this.container.style.display = 'none';
      return;
    }

    this.cityNameEl.textContent = data.cityName;
    this.temperatureEl.textContent = `${data.temperatureCelsius} °C`;
    this.humidityEl.textContent = `${data.relativeHumidityPercent} %`;
    this.precipitationEl.textContent = `${data.precipitationMm} mm`;

    this.container.style.display = '';
  }

  /**
   * Returns the root DOM element for mounting into the page.
   */
  getElement(): HTMLElement {
    return this.container;
  }
}

export default ForecastPanel;
