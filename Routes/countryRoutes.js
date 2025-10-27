const express = require('express');
const {
    refreshCountries,
    getCountries,
    getImage,
    getStatus,
    getCountryByName,
    deleteCountryByName,
} = require('../Controllers/countryController');

const router = express.Router();

router.post('/countries/refresh', refreshCountries);

router.get('/countries', getCountries);

router.get('/countries/image', getImage);
router.get('/status', getStatus);
router.get('/countries/:name', getCountryByName);
router.delete('/countries/:name', deleteCountryByName);

module.exports = router;