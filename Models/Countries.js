const mongoose = require('mongoose');

const countrySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      index: true, 
    },
    capital: {
      type: String,
    },
    region: {
      type: String,
    },
    population: {
      type: Number,
      required: true,
    },
    currency_code: {
      type: String,
      default: null,
    },
    exchange_rate: {
      type: Number,
      default: null,
    },
    estimated_gdp: {
      type: Number,
      default: null,
    },
    flag_url: {
      type: String,
    },
  }
);
module.exports = mongoose.model('Country', countrySchema);