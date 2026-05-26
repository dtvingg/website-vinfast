function formatPrice(num) {
  if (!num && num !== 0) return 'Liên hệ';
  return num.toLocaleString('vi-VN') + ' đ';
}

async function loadSettings() {
  try {
    const res = await fetch('/api/settings');
    if (!res.ok) return;
    const data = await res.json();

    const consultant = data.consultant || {};

    const setText = (id, val) => {
      const el = document.getElementById(id);
      if (el && val) el.textContent = val;
    };
    const setHref = (id, href) => {
      const el = document.getElementById(id);
      if (el && href) el.href = href;
    };

    setText('footer-name', consultant.name);
    const phoneEl = document.getElementById('footer-phone');
    if (phoneEl && consultant.phone) {
      phoneEl.textContent = consultant.phone;
      phoneEl.href = 'tel:' + consultant.phone.replace(/\s+/g, '');
    }
    setHref('footer-facebook', consultant.facebook);
    setHref('footer-tiktok', consultant.tiktok);
    const zaloEl = document.getElementById('footer-zalo');
    if (zaloEl && consultant.zalo) {
      zaloEl.href = 'https://zalo.me/' + consultant.zalo;
    }
    setText('footer-address', consultant.address);
  } catch (e) {
    // silently fail
  }
}

const TYPE_LABELS = { mini: 'Mini', suv: 'SUV', 'suv-7cho': 'SUV 7 Chỗ' };
const BADGE_MOD   = { mini: 'type-badge--mini', suv: 'type-badge--suv', 'suv-7cho': 'type-badge--suv-7cho' };

function buildCarCard(car) {
  const card = document.createElement('a');
  card.className = 'car-card';
  card.href = '/car-detail.html?id=' + car.id;

  // Thumbnail
  const thumb = document.createElement('div');
  thumb.className = 'car-card-thumb';
  const img = document.createElement('img');
  img.src = car.thumbnail || '';
  img.alt = car.name || '';
  img.loading = 'lazy';
  img.onerror = function () {
    this.style.display = 'none';
    const ph = document.createElement('div');
    ph.className = 'car-thumb-placeholder';
    ph.textContent = 'VF';
    const span = document.createElement('span');
    span.textContent = car.name || '';
    ph.appendChild(span);
    thumb.appendChild(ph);
  };
  thumb.appendChild(img);

  // Body
  const body = document.createElement('div');
  body.className = 'car-card-body';

  const top = document.createElement('div');
  top.className = 'car-card-top';

  const nameEl = document.createElement('h3');
  nameEl.className = 'car-card-name';
  nameEl.textContent = car.name || '';

  const badge = document.createElement('span');
  badge.className = 'type-badge ' + (BADGE_MOD[car.type] || 'type-badge--default');
  badge.textContent = TYPE_LABELS[car.type] || car.type || '';

  top.appendChild(nameEl);
  top.appendChild(badge);

  const priceEl = document.createElement('p');
  priceEl.className = 'car-card-price';
  priceEl.innerHTML = '<span class="car-card-price-label">Từ </span>' + formatPrice(car.priceFrom);

  const footer = document.createElement('div');
  footer.className = 'car-card-footer';

  const btn = document.createElement('span');
  btn.className = 'btn-primary car-card-btn';
  btn.textContent = 'Xem Chi Tiết';

  footer.appendChild(btn);
  body.appendChild(top);
  body.appendChild(priceEl);
  body.appendChild(footer);
  card.appendChild(thumb);
  card.appendChild(body);

  return card;
}

async function loadCars(params) {
  params = params || {};
  try {
    const query = new URLSearchParams();
    if (params.search) query.set('search', params.search);
    if (params.type) query.set('type', params.type);
    if (params.minPrice) query.set('minPrice', params.minPrice);
    if (params.maxPrice) query.set('maxPrice', params.maxPrice);

    const url = '/api/cars' + (query.toString() ? '?' + query.toString() : '');
    const res = await fetch(url);
    if (!res.ok) return;
    const cars = await res.json();

    const grid = document.getElementById('cars-grid');
    if (!grid) return;

    grid.innerHTML = '';

    const countEl = document.getElementById('cars-result-count');

    if (!cars || cars.length === 0) {
      if (countEl) countEl.textContent = 'Không tìm thấy xe phù hợp';
      const noResult = document.createElement('div');
      noResult.className = 'no-results';
      noResult.textContent = 'Không tìm thấy xe phù hợp';
      grid.appendChild(noResult);
      return;
    }

    if (countEl) countEl.textContent = 'Tìm thấy ' + cars.length + ' dòng xe';

    cars.forEach(car => {
      grid.appendChild(buildCarCard(car));
    });
  } catch (e) {
    // silently fail
  }
}

function setupFilters() {
  const filterBtn = document.getElementById('btn-filter');
  const searchInput = document.getElementById('search-input');

  function applyFilter() {
    const search = (searchInput && searchInput.value.trim()) || '';
    const typeEl = document.getElementById('type-filter');
    const minPriceEl = document.getElementById('min-price');
    const maxPriceEl = document.getElementById('max-price');

    const type = (typeEl && typeEl.value.trim()) || '';
    const minPrice = (minPriceEl && minPriceEl.value.trim()) || '';
    const maxPrice = (maxPriceEl && maxPriceEl.value.trim()) || '';

    const params = {};
    if (search) params.search = search;
    if (type) params.type = type;
    if (minPrice) params.minPrice = minPrice;
    if (maxPrice) params.maxPrice = maxPrice;

    loadCars(params);
  }

  if (filterBtn) {
    filterBtn.addEventListener('click', applyFilter);
  }

  if (searchInput) {
    searchInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') applyFilter();
    });
  }
}

async function loadTypeFilter() {
  try {
    const res = await fetch('/api/cars');
    if (!res.ok) return;
    const cars = await res.json();
    if (!cars || cars.length === 0) return;

    const select = document.getElementById('type-filter');
    if (!select) return;

    const seen = new Set();
    cars.forEach(car => {
      if (car.type && !seen.has(car.type)) {
        seen.add(car.type);
        const opt = document.createElement('option');
        opt.value = car.type;
        opt.textContent = TYPE_LABELS[car.type] || car.type;
        select.appendChild(opt);
      }
    });
  } catch (e) {
    // silently fail
  }
}

document.addEventListener('DOMContentLoaded', function () {
  loadSettings();
  loadTypeFilter();
  loadCars();
  setupFilters();
});
