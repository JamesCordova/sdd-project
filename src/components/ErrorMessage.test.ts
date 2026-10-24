// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
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
   * Maps each error kind to the full user-facing message string (cause + action)
   * as defined in the design.md error table. The WeatherController assembles
   * these strings before calling ErrorMessage.update(), so the component only
   * needs to render whatever it receives faithfully.
   *
   * Validates: Requirements 5.7
   */
  const ERROR_MESSAGES: Record<string, { cause: string; action: string }> = {
    EMPTY_INPUT: {
      cause: 'El nombre de la ciudad es requerido.',
      action: 'Escribe el nombre de una ciudad',
    },
    NOT_FOUND: {
      cause: 'No se encontró la ciudad ingresada.',
      action: 'Verifica el nombre y vuelve a intentarlo',
    },
    GEO_NETWORK: {
      cause: 'El servicio de geocodificación no está disponible.',
      action: 'Verifica tu conexión a internet e inténtalo de nuevo',
    },
    WEATHER_NETWORK: {
      cause: 'El servicio meteorológico no está disponible.',
      action: 'Verifica tu conexión a internet e inténtalo de nuevo',
    },
    INCOMPLETE_DATA: {
      cause: 'Los datos meteorológicos recibidos están incompletos.',
      action: 'Inténtalo de nuevo en unos momentos',
    },
  };

  it('rendered text contains both the cause and the suggested action for every error kind', () => {
    // **Validates: Requirements 5.7**
    fc.assert(
      fc.property(
        fc.constantFrom(
          'EMPTY_INPUT',
          'NOT_FOUND',
          'GEO_NETWORK',
          'WEATHER_NETWORK',
          'INCOMPLETE_DATA'
        ),
        (kind) => {
          const { cause, action } = ERROR_MESSAGES[kind];
          const fullMessage = `${cause} ${action}.`;

          const em = new ErrorMessage();
          em.update(fullMessage);

          const rendered = em.getElement().textContent ?? '';
          const isVisible = em.getElement().style.display !== 'none';
          const hasCause = rendered.includes(cause);
          const hasAction = rendered.includes(action);

          return isVisible && hasCause && hasAction;
        }
      ),
      { numRuns: 100 }
    );
  });
});
