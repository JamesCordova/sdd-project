// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import {
  GEOCODING_ERROR_MESSAGES,
  VALIDATION_EMPTY_INPUT,
  WEATHER_ERROR_MESSAGES,
} from '../errorMessages';
import { ErrorMessage } from './ErrorMessage.js';

// ─── Unit tests ───────────────────────────────────────────────────────────────

describe('ErrorMessage', () => {
  let errorMessage: ErrorMessage;

  beforeEach(() => {
    errorMessage = new ErrorMessage();
  });

  // ── getElement() ──────────────────────────────────────────────────────────

  describe('getElement()', () => {
    it('returns an HTMLElement', () => {
      expect(errorMessage.getElement()).toBeInstanceOf(HTMLElement);
    });

    it('has role="alert"', () => {
      expect(errorMessage.getElement().getAttribute('role')).toBe('alert');
    });

    it('has aria-live="assertive"', () => {
      expect(errorMessage.getElement().getAttribute('aria-live')).toBe('assertive');
    });

    it('has aria-atomic="true"', () => {
      expect(errorMessage.getElement().getAttribute('aria-atomic')).toBe('true');
    });

    it('contains an icon element that is aria-hidden', () => {
      const icon = errorMessage.getElement().querySelector('[aria-hidden="true"]');
      expect(icon).not.toBeNull();
    });
  });

  // ── update(null) ──────────────────────────────────────────────────────────

  describe('update(null)', () => {
    it('hides the element (display: none) when message is null', () => {
      errorMessage.update(null);
      expect(errorMessage.getElement().style.display).toBe('none');
    });

    it('starts hidden by default (constructor does not render a message)', () => {
      // A freshly created component should be invisible.
      expect(errorMessage.getElement().style.display).toBe('none');
    });

    it('clears any previous text when called with null', () => {
      errorMessage.update('Some error');
      errorMessage.update(null);
      expect(errorMessage.getElement().textContent).not.toContain('Some error');
    });
  });

  // ── update(string) ────────────────────────────────────────────────────────

  describe('update(message)', () => {
    it('makes the element visible when given a non-null message', () => {
      errorMessage.update('Ciudad no encontrada.');
      expect(errorMessage.getElement().style.display).not.toBe('none');
    });

    it('displays the message text in the element', () => {
      const msg = 'El servicio de geocodificación no está disponible.';
      errorMessage.update(msg);
      expect(errorMessage.getElement().textContent).toContain(msg);
    });

    it('updates the text when called with a different message', () => {
      errorMessage.update('Error A');
      errorMessage.update('Error B');
      const text = errorMessage.getElement().textContent ?? '';
      expect(text).toContain('Error B');
      expect(text).not.toContain('Error A');
    });

    it('renders a visible icon/prefix alongside the message', () => {
      errorMessage.update('Algún error');
      // The icon span is present and non-empty
      const icon = errorMessage.getElement().querySelector('[aria-hidden="true"]');
      expect(icon).not.toBeNull();
      expect(icon?.textContent?.trim().length).toBeGreaterThan(0);
    });

    it('shows a visually distinct background color (reddish scheme)', () => {
      // The container should have a non-white background set.
      const bg = errorMessage.getElement().style.backgroundColor;
      expect(bg).toBeTruthy();
      // Inline style in jsdom is stored as-is (rgb or hex); not pure white.
      expect(bg).not.toBe('white');
      expect(bg).not.toBe('');
    });

    it('shows a border for visual distinction', () => {
      const border = errorMessage.getElement().style.border;
      expect(border).toBeTruthy();
      expect(border).not.toBe('');
    });
  });

  // ── toggle cycle ──────────────────────────────────────────────────────────

  describe('show/hide toggle', () => {
    it('can be shown then hidden then shown again', () => {
      errorMessage.update('Primer error');
      expect(errorMessage.getElement().style.display).not.toBe('none');

      errorMessage.update(null);
      expect(errorMessage.getElement().style.display).toBe('none');

      errorMessage.update('Segundo error');
      expect(errorMessage.getElement().style.display).not.toBe('none');
    });
  });
});

// ─── Property-based tests ─────────────────────────────────────────────────────

describe('ErrorMessage – property: null always hides the element', () => {
  // Feature: weather-forecast-app, Property 11: Nueva búsqueda limpia el error anterior
  it('update(null) always hides the element regardless of prior state', () => {
    fc.assert(
      fc.property(
        fc.option(fc.string({ minLength: 1 }), { nil: null }),
        (priorMessage) => {
          const em = new ErrorMessage();
          // Optionally set a prior message first
          if (priorMessage !== null) {
            em.update(priorMessage);
          }
          // Clearing should always hide
          em.update(null);
          return em.getElement().style.display === 'none';
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('ErrorMessage – property: non-null message always shows element with text', () => {
  // Feature: weather-forecast-app, Property 12: Mensajes de error incluyen causa y acción sugerida
  it('update(message) always shows the element and contains the message text', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), (message) => {
        const em = new ErrorMessage();
        em.update(message);
        const el = em.getElement();
        const isVisible = el.style.display !== 'none';
        const containsText = (el.textContent ?? '').includes(message);
        return isVisible && containsText;
      }),
      { numRuns: 100 }
    );
  });
});

describe('ErrorMessage – property: display and content are always consistent', () => {
  // Feature: weather-forecast-app, Property 11 & 12
  it('hidden state always means empty/cleared text, visible state always shows the message', () => {
    fc.assert(
      fc.property(
        fc.option(fc.string({ minLength: 1 }), { nil: null }),
        (message) => {
          const em = new ErrorMessage();
          em.update(message);
          const el = em.getElement();

          if (message === null) {
            // Must be hidden
            return el.style.display === 'none';
          } else {
            // Must be visible and contain the text
            return (
              el.style.display !== 'none' &&
              (el.textContent ?? '').includes(message)
            );
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── Property 12: Mensajes de error incluyen causa y acción sugerida ──────────

describe('ErrorMessage – property P12: error messages include cause and suggested action', () => {
  // Feature: weather-forecast-app, Property 12: Mensajes de error incluyen causa y acción sugerida

  /**
   * Uses the real messages the app produces (src/errorMessages.ts): every
   * service error must name the cause and suggest an action (Req 5.7).
   * The empty-input message is the exact text mandated by task 14.2.
   *
   * Validates: Requirements 5.7
   */
  const ACTIONS = [
    'Verifica el nombre y vuelve a intentarlo',
    'Verifica tu conexión a internet e inténtalo de nuevo',
    'Inténtalo de nuevo en unos momentos',
  ];
  const CAUSES = [
    'No se encontró la ciudad ingresada.',
    'El servicio de geocodificación no está disponible.',
    'El servicio meteorológico no está disponible.',
    'Los datos meteorológicos recibidos están incompletos.',
  ];

  const MESSAGES: Record<string, string> = {
    EMPTY_INPUT: VALIDATION_EMPTY_INPUT,
    NOT_FOUND: GEOCODING_ERROR_MESSAGES.NOT_FOUND,
    GEO_NETWORK: GEOCODING_ERROR_MESSAGES.NETWORK,
    WEATHER_NETWORK: WEATHER_ERROR_MESSAGES.NETWORK,
    INCOMPLETE_DATA: WEATHER_ERROR_MESSAGES.INCOMPLETE_DATA,
  };

  it('rendered text contains both the cause and the suggested action for every error kind', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('NOT_FOUND', 'GEO_NETWORK', 'WEATHER_NETWORK', 'INCOMPLETE_DATA'),
        (kind) => {
          const em = new ErrorMessage();
          em.update(MESSAGES[kind]);
          const rendered = em.getElement().textContent ?? '';
          return (
            em.getElement().style.display !== 'none' &&
            CAUSES.some((c) => rendered.includes(c)) &&
            ACTIONS.some((a) => rendered.includes(a))
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it('empty-input message states the cause (action is conveyed by the input placeholder)', () => {
    const em = new ErrorMessage();
    em.update(MESSAGES.EMPTY_INPUT);
    expect(em.getElement().textContent).toContain('El nombre de la ciudad es requerido.');
  });
});
