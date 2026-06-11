const express = require('express');
const router = express.Router();
const { readJson, writeJson } = require('../services/fileDb');
const { requireAdmin } = require('../middleware/auth');

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

// Thêm xe mới
router.post('/', requireAdmin, (req, res) => {
  const cars = readJson('cars.json');
  const car = req.body;

  if (!car.id || !car.name) {
    return res.status(400).json({ error: 'Thiếu id hoặc tên xe' });
  }
  if (cars.find(c => c.id === car.id)) {
    return res.status(409).json({ error: 'ID xe đã tồn tại' });
  }

  cars.push(car);
  writeJson('cars.json', cars);
  res.status(201).json(car);
});

// Cập nhật xe
router.put('/:id', requireAdmin, (req, res) => {
  const cars = readJson('cars.json');
  const idx = cars.findIndex(c => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Không tìm thấy xe' });

  cars[idx] = { ...cars[idx], ...req.body, id: req.params.id };
  writeJson('cars.json', cars);
  res.json(cars[idx]);
});

// Xóa xe
router.delete('/:id', requireAdmin, (req, res) => {
  const cars = readJson('cars.json');
  const idx = cars.findIndex(c => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Không tìm thấy xe' });

  cars.splice(idx, 1);
  writeJson('cars.json', cars);
  res.json({ success: true });
});

module.exports = router;
