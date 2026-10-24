// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { LoadingIndicator } from './LoadingIndicator.js';

// ─── Unit tests ───────────────────────────────────────────────────────────────

describe('LoadingIndicator', () => {
  let indicator: LoadingIndicator;

  beforeEach(() => {
    indicator = new LoadingIndicator();
  });

  describe('getElement()', () => {
    it('returns an HTMLElement', () => {
      expect(indicator.getElement()).toBeInstanceOf(HTMLElement);
    });

    it('has role="status"', () => {
      expect(indicator.getElement().getAttribute('role')).toBe('status');
    });

    it('has aria-live="polite"', () => {
      expect(indicator.getElement().getAttribute('aria-live')).toBe('polite');
    });

    it('contains a visually-hidden label for screen readers', () => {
      const text = indicator.getElement().textContent ?? '';
      expect(text).toContain('Buscando...');
    });
  });

  describe('update(visible)', () => {
    it('hides the element when visible=false', () => {
      indicator.update(false);
      expect(indicator.getElement().style.display).toBe('none');
    });

    it('shows the element when visible=true', () => {
      indicator.update(false); // ensure we start hidden
      indicator.update(true);
      expect(indicator.getElement().style.display).not.toBe('none');
    });

    it('sets aria-hidden="true" when hidden', () => {
      indicator.update(false);
      expect(indicator.getElement().getAttribute('aria-hidden')).toBe('true');
    });

    it('sets aria-hidden="false" when visible', () => {
      indicator.update(true);
      expect(indicator.getElement().getAttribute('aria-hidden')).toBe('false');
    });

    it('starts hidden by default (constructor calls update(false))', () => {
      // A freshly constructed indicator should be hidden.
      expect(indicator.getElement().style.display).toBe('none');
    });

    it('toggles correctly across multiple calls', () => {
      indicator.update(true);
      expect(indicator.getElement().style.display).not.toBe('none');

      indicator.update(false);
      expect(indicator.getElement().style.display).toBe('none');

      indicator.update(true);
      expect(indicator.getElement().style.display).not.toBe('none');
    });
  });

  describe('spinner child element', () => {
    it('contains a spinner with class "loading-spinner"', () => {
      const spinner = indicator.getElement().querySelector('.loading-spinner');
      expect(spinner).not.toBeNull();
    });
  });
});

// ─── Property-based tests ─────────────────────────────────────────────────────

describe('LoadingIndicator – property: update is idempotent', () => {
  // Feature: weather-forecast-app, Property 5: Ciclo de vida del indicador de carga
  it('calling update(v) twice with the same value leaves state identical', () => {
    fc.assert(
      fc.property(fc.boolean(), (visible) => {
        const ind = new LoadingIndicator();
        ind.update(visible);
        const displayAfterFirst = ind.getElement().style.display;
        const ariaAfterFirst = ind.getElement().getAttribute('aria-hidden');

        ind.update(visible);
        const displayAfterSecond = ind.getElement().style.display;
        const ariaAfterSecond = ind.getElement().getAttribute('aria-hidden');

        return (
          displayAfterFirst === displayAfterSecond &&
          ariaAfterFirst === ariaAfterSecond
        );
      }),
      { numRuns: 100 }
    );
  });
});

describe('LoadingIndicator – property: visible state is always consistent', () => {
  // Feature: weather-forecast-app, Property 5: Ciclo de vida del indicador de carga
  it('display and aria-hidden are consistent for any boolean value', () => {
    fc.assert(
      fc.property(fc.boolean(), (visible) => {
        const ind = new LoadingIndicator();
        ind.update(visible);

        const el = ind.getElement();
        const isDisplayed = el.style.display !== 'none';
        const ariaHidden = el.getAttribute('aria-hidden');

        if (visible) {
          // Visible → displayed and aria-hidden="false"
          return isDisplayed && ariaHidden === 'false';
        } else {
          // Hidden → display:none and aria-hidden="true"
          return !isDisplayed && ariaHidden === 'true';
        }
      }),
      { numRuns: 100 }
    );
  });
});
