const axios = require('axios');
const fs = require('fs');
const Country = require('../Models/Countries');
const Status = require('../Models/Status');

const { generateSummaryImage, IMAGE_PATH } = require('../Utils/imageGenerator');
const COUNTRIES_API_URL = 'https://restcountries.com/v2/all?fields=name,capital,region,population,flag,currencies';
const EXCHANGE_RATE_API_URL = 'https://open.er-api.com/v6/latest/USD';

const asyncHandler = fn => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Helper function to escape special characters for use in a regular expression
const escapeRegex = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
};

const refreshCountries = asyncHandler(async (req, res, next) => {
  try {
    // Updated API URL to match the one defined in constants
    const response = await fetch(COUNTRIES_API_URL);
    if (!response.ok) {
      throw new Error(`API request failed with status: ${response.status}`);
    }
    const countriesData = await response.json();

    // Validate the response data
    if (!Array.isArray(countriesData)) {
      throw new Error('Invalid data format received from external API');
    }

    const exchangeRatesResponse = await axios.get(EXCHANGE_RATE_API_URL);
    if (!exchangeRatesResponse.data || !exchangeRatesResponse.data.rates) {
      throw new Error('Failed to fetch exchange rates');
    }
    
    const rates = exchangeRatesResponse.data.rates;
    const refreshTime = new Date();

    const upsertPromises = countriesData.map(async (country) => {
      // Updated to match v2 API response structure
      const currencyInfo = country.currencies ? Object.values(country.currencies)[0] : null;
      const currency_code = currencyInfo ? Object.keys(country.currencies)[0] : null;

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
        capital: country.capital ? country.capital[0] : null,
        region: country.region,
        population: country.population,
        flag_url: country.flag,
        currency_code,
        exchange_rate,
        estimated_gdp,
      };

      const escapedName = escapeRegex(country.name);
      return Country.findOneAndUpdate(
        { name: { $regex: new RegExp('^' + escapedName + '$', 'i') } },
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

  } catch (error) {
    console.error('Refresh countries error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message || 'Failed to refresh countries data'
    });
  }
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