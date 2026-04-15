const API_BASE_URL = "http://localhost:3000";

const weatherForm = document.getElementById("weather-form");
const cityInput = document.getElementById("city-input");
const modeSelect = document.getElementById("mode-select");
const clearBtn = document.getElementById("clear-btn");

const statusText = document.getElementById("status-text");
const sourceText = document.getElementById("source-text");
const errorBox = document.getElementById("error-box");

const singleCurrentSection = document.getElementById("single-current-section");
const forecastSection = document.getElementById("forecast-section");
const multiCitySection = document.getElementById("multi-city-section");

const singleUpdated = document.getElementById("single-updated");
const singleCity = document.getElementById("single-city");
const singleCountry = document.getElementById("single-country");
const singleTemperature = document.getElementById("single-temperature");
const singleWind = document.getElementById("single-wind");
const singleHumidity = document.getElementById("single-humidity");
const singlePrecipitation = document.getElementById("single-precipitation");
const singlePollution = document.getElementById("single-pollution");
const singlePm10 = document.getElementById("single-pm10");
const singlePm25 = document.getElementById("single-pm25");
const singleNo2 = document.getElementById("single-no2");
const singleO3 = document.getElementById("single-o3");

const forecastUpdated = document.getElementById("forecast-updated");
const forecastCity = document.getElementById("forecast-city");
const forecastSource = document.getElementById("forecast-source");
const forecastCards = document.getElementById("forecast-cards");
const multiCityGrid = document.getElementById("multi-city-grid");

function parseCitiesInput(value) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatValue(value, unit = "") {
  if (value == null) {
    return "N/A";
  }

  return unit ? `${value} ${unit}` : String(value);
}

function formatTimestamp(timestamp) {
  if (!timestamp) {
    return "N/A";
  }

  return new Date(timestamp).toLocaleString("it-IT");
}

function setStatus(text, source = "-") {
  statusText.textContent = text;
  sourceText.textContent = source;
}

function showError(message) {
  errorBox.textContent = message;
  errorBox.classList.remove("hidden");
}

function hideError() {
  errorBox.textContent = "";
  errorBox.classList.add("hidden");
}

function hideAllSections() {
  singleCurrentSection.classList.add("hidden");
  forecastSection.classList.add("hidden");
  multiCitySection.classList.add("hidden");
}

function renderSingleCurrent(response) {
  const data = response.data;

  hideAllSections();
  singleCurrentSection.classList.remove("hidden");

  singleUpdated.textContent = `Ultimo aggiornamento: ${formatTimestamp(response.cachedAt)}`;
  singleCity.textContent = data.city;
  singleCountry.textContent = data.country ?? "N/A";
  singleTemperature.textContent = data.temperature ?? "--";
  singleWind.textContent = formatValue(data.windSpeed, "km/h");
  singleHumidity.textContent = formatValue(data.humidity, "%");
  singlePrecipitation.textContent = formatValue(data.precipitation, "mm");
  singlePollution.textContent = formatValue(data.pollution);
  singlePm10.textContent = formatValue(data.pm10);
  singlePm25.textContent = formatValue(data.pm2_5);
  singleNo2.textContent = formatValue(data.nitrogenDioxide);
  singleO3.textContent = formatValue(data.ozone);

  setStatus("Meteo attuale caricato", response.source);
}

function renderForecast(response) {
  const data = response.data;

  hideAllSections();
  forecastSection.classList.remove("hidden");

  forecastUpdated.textContent = `Ultimo aggiornamento: ${formatTimestamp(response.cachedAt)}`;
  forecastCity.textContent = `Previsione 5 giorni • ${data.city}`;
  forecastSource.textContent = response.source;

  forecastCards.innerHTML = data.days
    .map(
      (day) => `
      <article class="forecast-card">
        <div class="forecast-date">${day.date}</div>
        <div class="forecast-list">
          <div class="forecast-item"><span>Temp. max</span><strong>${formatValue(day.temperatureMax, "°C")}</strong></div>
          <div class="forecast-item"><span>Temp. min</span><strong>${formatValue(day.temperatureMin, "°C")}</strong></div>
          <div class="forecast-item"><span>Pioggia</span><strong>${formatValue(day.precipitationProbability, "%")}</strong></div>
          <div class="forecast-item"><span>Vento max</span><strong>${formatValue(day.windSpeedMax, "km/h")}</strong></div>
        </div>
      </article>
    `
    )
    .join("");

  setStatus("Previsione caricata", response.source);
}

function renderMultiCity(responses) {
  hideAllSections();
  multiCitySection.classList.remove("hidden");

  multiCityGrid.innerHTML = responses
    .map((response) => {
      const data = response.data;

      return `
        <article class="city-card">
          <div class="city-name">${data.city}</div>
          <div class="city-details">
            <div class="city-detail"><span>Paese</span><strong>${data.country ?? "N/A"}</strong></div>
            <div class="city-detail"><span>Temperatura</span><strong>${formatValue(data.temperature, "°C")}</strong></div>
            <div class="city-detail"><span>Vento</span><strong>${formatValue(data.windSpeed, "km/h")}</strong></div>
            <div class="city-detail"><span>Umidità</span><strong>${formatValue(data.humidity, "%")}</strong></div>
            <div class="city-detail"><span>Precipitazioni</span><strong>${formatValue(data.precipitation, "mm")}</strong></div>
            <div class="city-detail"><span>AQI</span><strong>${formatValue(data.pollution)}</strong></div>
            <div class="city-detail"><span>Sorgente</span><strong>${response.source}</strong></div>
            <div class="city-detail"><span>Aggiornato</span><strong>${formatTimestamp(response.cachedAt)}</strong></div>
          </div>
        </article>
      `;
    })
    .join("");

  setStatus("Confronto multi-città caricato", "multiple");
}

async function fetchJson(url) {
  const response = await fetch(url);

  if (!response.ok) {
    let message = `Errore HTTP ${response.status}`;

    try {
      const data = await response.json();
      message = data.message || data.error || message;
    } catch {
      // ignora errore parsing json
    }

    throw new Error(message);
  }

  return response.json();
}

async function loadSingleCurrent(city) {
  const url = `${API_BASE_URL}/api/weather/current?city=${encodeURIComponent(city)}`;
  return fetchJson(url);
}

async function loadForecast(city) {
  const url = `${API_BASE_URL}/api/weather/forecast?city=${encodeURIComponent(city)}`;
  return fetchJson(url);
}

async function loadMultiCurrent(cities) {
  const requests = cities.map((city) => loadSingleCurrent(city));
  return Promise.all(requests);
}

weatherForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  hideError();

  const rawInput = cityInput.value.trim();
  const cities = parseCitiesInput(rawInput);
  const mode = modeSelect.value;

  if (!rawInput) {
    showError("Inserisci almeno una città.");
    return;
  }

  try {
    setStatus("Caricamento dati...", "-");

    if (cities.length > 1) {
      const responses = await loadMultiCurrent(cities);
      renderMultiCity(responses);
      return;
    }

    if (mode === "forecast") {
      const response = await loadForecast(cities[0]);
      renderForecast(response);
      return;
    }

    const response = await loadSingleCurrent(cities[0]);
    renderSingleCurrent(response);
  } catch (error) {
    hideAllSections();
    setStatus("Errore", "-");
    showError(error.message || "Si è verificato un errore durante il recupero dei dati.");
  }
});

clearBtn.addEventListener("click", () => {
  cityInput.value = "";
  modeSelect.value = "current";
  hideError();
  hideAllSections();
  setStatus("In attesa di una ricerca", "-");
});