import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  GeocodingError,
  WeatherError,
} from './types';

// ─── GeocodingError ───────────────────────────────────────────────────────────

describe('GeocodingError', () => {
  it('is an instance of Error', () => {
    const err = new GeocodingError('NOT_FOUND');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(GeocodingError);
  });

  it('stores the kind', () => {
    expect(new GeocodingError('NOT_FOUND').kind).toBe('NOT_FOUND');
    expect(new GeocodingError('NETWORK').kind).toBe('NETWORK');
  });

  it('has the correct name', () => {
    expect(new GeocodingError('NOT_FOUND').name).toBe('GeocodingError');
  });

  it('uses the kind as the default message', () => {
    expect(new GeocodingError('NOT_FOUND').message).toBe('NOT_FOUND');
  });

  it('uses a custom message when provided', () => {
    const err = new GeocodingError('NETWORK', 'custom message');
    expect(err.message).toBe('custom message');
  });
});

// ─── WeatherError ─────────────────────────────────────────────────────────────

describe('WeatherError', () => {
  it('is an instance of Error', () => {
    const err = new WeatherError('NETWORK');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(WeatherError);
  });

  it('stores the kind', () => {
    expect(new WeatherError('INCOMPLETE_DATA').kind).toBe('INCOMPLETE_DATA');
    expect(new WeatherError('NETWORK').kind).toBe('NETWORK');
  });

  it('has the correct name', () => {
    expect(new WeatherError('NETWORK').name).toBe('WeatherError');
  });

  it('uses the kind as the default message', () => {
    expect(new WeatherError('INCOMPLETE_DATA').message).toBe('INCOMPLETE_DATA');
  });

  it('uses a custom message when provided', () => {
    const err = new WeatherError('NETWORK', 'timeout after 10s');
    expect(err.message).toBe('timeout after 10s');
  });
});

// ─── Property: error kinds are always preserved ──────────────────────────────

describe('GeocodingError – property: kind is always preserved', () => {
  // Feature: weather-forecast-app, Property: GeocodingError preserves kind
  it('kind round-trips through the constructor', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('NOT_FOUND' as const, 'NETWORK' as const),
        (kind) => {
          const err = new GeocodingError(kind);
          return err.kind === kind;
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('WeatherError – property: kind is always preserved', () => {
  // Feature: weather-forecast-app, Property: WeatherError preserves kind
  it('kind round-trips through the constructor', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('INCOMPLETE_DATA' as const, 'NETWORK' as const),
        (kind) => {
          const err = new WeatherError(kind);
          return err.kind === kind;
        }
      ),
      { numRuns: 100 }
    );
  });
});
