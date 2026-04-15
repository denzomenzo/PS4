// public/demly-widget.js
// Embeddable cart widget for customer websites
// Usage: <script src="https://yourdomain.com/demly-widget.js" data-api-key="dmly_..." data-theme="light" data-position="bottom-right"></script>

(function () {
  'use strict';

  const script = document.currentScript || document.querySelector('script[data-api-key]');
  if (!script) return;

  const API_KEY = script.getAttribute('data-api-key');
  const THEME = script.getAttribute('data-theme') || 'light';
  const POSITION = script.getAttribute('data-position') || 'bottom-right';
  const API_URL = script.src.replace('/demly-widget.js', '') + '/api/orders/website';

  if (!API_KEY) { console.error('Demly Widget: data-api-key is required'); return; }

  // Persist cart in sessionStorage
  let cart = [];
  try { cart = JSON.parse(sessionStorage.getItem('demly_cart') || '[]'); } catch {}

  const saveCart = () => { try { sessionStorage.setItem('demly_cart', JSON.stringify(cart)); } catch {} };

  const isDark = THEME === 'dark';
  const bg = isDark ? '#1e293b' : '#ffffff';
  const text = isDark ? '#f1f5f9' : '#1e293b';
  const muted = isDark ? '#94a3b8' : '#64748b';
  const border = isDark ? '#334155' : '#e2e8f0';
  const primary = '#10b981';

  const posY = POSITION.includes('bottom') ? 'bottom: 20px;' : 'top: 20px;';
  const posX = POSITION.includes('right') ? 'right: 20px;' : 'left: 20px;';

  // Inject styles
  const style = document.createElement('style');
  style.textContent = `
    #demly-widget-btn { position: fixed; ${posY} ${posX} z-index: 9999; background: ${primary}; color: white; border: none; border-radius: 50px; padding: 12px 20px; font-size: 15px; font-weight: 600; cursor: pointer; box-shadow: 0 4px 20px rgba(16,185,129,0.4); display: flex; align-items: center; gap: 8px; font-family: -apple-system, sans-serif; transition: transform 0.2s; }
    #demly-widget-btn:hover { transform: scale(1.05); }
    #demly-widget-badge { background: #ef4444; color: white; border-radius: 50%; width: 20px; height: 20px; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; }
    #demly-widget-panel { position: fixed; ${posY.replace('20px', '80px')} ${posX} z-index: 9998; width: 340px; background: ${bg}; border: 1px solid ${border}; border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.15); font-family: -apple-system, sans-serif; color: ${text}; display: none; flex-direction: column; max-height: 560px; overflow: hidden; }
    #demly-widget-panel.open { display: flex; }
    .demly-header { padding: 16px; border-bottom: 1px solid ${border}; display: flex; justify-content: space-between; align-items: center; }
    .demly-header h3 { margin: 0; font-size: 16px; font-weight: 700; }
    .demly-close { background: none; border: none; font-size: 20px; cursor: pointer; color: ${muted}; line-height: 1; }
    .demly-items { flex: 1; overflow-y: auto; padding: 12px; }
    .demly-empty { text-align: center; color: ${muted}; padding: 32px 16px; font-size: 14px; }
    .demly-item { display: flex; align-items: center; justify-content: space-between; padding: 10px; background: ${isDark ? '#0f172a' : '#f8fafc'}; border-radius: 10px; margin-bottom: 8px; }
    .demly-item-name { font-size: 13px; font-weight: 600; margin-bottom: 2px; }
    .demly-item-price { font-size: 12px; color: ${muted}; }
    .demly-qty { display: flex; align-items: center; gap: 8px; }
    .demly-qty button { background: ${border}; border: none; border-radius: 6px; width: 26px; height: 26px; cursor: pointer; font-size: 16px; font-weight: 700; color: ${text}; line-height: 1; display: flex; align-items: center; justify-content: center; }
    .demly-qty span { font-size: 13px; font-weight: 600; min-width: 16px; text-align: center; }
    .demly-total { padding: 12px 16px; border-top: 1px solid ${border}; display: flex; justify-content: space-between; font-weight: 700; font-size: 15px; }
    .demly-form { padding: 12px 16px; border-top: 1px solid ${border}; }
    .demly-form input { width: 100%; box-sizing: border-box; padding: 9px 12px; border: 1px solid ${border}; border-radius: 8px; margin-bottom: 8px; font-size: 13px; background: ${isDark ? '#0f172a' : '#fff'}; color: ${text}; }
    .demly-form input:focus { outline: 2px solid ${primary}; border-color: transparent; }
    .demly-checkout-btn { width: 100%; padding: 12px; background: ${primary}; color: white; border: none; border-radius: 10px; font-size: 14px; font-weight: 700; cursor: pointer; margin-top: 4px; }
    .demly-checkout-btn:disabled { opacity: 0.6; cursor: not-allowed; }
    .demly-success { padding: 24px 16px; text-align: center; }
    .demly-success h4 { color: ${primary}; margin: 0 0 8px; font-size: 18px; }
    .demly-success p { color: ${muted}; font-size: 13px; margin: 0; }
  `;
  document.head.appendChild(style);

  // Create button
  const btn = document.createElement('button');
  btn.id = 'demly-widget-btn';
  btn.innerHTML = `🛒 Cart <span id="demly-widget-badge" style="display:none">0</span>`;
  document.body.appendChild(btn);

  // Create panel
  const panel = document.createElement('div');
  panel.id = 'demly-widget-panel';
  panel.innerHTML = `
    <div class="demly-header">
      <h3>Your Order</h3>
      <button class="demly-close" id="demly-close">×</button>
    </div>
    <div class="demly-items" id="demly-items"></div>
    <div class="demly-total" id="demly-total" style="display:none">
      <span>Total</span><span id="demly-total-amount">£0.00</span>
    </div>
    <div class="demly-form" id="demly-form" style="display:none">
      <input type="text" id="demly-name" placeholder="Your name *" required />
      <input type="email" id="demly-email" placeholder="Email address" />
      <input type="tel" id="demly-phone" placeholder="Phone number" />
      <input type="text" id="demly-notes" placeholder="Special instructions (optional)" />
      <button class="demly-checkout-btn" id="demly-checkout-btn">Place Order</button>
    </div>
    <div class="demly-success" id="demly-success" style="display:none">
      <h4>✓ Order Placed!</h4>
      <p>Your order has been received. We'll be in touch shortly.</p>
    </div>
  `;
  document.body.appendChild(panel);

  const badge = document.getElementById('demly-widget-badge');
  const itemsContainer = document.getElementById('demly-items');
  const totalDiv = document.getElementById('demly-total');
  const totalAmount = document.getElementById('demly-total-amount');
  const formDiv = document.getElementById('demly-form');
  const successDiv = document.getElementById('demly-success');

  const render = () => {
    const count = cart.reduce((s, i) => s + i.quantity, 0);
    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none';

    if (cart.length === 0) {
      itemsContainer.innerHTML = '<p class="demly-empty">Your cart is empty.<br>Click "Add to Cart" on any product.</p>';
      totalDiv.style.display = 'none';
      formDiv.style.display = 'none';
    } else {
      itemsContainer.innerHTML = cart.map((item, i) => `
        <div class="demly-item">
          <div>
            <div class="demly-item-name">${item.name}</div>
            <div class="demly-item-price">£${(item.price * item.quantity).toFixed(2)}</div>
          </div>
          <div class="demly-qty">
            <button onclick="demlyQty(${i}, -1)">−</button>
            <span>${item.quantity}</span>
            <button onclick="demlyQty(${i}, 1)">+</button>
          </div>
        </div>
      `).join('');
      const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);
      totalAmount.textContent = `£${total.toFixed(2)}`;
      totalDiv.style.display = 'flex';
      formDiv.style.display = 'block';
      successDiv.style.display = 'none';
    }
  };

  window.demlyQty = (index, delta) => {
    cart[index].quantity += delta;
    if (cart[index].quantity <= 0) cart.splice(index, 1);
    saveCart();
    render();
  };

  // Handle "Add to Cart" buttons
  document.addEventListener('click', (e) => {
    const target = e.target.closest('[data-demly-product]');
    if (!target) return;
    try {
      const product = JSON.parse(target.getAttribute('data-demly-product'));
      const existing = cart.find(i => i.id === product.id);
      if (existing) { existing.quantity++; }
      else { cart.push({ ...product, quantity: 1 }); }
      saveCart();
      render();
      panel.classList.add('open');
    } catch (err) { console.error('Demly: invalid product data', err); }
  });

  btn.addEventListener('click', () => panel.classList.toggle('open'));
  document.getElementById('demly-close').addEventListener('click', () => panel.classList.remove('open'));

  document.getElementById('demly-checkout-btn').addEventListener('click', async () => {
    const name = document.getElementById('demly-name').value.trim();
    if (!name) { alert('Please enter your name'); return; }

    const checkoutBtn = document.getElementById('demly-checkout-btn');
    checkoutBtn.disabled = true;
    checkoutBtn.textContent = 'Placing order...';

    try {
      const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY },
        body: JSON.stringify({
          customer: {
            name,
            email: document.getElementById('demly-email').value.trim() || null,
            phone: document.getElementById('demly-phone').value.trim() || null,
          },
          items: cart.map(i => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity })),
          notes: document.getElementById('demly-notes').value.trim() || null,
          subtotal: total,
          total,
        }),
      });

      if (res.ok) {
        cart = [];
        saveCart();
        render();
        formDiv.style.display = 'none';
        successDiv.style.display = 'block';
        setTimeout(() => panel.classList.remove('open'), 3000);
      } else {
        const err = await res.json();
        alert('Order failed: ' + (err.error || 'Unknown error'));
        checkoutBtn.disabled = false;
        checkoutBtn.textContent = 'Place Order';
      }
    } catch (err) {
      alert('Network error. Please try again.');
      checkoutBtn.disabled = false;
      checkoutBtn.textContent = 'Place Order';
    }
  });

  render();
})();
