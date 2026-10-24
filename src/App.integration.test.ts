/**
 * Integration tests for the complete search flow (both APIs mocked via fetch).
 *
 * Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 4.1, 5.2, 5.5
 *
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { GEOCODING_ERROR_MESSAGES, WEATHER_ERROR_MESSAGES } from './errorMessages';

const json = (body: unknown, ok = true, status = 200) =>
  Promise.resolve({ ok, status, json: () => Promise.resolve(body) } as Response);

const berlinGeo = { results: [{ name: 'Berlin', latitude: 52.52, longitude: 13.41 }] };
const berlinWeather = {
  current: { temperature_2m: 3.2, relative_humidity_2m: 78, precipitation: 0.4 },
};

function mount() {
  const app = new App();
  document.body.replaceChildren(app.getElement());
  const q = <T extends Element>(sel: string) => app.getElement().querySelector(sel) as T;
  return {
    app,
    input: q<HTMLInputElement>('input'),
    button: q<HTMLButtonElement>('button'),
    error: q<HTMLElement>('.error-message'),
    spinner: q<HTMLElement>('[role="status"]'),
    panel: q<HTMLElement>('section'),
  };
}

const visible = (el: HTMLElement) => el.style.display !== 'none';

describe('App integration', () => {
  const fetchMock = vi.fn();
  beforeEach(() => vi.stubGlobal('fetch', fetchMock));
  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
  });

  it('successful flow shows the ForecastPanel and re-enables the button', async () => {
    fetchMock.mockImplementation((url: string) =>
      url.includes('geocoding-api') ? json(berlinGeo) : json(berlinWeather),
    );
    const { app, input, button, error, spinner, panel } = mount();
    expect(visible(panel)).toBe(false);

    input.value = 'Berlin';
    button.click();
    expect(button.disabled).toBe(true);
    expect(visible(spinner)).toBe(true);
    await vi.waitFor(() => expect(visible(panel)).toBe(true));

    expect(fetchMock.mock.calls[0][0]).toContain('name=Berlin');
    expect(fetchMock.mock.calls[1][0]).toContain('latitude=52.52');
    expect(panel.textContent).toContain('Berlin');
    expect(panel.textContent).toContain('3.2 °C');
    expect(panel.textContent).toContain('78 %');
    expect(panel.textContent).toContain('0.4 mm');
    expect(visible(error)).toBe(false);
    expect(visible(spinner)).toBe(false);
    expect(button.disabled).toBe(false);
    expect(app.stateManager.getState().forecast?.cityName).toBe('Berlin');
  });

  it('city not found shows the error and no ForecastPanel', async () => {
    fetchMock.mockImplementation(() => json({}));
    const { app, input, button, error, panel } = mount();

    input.value = 'Zzzzz';
    button.click();
    await vi.waitFor(() => expect(visible(error)).toBe(true));

    expect(error.textContent).toContain(GEOCODING_ERROR_MESSAGES.NOT_FOUND);
    expect(visible(panel)).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(app.stateManager.getState().isLoading).toBe(false);
  });

  it('weather network error shows the error and hides the loading indicator', async () => {
    fetchMock.mockImplementation((url: string) =>
      url.includes('geocoding-api') ? json(berlinGeo) : json({}, false, 500),
    );
    const { input, button, error, spinner, panel } = mount();

    input.value = 'Berlin';
    button.click();
    await vi.waitFor(() => expect(visible(error)).toBe(true));

    expect(error.textContent).toContain(WEATHER_ERROR_MESSAGES.NETWORK);
    expect(visible(spinner)).toBe(false);
    expect(visible(panel)).toBe(false);
    expect(button.disabled).toBe(false);
  });

  it('empty input shows the validation error, makes no request, and editing clears it', () => {
    const { input, button } = mount();
    button.click();
    const span = document.querySelector('[role="alert"]:not(.error-message)') as HTMLElement;
    expect(span.hidden).toBe(false);
    expect(span.textContent).toBe('El nombre de la ciudad es requerido.');
    expect(fetchMock).not.toHaveBeenCalled();

    input.value = 'B';
    input.dispatchEvent(new Event('input'));
    expect(span.hidden).toBe(true);
  });

  it('a new search clears the previous error and replaces the forecast', async () => {
    fetchMock.mockImplementationOnce(() => json({}));
    const { input, button, error, panel } = mount();
    input.value = 'Nowhere';
    button.click();
    await vi.waitFor(() => expect(visible(error)).toBe(true));

    fetchMock.mockImplementation((url: string) =>
      url.includes('geocoding-api') ? json(berlinGeo) : json(berlinWeather),
    );
    input.value = 'Berlin';
    button.click();
    expect(visible(error)).toBe(false);
    await vi.waitFor(() => expect(visible(panel)).toBe(true));
    expect(panel.textContent).toContain('Berlin');
  });
});
