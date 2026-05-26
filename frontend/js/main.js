function formatPrice(num) {
  if (!num && num !== 0) return 'Liên hệ';
  return num.toLocaleString('vi-VN') + ' đ';
}

async function loadSettings() {
  try {
    const res = await fetch('/api/settings');
    if (!res.ok) return;
    const data = await res.json();

    const site = data.site || {};
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

async function loadBanners() {
  try {
    const res = await fetch('/api/banners');
    if (!res.ok) return;
    const banners = await res.json();
    if (!banners || banners.length === 0) return;

    const slidesContainer = document.getElementById('banner-slides');
    const dotsContainer = document.getElementById('banner-dots');
    if (!slidesContainer) return;

    slidesContainer.innerHTML = '';
    if (dotsContainer) dotsContainer.innerHTML = '';

    banners.forEach((banner, index) => {
      const slide = document.createElement('div');
      slide.className = 'banner-slide';

      const img = document.createElement('img');
      img.className = 'banner-slide-img';
      img.src = banner.image || '';
      img.alt = banner.title || '';

      slide.appendChild(img);
      slidesContainer.appendChild(slide);

      if (dotsContainer) {
        const dot = document.createElement('span');
        dot.className = 'banner-dot' + (index === 0 ? ' active' : '');
        dot.addEventListener('click', () => showSlide(index));
        dotsContainer.appendChild(dot);
      }
    });

    let currentSlide = 0;
    const totalSlides = banners.length;

    function showSlide(n) {
      currentSlide = (n + totalSlides) % totalSlides;
      slidesContainer.style.transform = 'translateX(-' + (currentSlide * 100) + '%)';

      if (dotsContainer) {
        const dots = dotsContainer.querySelectorAll('.banner-dot');
        dots.forEach((dot, i) => {
          dot.classList.toggle('active', i === currentSlide);
        });
      }
    }

    const prevBtn = document.getElementById('banner-prev');
    const nextBtn = document.getElementById('banner-next');

    if (prevBtn) prevBtn.addEventListener('click', () => showSlide(currentSlide - 1));
    if (nextBtn) nextBtn.addEventListener('click', () => showSlide(currentSlide + 1));

    let autoPlay = setInterval(() => showSlide(currentSlide + 1), 4000);

    // Pause on hover, resume on leave
    const bannerContainer = document.getElementById('banner-container');
    if (bannerContainer) {
      bannerContainer.addEventListener('mouseenter', () => clearInterval(autoPlay));
      bannerContainer.addEventListener('mouseleave', () => {
        autoPlay = setInterval(() => showSlide(currentSlide + 1), 4000);
      });
    }

    showSlide(0);
  } catch (e) {
    // silently fail
  }
}

async function loadFeaturedCars() {
  try {
    const res = await fetch('/api/cars?featured=true');
    if (!res.ok) return;
    const cars = await res.json();
    if (!cars || cars.length === 0) return;

    const container = document.getElementById('featured-cars');
    if (!container) return;

    container.innerHTML = '';

    const typeLabels = { mini: 'Mini', suv: 'SUV', 'suv-7cho': 'SUV 7 Chỗ' };
    const badgeMod   = { mini: 'type-badge--mini', suv: 'type-badge--suv', 'suv-7cho': 'type-badge--suv-7cho' };

    cars.forEach(car => {
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
      badge.className = 'type-badge ' + (badgeMod[car.type] || 'type-badge--default');
      badge.textContent = typeLabels[car.type] || car.type || '';

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
      container.appendChild(card);
    });
  } catch (e) {
    // silently fail
  }
}

document.addEventListener('DOMContentLoaded', function () {
  loadSettings();
  loadBanners();
  loadFeaturedCars();
});
