const test = require("node:test");
const assert = require("node:assert/strict");

const {
  getCoordinates,
  getWeatherByCoordinates,
  getWeatherForCity,
} = require("./weather");

test("should return coordinates for a valid city", async () => {
  global.fetch = async (url) => {
    return {
      ok: true,
      async json() {
        return {
          results: [
            {
              name: "Milano",
              latitude: 45.4642,
              longitude: 9.19,
              country: "Italy",
            },
          ],
        };
      },
    };
  };

  const result = await getCoordinates("Milano");

  assert.deepEqual(result, {
    name: "Milano",
    latitude: 45.4642,
    longitude: 9.19,
    country: "Italy",
  });
});

test("should trim city name", async () => {
  let calledUrl = "";

  global.fetch = async (url) => {
    calledUrl = url;
    return {
      ok: true,
      async json() {
        return {
          results: [
            {
              name: "Roma",
              latitude: 41.9028,
              longitude: 12.4964,
              country: "Italy",
            },
          ],
        };
      },
    };
  };

  await getCoordinates("   Roma   ");

  assert.match(calledUrl, /name=Roma/);
});

test("should throw error for empty city name", async () => {
  await assert.rejects(
    () => getCoordinates("   "),
    /City name is required/
  );
});

test("should throw error when city is not found", async () => {
  global.fetch = async () => {
    return {
      ok: true,
      async json() {
        return { results: [] };
      },
    };
  };

  await assert.rejects(
    () => getCoordinates("CittaInventata"),
    /City not found/
  );
});

test("should throw error when geocoding API fails", async () => {
  global.fetch = async () => {
    return {
      ok: false,
      async json() {
        return {};
      },
    };
  };

  await assert.rejects(
    () => getCoordinates("Milano"),
    /Geocoding request failed/
  );
});

test("should return weather data for valid coordinates", async () => {
  global.fetch = async () => {
    return {
      ok: true,
      async json() {
        return {
          current: {
            temperature_2m: 22.4,
            wind_speed_10m: 11.2,
          },
        };
      },
    };
  };

  const result = await getWeatherByCoordinates(45.4642, 9.19);

  assert.deepEqual(result, {
    temperature: 22.4,
    windSpeed: 11.2,
  });
});

test("should throw error when weather API fails", async () => {
  global.fetch = async () => {
    return {
      ok: false,
      async json() {
        return {};
      },
    };
  };

  await assert.rejects(
    () => getWeatherByCoordinates(45.4642, 9.19),
    /Weather request failed/
  );
});

test("should throw error when weather data is missing", async () => {
  global.fetch = async () => {
    return {
      ok: true,
      async json() {
        return {};
      },
    };
  };

  await assert.rejects(
    () => getWeatherByCoordinates(45.4642, 9.19),
    /Weather data is missing/
  );
});

test("should return full weather info for a city", async () => {
  let callCount = 0;

  global.fetch = async () => {
    callCount++;

    if (callCount === 1) {
      return {
        ok: true,
        async json() {
          return {
            results: [
              {
                name: "Torino",
                latitude: 45.0703,
                longitude: 7.6869,
                country: "Italy",
              },
            ],
          };
        },
      };
    }

    return {
      ok: true,
      async json() {
        return {
          current: {
            temperature_2m: 18.7,
            wind_speed_10m: 6.3,
          },
        };
      },
    };
  };

  const result = await getWeatherForCity("Torino");

  assert.deepEqual(result, {
    city: "Torino",
    country: "Italy",
    latitude: 45.0703,
    longitude: 7.6869,
    temperature: 18.7,
    windSpeed: 6.3,
  });
});

test("should fail if geocoding succeeds but weather fails", async () => {
  let callCount = 0;

  global.fetch = async () => {
    callCount++;

    if (callCount === 1) {
      return {
        ok: true,
        async json() {
          return {
            results: [
              {
                name: "Bologna",
                latitude: 44.4949,
                longitude: 11.3426,
                country: "Italy",
              },
            ],
          };
        },
      };
    }

    return {
      ok: false,
      async json() {
        return {};
      },
    };
  };

  await assert.rejects(
    () => getWeatherForCity("Bologna"),
    /Weather request failed/
  );
});