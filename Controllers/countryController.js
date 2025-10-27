const axios = require('axios');
const fs = require('fs');
const Country = require('../Models/Countries');
const Status = require('../Models/Status');

const { generateSummaryImage, IMAGE_PATH } = require('../utils/imageGenerator');
const COUNTRIES_API_URL = 'https://restcountries.com/v2/all?fields=name,capital,region,population,flag,currencies';
const EXCHANGE_RATE_API_URL = 'https://open.er-api.com/v6/latest/USD';

const asyncHandler = fn => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const refreshCountries = asyncHandler(async (req, res, next) => {
  let countriesResponse, exchangeRatesResponse;

  try {
    const [countriesResponse, exchangeRatesResponse] = await Promise.all([
      axios.get(COUNTRIES_API_URL),
      axios.get(EXCHANGE_RATE_API_URL)
    ]);
  } catch (error) {
    const apiName = error.config?.url?.includes('restcountries') ? 'restcountries.com' : 'open.er-api.com';
    console.error(`Error fetching data from ${apiName}:`, error.message);
    // Send a 503 error and stop execution
    return res.status(503).json({
      error: "External data source unavailable",
      details: `Could not fetch data from ${apiName}`
    });
  }

    const countriesData = countriesResponse.data;
    const rates = exchangeRatesResponse.data.rates;
    const refreshTime = new Date();

    if (!countriesData || !rates) {
      return res.status(503).json({ error: "External data source unavailable", details: "Invalid data received from external APIs." });
    }

    const upsertPromises = countriesData.map(async (country) => {
      const currencyInfo = country.currencies && country.currencies[0];
      const currency_code = currencyInfo ? currencyInfo.code : null;

      let exchange_rate = null;
      if (currency_code && rates[currency_code]) {
        exchange_rate = rates[currency_code];
      }

      let estimated_gdp = null;
      if (!currency_code) {
        estimated_gdp = 0;
      } else if (country.population && exchange_rate) {
        const randomMultiplier = Math.random() * (2000 - 1000) + 1000;
        estimated_gdp = (country.population * randomMultiplier) / exchange_rate;
      }

      const countryPayload = {
        name: country.name,
        capital: country.capital,
        region: country.region,
        population: country.population,
        flag_url: country.flag,
        currency_code,
        exchange_rate,
        estimated_gdp,
      };

      return Country.findOneAndUpdate(
        { name: { $regex: new RegExp('^' + country.name + '$', 'i') } }, // Case-insensitive match
        countryPayload,
        { upsert: true, new: true, runValidators: true }
      );
    });

    const updatedCountries = await Promise.all(upsertPromises);

    await Status.findOneAndUpdate(
      {},
      {
        last_refreshed_at: refreshTime,
        total_countries: updatedCountries.length
      },
      { upsert: true }
    );

    await generateSummaryImage();

    return res.status(200).json({
      status: "success",
      message: "Cache refreshed successfully",
      countries_processed: updatedCountries.length
    });

});

const getCountries = asyncHandler(async (req, res, next) => {
    let query = Country.find();
    const { region, currency, sort } = req.query;
    if (region) {
      query = query.where('region').equals(region);
    }
    if (currency) {
      query = query.where('currency_code').equals(currency.toUpperCase());
    }

    if (sort) {
      const sortOptions = {};
      if (sort === 'gdp_desc') {
        sortOptions.estimated_gdp = -1;
      } else if (sort === 'gdp_asc') {
        sortOptions.estimated_gdp = 1;
      } else if (sort === 'population_desc') {
        sortOptions.population = -1;
      } else if (sort === 'population_asc') {
        sortOptions.population = 1;
      }
      query = query.sort(sortOptions);
    }

    const countries = await query;
    return res.status(200).json(countries);
});

const getCountryByName = asyncHandler(async (req, res, next) => {
    const { name } = req.params;
    const country = await Country.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });

    if (!country) {
      return res.status(404).json({ error: 'Country not found' });
    }

    return res.status(200).json(country);
});

const deleteCountryByName = asyncHandler(async (req, res, next) => {
    const { name } = req.params;
    const country = await Country.findOneAndDelete({
      name: { $regex: new RegExp(`^${name}$`, 'i') },
    });

    if (!country) {
      return res.status(404).json({ error: 'Country not found' });
    }

    return res.status(200).json({ message: 'Country deleted successfully' });
});

const getStatus = asyncHandler(async (req, res, next) => {
    const status = await Status.findOne({});
    if (!status) {
      return res.status(404).json({ error: 'Status not found. Please run refresh.' });
    }
    return res.status(200).json(status);
});

const getImage = (req, res) => {
  if (!fs.existsSync(IMAGE_PATH)) {
    return res.status(404).json({ error: "Summary image not found" });
  }

  res.sendFile(IMAGE_PATH, (err) => {
    if (err && !res.headersSent) {
      next(err);
    }
  });
};

module.exports = {
  refreshCountries,
  getCountries,
  getCountryByName,
  deleteCountryByName,
  getStatus,
  getImage,
};