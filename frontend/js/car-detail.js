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

function getCarIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('id');
}

function renderSpecs(specs) {
  if (!specs) return [];

  const labels = {
    engine: 'Động cơ',
    power: 'Công suất',
    range: 'Tầm hoạt động',
    seats: 'Số chỗ ngồi',
    charging: 'Sạc nhanh',
    dimensions: 'Kích thước',
    weight: 'Khối lượng'
  };

  const rows = [];
  Object.keys(labels).forEach(key => {
    if (specs[key] !== undefined && specs[key] !== null && specs[key] !== '') {
      const tr = document.createElement('tr');

      const th = document.createElement('th');
      th.textContent = labels[key];

      const td = document.createElement('td');
      td.textContent = specs[key];

      tr.appendChild(th);
      tr.appendChild(td);
      rows.push(tr);
    }
  });

  return rows;
}

function renderColors(colors) {
  const container = document.getElementById('car-colors');
  if (!container || !colors || colors.length === 0) return;

  container.innerHTML = '';
  colors.forEach(color => {
    const chip = document.createElement('span');
    chip.className = 'color-chip';
    chip.textContent = color;
    container.appendChild(chip);
  });
}

function setupGallery(images) {
  const mainImg = document.getElementById('car-gallery-main');
  const thumbnailsContainer = document.getElementById('car-thumbnails');
  const placeholder = document.getElementById('gallery-placeholder');

  if (!mainImg) return;

  if (!images || images.length === 0) {
    mainImg.style.display = 'none';
    return;
  }

  mainImg.src = images[0];
  mainImg.onload = function () {
    if (placeholder) placeholder.style.display = 'none';
  };

  if (!thumbnailsContainer) return;
  thumbnailsContainer.innerHTML = '';

  images.forEach((imgSrc, index) => {
    // Use thumbnail-item to match CSS
    const item = document.createElement('div');
    item.className = 'thumbnail-item' + (index === 0 ? ' active' : '');

    const thumb = document.createElement('img');
    thumb.src = imgSrc;
    thumb.alt = 'Ảnh ' + (index + 1);

    item.appendChild(thumb);
    item.addEventListener('click', function () {
      mainImg.src = imgSrc;
      if (placeholder) placeholder.style.display = 'none';
      thumbnailsContainer.querySelectorAll('.thumbnail-item').forEach(t => t.classList.remove('active'));
      item.classList.add('active');
    });

    thumbnailsContainer.appendChild(item);
  });
}

async function loadCar() {
  const carId = getCarIdFromUrl();

  if (!carId) {
    document.body.innerHTML = '<div style="padding:2rem;text-align:center;"><h2>Không tìm thấy ID xe</h2><a href="/cars.html">Quay lại danh sách xe</a></div>';
    return;
  }

  try {
    const res = await fetch('/api/cars/' + carId);

    if (res.status === 404) {
      document.body.innerHTML = '<div style="padding:2rem;text-align:center;"><h2>Xe không tồn tại</h2><a href="/cars.html">Quay lại danh sách xe</a></div>';
      return;
    }

    if (!res.ok) {
      throw new Error('Server error: ' + res.status);
    }

    const car = await res.json();

    document.title = (car.name || 'Chi tiết xe') + ' | VinFast Mạnh Hiển';

    // Update breadcrumb
    const breadcrumb = document.getElementById('breadcrumb-car-name');
    if (breadcrumb) breadcrumb.textContent = car.name || '';

    // Update type badge
    const typeBadgeEl = document.getElementById('info-type-badge');
    if (typeBadgeEl && car.type) {
      const typeLabels = { mini: 'Mini', suv: 'SUV', 'suv-7cho': 'SUV 7 Chỗ' };
      const badgeMod   = { mini: 'type-badge--mini', suv: 'type-badge--suv', 'suv-7cho': 'type-badge--suv-7cho' };
      typeBadgeEl.innerHTML = '';
      const badgeSpan = document.createElement('span');
      badgeSpan.className = 'type-badge ' + (badgeMod[car.type] || 'type-badge--default');
      badgeSpan.textContent = typeLabels[car.type] || car.type;
      typeBadgeEl.appendChild(badgeSpan);
    }

    const carNameEl = document.getElementById('car-name');
    if (carNameEl) carNameEl.textContent = car.name || '';

    const carPriceEl = document.getElementById('car-price');
    if (carPriceEl) {
      if (car.priceFrom && car.priceTo) {
        carPriceEl.textContent = formatPrice(car.priceFrom) + ' - ' + formatPrice(car.priceTo);
      } else if (car.priceFrom) {
        carPriceEl.textContent = 'Từ ' + formatPrice(car.priceFrom);
      } else {
        carPriceEl.textContent = 'Liên hệ';
      }
    }

    const carDescEl = document.getElementById('car-description');
    if (carDescEl) carDescEl.textContent = car.description || '';

    const specsBody = document.getElementById('car-specs-body');
    if (specsBody) {
      specsBody.innerHTML = '';
      const rows = renderSpecs(car.specs);
      rows.forEach(row => specsBody.appendChild(row));
    }

    renderColors(car.colors);

    const images = car.images && car.images.length > 0 ? car.images : [];
    setupGallery(images);

    const formCarId = document.getElementById('form-car-id');
    if (formCarId) formCarId.value = car.id || '';

    const formCarName = document.getElementById('form-car-name');
    if (formCarName) formCarName.value = car.name || '';
  } catch (e) {
    // silently fail on unexpected errors
  }
}

document.addEventListener('DOMContentLoaded', function () {
  loadSettings();
  loadCar();
});
