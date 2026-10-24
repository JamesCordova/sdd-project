/**
 * App — root component. Wires services, controller, state and UI components.
 *
 * Requirements: 1.1, 1.2, 2.6, 3.5, 4.1, 4.5, 5.1, 5.2, 5.4, 5.5
 */
import { StateManager } from './application/StateManager';
import { WeatherControllerImpl } from './application/WeatherController';
import { ErrorMessage } from './components/ErrorMessage';
import { ForecastPanel } from './components/ForecastPanel';
import { LoadingIndicator } from './components/LoadingIndicator';
import { SearchBar } from './components/SearchBar';
import { GeocodingServiceImpl } from './services/GeocodingService';
import { InputValidatorImpl } from './services/InputValidator';
import { WeatherServiceImpl } from './services/WeatherService';
import type { AppState, GeocodingService, InputValidator, WeatherService } from './types';

export interface AppDeps {
  validator?: InputValidator;
  geocodingService?: GeocodingService;
  weatherService?: WeatherService;
}

export class App {
  readonly stateManager = new StateManager();
  private readonly controller: WeatherControllerImpl;
  private readonly searchBar: SearchBar;
  private readonly loadingIndicator = new LoadingIndicator();
  private readonly errorMessage = new ErrorMessage();
  private readonly forecastPanel = new ForecastPanel();
  private readonly root: HTMLElement;

  constructor(deps: AppDeps = {}) {
    this.controller = new WeatherControllerImpl(
      deps.validator ?? new InputValidatorImpl(),
      deps.geocodingService ?? new GeocodingServiceImpl(),
      deps.weatherService ?? new WeatherServiceImpl(),
      this.stateManager,
    );

    this.searchBar = new SearchBar({
      onSearch: (cityName) => {
        void this.controller.search(cityName);
      },
      // Req 1.6: editing the input hides the validation error
      onClearValidationError: () => this.stateManager.setValidationError(null),
    });

    // Layout order: SearchBar · LoadingIndicator · ErrorMessage · ForecastPanel (Req 5.1)
    this.root = document.createElement('main');
    const title = document.createElement('h1');
    title.textContent = 'Weather Forecast App';
    this.root.append(
      title,
      this.searchBar.getElement(),
      this.loadingIndicator.getElement(),
      this.errorMessage.getElement(),
      this.forecastPanel.getElement(),
    );

    this.stateManager.subscribe((state) => this.render(state));
    this.render(this.stateManager.getState());
  }

  getElement(): HTMLElement {
    return this.root;
  }

  /** Runs a search programmatically (used by tests). */
  search(cityName: string): Promise<void> {
    return this.controller.search(cityName);
  }

  private render(state: AppState): void {
    this.searchBar.update({ isLoading: state.isLoading, validationError: state.validationError });
    this.loadingIndicator.update(state.isLoading);
    this.errorMessage.update(state.serviceError);
    // Req 4.5: hide the previous forecast while a new search is in flight
    this.forecastPanel.update(state.isLoading ? null : state.forecast);
  }
}

export default App;
