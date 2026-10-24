import { describe, it, expect, vi } from 'vitest';
import * as fc from 'fast-check';
import { StateManager } from './StateManager.js';
import type { ForecastData } from '../types.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

const sampleForecast: ForecastData = {
  cityName: 'Berlin',
  temperatureCelsius: 12.5,
  relativeHumidityPercent: 72,
  precipitationMm: 0.0,
};

// ── Initial state ─────────────────────────────────────────────────────────────

describe('StateManager — initial state', () => {
  it('starts with the correct default values', () => {
    const sm = new StateManager();
    expect(sm.getState()).toEqual({
      isLoading: false,
      validationError: null,
      serviceError: null,
      forecast: null,
    });
  });
});

// ── getState returns a copy ───────────────────────────────────────────────────

describe('StateManager.getState()', () => {
  it('returns a new object on each call (immutable snapshot)', () => {
    const sm = new StateManager();
    const a = sm.getState();
    const b = sm.getState();
    expect(a).not.toBe(b);         // different references
    expect(a).toEqual(b);          // same values
  });

  it('external mutations do not affect internal state', () => {
    const sm = new StateManager();
    const snapshot = sm.getState();
    (snapshot as unknown as Record<string, unknown>).isLoading = true;
    expect(sm.getState().isLoading).toBe(false);
  });
});

// ── subscribe / unsubscribe ───────────────────────────────────────────────────

describe('StateManager.subscribe()', () => {
  it('calls the listener immediately after the first state change', () => {
    const sm = new StateManager();
    const listener = vi.fn();
    sm.subscribe(listener);
    sm.setLoading(true);
    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ isLoading: true }));
  });

  it('notifies multiple listeners', () => {
    const sm = new StateManager();
    const l1 = vi.fn();
    const l2 = vi.fn();
    sm.subscribe(l1);
    sm.subscribe(l2);
    sm.setServiceError('oops');
    expect(l1).toHaveBeenCalledOnce();
    expect(l2).toHaveBeenCalledOnce();
  });

  it('returns an unsubscribe function that stops notifications', () => {
    const sm = new StateManager();
    const listener = vi.fn();
    const unsubscribe = sm.subscribe(listener);
    unsubscribe();
    sm.setLoading(true);
    expect(listener).not.toHaveBeenCalled();
  });

  it('passes a snapshot, not a live reference, to the listener', () => {
    const sm = new StateManager();
    // Collect all snapshots in order — each call to patch delivers a new object
    const snapshots: ReturnType<typeof sm.getState>[] = [];
    sm.subscribe((s) => { snapshots.push(s); });
    sm.setLoading(true);   // first notification
    sm.setLoading(false);  // second notification
    // Each snapshot must be a distinct object
    expect(snapshots[0]).not.toBe(snapshots[1]);
    // First snapshot captured isLoading=true
    expect(snapshots[0].isLoading).toBe(true);
    // Second snapshot captured isLoading=false
    expect(snapshots[1].isLoading).toBe(false);
  });
});

// ── Individual setters ────────────────────────────────────────────────────────

describe('StateManager — individual setters', () => {
  it('setLoading(true) sets isLoading to true', () => {
    const sm = new StateManager();
    sm.setLoading(true);
    expect(sm.getState().isLoading).toBe(true);
  });

  it('setLoading(false) sets isLoading to false', () => {
    const sm = new StateManager();
    sm.setLoading(true);
    sm.setLoading(false);
    expect(sm.getState().isLoading).toBe(false);
  });

  it('setValidationError sets the validation error message', () => {
    const sm = new StateManager();
    sm.setValidationError('El nombre de la ciudad es requerido.');
    expect(sm.getState().validationError).toBe('El nombre de la ciudad es requerido.');
  });

  it('setValidationError(null) clears the validation error', () => {
    const sm = new StateManager();
    sm.setValidationError('required');
    sm.setValidationError(null);
    expect(sm.getState().validationError).toBeNull();
  });

  it('setServiceError sets the service error message', () => {
    const sm = new StateManager();
    sm.setServiceError('Ciudad no encontrada.');
    expect(sm.getState().serviceError).toBe('Ciudad no encontrada.');
  });

  it('setServiceError(null) clears the service error', () => {
    const sm = new StateManager();
    sm.setServiceError('error');
    sm.setServiceError(null);
    expect(sm.getState().serviceError).toBeNull();
  });

  it('setForecast stores the forecast data', () => {
    const sm = new StateManager();
    sm.setForecast(sampleForecast);
    expect(sm.getState().forecast).toEqual(sampleForecast);
  });

  it('setForecast(null) clears the forecast', () => {
    const sm = new StateManager();
    sm.setForecast(sampleForecast);
    sm.setForecast(null);
    expect(sm.getState().forecast).toBeNull();
  });

  it('each setter only modifies the targeted field', () => {
    const sm = new StateManager();
    sm.setForecast(sampleForecast);
    sm.setLoading(true);
    const state = sm.getState();
    // forecast must be untouched by setLoading
    expect(state.forecast).toEqual(sampleForecast);
    expect(state.isLoading).toBe(true);
  });
});

// ── startSearch() ─────────────────────────────────────────────────────────────

describe('StateManager.startSearch()', () => {
  it('sets isLoading to true', () => {
    const sm = new StateManager();
    sm.startSearch();
    expect(sm.getState().isLoading).toBe(true);
  });

  it('clears serviceError (Req 5.2)', () => {
    const sm = new StateManager();
    sm.setServiceError('previous error');
    sm.startSearch();
    expect(sm.getState().serviceError).toBeNull();
  });

  it('clears serviceError AND sets isLoading in a single atomic update', () => {
    const sm = new StateManager();
    sm.setServiceError('previous error');

    // The listener captures state exactly as it is at the moment of notification
    const snapshots: ReturnType<typeof sm.getState>[] = [];
    sm.subscribe((s) => snapshots.push(s));

    sm.startSearch();

    // Only one notification should have been fired for the composite transition
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0].serviceError).toBeNull();
    expect(snapshots[0].isLoading).toBe(true);
  });

  it('does not modify validationError or forecast', () => {
    const sm = new StateManager();
    sm.setValidationError('required');
    sm.setForecast(sampleForecast);
    sm.startSearch();
    const state = sm.getState();
    expect(state.validationError).toBe('required');
    expect(state.forecast).toEqual(sampleForecast);
  });
});

// ── endSearch() ───────────────────────────────────────────────────────────────

describe('StateManager.endSearch()', () => {
  it('sets isLoading to false (Req 5.5)', () => {
    const sm = new StateManager();
    sm.startSearch();
    sm.endSearch();
    expect(sm.getState().isLoading).toBe(false);
  });

  it('does not touch other fields', () => {
    const sm = new StateManager();
    sm.startSearch();
    sm.setForecast(sampleForecast);
    sm.endSearch();
    const state = sm.getState();
    expect(state.forecast).toEqual(sampleForecast);
    expect(state.serviceError).toBeNull();
  });
});

// ── Loading → ForecastReady transition ────────────────────────────────────────

describe('StateManager — Loading → ForecastReady transition', () => {
  it('reflects forecast data after setForecast + endSearch', () => {
    const sm = new StateManager();
    sm.startSearch();
    sm.setForecast(sampleForecast);
    sm.endSearch();
    const state = sm.getState();
    expect(state.isLoading).toBe(false);
    expect(state.forecast).toEqual(sampleForecast);
    expect(state.serviceError).toBeNull();
  });
});

// ── Loading → ServiceError transition ────────────────────────────────────────

describe('StateManager — Loading → ServiceError transition', () => {
  it('reflects the service error after setServiceError + endSearch', () => {
    const sm = new StateManager();
    sm.startSearch();
    sm.setServiceError('No se encontró la ciudad ingresada.');
    sm.endSearch();
    const state = sm.getState();
    expect(state.isLoading).toBe(false);
    expect(state.serviceError).toBe('No se encontró la ciudad ingresada.');
    expect(state.forecast).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Property-Based Tests
// ─────────────────────────────────────────────────────────────────────────────

fc.configureGlobal({ numRuns: 100 });

// All possible service error kinds that the app can surface, mapped to their
// canonical user-facing messages (see Error Handling table in design.md).
const allServiceErrorKinds = [
  'NOT_FOUND',
  'NETWORK',
  'INCOMPLETE_DATA',
] as const;

type ServiceErrorKind = (typeof allServiceErrorKinds)[number];

/** Maps each service error kind to the user-facing message shown in AppState.serviceError. */
const serviceErrorMessages: Record<ServiceErrorKind, string> = {
  NOT_FOUND:       'No se encontró la ciudad ingresada.',
  NETWORK:         'El servicio de geocodificación no está disponible.',
  INCOMPLETE_DATA: 'Los datos meteorológicos recibidos están incompletos.',
};

// Feature: weather-forecast-app, Property 11: Nueva búsqueda limpia el error anterior
describe('Property 11 — startSearch() always clears serviceError before loading (Req 5.2)', () => {
  // P11 — generator: fc.constantFrom(...allServiceErrorKinds)
  // For every possible service-error kind, starting a new search must atomically
  // clear serviceError (set it to null) and set isLoading=true, with no HTTP
  // calls having been made yet (StateManager has no network access itself).
  it('clears serviceError atomically when starting a new search (fc.constantFrom over all error kinds)', () => {
    // Feature: weather-forecast-app, Property 11: Nueva búsqueda limpia el error anterior
    fc.assert(
      fc.property(
        fc.constantFrom(...allServiceErrorKinds),
        (kind) => {
          const message = serviceErrorMessages[kind];
          const sm = new StateManager();
          sm.setServiceError(message);

          const snapshots: ReturnType<typeof sm.getState>[] = [];
          sm.subscribe((s) => snapshots.push(s));

          sm.startSearch();

          // Exactly one atomic notification — both fields updated in a single patch
          expect(snapshots).toHaveLength(1);
          // serviceError must be null before/simultaneously with isLoading=true
          // (i.e., before any HTTP call that the controller would make after startSearch)
          expect(snapshots[0].serviceError).toBeNull();
          expect(snapshots[0].isLoading).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('getState() immediately after startSearch() has serviceError=null for every error kind', () => {
    // Feature: weather-forecast-app, Property 11: Nueva búsqueda limpia el error anterior
    fc.assert(
      fc.property(
        fc.constantFrom(...allServiceErrorKinds),
        (kind) => {
          const sm = new StateManager();
          sm.setServiceError(serviceErrorMessages[kind]);
          sm.startSearch();
          // No HTTP calls have occurred — serviceError must already be null
          expect(sm.getState().serviceError).toBeNull();
          expect(sm.getState().isLoading).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('serviceError is null and isLoading is true in the snapshot delivered to listeners (arbitrary strings)', () => {
    // Generador: any non-null service error string
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        (errorMessage) => {
          const sm = new StateManager();
          sm.setServiceError(errorMessage);

          const snapshots: ReturnType<typeof sm.getState>[] = [];
          sm.subscribe((s) => snapshots.push(s));

          sm.startSearch();

          // Exactly one atomic notification
          expect(snapshots).toHaveLength(1);
          // serviceError must be cleared BEFORE / simultaneously with isLoading=true
          expect(snapshots[0].serviceError).toBeNull();
          expect(snapshots[0].isLoading).toBe(true);
        },
      ),
    );
  });

  it('getState() immediately after startSearch() has serviceError=null (regardless of prior error)', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        (errorMessage) => {
          const sm = new StateManager();
          sm.setServiceError(errorMessage);
          sm.startSearch();
          expect(sm.getState().serviceError).toBeNull();
          expect(sm.getState().isLoading).toBe(true);
        },
      ),
    );
  });
});
