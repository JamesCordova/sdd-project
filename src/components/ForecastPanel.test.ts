/**
 * Tests for ForecastPanel component.
 *
 * Requirements covered: 4.1, 4.2, 4.3, 4.4
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { ForecastPanel } from './ForecastPanel.js';
import type { ForecastData } from '../types.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeForecast(overrides?: Partial<ForecastData>): ForecastData {
  return {
    cityName: 'Buenos Aires',
    temperatureCelsius: 22.5,
    relativeHumidityPercent: 65,
    precipitationMm: 0.0,
    ...overrides,
  };
}

function getField(panel: ForecastPanel, field: string): HTMLElement | null {
  return panel.getElement().querySelector(`[data-field="${field}"]`);
}

// ─── Unit tests ───────────────────────────────────────────────────────────────

describe('ForecastPanel – rendering', () => {
  let panel: ForecastPanel;

  beforeEach(() => {
    panel = new ForecastPanel();
  });

  it('getElement() returns an HTMLElement', () => {
    expect(panel.getElement()).toBeInstanceOf(HTMLElement);
  });

  it('has role="region"', () => {
    expect(panel.getElement().getAttribute('role')).toBe('region');
  });

  it('has aria-labelledby pointing to the heading', () => {
    const labelledby = panel.getElement().getAttribute('aria-labelledby');
    const heading = panel.getElement().querySelector('h2');
    expect(labelledby).toBeTruthy();
    expect(heading?.id).toBe(labelledby);
  });

  it('contains elements for all four data fields', () => {
    expect(getField(panel, 'city-name')).not.toBeNull();
    expect(getField(panel, 'temperature')).not.toBeNull();
    expect(getField(panel, 'humidity')).not.toBeNull();
    expect(getField(panel, 'precipitation')).not.toBeNull();
  });

  it('city-name field is an h2', () => {
    const el = getField(panel, 'city-name');
    expect(el?.tagName.toLowerCase()).toBe('h2');
  });
});

describe('ForecastPanel – update(null)', () => {
  it('is hidden by default (display: none)', () => {
    const panel = new ForecastPanel();
    expect(panel.getElement().style.display).toBe('none');
  });

  it('hides the panel when update(null) is called', () => {
    const panel = new ForecastPanel();
    panel.update(makeForecast()); // show it first
    panel.update(null);           // then hide
    expect(panel.getElement().style.display).toBe('none');
  });

  it('does not throw when called multiple times with null', () => {
    const panel = new ForecastPanel();
    expect(() => {
      panel.update(null);
      panel.update(null);
    }).not.toThrow();
  });
});

describe('ForecastPanel – update(data)', () => {
  let panel: ForecastPanel;

  beforeEach(() => {
    panel = new ForecastPanel();
  });

  it('makes the panel visible when data is non-null (Requirement 4.1)', () => {
    panel.update(makeForecast());
    expect(panel.getElement().style.display).not.toBe('none');
  });

  it('displays the city name (Requirement 4.1)', () => {
    panel.update(makeForecast({ cityName: 'Tokyo' }));
    expect(getField(panel, 'city-name')?.textContent).toBe('Tokyo');
  });

  it('displays temperature with °C unit (Requirement 4.2)', () => {
    panel.update(makeForecast({ temperatureCelsius: 3.2 }));
    const text = getField(panel, 'temperature')?.textContent ?? '';
    expect(text).toContain('3.2');
    expect(text).toContain('°C');
  });

  it('displays humidity with % unit (Requirement 4.3)', () => {
    panel.update(makeForecast({ relativeHumidityPercent: 78 }));
    const text = getField(panel, 'humidity')?.textContent ?? '';
    expect(text).toContain('78');
    expect(text).toContain('%');
  });

  it('displays precipitation with mm unit (Requirement 4.4)', () => {
    panel.update(makeForecast({ precipitationMm: 0.0 }));
    const text = getField(panel, 'precipitation')?.textContent ?? '';
    expect(text).toContain('0');
    expect(text).toContain('mm');
  });

  it('updates all fields when called again with new data', () => {
    panel.update(makeForecast({ cityName: 'London', temperatureCelsius: 10 }));
    panel.update(makeForecast({ cityName: 'Berlin', temperatureCelsius: -2 }));

    expect(getField(panel, 'city-name')?.textContent).toBe('Berlin');
    expect(getField(panel, 'temperature')?.textContent).toContain('-2');
  });
});

describe('ForecastPanel – multiple instances', () => {
  it('two instances have different heading IDs to avoid ARIA conflicts', () => {
    const p1 = new ForecastPanel();
    const p2 = new ForecastPanel();
    const id1 = p1.getElement().querySelector('h2')?.id;
    const id2 = p2.getElement().querySelector('h2')?.id;
    expect(id1).not.toBe(id2);
  });
});

// ─── Property-based tests ─────────────────────────────────────────────────────

// Feature: weather-forecast-app, Property 8: ForecastPanel renderiza todos los campos con unidades correctas
describe('ForecastPanel – P8: renders all fields with correct units for any ForecastData', () => {
  it('city name, °C, %, and mm are always present for any valid ForecastData', () => {
    // Validates: Requirements 4.1, 4.2, 4.3, 4.4
    const forecastDataArb = fc.record({
      cityName: fc.string({ minLength: 1, maxLength: 100 }),
      temperatureCelsius: fc.float({ noNaN: true, min: -100, max: 60 }),
      relativeHumidityPercent: fc.integer({ min: 0, max: 100 }),
      precipitationMm: fc.float({ noNaN: true, min: 0, max: 500 }),
    });

    fc.assert(
      fc.property(forecastDataArb, (data) => {
        const panel = new ForecastPanel();
        panel.update(data);

        const el = panel.getElement();

        // Panel must be visible
        if (el.style.display === 'none') return false;

        // City name must appear
        const cityText = el.querySelector('[data-field="city-name"]')?.textContent ?? '';
        if (!cityText.includes(data.cityName)) return false;

        // Temperature must include the numeric value and '°C'
        const tempText = el.querySelector('[data-field="temperature"]')?.textContent ?? '';
        if (!tempText.includes('°C')) return false;
        if (!tempText.includes(String(data.temperatureCelsius))) return false;

        // Humidity must include the numeric value and '%'
        const humText = el.querySelector('[data-field="humidity"]')?.textContent ?? '';
        if (!humText.includes('%')) return false;
        if (!humText.includes(String(data.relativeHumidityPercent))) return false;

        // Precipitation must include the numeric value and 'mm'
        const precipText = el.querySelector('[data-field="precipitation"]')?.textContent ?? '';
        if (!precipText.includes('mm')) return false;
        if (!precipText.includes(String(data.precipitationMm))) return false;

        return true;
      }),
      { numRuns: 100 },
    );
  });

  it('panel is hidden for any call with null data', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const panel = new ForecastPanel();
        panel.update(null);
        return panel.getElement().style.display === 'none';
      }),
      { numRuns: 10 },
    );
  });
});
