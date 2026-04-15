require("dotenv").config();
const {
  OfflineAwareCache,
  buildWeatherCacheKey,
  createIsOfflineResolver,
} = require("./cache");

class AppError extends Error {
  constructor(message, code) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
  }
}

class ValidationError extends AppError {}
class CityNotFoundError extends AppError {}
class ApiError extends AppError {}
class TimeoutError extends AppError {}
class DataFormatError extends AppError {}

const DEFAULT_TIMEOUT_MS = 5000;

const WEATHER_CACHE_TTL_MS = 10 * 60 * 1000;
const HOURLY_WEATHER_CACHE_TTL_MS = 60 * 60 * 1000;
const WEATHER_CACHE_STALE_TTL_MS = 2 * 60 * 60 * 1000;

const weatherCache = new OfflineAwareCache();
const isOffline = createIsOfflineResolver();

function validateCity(city) {
  if (typeof city !== "string") {
    throw new ValidationError("City name must be a string", "INVALID_CITY_TYPE");
  }

  const trimmedCity = city.trim();

  if (!trimmedCity) {
    throw new ValidationError("City name is required", "CITY_REQUIRED");
  }

  return trimmedCity;
}

function validateCoordinates(latitude, longitude) {
  if (latitude == null || longitude == null) {
    throw new ValidationError(
      "Latitude and longitude are required",
      "COORDINATES_REQUIRED"
    );
  }

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new ValidationError(
      "Latitude and longitude must be valid numbers",
      "INVALID_COORDINATES"
    );
  }
}

async function fetchJsonWithTimeout(url, options = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new ApiError(
        `Request failed with status ${response.status} ${response.statusText}`,
        "HTTP_ERROR"
      );
    }

    let data;
    try {
      data = await response.json();
    } catch {
      throw new DataFormatError("Response is not valid JSON", "INVALID_JSON");
    }

    return data;
  } catch (error) {
    if (error.name === "AbortError") {
      throw new TimeoutError(
        `Request timed out after ${timeoutMs}ms`,
        "REQUEST_TIMEOUT"
      );
    }

    if (error instanceof AppError) {
      throw error;
    }

    throw new ApiError(
      `Network or fetch error: ${error.message}`,
      "NETWORK_ERROR"
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

async function getCoordinates(city) {
  const trimmedCity = validateCity(city);

  const geoUrl = new URL("https://geocoding-api.open-meteo.com/v1/search");
  geoUrl.searchParams.set("name", trimmedCity);
  geoUrl.searchParams.set("count", "1");
  geoUrl.searchParams.set("language", "it");
  geoUrl.searchParams.set("format", "json");

  const geoData = await fetchJsonWithTimeout(geoUrl);

  if (!geoData || !Array.isArray(geoData.results) || geoData.results.length === 0) {
    throw new CityNotFoundError(`City not found: "${trimmedCity}"`, "CITY_NOT_FOUND");
  }

  const firstResult = geoData.results[0];

  if (
    typeof firstResult.name !== "string" ||
    !Number.isFinite(firstResult.latitude) ||
    !Number.isFinite(firstResult.longitude)
  ) {
    throw new DataFormatError(
      "Geocoding response is missing required fields",
      "INVALID_GEOCODING_DATA"
    );
  }

  return {
    name: firstResult.name,
    latitude: firstResult.latitude,
    longitude: firstResult.longitude,
    country: firstResult.country ?? null,
  };
}

async function getWeatherByCoordinates(latitude, longitude) {
  validateCoordinates(latitude, longitude);

  const weatherUrl = new URL("https://api.open-meteo.com/v1/forecast");
  weatherUrl.searchParams.set("latitude", String(latitude));
  weatherUrl.searchParams.set("longitude", String(longitude));
  weatherUrl.searchParams.set(
    "current",
    "temperature_2m,wind_speed_10m,relative_humidity_2m,precipitation"
  );
  weatherUrl.searchParams.set("timezone", "auto");

  const weatherData = await fetchJsonWithTimeout(weatherUrl);

  const airQualityUrl = new URL("https://air-quality-api.open-meteo.com/v1/air-quality");
  airQualityUrl.searchParams.set("latitude", String(latitude));
  airQualityUrl.searchParams.set("longitude", String(longitude));
  airQualityUrl.searchParams.set(
    "current",
    "european_aqi,pm10,pm2_5,nitrogen_dioxide,ozone"
  );
  airQualityUrl.searchParams.set("timezone", "auto");

  let airQualityData = null;

  try {
    airQualityData = await fetchJsonWithTimeout(airQualityUrl);
  } catch {
    airQualityData = null;
  }

  if (!weatherData || typeof weatherData.current !== "object" || weatherData.current === null) {
    throw new DataFormatError("Weather data is missing", "MISSING_WEATHER_DATA");
  }

  const current = weatherData.current ?? {};
  const airCurrent = airQualityData?.current ?? null;

  return {
    temperature: current.temperature_2m ?? null,
    windSpeed: current.wind_speed_10m ?? null,
    humidity: current.relative_humidity_2m ?? null,
    precipitation: current.precipitation ?? 0,
    pollution: airCurrent?.european_aqi ?? null,
    pm10: airCurrent?.pm10 ?? null,
    pm2_5: airCurrent?.pm2_5 ?? null,
    nitrogenDioxide: airCurrent?.nitrogen_dioxide ?? null,
    ozone: airCurrent?.ozone ?? null,
  };
}

async function getWeatherForCity(city) {
  const safeCity = typeof city === "string" ? city.trim() : String(city);

  try {
    const coordinates = await getCoordinates(city);
    const weather = await getWeatherByCoordinates(
      coordinates.latitude,
      coordinates.longitude
    );

    return {
      city: coordinates.name,
      country: coordinates.country,
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      temperature: weather.temperature,
      windSpeed: weather.windSpeed,
      humidity: weather.humidity,
      precipitation: weather.precipitation,
      pollution: weather.pollution,
      pm10: weather.pm10,
      pm2_5: weather.pm2_5,
      nitrogenDioxide: weather.nitrogenDioxide,
      ozone: weather.ozone,
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw new AppError(
        `Unable to get weather for "${safeCity}": ${error.message}`,
        error.code
      );
    }

    throw new AppError(
      `Unexpected error while getting weather for "${safeCity}"`,
      "UNEXPECTED_ERROR"
    );
  }
}

async function getFiveDayForecastForCity(city) {
  const safeCity = typeof city === "string" ? city.trim() : String(city);

  try {
    const location = await getCoordinates(city);

    const forecastUrl = new URL("https://api.open-meteo.com/v1/forecast");
    forecastUrl.searchParams.set("latitude", String(location.latitude));
    forecastUrl.searchParams.set("longitude", String(location.longitude));
    forecastUrl.searchParams.set(
      "daily",
      "temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max"
    );
    forecastUrl.searchParams.set("timezone", "auto");
    forecastUrl.searchParams.set("forecast_days", "5");

    const forecastData = await fetchJsonWithTimeout(forecastUrl);

    if (!forecastData || typeof forecastData.daily !== "object" || forecastData.daily === null) {
      throw new DataFormatError("Forecast data is missing", "MISSING_FORECAST_DATA");
    }

    const daily = forecastData.daily;
    const dates = Array.isArray(daily.time) ? daily.time : [];
    const maxTemps = Array.isArray(daily.temperature_2m_max) ? daily.temperature_2m_max : [];
    const minTemps = Array.isArray(daily.temperature_2m_min) ? daily.temperature_2m_min : [];
    const precipitationProbabilities = Array.isArray(daily.precipitation_probability_max)
      ? daily.precipitation_probability_max
      : [];
    const maxWindSpeeds = Array.isArray(daily.wind_speed_10m_max)
      ? daily.wind_speed_10m_max
      : [];

    if (dates.length === 0) {
      throw new DataFormatError("Forecast days are missing", "MISSING_FORECAST_DAYS");
    }

    const days = dates.map((date, index) => ({
      date,
      temperatureMax: maxTemps[index] ?? null,
      temperatureMin: minTemps[index] ?? null,
      precipitationProbability: precipitationProbabilities[index] ?? null,
      windSpeedMax: maxWindSpeeds[index] ?? null,
    }));

    return {
      city: location.name,
      country: location.country,
      latitude: location.latitude,
      longitude: location.longitude,
      days,
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw new AppError(
        `Unable to get 5-day forecast for "${safeCity}": ${error.message}`,
        error.code
      );
    }

    throw new AppError(
      `Unexpected error while getting 5-day forecast for "${safeCity}"`,
      "UNEXPECTED_ERROR"
    );
  }
}

async function getWeatherForCityCached(city, options = {}) {
  const trimmedCity = validateCity(city);
  const cacheKey = buildWeatherCacheKey(trimmedCity);

  return weatherCache.getOrFetch(
    cacheKey,
    () => getWeatherForCity(trimmedCity),
    {
      ttlMs: options.ttlMs ?? WEATHER_CACHE_TTL_MS,
      staleTtlMs: options.staleTtlMs ?? WEATHER_CACHE_STALE_TTL_MS,
      isOffline: options.isOffline ?? isOffline,
      allowStaleOnError: options.allowStaleOnError ?? true,
      allowStaleWhenOffline: options.allowStaleWhenOffline ?? true,
    }
  );
}

async function getWeatherForCityHourlyCached(city, options = {}) {
  const trimmedCity = validateCity(city);
  const cacheKey = `${buildWeatherCacheKey(trimmedCity)}:hourly`;

  return weatherCache.getOrFetch(
    cacheKey,
    () => getWeatherForCity(trimmedCity),
    {
      ttlMs: options.ttlMs ?? HOURLY_WEATHER_CACHE_TTL_MS,
      staleTtlMs: options.staleTtlMs ?? HOURLY_WEATHER_CACHE_TTL_MS,
      isOffline: options.isOffline ?? isOffline,
      allowStaleOnError: options.allowStaleOnError ?? true,
      allowStaleWhenOffline: options.allowStaleWhenOffline ?? true,
    }
  );
}

async function getFiveDayForecastForCityHourlyCached(city, options = {}) {
  const trimmedCity = validateCity(city);
  const cacheKey = `${buildWeatherCacheKey(trimmedCity)}:forecast:5d`;

  return weatherCache.getOrFetch(
    cacheKey,
    () => getFiveDayForecastForCity(trimmedCity),
    {
      ttlMs: options.ttlMs ?? HOURLY_WEATHER_CACHE_TTL_MS,
      staleTtlMs: options.staleTtlMs ?? HOURLY_WEATHER_CACHE_TTL_MS,
      isOffline: options.isOffline ?? isOffline,
      allowStaleOnError: options.allowStaleOnError ?? true,
      allowStaleWhenOffline: options.allowStaleWhenOffline ?? true,
    }
  );
}

module.exports = {
  AppError,
  ValidationError,
  CityNotFoundError,
  ApiError,
  TimeoutError,
  DataFormatError,
  validateCity,
  validateCoordinates,
  fetchJsonWithTimeout,
  getCoordinates,
  getWeatherByCoordinates,
  getWeatherForCity,
  WEATHER_CACHE_TTL_MS,
  HOURLY_WEATHER_CACHE_TTL_MS,
  WEATHER_CACHE_STALE_TTL_MS,
  weatherCache,
  getWeatherForCityCached,
  getWeatherForCityHourlyCached,
  getFiveDayForecastForCity,
  getFiveDayForecastForCityHourlyCached,
};