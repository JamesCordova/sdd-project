/**
 * ErrorMessage — accessible error message component.
 *
 * Renders a container with `role="alert"` and `aria-live="assertive"` so that
 * screen readers announce errors immediately when they appear. Uses a visually
 * distinct reddish/warning colour scheme with an icon prefix to differentiate
 * it from the ForecastPanel.
 *
 * Requirements: 5.1, 5.3, 5.6, 5.7
 */
export class ErrorMessage {
  private readonly container: HTMLElement;
  private readonly iconSpan: HTMLSpanElement;
  private readonly messageSpan: HTMLSpanElement;

  constructor() {
    // ── Container ──────────────────────────────────────────────────────────
    this.container = document.createElement('div');
    this.container.setAttribute('role', 'alert');
    this.container.setAttribute('aria-live', 'assertive');
    this.container.setAttribute('aria-atomic', 'true');
    this.container.className = 'error-message';

    // Inline styles ensure the visual treatment is applied regardless of
    // whether the app stylesheet is loaded, and make the component
    // self-contained for testing environments.
    Object.assign(this.container.style, {
      display: 'none',
      alignItems: 'flex-start',
      gap: '0.5rem',
      padding: '0.75rem 1rem',
      borderRadius: '0.375rem',
      border: '1px solid #f87171',       // red-400
      backgroundColor: '#fef2f2',        // red-50
      color: '#b91c1c',                  // red-700
      fontSize: '0.95rem',
      lineHeight: '1.5',
    });

    // ── Icon ───────────────────────────────────────────────────────────────
    this.iconSpan = document.createElement('span');
    this.iconSpan.setAttribute('aria-hidden', 'true'); // decorative; message carries the meaning
    this.iconSpan.textContent = '⚠️';
    Object.assign(this.iconSpan.style, {
      flexShrink: '0',
      fontSize: '1rem',
    });

    // ── Message text ───────────────────────────────────────────────────────
    this.messageSpan = document.createElement('span');
    this.messageSpan.className = 'error-message__text';

    // ── Assemble ───────────────────────────────────────────────────────────
    this.container.appendChild(this.iconSpan);
    this.container.appendChild(this.messageSpan);
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Shows or hides the error message.
   *
   * @param message - The error string to display, or `null` to hide the component.
   *
   * When `message` is `null` the element is hidden (`display: none`), so it
   * takes no space in the layout and is skipped by assistive technologies.
   * When `message` is non-null the element becomes visible and the text is
   * announced immediately by screen readers via `aria-live="assertive"`.
   */
  update(message: string | null): void {
    if (message === null) {
      this.container.style.display = 'none';
      this.messageSpan.textContent = '';
    } else {
      this.messageSpan.textContent = message;
      this.container.style.display = 'flex';
    }
  }

  /**
   * Returns the root DOM element for mounting into the page.
   */
  getElement(): HTMLElement {
    return this.container;
  }
}

export default ErrorMessage;
