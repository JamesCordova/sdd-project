import { describe, it, expect, vi, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { WeatherServiceImpl } from './WeatherService';
import { WeatherError } from '../types';
import type { Coordinates } from '../types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const COORDS: Coordinates = { latitude: 52.52, longitude: 13.41, cityName: 'Berlin' };

/** Creates a minimal valid Weather API response body. */
function validBody(overrides: Record<string, unknown> = {}) {
  return {
    current: {
      temperature_2m: 3.2,
      relative_humidity_2m: 78,
      precipitation: 0.0,
      ...overrides,
    },
  };
}

/** Creates a mock Response with the given status and JSON body. */
function mockResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

// ─── Unit tests ───────────────────────────────────────────────────────────────

describe('WeatherServiceImpl.getForecast', () => {
  // ── Happy path ──────────────────────────────────────────────────────────────

  it('maps a valid API response to ForecastData', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse(200, validBody())));

    const svc = new WeatherServiceImpl();
    const result = await svc.getForecast(COORDS);

    expect(result).toEqual({
      cityName: 'Berlin',
      temperatureCelsius: 3.2,
      relativeHumidityPercent: 78,
      precipitationMm: 0.0,
    });
  });

  it('uses the cityName from coords, not from the API body', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse(200, validBody())));

    const svc = new WeatherServiceImpl();
    const result = await svc.getForecast({ ...COORDS, cityName: 'MyCityOverride' });

    expect(result.cityName).toBe('MyCityOverride');
  });

  it('constructs the correct URL including all three variables', async () => {
    const mockFetch = vi.fn().mockResolvedValue(mockResponse(200, validBody()));
    vi.stubGlobal('fetch', mockFetch);

    const svc = new WeatherServiceImpl();
    await svc.getForecast(COORDS);

    const calledUrl: string = mockFetch.mock.calls[0][0];
    expect(calledUrl).toContain('latitude=52.52');
    expect(calledUrl).toContain('longitude=13.41');
    expect(calledUrl).toContain('temperature_2m');
    expect(calledUrl).toContain('relative_humidity_2m');
    expect(calledUrl).toContain('precipitation');
  });

  // ── Network / HTTP errors → NETWORK ────────────────────────────────────────

  it('throws WeatherError(NETWORK) on network error (fetch rejects)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    const svc = new WeatherServiceImpl();
    await expect(svc.getForecast(COORDS)).rejects.toMatchObject({
      kind: 'NETWORK',
    });
  });

  it('throws WeatherError(NETWORK) on HTTP 404', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse(404, { error: true })));

    const svc = new WeatherServiceImpl();
    const err = await svc.getForecast(COORDS).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(WeatherError);
    expect((err as WeatherError).kind).toBe('NETWORK');
  });

  it('throws WeatherError(NETWORK) on HTTP 500', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse(500, {})));

    const svc = new WeatherServiceImpl();
    const err = await svc.getForecast(COORDS).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(WeatherError);
    expect((err as WeatherError).kind).toBe('NETWORK');
  });

  it('throws WeatherError(NETWORK) when AbortController fires (timeout simulation)', async () => {
    // Simulate a fetch that never resolves, then abort it via fake timers
    vi.useFakeTimers();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((_url: string, init: RequestInit) => {
        return new Promise((_resolve, reject) => {
          (init.signal as AbortSignal).addEventListener('abort', () => {
            reject(new DOMException('The operation was aborted.', 'AbortError'));
          });
        });
      }),
    );

    const svc = new WeatherServiceImpl();
    const promise = svc.getForecast(COORDS);

    // Advance past the 10 s timeout
    vi.advanceTimersByTime(10_001);

    const err = await promise.catch((e: unknown) => e);
    expect(err).toBeInstanceOf(WeatherError);
    expect((err as WeatherError).kind).toBe('NETWORK');

    vi.useRealTimers();
  });

  // ── Incomplete data → INCOMPLETE_DATA ──────────────────────────────────────

  it('throws WeatherError(INCOMPLETE_DATA) when temperature_2m is missing', async () => {
    const body = { current: { relative_humidity_2m: 78, precipitation: 0.0 } };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse(200, body)));

    const svc = new WeatherServiceImpl();
    const err = await svc.getForecast(COORDS).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(WeatherError);
    expect((err as WeatherError).kind).toBe('INCOMPLETE_DATA');
  });

  it('throws WeatherError(INCOMPLETE_DATA) when relative_humidity_2m is missing', async () => {
    const body = { current: { temperature_2m: 3.2, precipitation: 0.0 } };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse(200, body)));

    const svc = new WeatherServiceImpl();
    const err = await svc.getForecast(COORDS).catch((e: unknown) => e);
    expect((err as WeatherError).kind).toBe('INCOMPLETE_DATA');
  });

  it('throws WeatherError(INCOMPLETE_DATA) when precipitation is missing', async () => {
    const body = { current: { temperature_2m: 3.2, relative_humidity_2m: 78 } };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse(200, body)));

    const svc = new WeatherServiceImpl();
    const err = await svc.getForecast(COORDS).catch((e: unknown) => e);
    expect((err as WeatherError).kind).toBe('INCOMPLETE_DATA');
  });

  it('throws WeatherError(INCOMPLETE_DATA) when a field is a string instead of number', async () => {
    const body = { current: { temperature_2m: 'hot', relative_humidity_2m: 78, precipitation: 0.0 } };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse(200, body)));

    const svc = new WeatherServiceImpl();
    const err = await svc.getForecast(COORDS).catch((e: unknown) => e);
    expect((err as WeatherError).kind).toBe('INCOMPLETE_DATA');
  });

  it('throws WeatherError(INCOMPLETE_DATA) when current block is absent', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse(200, {})));

    const svc = new WeatherServiceImpl();
    const err = await svc.getForecast(COORDS).catch((e: unknown) => e);
    expect((err as WeatherError).kind).toBe('INCOMPLETE_DATA');
  });

  it('throws WeatherError(INCOMPLETE_DATA) when body is not valid JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('not json', { status: 200 })),
    );

    const svc = new WeatherServiceImpl();
    const err = await svc.getForecast(COORDS).catch((e: unknown) => e);
    expect((err as WeatherError).kind).toBe('INCOMPLETE_DATA');
  });
});

// ─── Property-based tests ─────────────────────────────────────────────────────

describe('WeatherServiceImpl — property tests', () => {
  // Feature: weather-forecast-app, Property 7: Respuesta incompleta de Weather API muestra error
  it('P7 — getForecast() throws WeatherError(INCOMPLETE_DATA) whenever at least one required field is absent or non-numeric (Validates: Requirements 3.3, 4.6)', async () => {
    const ALL_FIELDS = ['temperature_2m', 'relative_humidity_2m', 'precipitation'] as const;

    // Arbitrary non-numeric value to use when corrupting a field
    const nonNumericArb = fc.oneof(
      fc.constant(null),
      fc.constant(undefined),
      fc.constant(''),
      fc.string(),
      fc.boolean(),
      fc.constant([]),
      fc.constant({}),
    );

    await fc.assert(
      fc.asyncProperty(
        // Pick which fields to corrupt (at least 1 of the 3)
        fc.subarray([...ALL_FIELDS], { minLength: 1 }),
        // Valid numeric values for all three fields (used for the non-corrupted ones)
        fc.float({ noNaN: true, noDefaultInfinity: true }),
        fc.integer({ min: 0, max: 100 }),
        fc.float({ min: 0, noNaN: true, noDefaultInfinity: true }),
        // A non-numeric replacement for the corrupted fields
        nonNumericArb,
        async (fieldsToCorrupt, temp, humidity, precip, badValue) => {
          const current: Record<string, unknown> = {
            temperature_2m: temp,
            relative_humidity_2m: humidity,
            precipitation: precip,
          };

          // Remove or corrupt each selected field
          for (const field of fieldsToCorrupt) {
            if (badValue === undefined) {
              // Simulate absent field by deleting the key
              delete current[field];
            } else {
              current[field] = badValue;
            }
          }

          vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue(
              new Response(JSON.stringify({ current }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
              }),
            ),
          );

          try {
            const svc = new WeatherServiceImpl();
            const resultOrError = await svc.getForecast(COORDS).catch((e: unknown) => e);

            // Must always throw WeatherError with kind='INCOMPLETE_DATA'
            expect(resultOrError).toBeInstanceOf(WeatherError);
            expect((resultOrError as WeatherError).kind).toBe('INCOMPLETE_DATA');
          } finally {
            vi.unstubAllGlobals();
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: weather-forecast-app, Property 6: Extracción correcta de datos de pronóstico
  it('P6 — ForecastData values exactly match the Weather API current.* fields (Validates: Requirements 3.2)', async () => {
    // Constrain floats to finite values: NaN and ±Infinity serialise to JSON "null",
    // which causes the service to throw INCOMPLETE_DATA instead of returning data.
    // Real Weather API responses always contain finite numeric values.
    const finiteFloat = fc.float({ noNaN: true, noDefaultInfinity: true });
    const finiteNonNegFloat = fc.float({ min: 0, noNaN: true, noDefaultInfinity: true });

    await fc.assert(
      fc.asyncProperty(
        fc.record({
          temp: finiteFloat,
          humidity: fc.integer({ min: 0, max: 100 }),
          precip: finiteNonNegFloat,
        }),
        async ({ temp, humidity, precip }) => {
          vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue(
              new Response(
                JSON.stringify({
                  current: {
                    temperature_2m: temp,
                    relative_humidity_2m: humidity,
                    precipitation: precip,
                  },
                }),
                { status: 200, headers: { 'Content-Type': 'application/json' } },
              ),
            ),
          );

          try {
            const svc = new WeatherServiceImpl();
            const result = await svc.getForecast(COORDS);

            // JSON.stringify(-0) === "0", so -0 round-trips as +0 through the API response.
            // The property intent is numeric value equality (=== treats -0 and +0 as equal).
            expect(result.temperatureCelsius === temp).toBe(true);
            expect(result.relativeHumidityPercent).toBe(humidity);
            expect(result.precipitationMm === precip).toBe(true);
          } finally {
            vi.unstubAllGlobals();
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
