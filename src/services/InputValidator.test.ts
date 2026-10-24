import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import InputValidatorImpl from './InputValidator';

describe('InputValidator', () => {
  const validator = new InputValidatorImpl();

  // Unit tests (example-based)
  describe('validate()', () => {
    it('returns null for a normal city name', () => {
      expect(validator.validate('Madrid')).toBeNull();
    });

    it('returns null for a single non-whitespace character', () => {
      expect(validator.validate('A')).toBeNull();
    });

    it('returns null for a city name with surrounding whitespace', () => {
      expect(validator.validate('  Paris  ')).toBeNull();
    });

    it('returns error message for empty string', () => {
      expect(validator.validate('')).toBe('El nombre de la ciudad es requerido.');
    });

    it('returns error message for a single space', () => {
      expect(validator.validate(' ')).toBe('El nombre de la ciudad es requerido.');
    });

    it('returns error message for multiple spaces', () => {
      expect(validator.validate('   ')).toBe('El nombre de la ciudad es requerido.');
    });

    it('returns error message for tab characters', () => {
      expect(validator.validate('\t')).toBe('El nombre de la ciudad es requerido.');
    });

    it('returns error message for newline characters', () => {
      expect(validator.validate('\n')).toBe('El nombre de la ciudad es requerido.');
    });

    it('returns error message for mixed whitespace', () => {
      expect(validator.validate(' \t\n\r ')).toBe('El nombre de la ciudad es requerido.');
    });
  });

  // Property-based tests
  // Feature: weather-forecast-app, Property 2: Rechazo de entradas vacías o de solo espacios
  describe('Property 2: Rechazo de entradas vacías o de solo espacios', () => {
    // Validates: Requirements 1.5
    it('always returns a non-null error string for any whitespace-only or empty input', () => {
      fc.assert(
        fc.property(
          fc.stringOf(fc.constantFrom(' ', '\t', '\n', '\r')),
          (input) => {
            const result = validator.validate(input);
            return result !== null && typeof result === 'string' && result.length > 0;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
