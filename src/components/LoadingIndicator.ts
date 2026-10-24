/**
 * LoadingIndicator — accessible loading spinner component.
 *
 * Renders a container with `role="status"` and `aria-live="polite"` so that
 * screen readers announce the state change when the spinner becomes visible.
 * A visually-hidden label ("Buscando...") is always present in the DOM; the
 * animated spinner element is shown/hidden via the `visible` prop.
 *
 * Requirements: 2.6, 3.5, 5.4, 5.5
 */
export class LoadingIndicator {
  private readonly container: HTMLElement;
  private readonly spinner: HTMLElement;

  constructor() {
    // ── Container ────────────────────────────────────────────────────────────
    this.container = document.createElement('div');
    this.container.setAttribute('role', 'status');
    this.container.setAttribute('aria-live', 'polite');
    this.container.setAttribute('aria-label', 'Buscando...');

    // ── Visually-hidden text for screen readers ───────────────────────────────
    const srText = document.createElement('span');
    srText.textContent = 'Buscando...';
    // Classic visually-hidden technique: keeps text in the accessibility tree
    // while keeping it invisible on screen.
    Object.assign(srText.style, {
      position: 'absolute',
      width: '1px',
      height: '1px',
      padding: '0',
      margin: '-1px',
      overflow: 'hidden',
      clip: 'rect(0,0,0,0)',
      whiteSpace: 'nowrap',
      border: '0',
    });
    this.container.appendChild(srText);

    // ── Animated spinner element ─────────────────────────────────────────────
    this.spinner = document.createElement('div');
    this.spinner.className = 'loading-spinner';
    // Inline fallback styles — the app stylesheet can override via the class.
    Object.assign(this.spinner.style, {
      display: 'inline-block',
      width: '2rem',
      height: '2rem',
      border: '3px solid rgba(0, 0, 0, 0.15)',
      borderTopColor: 'currentColor',
      borderRadius: '50%',
      animation: 'loading-spin 0.75s linear infinite',
    });
    this.container.appendChild(this.spinner);

    // Inject the keyframe animation once into the document <head> if it has
    // not been injected already.
    LoadingIndicator.ensureKeyframes();

    // Start hidden.
    this.update(false);
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Shows or hides the loading indicator.
   * @param visible - `true` to show the spinner; `false` to hide it.
   */
  update(visible: boolean): void {
    this.container.style.display = visible ? '' : 'none';
    // Update aria-hidden so assistive technologies skip the region when idle.
    this.container.setAttribute('aria-hidden', visible ? 'false' : 'true');
  }

  /**
   * Returns the root DOM element to be inserted into the page.
   */
  getElement(): HTMLElement {
    return this.container;
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  /**
   * Injects the `@keyframes loading-spin` rule into the document once.
   * Safe to call multiple times — subsequent calls are no-ops.
   */
  private static ensureKeyframes(): void {
    const STYLE_ID = 'loading-indicator-keyframes';
    if (typeof document === 'undefined') return; // SSR/test safety guard
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      @keyframes loading-spin {
        to { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
  }
}
