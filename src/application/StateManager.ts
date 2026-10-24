import type { AppState, ForecastData } from '../types.js';

/**
 * Manages the reactive AppState for the Weather Forecast SPA.
 *
 * State transitions (per design diagram):
 *   Idle → Loading          : startSearch() when input is valid
 *   Loading → ForecastReady : setForecast(data) then endSearch()
 *   Loading → ServiceError  : setServiceError(msg) then endSearch()
 *   ForecastReady / ServiceError → Loading : startSearch() (new search)
 *
 * Requirements: 2.6, 3.5, 5.2, 5.4, 5.5
 */
export class StateManager {
  private state: AppState = {
    isLoading: false,
    validationError: null,
    serviceError: null,
    forecast: null,
  };

  private listeners: Set<(state: AppState) => void> = new Set();

  // ── Private helpers ──────────────────────────────────────────────────────

  /** Creates a shallow copy of the current state (prevents external mutation). */
  private snapshot(): AppState {
    return { ...this.state };
  }

  /** Applies a partial update and notifies all subscribers. */
  private patch(partial: Partial<AppState>): void {
    this.state = { ...this.state, ...partial };
    const snapshot = this.snapshot();
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }

  // ── Public API ───────────────────────────────────────────────────────────

  /**
   * Returns a copy of the current state.
   * Callers receive a snapshot; mutations do not affect internal state.
   */
  getState(): AppState {
    return this.snapshot();
  }

  /**
   * Registers a state-change listener.
   * @returns An unsubscribe function that removes the listener.
   */
  subscribe(listener: (state: AppState) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  // ── Individual field setters ─────────────────────────────────────────────

  /** Sets the loading flag and notifies subscribers. */
  setLoading(isLoading: boolean): void {
    this.patch({ isLoading });
  }

  /** Sets (or clears) the validation error and notifies subscribers. */
  setValidationError(error: string | null): void {
    this.patch({ validationError: error });
  }

  /** Sets (or clears) the service error and notifies subscribers. */
  setServiceError(error: string | null): void {
    this.patch({ serviceError: error });
  }

  /** Sets (or clears) the forecast data and notifies subscribers. */
  setForecast(forecast: ForecastData | null): void {
    this.patch({ forecast });
  }

  // ── Composite state transitions ──────────────────────────────────────────

  /**
   * Begins a new search:
   *   1. Clears any previous serviceError (Req 5.2 — "nueva búsqueda limpia el error anterior")
   *   2. Sets isLoading = true
   *
   * A single patch ensures subscribers see the transition atomically.
   */
  startSearch(): void {
    this.patch({ serviceError: null, isLoading: true });
  }

  /**
   * Ends the current search by setting isLoading = false.
   * Called from a finally block so it fires on both success and error (Req 5.5).
   */
  endSearch(): void {
    this.patch({ isLoading: false });
  }
}
