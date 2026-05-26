function openModal() {
  const modal = document.getElementById('consultation-modal');
  if (modal) {
    modal.classList.add('active');
    modal.style.display = 'flex';
  }
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  const modal = document.getElementById('consultation-modal');
  if (modal) {
    modal.classList.remove('active');
    modal.style.display = 'none';
  }
  document.body.style.overflow = '';

  const msgEl = document.getElementById('form-message');
  if (msgEl) {
    msgEl.textContent = '';
    msgEl.className = '';
  }
}

function showMessage(text, isError) {
  const msgEl = document.getElementById('form-message');
  if (!msgEl) return;
  msgEl.textContent = text;
  msgEl.className = isError ? 'msg-error' : 'msg-success';
}

function validatePhone(phone) {
  const cleaned = phone.replace(/[\s\-]/g, '');
  return /^[0-9]{9,11}$/.test(cleaned);
}

async function handleSubmit(e) {
  e.preventDefault();

  const carId = (document.getElementById('form-car-id') || {}).value || '';
  const carName = (document.getElementById('form-car-name') || {}).value || '';
  const name = ((document.getElementById('form-name') || {}).value || '').trim();
  const phone = ((document.getElementById('form-phone') || {}).value || '').trim();
  const address = ((document.getElementById('form-address') || {}).value || '').trim();
  const notes = ((document.getElementById('form-notes') || {}).value || '').trim();

  if (!name) {
    showMessage('Vui lòng nhập họ và tên.', true);
    return;
  }

  if (!phone || !validatePhone(phone)) {
    showMessage('Số điện thoại không hợp lệ (9-11 chữ số).', true);
    return;
  }

  const submitBtn = document.getElementById('btn-submit-consult');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Đang gửi...';
  }

  try {
    const res = await fetch('/api/consultations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ carId, carName, name, phone, address, notes })
    });

    if (res.status === 201 || res.ok) {
      showMessage('✓ Cảm ơn! Chúng tôi sẽ liên hệ sớm.', false);

      const form = document.getElementById('consultation-form');
      if (form) {
        // Reset only user-input fields, preserve hidden car info
        const nameEl = document.getElementById('form-name');
        const phoneEl = document.getElementById('form-phone');
        const addressEl = document.getElementById('form-address');
        const notesEl = document.getElementById('form-notes');
        if (nameEl) nameEl.value = '';
        if (phoneEl) phoneEl.value = '';
        if (addressEl) addressEl.value = '';
        if (notesEl) notesEl.value = '';
      }

      setTimeout(closeModal, 2500);
    } else {
      showMessage('Có lỗi xảy ra, vui lòng thử lại.', true);
    }
  } catch (err) {
    showMessage('Có lỗi xảy ra, vui lòng thử lại.', true);
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Gửi Yêu Cầu';
    }
  }
}

document.addEventListener('DOMContentLoaded', function () {
  const consultBtn = document.getElementById('btn-consult');
  if (consultBtn) {
    consultBtn.addEventListener('click', openModal);
  }

  const closeBtn = document.getElementById('modal-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', closeModal);
  }

  const modal = document.getElementById('consultation-modal');
  if (modal) {
    modal.addEventListener('click', function (e) {
      // Only close when clicking the overlay, not the modal box itself
      if (e.target === modal) {
        closeModal();
      }
    });
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      closeModal();
    }
  });

  const form = document.getElementById('consultation-form');
  if (form) {
    form.addEventListener('submit', handleSubmit);
  }
});
