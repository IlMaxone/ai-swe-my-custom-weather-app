const readline = require("node:readline");
const {
  getWeatherForCityHourlyCached,
  getFiveDayForecastForCityHourlyCached,
  AppError,
} = require("./weather");

function createCli() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

function askQuestion(rl, question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

function formatTimestamp(timestamp) {
  if (!timestamp || !Number.isFinite(timestamp)) {
    return "N/A";
  }

  return new Date(timestamp).toLocaleString("it-IT");
}

function formatValue(value, unit = "") {
  if (value == null) {
    return "N/A";
  }

  return unit ? `${value} ${unit}` : String(value);
}

function parseCitiesInput(input) {
  return input
    .split(",")
    .map((city) => city.trim())
    .filter(Boolean);
}

function truncateText(value, maxLength) {
  const stringValue = String(value ?? "N/A");

  if (stringValue.length <= maxLength) {
    return stringValue;
  }

  return `${stringValue.slice(0, Math.max(0, maxLength - 3))}...`;
}

function padCell(value, width) {
  return truncateText(value, width).padEnd(width, " ");
}

function printSideBySideWeatherResponses(responses) {
  const rows = [
    {
      label: "Città",
      values: responses.map((response) => response.data.city),
    },
    {
      label: "Paese",
      values: responses.map((response) => response.data.country ?? "N/A"),
    },
    {
      label: "Temperatura",
      values: responses.map((response) => formatValue(response.data.temperature, "°C")),
    },
    {
      label: "Vento",
      values: responses.map((response) => formatValue(response.data.windSpeed, "km/h")),
    },
    {
      label: "Umidità",
      values: responses.map((response) => formatValue(response.data.humidity, "%")),
    },
    {
      label: "Precipitazioni",
      values: responses.map((response) => formatValue(response.data.precipitation, "mm")),
    },
    {
      label: "Inquinamento",
      values: responses.map((response) => formatValue(response.data.pollution)),
    },
    {
      label: "Sorgente",
      values: responses.map((response) => response.source),
    },
    {
      label: "Cache aggiornata",
      values: responses.map((response) => formatTimestamp(response.cachedAt)),
    },
  ];

  const labelWidth = 18;
  const cityColumnWidths = responses.map((response) => {
    const valuesToMeasure = [
      response.data.city,
      response.data.country ?? "N/A",
      formatValue(response.data.temperature, "°C"),
      formatValue(response.data.windSpeed, "km/h"),
      formatValue(response.data.humidity, "%"),
      formatValue(response.data.precipitation, "mm"),
      formatValue(response.data.pollution),
      response.source,
      formatTimestamp(response.cachedAt),
    ];

    const measuredWidth = Math.max(...valuesToMeasure.map((value) => String(value).length));
    return Math.min(Math.max(measuredWidth, 16), 24);
  });

  console.log("\n===== METEO ATTUALE MULTI-CITTÀ =====");

  const header =
    padCell("Campo", labelWidth) +
    responses
      .map((response, index) => padCell(response.data.city, cityColumnWidths[index]))
      .join(" | ");

  console.log(header);
  console.log(
    `${"-".repeat(labelWidth)}${responses
      .map((_, index) => `-+-${"-".repeat(cityColumnWidths[index])}`)
      .join("")}`
  );

  for (const row of rows) {
    const line =
      padCell(row.label, labelWidth) +
      row.values
        .map((value, index) => padCell(value, cityColumnWidths[index]))
        .join(" | ");

    console.log(line);
  }

  console.log("=====================================\n");
}

function printWeatherResponse(response) {
  const data = response.data;

  console.log("\n===== DATI METEO =====");
  console.log(`Sorgente dati: ${response.source}`);
  console.log(`Ultimo aggiornamento cache: ${formatTimestamp(response.cachedAt)}`);
  console.log(`Città: ${data.city}`);
  console.log(`Paese: ${data.country ?? "N/A"}`);
  console.log(`Latitudine: ${formatValue(data.latitude)}`);
  console.log(`Longitudine: ${formatValue(data.longitude)}`);
  console.log(`Temperatura: ${formatValue(data.temperature, "°C")}`);
  console.log(`Velocità vento: ${formatValue(data.windSpeed, "km/h")}`);
  console.log(`Umidità: ${formatValue(data.humidity, "%")}`);
  console.log(`Precipitazioni: ${formatValue(data.precipitation, "mm")}`);
  console.log(`Inquinamento: ${formatValue(data.pollution)}`);
  console.log("======================\n");
}

function printFiveDayForecastResponse(response) {
  const data = response.data;

  console.log("\n===== PREVISIONE METEO 5 GIORNI =====");
  console.log(`Sorgente dati: ${response.source}`);
  console.log(`Ultimo aggiornamento cache: ${formatTimestamp(response.cachedAt)}`);
  console.log(`Città: ${data.city}`);
  console.log(`Paese: ${data.country ?? "N/A"}`);
  console.log(`Latitudine: ${formatValue(data.latitude)}`);
  console.log(`Longitudine: ${formatValue(data.longitude)}`);
  console.log("");

  for (const day of data.days) {
    console.log(`Data: ${day.date}`);
    console.log(`  Temp. max: ${formatValue(day.temperatureMax, "°C")}`);
    console.log(`  Temp. min: ${formatValue(day.temperatureMin, "°C")}`);
    console.log(`  Prob. pioggia: ${formatValue(day.precipitationProbability, "%")}`);
    console.log(`  Vento max: ${formatValue(day.windSpeedMax, "km/h")}`);
    console.log("");
  }

  console.log("=====================================\n");
}

function printError(error) {
  console.error("\n===== ERRORE =====");

  if (error instanceof AppError) {
    console.error(`Messaggio: ${error.message}`);
    console.error(`Codice: ${error.code ?? "N/A"}`);
  } else if (error instanceof Error) {
    console.error(`Messaggio: ${error.message}`);
  } else {
    console.error(String(error));
  }

  console.error("==================\n");
}

function printWelcome() {
  console.log("App Meteo");
  console.log("Scrivi il nome di una città per vedere i dati meteo.");
  console.log("Puoi anche inserire più città separate da virgola per confrontare il meteo attuale affiancato.");
  console.log("Dopo la città puoi scegliere tra meteo attuale e previsione a 5 giorni.");
  console.log("La cache viene usata automaticamente se i dati hanno meno di un'ora.");
  console.log("Scrivi 'esci' per chiudere l'app.\n");
}

function printMultiCityHint() {
  console.log("Suggerimento: puoi inserire più città separate da virgola, ad esempio: Milano, Roma, Torino\n");
}

async function askWeatherMode(rl) {
  while (true) {
    console.log("\nScegli cosa vuoi visualizzare:");
    console.log("1. Meteo attuale");
    console.log("2. Previsione a 5 giorni");

    const choice = (await askQuestion(rl, "Scelta (1 o 2): ")).trim();

    if (choice === "1" || choice === "2") {
      return choice;
    }

    console.log("\nScelta non valida. Inserisci 1 oppure 2.\n");
  }
}

async function main() {
  const rl = createCli();

  try {
    printWelcome();
    printMultiCityHint();

    while (true) {
      const input = await askQuestion(rl, "Città o 'esci': ");
      const city = input.trim();
      const cities = parseCitiesInput(input);

      if (!city) {
        console.log("\nInserisci un nome città valido.\n");
        continue;
      }

      if (city.toLowerCase() === "esci") {
        console.log("\nChiusura applicazione.\n");
        break;
      }

      if (cities.length > 1) {
        try {
          const responses = await Promise.all(
            cities.map((cityName) => getWeatherForCityHourlyCached(cityName))
          );

          printSideBySideWeatherResponses(responses);
        } catch (error) {
          printError(error);
        }

        continue;
      }

      try {
        const mode = await askWeatherMode(rl);

        if (mode === "1") {
          const response = await getWeatherForCityHourlyCached(city);
          printWeatherResponse(response);
        } else {
          const response = await getFiveDayForecastForCityHourlyCached(city);
          printFiveDayForecastResponse(response);
        }
      } catch (error) {
        printError(error);
      }
    }
  } finally {
    rl.close();
  }
}

main().catch((error) => {
  printError(error);
  process.exit(1);
});