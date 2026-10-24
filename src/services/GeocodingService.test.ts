import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GeocodingServiceImpl } from './GeocodingService';
import { GeocodingError } from '../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Creates a mock Response with a JSON body and an optional ok/status flag. */
function mockResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

// ─── Unit Tests ───────────────────────────────────────────────────────────────

describe('GeocodingServiceImpl.geocode', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // Success path

  it('returns coordinates from the first result on a valid response', async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockResponse({
        results: [
          { name: 'Berlin', latitude: 52.52437, longitude: 13.41053 },
        ],
      })
    );

    const svc = new GeocodingServiceImpl();
    const coords = await svc.geocode('Berlin');

    expect(coords).toEqual({ latitude: 52.52437, longitude: 13.41053, cityName: 'Berlin' });
  });

  it('builds the URL with the city name URL-encoded', async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockResponse({ results: [{ name: 'São Paulo', latitude: -23.5, longitude: -46.6 }] })
    );

    const svc = new GeocodingServiceImpl();
    await svc.geocode('São Paulo');

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('name=S%C3%A3o%20Paulo')
    );
  });

  it('uses count=1, language=es, format=json in the URL', async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockResponse({ results: [{ name: 'Madrid', latitude: 40.4, longitude: -3.7 }] })
    );

    const svc = new GeocodingServiceImpl();
    await svc.geocode('Madrid');

    const calledUrl = vi.mocked(fetch).mock.calls[0][0] as string;
    expect(calledUrl).toContain('count=1');
    expect(calledUrl).toContain('language=es');
    expect(calledUrl).toContain('format=json');
  });

  // NOT_FOUND cases

  it('throws GeocodingError NOT_FOUND when results array is empty', async () => {
    vi.mocked(fetch).mockResolvedValue(mockResponse({ results: [] }));

    const svc = new GeocodingServiceImpl();
    await expect(svc.geocode('UnknownCity')).rejects.toMatchObject({
      kind: 'NOT_FOUND',
    });
    await expect(svc.geocode('UnknownCity')).rejects.toBeInstanceOf(GeocodingError);
  });

  it('throws GeocodingError NOT_FOUND when results key is absent', async () => {
    vi.mocked(fetch).mockResolvedValue(mockResponse({}));

    const svc = new GeocodingServiceImpl();
    const error = await svc.geocode('Nowhere').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(GeocodingError);
    expect((error as GeocodingError).kind).toBe('NOT_FOUND');
  });

  // NETWORK cases

  it('throws GeocodingError NETWORK when fetch rejects (network error)', async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError('Failed to fetch'));

    const svc = new GeocodingServiceImpl();
    const error = await svc.geocode('Berlin').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(GeocodingError);
    expect((error as GeocodingError).kind).toBe('NETWORK');
  });

  it('throws GeocodingError NETWORK on HTTP 500', async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockResponse({ error: true, reason: 'Internal Server Error' }, false, 500)
    );

    const svc = new GeocodingServiceImpl();
    await expect(svc.geocode('Berlin')).rejects.toMatchObject({ kind: 'NETWORK' });
  });

  it('throws GeocodingError NETWORK on HTTP 404', async () => {
    vi.mocked(fetch).mockResolvedValue(mockResponse({}, false, 404));

    const svc = new GeocodingServiceImpl();
    await expect(svc.geocode('Berlin')).rejects.toMatchObject({ kind: 'NETWORK' });
  });

  it('throws GeocodingError NETWORK on HTTP 429 (rate limit)', async () => {
    vi.mocked(fetch).mockResolvedValue(mockResponse({}, false, 429));

    const svc = new GeocodingServiceImpl();
    await expect(svc.geocode('Berlin')).rejects.toMatchObject({ kind: 'NETWORK' });
  });
});
