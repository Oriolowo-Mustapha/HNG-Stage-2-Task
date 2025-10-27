const dotenv = require('dotenv');
dotenv.config(); 

const express = require('express');
const app = express();
const port = process.env.PORT || 3000;
const connectDB = require('./db');
const morgan = require('morgan');
const cors = require('cors');
const countryRoutes = require('./Routes/countryRoutes');

connectDB();

app.use(express.json());
app.use(cors());
app.use(morgan('dev'));

app.get('/', (req, res) => {
  res.send('Country Currency & Exchange API is Working!');
});

app.use('/api', countryRoutes);

app.use((req, res, next) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.use((err, req, res, next) => {
  console.error(err.stack); 

  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: 'Validation failed', details: err.errors });
  }

  res.status(500).json({ error: 'Internal server error', message: err.message });
});

app.listen(port, () => {
  console.log(`Country Currency & Exchange API is running on port ${port}`);
});

module.exports = app;