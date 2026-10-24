import type { InputValidator } from '../types';

/** Validates city name user input. */
export class InputValidatorImpl implements InputValidator {
  /**
   * Returns null if the city name is valid (contains at least one non-whitespace character).
   * Returns a localized error message if the input is empty or whitespace-only.
   */
  validate(cityName: string): string | null {
    if (cityName.trim().length > 0) {
      return null;
    }
    return 'El nombre de la ciudad es requerido.';
  }
}

export default InputValidatorImpl;
