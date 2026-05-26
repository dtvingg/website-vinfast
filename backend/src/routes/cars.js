const express = require('express');
const router = express.Router();
const { readJson } = require('../services/fileDb');

router.get('/', (req, res) => {
  let cars = readJson('cars.json');
  const { search, type, minPrice, maxPrice, featured } = req.query;

  if (search) {
    const q = search.toLowerCase();
    cars = cars.filter(c => c.name.toLowerCase().includes(q));
  }
  if (type) {
    cars = cars.filter(c => c.type.toLowerCase() === type.toLowerCase());
  }
  if (minPrice) {
    cars = cars.filter(c => c.priceFrom >= Number(minPrice));
  }
  if (maxPrice) {
    cars = cars.filter(c => c.priceTo <= Number(maxPrice));
  }
  if (featured === 'true') {
    cars = cars.filter(c => c.featured === true);
  }

  res.json(cars);
});

router.get('/:id', (req, res) => {
  const cars = readJson('cars.json');
  const car = cars.find(c => c.id === req.params.id);
  if (!car) return res.status(404).json({ error: 'Không tìm thấy xe' });
  res.json(car);
});

module.exports = router;
