# Implementation Plan: Weather Forecast App

## Overview

Implementación incremental de una SPA client-side en TypeScript con arquitectura de tres capas (UI → Application → Services). Las tareas siguen el orden de dependencias: tipos e interfaces → servicios → capa de aplicación → componentes UI → integración final. Los tests de propiedad con fast-check se añaden junto a cada componente para detectar errores temprano.

## Tasks

- [x] 1. Configurar estructura del proyecto e interfaces centrales
  - Inicializar proyecto con TypeScript, Vite (o bundler equivalente) y fast-check
  - Crear los ficheros de tipos compartidos: `Coordinates`, `ForecastData`, `AppState`, `GeocodingErrorKind`, `WeatherErrorKind` y las clases de error `GeocodingError` y `WeatherError`
  - Definir las interfaces de servicio `GeocodingService`, `WeatherService`, `InputValidator` y `WeatherController`
  - Configurar el framework de testing (Vitest o Jest) con soporte a fast-check
  - _Requirements: 1.1, 2.1, 3.1_

- [x] 2. Implementar `InputValidator`
  - [x] 2.1 Implementar la clase `InputValidator`
    - Implementar `validate(cityName: string): string | null`
    - Devolver `null` si `cityName.trim().length > 0`; devolver mensaje de error localizado en caso contrario
    - _Requirements: 1.5_

  - [x] 2.2 Escribir tests unitarios para `InputValidator`
    - Input vacío → error; input de solo espacios → error; input con tabulaciones/saltos de línea → error; input con un carácter → válido
    - _Requirements: 1.5_

  - [x] 2.3 Escribir test de propiedad P2 para `InputValidator`
    - **Property 2: Rechazo de entradas vacías o de solo espacios**
    - Generador: `fc.stringOf(fc.constantFrom(' ', '\t', '\n', '\r'))`
    - Verificar que `validate()` siempre devuelve un string no nulo para cualquier combinación de espacios en blanco
    - **Validates: Requirements 1.5**

- [x] 3. Implementar `GeocodingService`
  - [x] 3.1 Implementar la clase `GeocodingService`
    - Construir la URL `https://geocoding-api.open-meteo.com/v1/search?name={cityName}&count=1&language=es&format=json`
    - Extraer `results[0].latitude`, `results[0].longitude` y `results[0].name`
    - Si `results` está ausente o vacío lanzar `GeocodingError('NOT_FOUND')`
    - Si hay error de red o código HTTP no exitoso lanzar `GeocodingError('NETWORK')`
    - _Requirements: 2.1, 2.2, 2.4, 2.5_

  - [x] 3.2 Escribir tests unitarios para `GeocodingService`
    - Respuesta con `results` vacío → `NOT_FOUND`; HTTP 500 → `NETWORK`; error de red (fetch rechazado) → `NETWORK`; respuesta válida → objeto `Coordinates` correcto
    - _Requirements: 2.2, 2.4, 2.5_

- [x] 4. Implementar `WeatherService`
  - [x] 4.1 Implementar la clase `WeatherService`
    - Construir la URL `https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=temperature_2m,relative_humidity_2m,precipitation`
    - Configurar timeout de 10 s; si se supera lanzar `WeatherError('NETWORK')`
    - Extraer `current.temperature_2m`, `current.relative_humidity_2m` y `current.precipitation`
    - Si alguno de los tres campos está ausente o no es numérico lanzar `WeatherError('INCOMPLETE_DATA')`
    - Si hay error de red o código HTTP no exitoso lanzar `WeatherError('NETWORK')`
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [x] 4.2 Escribir tests unitarios para `WeatherService`
    - Timeout superado → `NETWORK`; HTTP 404 → `NETWORK`; campo `temperature_2m` ausente → `INCOMPLETE_DATA`; respuesta completa → `ForecastData` correcto
    - _Requirements: 3.2, 3.3, 3.4_

  - [x] 4.3 Escribir test de propiedad P6 para `WeatherService`
    - **Property 6: Extracción correcta de datos de pronóstico**
    - Generador: `fc.record({ temp: fc.float(), humidity: fc.integer({ min: 0, max: 100 }), precip: fc.float({ min: 0 }) })`
    - Verificar que los valores de `ForecastData` son exactamente iguales a los de `current.*` en la respuesta
    - **Validates: Requirements 3.2**

  - [x] 4.4 Escribir test de propiedad P7 para `WeatherService`
    - **Property 7: Respuesta incompleta de Weather API muestra error**
    - Generar respuestas de la Weather API con subconjuntos arbitrarios de los tres campos faltantes o no numéricos
    - Verificar que siempre se lanza `WeatherError('INCOMPLETE_DATA')` y nunca se construye un `ForecastData`
    - **Validates: Requirements 3.3, 4.6**

- [~] 5. Checkpoint — Verificar servicios y validador
  - Asegurarse de que todos los tests de las tareas 2–4 pasan. Preguntar al usuario si tiene dudas.

- [x] 6. Implementar `StateManager`
  - [x] 6.1 Implementar la clase `StateManager`
    - Gestionar el estado reactivo `AppState`: `isLoading`, `validationError`, `serviceError`, `forecast`
    - Exponer métodos para actualizar cada campo y suscribirse a cambios de estado
    - Aplicar las transiciones definidas en el diagrama de estados del diseño
    - _Requirements: 2.6, 3.5, 5.2, 5.4, 5.5_

  - [x] 6.2 Escribir test de propiedad P11 para `StateManager`
    - **Property 11: Nueva búsqueda limpia el error anterior**
    - Generador: `fc.constantFrom(...allServiceErrorKinds)`
    - Verificar que al iniciar una nueva búsqueda `serviceError` se pone a `null` antes de cualquier llamada HTTP
    - **Validates: Requirements 5.2**

- [x] 7. Implementar `WeatherController`
  - [x] 7.1 Implementar la clase `WeatherController`
    - Implementar `search(cityName: string): Promise<void>` que orquesta: validar → limpiar errores → mostrar carga → geocodificar → consultar pronóstico → actualizar estado → ocultar carga
    - Asegurarse de que `hideLoading()` se llama tanto en éxito como en error (bloque `finally`)
    - _Requirements: 1.5, 2.1, 2.4, 2.5, 3.1, 3.3, 3.4, 5.2, 5.4, 5.5_

  - [x] 7.2 Escribir tests unitarios para `WeatherController`
    - Flujo completo exitoso; error en geocodificación limpia el loading; error en weather limpia el loading; input inválido no llama a la Geocoding API
    - _Requirements: 2.6, 3.5, 5.2, 5.4, 5.5_

  - [x] 7.3 Escribir test de propiedad P4 para `WeatherController`
    - **Property 4: Cadena de llamadas API usa parámetros correctos**
    - Generador: `fc.record({ lat: fc.float(), lon: fc.float(), name: fc.string({ minLength: 1 }) })`
    - Verificar que (a) se llama a Geocoding API con el cityName exacto; (b) se llama a Weather API con `lat` y `lon` de `results[0]`; (c) la solicitud incluye las tres variables requeridas
    - **Validates: Requirements 2.1, 2.2, 2.3, 3.1**

  - [x] 7.4 Escribir test de propiedad P5 para `WeatherController`
    - **Property 5: Ciclo de vida del indicador de carga**
    - Generador: `fc.oneof(successResponse, notFoundResponse, networkErrorArb)`
    - Verificar que `isLoading` es `true` durante toda la solicitud y `false` una vez terminada, independientemente del resultado
    - **Validates: Requirements 2.6, 3.5, 5.5**

- [~] 8. Checkpoint — Verificar capa de aplicación
  - Asegurarse de que todos los tests de las tareas 6–7 pasan. Preguntar al usuario si tiene dudas.

- [ ] 9. Implementar componente `SearchBar`
  - [x] 9.1 Implementar el componente `SearchBar`
    - Renderizar `City_Input` (maxlength=100) y `Search_Button`
    - Emitir el evento `onSearch(cityName)` al hacer clic en el botón o pulsar Enter con el input enfocado
    - Recibir props `isLoading: boolean` (deshabilita el botón) y `validationError: string | null` (muestra/oculta mensaje inline)
    - Limpiar `validationError` al modificar el contenido del input mediante callback al padre
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 5.3, 5.4_

  - [-] 9.2 Escribir test de propiedad P1 para `SearchBar`
    - **Property 1: Límite de caracteres en el input**
    - Generador: `fc.string({ maxLength: 200 })`
    - Verificar que el valor almacenado/emitido por `City_Input` nunca supera los 100 caracteres; para strings ≤ 100 se almacena completo; para strings > 100 solo los primeros 100
    - **Validates: Requirements 1.3**

  - [-] 9.3 Escribir test de propiedad P3 para `SearchBar`
    - **Property 3: Editar el input limpia el error de validación**
    - Generador: `fc.string({ minLength: 1 })`
    - Simular estado con `validationError !== null`, aplicar cualquier modificación al input, verificar que `validationError` se vuelve `null`
    - **Validates: Requirements 1.6**

  - [-] 9.4 Escribir test de propiedad P10 para `SearchBar`
    - **Property 10: Estado del botón refleja el estado de carga**
    - Generador: `fc.boolean()` como valor de `isLoading`
    - Verificar que `Search_Button.disabled === isLoading` para cualquier valor del estado
    - **Validates: Requirements 5.4, 5.5**

  - [-] 9.5 Escribir tests unitarios para `SearchBar`
    - `Search_Button` deshabilitado cuando `isLoading=true`; presionar Enter llama al mismo handler que el botón; `validationError` visible con texto correcto
    - _Requirements: 1.4, 5.4_

- [x] 10. Implementar componente `LoadingIndicator`
  - [x] 10.1 Implementar el componente `LoadingIndicator`
    - Renderizar un spinner o barra de progreso accesible (aria-live, role="status")
    - Mostrar/ocultar según la prop `visible: boolean`
    - _Requirements: 2.6, 3.5, 5.4, 5.5_

- [ ] 11. Implementar componente `ErrorMessage`
  - [x] 11.1 Implementar el componente `ErrorMessage`
    - Renderizar el mensaje de error en el área fija entre `SearchBar` y `ForecastPanel`
    - Aplicar estilos con fondo/borde visualmente distinto al `ForecastPanel` (accesible: uso de colores + icono)
    - No renderizar nada si `message` es `null`
    - _Requirements: 5.1, 5.3, 5.6, 5.7_

  - [ ] 11.2 Escribir test de propiedad P12 para `ErrorMessage`
    - **Property 12: Mensajes de error incluyen causa y acción sugerida**
    - Generador: `fc.constantFrom('EMPTY_INPUT', 'NOT_FOUND', 'GEO_NETWORK', 'WEATHER_NETWORK', 'INCOMPLETE_DATA')`
    - Verificar que el mensaje renderizado para cada tipo de error contiene tanto la descripción de la causa como la acción sugerida al usuario
    - **Validates: Requirements 5.7**

  - [~] 11.3 Escribir tests unitarios para `ErrorMessage`
    - `message=null` → componente no se renderiza; `message` con texto → área visible con contenido correcto
    - _Requirements: 5.1, 5.6_

- [ ] 12. Implementar componente `ForecastPanel`
  - [x] 12.1 Implementar el componente `ForecastPanel`
    - Mostrar nombre de ciudad, temperatura en °C, humedad relativa en % y precipitación en mm
    - No renderizar si `data` es `null`
    - Incluir unidades visibles junto a cada valor
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [~] 12.2 Escribir test de propiedad P8 para `ForecastPanel`
    - **Property 8: ForecastPanel renderiza todos los campos con unidades correctas**
    - Generador: `fc.record({ cityName: fc.string({ minLength: 1 }), temperatureCelsius: fc.float(), relativeHumidityPercent: fc.integer({ min: 0, max: 100 }), precipitationMm: fc.float({ min: 0 }) })`
    - Verificar que el DOM renderizado incluye: nombre de ciudad, valor de temperatura + "°C", valor de humedad + "%", valor de precipitación + "mm"
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4**

  - [~] 12.3 Escribir test de propiedad P9 para `ForecastPanel`
    - **Property 9: Nueva búsqueda reemplaza el pronóstico anterior**
    - Generador: `fc.tuple(forecastDataArb, forecastDataArb).filter(([a, b]) => a.cityName !== b.cityName)`
    - Renderizar con primer `ForecastData`, actualizar al segundo, verificar que el panel muestra únicamente los datos del segundo
    - **Validates: Requirements 4.5**

  - [~] 12.4 Escribir tests unitarios para `ForecastPanel`
    - `data=null` → panel no renderizado; `data` con valores → todos los campos visibles con unidades
    - _Requirements: 4.1, 4.6_

- [~] 13. Checkpoint — Verificar componentes UI
  - Asegurarse de que todos los tests de las tareas 9–12 pasan. Preguntar al usuario si tiene dudas.

- [ ] 14. Integrar y conectar todos los componentes
  - [~] 14.1 Crear el componente raíz `App` y conectar `WeatherController` con los componentes UI
    - Instanciar `InputValidator`, `GeocodingService`, `WeatherService`, `StateManager` y `WeatherController`
    - Suscribir los componentes UI al `StateManager` para que reflejen el `AppState` reactivamente
    - Pasar `onSearch`, `isLoading`, `validationError`, `serviceError` y `forecast` a los componentes correspondientes
    - _Requirements: 1.1, 1.2, 2.6, 3.5, 4.1, 4.5, 5.1, 5.2, 5.4, 5.5_

  - [~] 14.2 Aplicar los mensajes de error localizados definidos en la tabla de errores del diseño
    - Mapear cada `GeocodingErrorKind` y `WeatherErrorKind` al mensaje de usuario correspondiente (causa + acción sugerida)
    - Asegurarse de que el `validationError` usa el mensaje "El nombre de la ciudad es requerido."
    - _Requirements: 5.3, 5.6, 5.7_

  - [~] 14.3 Escribir tests de integración para el flujo completo
    - Flujo exitoso end-to-end (mock de ambas APIs): input → geocoding → forecast → ForecastPanel visible
    - Flujo con ciudad no encontrada: ErrorMessage visible, ForecastPanel no visible
    - Flujo con error de red en WeatherService: ErrorMessage visible, loading oculto
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 4.1, 5.2, 5.5_

- [~] 15. Checkpoint final — Validación completa
  - Asegurarse de que todos los tests pasan (unitarios, de propiedad e integración). Preguntar al usuario si tiene dudas.

## Notes

- Las sub-tareas marcadas con `*` son opcionales y pueden omitirse para un MVP más rápido
- Cada tarea referencia los criterios de aceptación específicos para trazabilidad completa
- Los tests de propiedad deben incluir el comentario de trazabilidad: `// Feature: weather-forecast-app, Property N: <texto>`
- Los tests de propiedad se configuran con mínimo 100 iteraciones (`fc.configureGlobal({ numRuns: 100 })`)
- El timeout de 10 s de `WeatherService` se implementa con `AbortController` + `setTimeout`
- Todas las llamadas HTTP se realizan desde el cliente (no hay servidor propio); CORS ya está habilitado en las APIs de Open-Meteo

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["2.1", "3.1", "4.1"] },
    { "id": 1, "tasks": ["2.2", "2.3", "3.2", "4.2", "4.3", "4.4", "6.1"] },
    { "id": 2, "tasks": ["6.2", "7.1"] },
    { "id": 3, "tasks": ["7.2", "7.3", "7.4", "9.1", "10.1", "11.1", "12.1"] },
    { "id": 4, "tasks": ["9.2", "9.3", "9.4", "9.5", "11.2", "11.3", "12.2", "12.3", "12.4", "14.1"] },
    { "id": 5, "tasks": ["14.2"] },
    { "id": 6, "tasks": ["14.3"] }
  ]
}
```
