# Requirements Document

## Introduction

Aplicación web que permite a los usuarios consultar el pronóstico del clima de cualquier ciudad del mundo. El usuario ingresa el nombre de una ciudad, la aplicación convierte ese nombre a coordenadas geográficas usando la API de geocodificación de Open-Meteo, y luego consulta el pronóstico meteorológico mostrando temperatura, humedad y precipitaciones.

## Glossary

- **App**: La aplicación web de pronóstico del clima.
- **User**: La persona que interactúa con la interfaz web de la App.
- **Geocoding_API**: El servicio de geocodificación de Open-Meteo disponible en `https://geocoding-api.open-meteo.com`.
- **Weather_API**: El servicio de pronóstico meteorológico de Open-Meteo disponible en `https://api.open-meteo.com`.
- **City_Name**: El nombre de ciudad ingresado por el User como texto libre.
- **Coordinates**: Par de valores numéricos latitud/longitud que identifican una ubicación geográfica.
- **Forecast**: El conjunto de datos meteorológicos que incluye temperatura, humedad y precipitaciones para una ubicación.
- **City_Input**: El campo de entrada de texto donde el User escribe el City_Name.
- **Search_Button**: El control que el User activa para iniciar la búsqueda del Forecast.
- **Forecast_Panel**: La sección de la interfaz que muestra el Forecast al User.

---

## Requirements

### Requirement 1: Entrada de ciudad

**User Story:** Como User, quiero ingresar el nombre de una ciudad en un campo de texto, para poder consultar el pronóstico del clima de esa ciudad.

#### Acceptance Criteria

1. THE App SHALL mostrar un City_Input renderizado e interactuable en la página principal al cargar.
2. THE App SHALL mostrar un Search_Button junto al City_Input.
3. WHEN el User escribe en el City_Input, THE App SHALL aceptar texto libre de hasta 100 caracteres y no permitir ingresar caracteres adicionales una vez alcanzado el límite.
4. WHEN el User presiona la tecla Enter mientras el City_Input está enfocado, THE App SHALL iniciar la búsqueda del Forecast de la misma manera que al activar el Search_Button.
5. IF el City_Input está vacío o contiene únicamente espacios en blanco al activar el Search_Button, THEN THE App SHALL mostrar un mensaje de error indicando que el nombre de la ciudad es requerido.
6. WHEN el User modifica el contenido del City_Input mientras se muestra el mensaje de error del criterio 5, THE App SHALL ocultar dicho mensaje de error.

---

### Requirement 2: Geocodificación de la ciudad

**User Story:** Como User, quiero que la aplicación convierta automáticamente el nombre de la ciudad a coordenadas geográficas, para no tener que conocer la latitud y longitud de cada ciudad.

#### Acceptance Criteria

1. WHEN el User activa el Search_Button con un City_Name que contiene al menos un carácter no espaciado en el City_Input, THE App SHALL enviar una solicitud a la Geocoding_API con el City_Name como parámetro de búsqueda.
2. WHEN la Geocoding_API devuelve al menos un resultado, THE App SHALL extraer las Coordinates (latitud y longitud) del primer resultado.
3. WHEN la Geocoding_API devuelve al menos un resultado, THE App SHALL utilizar las Coordinates extraídas para consultar la Weather_API.
4. IF la Geocoding_API no devuelve resultados para el City_Name, THEN THE App SHALL mostrar un mensaje de error indicando que la ciudad no fue encontrada.
5. IF la Geocoding_API devuelve un error de red o respuesta no exitosa, THEN THE App SHALL mostrar un mensaje de error indicando que el servicio de geocodificación no está disponible.
6. WHEN una solicitud a la Geocoding_API está en curso, THE App SHALL mostrar un indicador visual de carga al User y ocultarlo cuando la solicitud finalice independientemente del resultado.

---

### Requirement 3: Consulta del pronóstico meteorológico

**User Story:** Como User, quiero que la aplicación consulte el pronóstico del clima usando las coordenadas geográficas de la ciudad, para obtener datos meteorológicos precisos de esa ubicación.

#### Acceptance Criteria

1. WHEN las Coordinates de una ciudad han sido obtenidas de la Geocoding_API, THE App SHALL enviar una solicitud a la Weather_API incluyendo la latitud, longitud, y solicitando las variables de temperatura, humedad y precipitaciones.
2. WHEN la Weather_API devuelve una respuesta que contiene los tres campos de temperatura (°C), humedad relativa (%) y precipitaciones (mm) presentes y con valores numéricos, THE App SHALL extraer y almacenar esos valores para su presentación al User.
3. IF la respuesta de la Weather_API contiene uno o más campos de temperatura, humedad relativa o precipitaciones ausentes o no numéricos, THEN THE App SHALL mostrar un mensaje de error indicando que los datos meteorológicos recibidos son incompletos.
4. IF la solicitud a la Weather_API no recibe respuesta en un plazo de 10 segundos o devuelve un error de red o código de respuesta no exitoso, THEN THE App SHALL mostrar un mensaje de error indicando que el servicio meteorológico no está disponible.
5. WHILE una solicitud a la Weather_API está en curso, THE App SHALL mostrar un indicador visual de carga al User.

---

### Requirement 4: Visualización del pronóstico

**User Story:** Como User, quiero ver el pronóstico del clima de la ciudad buscada en un formato claro y legible, para entender las condiciones meteorológicas de un vistazo.

#### Acceptance Criteria

1. WHEN la Weather_API retorna una respuesta que contiene el nombre de la ciudad, la temperatura, la humedad relativa y la precipitación, THE App SHALL mostrar el Forecast_Panel con dichos datos.
2. WHEN el Forecast_Panel es mostrado, THE App SHALL presentar la temperatura actual expresada en grados Celsius (°C).
3. WHEN el Forecast_Panel es mostrado, THE App SHALL presentar la humedad relativa actual expresada como un valor entre 0% y 100%.
4. WHEN el Forecast_Panel es mostrado, THE App SHALL presentar la precipitación actual expresada en milímetros (mm) con un valor mínimo de 0.0 mm.
5. WHEN el User somete una nueva búsqueda, THE App SHALL ocultar el Forecast_Panel actual y mostrar el Forecast_Panel con los datos de la nueva ciudad una vez recibida la respuesta de la Weather_API.
6. IF la respuesta de la Weather_API no contiene uno o más de los campos requeridos (nombre de ciudad, temperatura, humedad relativa, precipitación), THEN THE App SHALL no mostrar el Forecast_Panel y SHALL mostrar un mensaje de error indicando que los datos del pronóstico están incompletos.

---

### Requirement 5: Manejo de errores y retroalimentación al usuario

**User Story:** Como User, quiero recibir mensajes claros cuando algo falla, para saber qué ocurrió y qué acción puedo tomar.

#### Acceptance Criteria

1. WHEN la App muestra un mensaje de error, THE App SHALL presentarlo en un área de mensajes fija ubicada entre el Search_Bar y el Forecast_Panel, con un fondo o borde visualmente distinto al del Forecast_Panel.
2. WHEN el User activa el Search_Button después de que se mostró un error previo, THE App SHALL limpiar el mensaje de error anterior antes de iniciar la nueva búsqueda.
3. THE App SHALL mostrar mensajes de error en el idioma configurado por defecto de la interfaz.
4. WHEN la App muestra un indicador de carga, THE App SHALL deshabilitar el Search_Button para evitar solicitudes duplicadas.
5. WHEN la solicitud de búsqueda finaliza (exitosa o con error), THE App SHALL ocultar el indicador de carga y habilitar el Search_Button.
6. IF la solicitud de búsqueda falla por error de red o el nombre de ciudad ingresado no corresponde a ninguna ciudad reconocida, THEN THE App SHALL mostrar un mensaje de error en el área de mensajes indicando la causa del fallo.
7. WHEN la App muestra un mensaje de error, THE App SHALL incluir en el mensaje la causa del fallo y una indicación de la acción que el User puede tomar para resolverlo.
