// public/demly-widget.js
// Demly POS Website Orders Widget - Drop-in, zero config
// Version: 1.0.0

(function() {
  'use strict';

  // Configuration from script tag attributes
  const script = document.currentScript;
  const API_KEY = script.getAttribute('data-api-key');
  const API_URL = script.getAttribute('data-api-url') || 'https://your-domain.com/api/orders/website';
  const THEME = script.getAttribute('data-theme') || 'light';
  const POSITION = script.getAttribute('data-position') || 'bottom-right';

  if (!API_KEY) {
    console.error('Demly Widget: data-api-key is required');
    return;
  }

  // Widget state
  let isOpen = false;
  let cart = [];

  // Create widget container
  const widgetContainer = document.createElement('div');
  widgetContainer.id = 'demly-widget';
  widgetContainer.innerHTML = `
    <style>
      #demly-widget * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }

      #demly-cart-button {
        position: fixed;
        ${POSITION.includes('right') ? 'right: 20px;' : 'left: 20px;'}
        ${POSITION.includes('top') ? 'top: 20px;' : 'bottom: 20px;'}
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: #6366f1;
        color: white;
        border: none;
        box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
        cursor: pointer;
        z-index: 9998;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
        transition: all 0.3s ease;
      }

      #demly-cart-button:hover {
        transform: scale(1.1);
        box-shadow: 0 6px 16px rgba(99, 102, 241, 0.5);
      }

      #demly-cart-count {
        position: absolute;
        top: -5px;
        right: -5px;
        background: #ef4444;
        color: white;
        border-radius: 50%;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: bold;
      }

      #demly-cart-panel {
        position: fixed;
        ${POSITION.includes('right') ? 'right: 0;' : 'left: 0;'}
        top: 0;
        bottom: 0;
        width: 400px;
        max-width: 100%;
        background: ${THEME === 'dark' ? '#1f2937' : 'white'};
        color: ${THEME === 'dark' ? 'white' : '#1f2937'};
        box-shadow: -4px 0 24px rgba(0, 0, 0, 0.15);
        transform: translateX(${POSITION.includes('right') ? '100%' : '-100%'});
        transition: transform 0.3s ease;
        z-index: 9999;
        display: flex;
        flex-direction: column;
      }

      #demly-cart-panel.open {
        transform: translateX(0);
      }

      #demly-cart-header {
        padding: 20px;
        border-bottom: 1px solid ${THEME === 'dark' ? '#374151' : '#e5e7eb'};
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      #demly-cart-header h2 {
        font-size: 20px;
        font-weight: bold;
      }

      #demly-close-btn {
        background: none;
        border: none;
        color: ${THEME === 'dark' ? 'white' : '#1f2937'};
        font-size: 24px;
        cursor: pointer;
        padding: 0;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
      }

      #demly-close-btn:hover {
        background: ${THEME === 'dark' ? '#374151' : '#f3f4f6'};
      }

      #demly-cart-items {
        flex: 1;
        overflow-y: auto;
        padding: 20px;
      }

      .demly-cart-item {
        display: flex;
        gap: 12px;
        padding: 12px;
        background: ${THEME === 'dark' ? '#374151' : '#f9fafb'};
        border-radius: 8px;
        margin-bottom: 12px;
      }

      .demly-cart-item img {
        width: 60px;
        height: 60px;
        object-fit: cover;
        border-radius: 6px;
      }

      .demly-item-details {
        flex: 1;
        min-width: 0;
      }

      .demly-item-name {
        font-weight: 600;
        font-size: 14px;
        margin-bottom: 4px;
      }

      .demly-item-price {
        font-size: 13px;
        color: ${THEME === 'dark' ? '#9ca3af' : '#6b7280'};
      }

      .demly-item-controls {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-top: 8px;
      }

      .demly-qty-btn {
        width: 28px;
        height: 28px;
        border: 1px solid ${THEME === 'dark' ? '#4b5563' : '#d1d5db'};
        background: ${THEME === 'dark' ? '#4b5563' : 'white'};
        color: ${THEME === 'dark' ? 'white' : '#1f2937'};
        border-radius: 4px;
        cursor: pointer;
        font-size: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .demly-qty-btn:hover {
        background: ${THEME === 'dark' ? '#6b7280' : '#f3f4f6'};
      }

      .demly-qty {
        font-weight: 600;
        min-width: 30px;
        text-align: center;
      }

      .demly-remove-btn {
        margin-left: auto;
        background: none;
        border: none;
        color: #ef4444;
        cursor: pointer;
        font-size: 18px;
        padding: 4px;
      }

      #demly-cart-footer {
        padding: 20px;
        border-top: 1px solid ${THEME === 'dark' ? '#374151' : '#e5e7eb'};
      }

      #demly-cart-total {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
        font-size: 18px;
        font-weight: bold;
      }

      #demly-checkout-btn {
        width: 100%;
        padding: 14px;
        background: #6366f1;
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
      }

      #demly-checkout-btn:hover {
        background: #4f46e5;
        transform: translateY(-1px);
      }

      #demly-checkout-btn:disabled {
        background: #9ca3af;
        cursor: not-allowed;
        transform: none;
      }

      #demly-empty-cart {
        text-align: center;
        padding: 60px 20px;
        color: ${THEME === 'dark' ? '#9ca3af' : '#6b7280'};
      }

      #demly-empty-cart-icon {
        font-size: 48px;
        margin-bottom: 12px;
        opacity: 0.5;
      }

      /* Checkout Form */
      #demly-checkout-form {
        display: none;
        padding: 20px;
      }

      #demly-checkout-form.active {
        display: block;
      }

      .demly-form-group {
        margin-bottom: 16px;
      }

      .demly-form-group label {
        display: block;
        font-size: 14px;
        font-weight: 600;
        margin-bottom: 6px;
      }

      .demly-form-group input,
      .demly-form-group textarea {
        width: 100%;
        padding: 10px 12px;
        border: 1px solid ${THEME === 'dark' ? '#4b5563' : '#d1d5db'};
        background: ${THEME === 'dark' ? '#374151' : 'white'};
        color: ${THEME === 'dark' ? 'white' : '#1f2937'};
        border-radius: 6px;
        font-size: 14px;
      }

      .demly-form-group textarea {
        resize: vertical;
        min-height: 80px;
      }

      #demly-back-btn {
        margin-bottom: 16px;
        background: none;
        border: none;
        color: #6366f1;
        cursor: pointer;
        font-size: 14px;
        padding: 8px 0;
        display: flex;
        align-items: center;
        gap: 4px;
      }

      #demly-submit-btn {
        width: 100%;
        padding: 14px;
        background: #10b981;
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
      }

      #demly-submit-btn:hover {
        background: #059669;
      }

      #demly-submit-btn:disabled {
        background: #9ca3af;
        cursor: not-allowed;
      }

      .demly-success-message {
        text-align: center;
        padding: 40px 20px;
      }

      .demly-success-icon {
        font-size: 64px;
        color: #10b981;
        margin-bottom: 16px;
      }

      .demly-success-message h3 {
        font-size: 20px;
        margin-bottom: 8px;
      }

      .demly-success-message p {
        color: ${THEME === 'dark' ? '#9ca3af' : '#6b7280'};
        margin-bottom: 20px;
      }
    </style>

    <!-- Cart Button -->
    <button id="demly-cart-button" aria-label="Shopping Cart">
      🛒
      <span id="demly-cart-count" style="display: none;">0</span>
    </button>

    <!-- Cart Panel -->
    <div id="demly-cart-panel">
      <!-- Header -->
      <div id="demly-cart-header">
        <h2>Your Cart</h2>
        <button id="demly-close-btn" aria-label="Close">×</button>
      </div>

      <!-- Cart Items -->
      <div id="demly-cart-items">
        <div id="demly-empty-cart">
          <div id="demly-empty-cart-icon">🛒</div>
          <p>Your cart is empty</p>
        </div>
      </div>

      <!-- Footer -->
      <div id="demly-cart-footer" style="display: none;">
        <div id="demly-cart-total">
          <span>Total:</span>
          <span id="demly-total-amount">£0.00</span>
        </div>
        <button id="demly-checkout-btn">Checkout</button>
      </div>

      <!-- Checkout Form -->
      <div id="demly-checkout-form">
        <button id="demly-back-btn">← Back to Cart</button>
        <div class="demly-form-group">
          <label>Full Name *</label>
          <input type="text" id="demly-name" required>
        </div>
        <div class="demly-form-group">
          <label>Email</label>
          <input type="email" id="demly-email">
        </div>
        <div class="demly-form-group">
          <label>Phone *</label>
          <input type="tel" id="demly-phone" required>
        </div>
        <div class="demly-form-group">
          <label>Delivery Address</label>
          <textarea id="demly-address"></textarea>
        </div>
        <div class="demly-form-group">
          <label>Order Notes</label>
          <textarea id="demly-notes" placeholder="Special instructions..."></textarea>
        </div>
        <button id="demly-submit-btn">Place Order</button>
      </div>
    </div>
  `;

  document.body.appendChild(widgetContainer);

  // Get elements
  const cartButton = document.getElementById('demly-cart-button');
  const cartPanel = document.getElementById('demly-cart-panel');
  const closeBtn = document.getElementById('demly-close-btn');
  const cartCount = document.getElementById('demly-cart-count');
  const cartItems = document.getElementById('demly-cart-items');
  const cartFooter = document.getElementById('demly-cart-footer');
  const checkoutBtn = document.getElementById('demly-checkout-btn');
  const checkoutForm = document.getElementById('demly-checkout-form');
  const backBtn = document.getElementById('demly-back-btn');
  const submitBtn = document.getElementById('demly-submit-btn');
  const totalAmount = document.getElementById('demly-total-amount');

  // Functions
  function openCart() {
    isOpen = true;
    cartPanel.classList.add('open');
  }

  function closeCart() {
    isOpen = false;
    cartPanel.classList.remove('open');
    checkoutForm.classList.remove('active');
    cartItems.style.display = 'block';
    cartFooter.style.display = cart.length > 0 ? 'block' : 'none';
  }

  function updateCart() {
    // Update count badge
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    if (totalItems > 0) {
      cartCount.textContent = totalItems;
      cartCount.style.display = 'flex';
    } else {
      cartCount.style.display = 'none';
    }

    // Update cart display
    if (cart.length === 0) {
      cartItems.innerHTML = `
        <div id="demly-empty-cart">
          <div id="demly-empty-cart-icon">🛒</div>
          <p>Your cart is empty</p>
        </div>
      `;
      cartFooter.style.display = 'none';
    } else {
      cartItems.innerHTML = cart.map((item, index) => `
        <div class="demly-cart-item">
          ${item.image ? `<img src="${item.image}" alt="${item.name}">` : ''}
          <div class="demly-item-details">
            <div class="demly-item-name">${item.name}</div>
            <div class="demly-item-price">£${item.price.toFixed(2)}</div>
            <div class="demly-item-controls">
              <button class="demly-qty-btn" onclick="window.DemlyWidget.decreaseQty(${index})">−</button>
              <span class="demly-qty">${item.quantity}</span>
              <button class="demly-qty-btn" onclick="window.DemlyWidget.increaseQty(${index})">+</button>
              <button class="demly-remove-btn" onclick="window.DemlyWidget.removeItem(${index})">🗑️</button>
            </div>
          </div>
        </div>
      `).join('');
      cartFooter.style.display = 'block';
    }

    // Update total
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    totalAmount.textContent = `£${total.toFixed(2)}`;

    // Save to localStorage
    localStorage.setItem('demly_cart', JSON.stringify(cart));
  }

  function addToCart(product) {
    const existingIndex = cart.findIndex(item => item.id === product.id);
    
    if (existingIndex >= 0) {
      cart[existingIndex].quantity += 1;
    } else {
      cart.push({
        id: product.id || Date.now(),
        name: product.name,
        price: parseFloat(product.price),
        quantity: 1,
        image: product.image || null
      });
    }

    updateCart();
    openCart();
  }

  function increaseQty(index) {
    cart[index].quantity += 1;
    updateCart();
  }

  function decreaseQty(index) {
    if (cart[index].quantity > 1) {
      cart[index].quantity -= 1;
    } else {
      cart.splice(index, 1);
    }
    updateCart();
  }

  function removeItem(index) {
    cart.splice(index, 1);
    updateCart();
  }

  async function submitOrder() {
    // Get form values
    const name = document.getElementById('demly-name').value;
    const email = document.getElementById('demly-email').value;
    const phone = document.getElementById('demly-phone').value;
    const address = document.getElementById('demly-address').value;
    const notes = document.getElementById('demly-notes').value;

    if (!name || !phone) {
      alert('Please fill in required fields');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Placing Order...';

    try {
      const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const vat = subtotal * 0.2;
      const total = subtotal + vat;

      const orderData = {
        orderId: `WEB-${Date.now()}`,
        customer: {
          name,
          email: email || null,
          phone,
          address: address || null
        },
        items: cart.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity
        })),
        subtotal,
        vat,
        total,
        notes: notes || null,
        websiteUrl: window.location.origin,
        metadata: {
          source: 'demly-widget',
          userAgent: navigator.userAgent
        }
      };

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY
        },
        body: JSON.stringify(orderData)
      });

      const result = await response.json();

      if (result.success) {
        // Show success
        cartItems.style.display = 'none';
        cartFooter.style.display = 'none';
        checkoutForm.innerHTML = `
          <div class="demly-success-message">
            <div class="demly-success-icon">✅</div>
            <h3>Order Placed!</h3>
            <p>Order #${result.externalOrderId}<br>We'll contact you shortly.</p>
            <button onclick="window.DemlyWidget.closeAndReset()" style="padding: 12px 24px; background: #6366f1; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">Close</button>
          </div>
        `;

        // Clear cart
        cart = [];
        localStorage.removeItem('demly_cart');
        updateCart();

        // Fire custom event
        window.dispatchEvent(new CustomEvent('demly:orderPlaced', { 
          detail: result 
        }));
      } else {
        throw new Error(result.error || 'Order failed');
      }
    } catch (error) {
      alert('Failed to place order: ' + error.message);
      submitBtn.disabled = false;
      submitBtn.textContent = 'Place Order';
    }
  }

  function closeAndReset() {
    closeCart();
    setTimeout(() => {
      checkoutForm.classList.remove('active');
      checkoutForm.innerHTML = `
        <button id="demly-back-btn">← Back to Cart</button>
        <div class="demly-form-group">
          <label>Full Name *</label>
          <input type="text" id="demly-name" required>
        </div>
        <div class="demly-form-group">
          <label>Email</label>
          <input type="email" id="demly-email">
        </div>
        <div class="demly-form-group">
          <label>Phone *</label>
          <input type="tel" id="demly-phone" required>
        </div>
        <div class="demly-form-group">
          <label>Delivery Address</label>
          <textarea id="demly-address"></textarea>
        </div>
        <div class="demly-form-group">
          <label>Order Notes</label>
          <textarea id="demly-notes" placeholder="Special instructions..."></textarea>
        </div>
        <button id="demly-submit-btn">Place Order</button>
      `;
      
      // Re-attach event listeners
      document.getElementById('demly-back-btn').addEventListener('click', () => {
        checkoutForm.classList.remove('active');
        cartItems.style.display = 'block';
        cartFooter.style.display = 'block';
      });
      
      document.getElementById('demly-submit-btn').addEventListener('click', submitOrder);
    }, 300);
  }

  // Event listeners
  cartButton.addEventListener('click', openCart);
  closeBtn.addEventListener('click', closeCart);
  
  checkoutBtn.addEventListener('click', () => {
    cartItems.style.display = 'none';
    cartFooter.style.display = 'none';
    checkoutForm.classList.add('active');
  });

  backBtn.addEventListener('click', () => {
    checkoutForm.classList.remove('active');
    cartItems.style.display = 'block';
    cartFooter.style.display = 'block';
  });

  submitBtn.addEventListener('click', submitOrder);

  // Load cart from localStorage
  const savedCart = localStorage.getItem('demly_cart');
  if (savedCart) {
    cart = JSON.parse(savedCart);
    updateCart();
  }

  // Public API
  window.DemlyWidget = {
    addToCart,
    openCart,
    closeCart,
    increaseQty,
    decreaseQty,
    removeItem,
    closeAndReset,
    getCart: () => cart
  };

  // Auto-detect "Add to Cart" buttons
  document.addEventListener('click', (e) => {
    const target = e.target;
    if (target.matches('[data-demly-product]')) {
      e.preventDefault();
      const productData = target.dataset.demlyProduct;
      try {
        const product = JSON.parse(productData);
        addToCart(product);
      } catch (error) {
        console.error('Invalid product data:', error);
      }
    }
  });

  console.log('✅ Demly Widget loaded successfully');
})();