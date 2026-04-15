const express = require("express");
const path = require("path");
const {
  getWeatherForCityHourlyCached,
  getFiveDayForecastForCityHourlyCached,
  AppError,
} = require("./weather");

const app = express();
const PORT = 3000;

app.use(express.json());

// Serve i file statici della UI
app.use(express.static(path.join(__dirname, "UI")));

app.get("/api/weather/current", async (req, res) => {
  try {
    const city = req.query.city;

    if (!city || !String(city).trim()) {
      return res.status(400).json({
        error: "City query parameter is required",
      });
    }

    const result = await getWeatherForCityHourlyCached(String(city));
    res.json(result);
  } catch (error) {
    const message =
      error instanceof AppError || error instanceof Error
        ? error.message
        : "Unexpected error";

    res.status(500).json({ error: message });
  }
});

app.get("/api/weather/forecast", async (req, res) => {
  try {
    const city = req.query.city;

    if (!city || !String(city).trim()) {
      return res.status(400).json({
        error: "City query parameter is required",
      });
    }

    const result = await getFiveDayForecastForCityHourlyCached(String(city));
    res.json(result);
  } catch (error) {
    const message =
      error instanceof AppError || error instanceof Error
        ? error.message
        : "Unexpected error";

    res.status(500).json({ error: message });
  }
});

app.listen(PORT, () => {
  console.log(`Server avviato su http://localhost:${PORT}`);
  console.log(`UI disponibile su http://localhost:${PORT}/weather-ui.html`);
});