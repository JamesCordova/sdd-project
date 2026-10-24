/**
 * SearchBar component
 *
 * Renders a City_Input (text, maxlength=100) and a Search_Button inside a
 * container <div>.  Emits `onSearch(cityName)` when the button is clicked or
 * Enter is pressed while the input is focused.  Calls
 * `onClearValidationError()` whenever the input value changes.
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 5.3, 5.4
 */

export interface SearchBarProps {
  /** Called with the current input value when the user activates the search. */
  onSearch: (cityName: string) => void;
  /** Called whenever the user modifies the input content. */
  onClearValidationError: () => void;
}

export interface SearchBarState {
  isLoading: boolean;
  validationError: string | null;
}

/** Unique ID counter so multiple SearchBar instances don't share IDs. */
let instanceCount = 0;

export class SearchBar {
  private readonly container: HTMLDivElement;
  private readonly input: HTMLInputElement;
  private readonly button: HTMLButtonElement;
  private readonly errorSpan: HTMLSpanElement;
  private readonly errorId: string;

  constructor(private readonly props: SearchBarProps) {
    instanceCount += 1;
    this.errorId = `search-bar-error-${instanceCount}`;

    // ── Container ──────────────────────────────────────────────────────────
    this.container = document.createElement('div');
    this.container.setAttribute('role', 'search');

    // ── Input ──────────────────────────────────────────────────────────────
    this.input = document.createElement('input');
    this.input.type = 'text';
    this.input.maxLength = 100;
    this.input.id = `city-input-${instanceCount}`;
    this.input.setAttribute('aria-label', 'Nombre de la ciudad');
    this.input.setAttribute('aria-describedby', this.errorId);
    this.input.setAttribute('autocomplete', 'off');
    this.input.setAttribute('placeholder', 'Ingresa el nombre de una ciudad…');

    // ── Error span ─────────────────────────────────────────────────────────
    this.errorSpan = document.createElement('span');
    this.errorSpan.id = this.errorId;
    this.errorSpan.setAttribute('role', 'alert');
    this.errorSpan.setAttribute('aria-live', 'polite');
    this.errorSpan.hidden = true;

    // ── Button ─────────────────────────────────────────────────────────────
    this.button = document.createElement('button');
    this.button.type = 'button';
    this.button.textContent = 'Buscar';
    this.button.setAttribute('aria-label', 'Buscar pronóstico del clima');

    // ── Assemble ───────────────────────────────────────────────────────────
    this.container.append(this.input, this.errorSpan, this.button);

    // ── Event listeners ────────────────────────────────────────────────────
    this.button.addEventListener('click', () => this.handleSearch());

    this.input.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        this.handleSearch();
      }
    });

    this.input.addEventListener('input', () => {
      this.props.onClearValidationError();
    });
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /** Returns the root DOM element for mounting. */
  getElement(): HTMLElement {
    return this.container;
  }

  /**
   * Reflects the current application state in the component.
   *
   * - `isLoading === true`  → button is disabled
   * - `validationError !== null` → error span is shown with the error text
   */
  update(state: SearchBarState): void {
    // Loading state controls button availability (Requirements 5.4)
    this.button.disabled = state.isLoading;

    // Validation error display (Requirements 1.5)
    if (state.validationError !== null) {
      this.errorSpan.textContent = state.validationError;
      this.errorSpan.hidden = false;
      this.input.setAttribute('aria-invalid', 'true');
    } else {
      this.errorSpan.textContent = '';
      this.errorSpan.hidden = true;
      this.input.removeAttribute('aria-invalid');
    }
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private handleSearch(): void {
    this.props.onSearch(this.input.value);
  }
}

export default SearchBar;
