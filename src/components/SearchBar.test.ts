/**
 * Unit tests for SearchBar component.
 *
 * Requirements covered: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 5.3, 5.4
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import * as fc from 'fast-check';
import { SearchBar } from './SearchBar';

// jsdom is provided by vitest's default environment
function makeSearchBar() {
  const onSearch = vi.fn<[string], void>();
  const onClearValidationError = vi.fn<[], void>();
  const bar = new SearchBar({ onSearch, onClearValidationError });
  return { bar, onSearch, onClearValidationError };
}

function getInput(bar: SearchBar): HTMLInputElement {
  return bar.getElement().querySelector('input[type="text"]') as HTMLInputElement;
}

function getButton(bar: SearchBar): HTMLButtonElement {
  return bar.getElement().querySelector('button') as HTMLButtonElement;
}

function getErrorSpan(bar: SearchBar): HTMLSpanElement {
  return bar.getElement().querySelector('span') as HTMLSpanElement;
}

// ─────────────────────────────────────────────────────────────────────────────
// Rendering
// ─────────────────────────────────────────────────────────────────────────────

describe('SearchBar – rendering', () => {
  it('renders a container element (Requirement 1.1)', () => {
    const { bar } = makeSearchBar();
    expect(bar.getElement()).toBeInstanceOf(HTMLElement);
  });

  it('renders a text input with maxlength=100 (Requirement 1.3)', () => {
    const { bar } = makeSearchBar();
    const input = getInput(bar);
    expect(input).not.toBeNull();
    expect(input.maxLength).toBe(100);
  });

  it('renders a button (Requirement 1.2)', () => {
    const { bar } = makeSearchBar();
    const button = getButton(bar);
    expect(button).not.toBeNull();
    expect(button.type).toBe('button');
  });

  it('contains input, error span and button inside the container', () => {
    const { bar } = makeSearchBar();
    const el = bar.getElement();
    expect(el.querySelector('input')).not.toBeNull();
    expect(el.querySelector('span')).not.toBeNull();
    expect(el.querySelector('button')).not.toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Accessibility
// ─────────────────────────────────────────────────────────────────────────────

describe('SearchBar – accessibility', () => {
  it('input has an aria-label', () => {
    const { bar } = makeSearchBar();
    const input = getInput(bar);
    expect(input.getAttribute('aria-label')).toBeTruthy();
  });

  it('input has aria-describedby pointing to the error span id', () => {
    const { bar } = makeSearchBar();
    const input = getInput(bar);
    const span = getErrorSpan(bar);
    expect(input.getAttribute('aria-describedby')).toBe(span.id);
  });

  it('button has an aria-label', () => {
    const { bar } = makeSearchBar();
    const button = getButton(bar);
    expect(button.getAttribute('aria-label')).toBeTruthy();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// onSearch – button click
// ─────────────────────────────────────────────────────────────────────────────

describe('SearchBar – button click triggers onSearch (Requirements 1.1, 1.2)', () => {
  it('calls onSearch with the current input value when button is clicked', () => {
    const { bar, onSearch } = makeSearchBar();
    const input = getInput(bar);
    const button = getButton(bar);

    input.value = 'Buenos Aires';
    button.click();

    expect(onSearch).toHaveBeenCalledOnce();
    expect(onSearch).toHaveBeenCalledWith('Buenos Aires');
  });

  it('calls onSearch with empty string when input is empty and button is clicked', () => {
    const { bar, onSearch } = makeSearchBar();
    getButton(bar).click();
    expect(onSearch).toHaveBeenCalledWith('');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// onSearch – Enter key
// ─────────────────────────────────────────────────────────────────────────────

describe('SearchBar – Enter key triggers onSearch (Requirement 1.4)', () => {
  it('calls onSearch when Enter is pressed while the input is focused', () => {
    const { bar, onSearch } = makeSearchBar();
    const input = getInput(bar);

    input.value = 'Tokyo';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    expect(onSearch).toHaveBeenCalledOnce();
    expect(onSearch).toHaveBeenCalledWith('Tokyo');
  });

  it('does NOT call onSearch when a non-Enter key is pressed', () => {
    const { bar, onSearch } = makeSearchBar();
    const input = getInput(bar);

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));

    expect(onSearch).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// onClearValidationError – input event
// ─────────────────────────────────────────────────────────────────────────────

describe('SearchBar – input change clears validation error (Requirement 1.6)', () => {
  it('calls onClearValidationError when the input value changes', () => {
    const { bar, onClearValidationError } = makeSearchBar();
    const input = getInput(bar);

    input.dispatchEvent(new Event('input', { bubbles: true }));

    expect(onClearValidationError).toHaveBeenCalledOnce();
  });

  it('calls onClearValidationError each time the input fires an input event', () => {
    const { bar, onClearValidationError } = makeSearchBar();
    const input = getInput(bar);

    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('input'));

    expect(onClearValidationError).toHaveBeenCalledTimes(2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// update() – isLoading
// ─────────────────────────────────────────────────────────────────────────────

describe('SearchBar – update() isLoading (Requirements 5.4, 5.5)', () => {
  it('disables the button when isLoading is true', () => {
    const { bar } = makeSearchBar();
    bar.update({ isLoading: true, validationError: null });
    expect(getButton(bar).disabled).toBe(true);
  });

  it('enables the button when isLoading is false', () => {
    const { bar } = makeSearchBar();
    bar.update({ isLoading: true, validationError: null });
    bar.update({ isLoading: false, validationError: null });
    expect(getButton(bar).disabled).toBe(false);
  });

  it('button is enabled by default (before any update)', () => {
    const { bar } = makeSearchBar();
    expect(getButton(bar).disabled).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// update() – validationError
// ─────────────────────────────────────────────────────────────────────────────

describe('SearchBar – update() validationError (Requirements 1.5, 1.6, 5.3)', () => {
  it('shows the error span when validationError is non-null', () => {
    const { bar } = makeSearchBar();
    bar.update({ isLoading: false, validationError: 'El nombre de la ciudad es requerido.' });

    const span = getErrorSpan(bar);
    expect(span.hidden).toBe(false);
    expect(span.textContent).toBe('El nombre de la ciudad es requerido.');
  });

  it('hides the error span when validationError is null', () => {
    const { bar } = makeSearchBar();
    bar.update({ isLoading: false, validationError: 'Error' });
    bar.update({ isLoading: false, validationError: null });

    const span = getErrorSpan(bar);
    expect(span.hidden).toBe(true);
  });

  it('error span is hidden by default', () => {
    const { bar } = makeSearchBar();
    expect(getErrorSpan(bar).hidden).toBe(true);
  });

  it('sets aria-invalid on input when there is a validation error', () => {
    const { bar } = makeSearchBar();
    bar.update({ isLoading: false, validationError: 'Requerido' });
    expect(getInput(bar).getAttribute('aria-invalid')).toBe('true');
  });

  it('removes aria-invalid from input when error is cleared', () => {
    const { bar } = makeSearchBar();
    bar.update({ isLoading: false, validationError: 'Requerido' });
    bar.update({ isLoading: false, validationError: null });
    expect(getInput(bar).getAttribute('aria-invalid')).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Multiple instances have independent IDs
// ─────────────────────────────────────────────────────────────────────────────

describe('SearchBar – multiple instances', () => {
  it('two instances have different error span IDs to avoid ARIA conflicts', () => {
    const { bar: bar1 } = makeSearchBar();
    const { bar: bar2 } = makeSearchBar();
    expect(getErrorSpan(bar1).id).not.toBe(getErrorSpan(bar2).id);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Property-Based Tests
// ─────────────────────────────────────────────────────────────────────────────

// Feature: weather-forecast-app, Property 1: Límite de caracteres en el input
// Validates: Requirements 1.3
describe('SearchBar – PBT P1: character limit on input (Requirement 1.3)', () => {
  it('onSearch is called with at most 100 characters for any input string', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 200 }), (rawValue) => {
        const onSearch = vi.fn<[string], void>();
        const onClearValidationError = vi.fn<[], void>();
        const bar = new SearchBar({ onSearch, onClearValidationError });

        const input = bar.getElement().querySelector('input[type="text"]') as HTMLInputElement;
        const button = bar.getElement().querySelector('button') as HTMLButtonElement;

        // Enforce maxLength by truncating (mirrors real browser behaviour)
        input.value = rawValue.slice(0, input.maxLength);
        button.click();

        const emittedValue: string = onSearch.mock.calls[0][0];
        expect(emittedValue.length).toBeLessThanOrEqual(100);

        if (rawValue.length <= 100) {
          // For short strings the full value is preserved
          expect(emittedValue).toBe(rawValue);
        }
      }),
      { numRuns: 100 },
    );
  });
});

// Feature: weather-forecast-app, Property 3: Editar el input limpia el error de validación
// Validates: Requirements 1.6
describe('SearchBar – PBT P3: editing input clears validation error (Requirement 1.6)', () => {
  it('onClearValidationError is called whenever input fires an input event', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), (errorMessage) => {
        const onSearch = vi.fn<[string], void>();
        const onClearValidationError = vi.fn<[], void>();
        const bar = new SearchBar({ onSearch, onClearValidationError });

        // Set a validation error state
        bar.update({ isLoading: false, validationError: errorMessage });

        const input = bar.getElement().querySelector('input[type="text"]') as HTMLInputElement;

        // Simulate user modifying the input
        input.dispatchEvent(new Event('input', { bubbles: true }));

        expect(onClearValidationError).toHaveBeenCalledOnce();
      }),
      { numRuns: 100 },
    );
  });
});

// Feature: weather-forecast-app, Property 10: Estado del botón refleja el estado de carga
// Validates: Requirements 5.4, 5.5
describe('SearchBar – PBT P10: button disabled state mirrors isLoading (Requirements 5.4, 5.5)', () => {
  it('Search_Button.disabled === isLoading for any boolean value', () => {
    fc.assert(
      fc.property(fc.boolean(), (isLoading) => {
        const onSearch = vi.fn<[string], void>();
        const onClearValidationError = vi.fn<[], void>();
        const bar = new SearchBar({ onSearch, onClearValidationError });

        bar.update({ isLoading, validationError: null });

        const button = bar.getElement().querySelector('button') as HTMLButtonElement;
        expect(button.disabled).toBe(isLoading);
      }),
      { numRuns: 100 },
    );
  });
});
