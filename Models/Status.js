const mongoose = require('mongoose');

const statusSchema = new mongoose.Schema({
  last_refreshed_at: {
    type: Date,

  },
  total_countries:{
    type: Number,
  }
});
module.exports = mongoose.model('Status', statusSchema);