// API Configuration
const CONFIG = {
    API_KEY: '0148472e90a64aefb77b07fd50df441f', // TODO: Move to backend proxy in production
    API_URL: 'https://api.spoonacular.com/food/products/search',
    CACHE_KEY: 'grocery_products',
    CACHE_EXPIRY: 24 * 60 * 60 * 1000, // 24 hours
    POLL_INTERVAL: 10 * 60 * 1000, // Poll every 10 minutes
    MAX_RETRIES: 3,
    RETRY_DELAY: 2000, // 2 seconds
    DEBOUNCE_DELAY: 300, // 300ms for search
  };
  
  // DOM Elements
  const DOM = {
    loader: document.querySelector('#loader'),
    productList: document.querySelector('#products .product-list'),
    productSlider: document.querySelector('#product-slider'),
    filterButtons: document.querySelectorAll('.filter-bar button'),
    cartCount: document.querySelector('#cart-count'),
    cartModal: document.querySelector('#cart-modal'),
    cartItemsList: document.querySelector('#cart-items'),
    cartTotal: document.querySelector('#cart-total'),
    checkoutBtn: document.querySelector('#checkout-btn'),
    quickViewModal: document.querySelector('#quick-view-modal'),
    quickViewContent: document.querySelector('#quick-view-content'),
    searchForm: document.querySelector('#search-form'),
    searchInput: document.querySelector('#search-input'),
    undoSnackbar: document.querySelector('#undo-snackbar'),
    scrollToTopBtn: document.querySelector('#scroll-to-top'),
    toggleSearchBtn: document.querySelector('[data-action="toggle-search"]'),
    openCartBtn: document.querySelector('[data-action="open-cart"]'),
  };
  
  // State
  let state = {
    products: [],
    cartItems: JSON.parse(localStorage.getItem('cartItems')) || [],
    lastQuery: 'grocery',
  };
  
  // Utility: Debounce Function
  const debounce = (func, delay) => {
    let timeoutId;
    return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  };
  
  // Initialize
  document.addEventListener('DOMContentLoaded', () => {
    // Show loader briefly
    setTimeout(() => {
      DOM.loader.classList.add('hidden');
      document.body.style.overflow = 'auto';
    }, 1000);
  
    // Initialize app
    initApp();
  });
  
  /**
   * Initialize the application
   */
  function initApp() {
    fetchProducts();
    updateCart();
    initSliders();
    initAOS();
    attachEventListeners();
    initScrollToTop();
    initLazyLoading();
  }
  
  /**
   * Fetch products from API or cache
   * @param {string} query - Search query for products
   * @param {number} retries - Number of retry attempts
   */
  async function fetchProducts(query = state.lastQuery, retries = CONFIG.MAX_RETRIES) {
    state.lastQuery = query;
    const cachedData = getCachedProducts();
    if (cachedData) {
      state.products = cachedData;
      renderProducts(state.products);
      renderProductSlider(state.products.slice(0, 8)); // Top 8 for slider
      return;
    }
  
    DOM.productList.innerHTML = '<li class="loading-message">Loading products...</li>';
    try {
      const response = await fetch(`${CONFIG.API_URL}?query=${encodeURIComponent(query)}&number=24&apiKey=${CONFIG.API_KEY}`);
      if (!response.ok) {
        if (response.status === 429 && retries > 0) {
          await new Promise(resolve => setTimeout(resolve, CONFIG.RETRY_DELAY));
          return fetchProducts(query, retries - 1);
        }
        throw new Error(response.status === 429 ? 'Rate limit exceeded. Please try again later.' : 'Failed to fetch products.');
      }
      const data = await response.json();
      state.products = data.products.map(product => ({
        id: product.id,
        name: product.title,
        price: product.price || (Math.random() * 10 + 2).toFixed(2),
        image: product.image || 'https://via.placeholder.com/150',
        category: categorizeProduct(product.title),
        rating: (Math.random() * 2 + 3).toFixed(1),
      }));
      cacheProducts(state.products);
      renderProducts(state.products);
      renderProductSlider(state.products.slice(0, 8));
    } catch (error) {
      console.error('Error fetching products:', error);
      DOM.productList.innerHTML = `<li class="error-message">${error.message}</li>`;
      showSnackbar(error.message, 'error');
    }
  }
  
  /**
   * Categorize product based on name
   * @param {string} name - Product name
   * @returns {string} Category
   */
  function categorizeProduct(name) {
    const lowerName = name.toLowerCase();
    const categories = {
      Fruits: ['apple', 'banana', 'orange', 'berry', 'mango', 'pineapple'],
      Vegetables: ['carrot', 'broccoli', 'lettuce', 'potato', 'tomato', 'cucumber'],
      Dairy: ['milk', 'cheese', 'yogurt', 'butter', 'cream'],
      Pantry: [], // Default
    };
    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => lowerName.includes(keyword))) return category;
    }
    return 'Pantry';
  }
  
  /**
   * Cache products in localStorage
   * @param {Array} products - Products to cache
   */
  function cacheProducts(products) {
    localStorage.setItem(CONFIG.CACHE_KEY, JSON.stringify({ data: products, timestamp: Date.now() }));
  }
  
  /**
   * Retrieve cached products
   * @returns {Array|null} Cached products or null
   */
  function getCachedProducts() {
    const cache = JSON.parse(localStorage.getItem(CONFIG.CACHE_KEY));
    if (cache && Date.now() - cache.timestamp < CONFIG.CACHE_EXPIRY) return cache.data;
    return null;
  }
  
  /**
   * Render products to the DOM
   * @param {Array} products - Products to render
   * @param {HTMLElement} targetList - Target list element
   */
  function renderProducts(products, targetList = DOM.productList) {
    targetList.innerHTML = products
      .map(product => `
        <li class="card-product" data-id="${product.id}" data-category="${product.category}" tabindex="0">
          <div class="card-image">
            <img src="${product.image}" alt="${product.name}" loading="lazy">
            <div class="card-actions">
              <button class="btn-action quick-view" data-id="${product.id}" aria-label="View ${product.name} details"><i class="ri-eye-line"></i></button>
              <button class="btn-action wishlist" data-id="${product.id}" aria-label="Add ${product.name} to wishlist"><i class="ri-heart-line"></i></button>
            </div>
          </div>
          <div class="card-content">
            <small>${product.category}</small>
            <h3><a href="#products">${product.name}</a></h3>
            <div class="card-price">
              <span class="discounted-price">$${parseFloat(product.price).toFixed(2)}</span>
              <span class="original-price">$${(parseFloat(product.price) * 1.25).toFixed(2)}</span>
            </div>
            <div class="card-rating">
              ${Array(Math.floor(product.rating)).fill('<i class="ri-star-fill"></i>').join('')}
              ${product.rating % 1 >= 0.5 ? '<i class="ri-star-half-fill"></i>' : ''}
              <span>${product.rating}</span>
            </div>
            <button class="btn btn-primary add-to-cart" data-id="${product.id}" aria-label="Add ${product.name} to cart">Add to Cart</button>
          </div>
        </li>
      `)
      .join('');
    attachProductEventListeners();
  }
  
  /**
   * Render product slider
   * @param {Array} products - Products to render in slider
   */
  function renderProductSlider(products) {
    DOM.productSlider.innerHTML = products
      .map(product => `
        <div class="swiper-slide">
          <div class="card-product" data-id="${product.id}" tabindex="0">
            <div class="card-image">
              <img src="${product.image}" alt="${product.name}" loading="lazy">
              <div class="card-actions">
                <button class="btn-action quick-view" data-id="${product.id}" aria-label="View ${product.name} details"><i class="ri-eye-line"></i></button>
                <button class="btn-action wishlist" data-id="${product.id}" aria-label="Add ${product.name} to wishlist"><i class="ri-heart-line"></i></button>
              </div>
            </div>
            <div class="card-content">
              <small>${product.category}</small>
              <h3><a href="#products">${product.name}</a></h3>
              <div class="card-price">
                <span class="discounted-price">$${parseFloat(product.price).toFixed(2)}</span>
                <span class="original-price">$${(parseFloat(product.price) * 1.25).toFixed(2)}</span>
              </div>
              <div class="card-rating">
                ${Array(Math.floor(product.rating)).fill('<i class="ri-star-fill"></i>').join('')}
                ${product.rating % 1 >= 0.5 ? '<i class="ri-star-half-fill"></i>' : ''}
                <span>${product.rating}</span>
              </div>
              <button class="btn btn-primary add-to-cart" data-id="${product.id}" aria-label="Add ${product.name} to cart">Add to Cart</button>
            </div>
          </div>
        </div>
      `)
      .join('');
    attachProductEventListeners();
  }
  
  /**
   * Filter products by category
   * @param {string} category - Category to filter by
   */
  function filterProducts(category) {
    const filteredProducts = category === 'all' ? state.products : state.products.filter(product => product.category === category);
    renderProducts(filteredProducts);
    updateFilterButtons(category);
  }
  
  /**
   * Update filter button states
   * @param {string} activeCategory - Active category
   */
  function updateFilterButtons(activeCategory) {
    DOM.filterButtons.forEach(button => {
      button.classList.toggle('active', button.dataset.filter === activeCategory);
      button.setAttribute('aria-pressed', button.dataset.filter === activeCategory);
    });
  }
  
  /**
   * Add product to cart
   * @param {string} productId - Product ID
   */
  function addToCart(productId) {
    const product = state.products.find(p => p.id === productId);
    if (product) {
      state.cartItems.push(product);
      localStorage.setItem('cartItems', JSON.stringify(state.cartItems));
      updateCart();
      showSnackbar(`${product.name} added to cart.`, 'success');
    }
  }
  
  /**
   * Remove product from cart
   * @param {string} productId - Product ID
   */
  function removeFromCart(productId) {
    const index = state.cartItems.findIndex(item => item.id === productId);
    if (index !== -1) {
      const removedItem = state.cartItems.splice(index, 1)[0];
      localStorage.setItem('cartItems', JSON.stringify(state.cartItems));
      updateCart();
      showUndoSnackbar(removedItem);
    }
  }
  
  /**
   * Update cart UI
   */
  function updateCart() {
    DOM.cartCount.textContent = state.cartItems.length;
    DOM.cartCount.setAttribute('aria-label', `${state.cartItems.length} items in cart`);
    DOM.cartItemsList.innerHTML = state.cartItems
      .map(item => `
        <li data-id="${item.id}">
          <img src="${item.image}" alt="${item.name}" loading="lazy">
          <span>${item.name}</span>
          <span>$${parseFloat(item.price).toFixed(2)}</span>
          <button class="remove-item" data-id="${item.id}" aria-label="Remove ${item.name} from cart"><i class="ri-close-line"></i></button>
        </li>
      `)
      .join('');
    const total = state.cartItems.reduce((sum, item) => sum + parseFloat(item.price), 0).toFixed(2);
    DOM.cartTotal.textContent = `Total: $${total}`;
    DOM.checkoutBtn.disabled = state.cartItems.length === 0;
    DOM.checkoutBtn.setAttribute('aria-disabled', state.cartItems.length === 0);
  
    DOM.cartItemsList.querySelectorAll('.remove-item').forEach(button => {
      button.addEventListener('click', () => removeFromCart(button.dataset.id));
    });
  }
  
  /**
   * Show quick view modal for a product
   * @param {string} productId - Product ID
   */
  function showQuickView(productId) {
    const product = state.products.find(p => p.id === productId);
    if (product) {
      DOM.quickViewContent.innerHTML = `
        <div class="quick-view-details">
          <img src="${product.image}" alt="${product.name}" loading="lazy">
          <div>
            <h3>${product.name}</h3>
            <p class="quick-view-price">$${parseFloat(product.price).toFixed(2)}</p>
            <p>Category: ${product.category}</p>
            <p>Rating: ${product.rating} <i class="ri-star-fill"></i></p>
            <button class="btn btn-primary add-to-cart" data-id="${product.id}" aria-label="Add ${product.name} to cart">Add to Cart</button>
          </div>
        </div>
      `;
      DOM.quickViewModal.classList.remove('hidden');
      DOM.quickViewModal.setAttribute('aria-hidden', 'false');
      DOM.quickViewContent.querySelector('.add-to-cart').addEventListener('click', () => addToCart(productId));
      trapFocus(DOM.quickViewModal);
    }
  }
  
  /**
   * Show snackbar with message
   * @param {string} message - Message to display
   * @param {string} type - Type of message (success, error)
   */
  function showSnackbar(message, type = 'success') {
    DOM.undoSnackbar.textContent = message;
    DOM.undoSnackbar.className = `snackbar ${type}`;
    DOM.undoSnackbar.classList.remove('hidden');
    setTimeout(() => DOM.undoSnackbar.classList.add('hidden'), 4000);
  }
  
  /**
   * Show undo snackbar for removed cart item
   * @param {Object} removedItem - Removed cart item
   */
  function showUndoSnackbar(removedItem) {
    DOM.undoSnackbar.innerHTML = `${removedItem.name} removed from cart. <button class="undo-btn" aria-label="Undo remove ${removedItem.name}">Undo</button>`;
    DOM.undoSnackbar.className = 'snackbar warning';
    DOM.undoSnackbar.classList.remove('hidden');
    const undoBtn = DOM.undoSnackbar.querySelector('.undo-btn');
    undoBtn.addEventListener('click', () => {
      state.cartItems.push(removedItem);
      localStorage.setItem('cartItems', JSON.stringify(state.cartItems));
      updateCart();
      DOM.undoSnackbar.classList.add('hidden');
    });
    setTimeout(() => DOM.undoSnackbar.classList.add('hidden'), 6000);
  }
  
  /**
   * Initialize Swiper sliders
   */
  function initSliders() {
    new Swiper('.hero-slider', {
      loop: true,
      autoplay: { delay: 4000, disableOnInteraction: false },
      pagination: { el: '.swiper-pagination', clickable: true, dynamicBullets: true },
      navigation: { nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' },
      effect: 'fade',
      fadeEffect: { crossFade: true },
    });
  
    new Swiper('.product-slider', {
      slidesPerView: 4,
      spaceBetween: 24,
      breakpoints: {
        320: { slidesPerView: 1, spaceBetween: 16 },
        640: { slidesPerView: 2, spaceBetween: 20 },
        1024: { slidesPerView: 3, spaceBetween: 24 },
        1280: { slidesPerView: 4, spaceBetween: 24 },
      },
      navigation: { nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' },
      preloadImages: false,
      lazy: true,
    });
  }
  
  /**
   * Initialize AOS animations
   */
  function initAOS() {
    AOS.init({
      duration: 600,
      easing: 'ease-out-quart',
      once: true,
      offset: 120,
    });
  }
  
  /**
   * Initialize scroll-to-top functionality
   */
  function initScrollToTop() {
    window.addEventListener('scroll', () => {
      DOM.scrollToTopBtn.classList.toggle('show', window.scrollY > 400);
    });
    DOM.scrollToTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
  
  /**
   * Initialize lazy loading for product images
   */
  function initLazyLoading() {
    const observer = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
            observer.unobserve(img);
          }
        });
      },
      { rootMargin: '0px 0px 200px 0px' }
    );
  
    document.querySelectorAll('img[loading="lazy"]').forEach(img => {
      if (img.dataset.src) observer.observe(img);
    });
  }
  
  /**
   * Trap focus within modal for accessibility
   * @param {HTMLElement} modal - Modal element
   */
  function trapFocus(modal) {
    const focusableElements = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
  
    modal.addEventListener('keydown', e => {
      if (e.key === 'Tab') {
        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
      if (e.key === 'Escape') {
        closeModal(modal);
      }
    });
  
    firstElement.focus();
  }
  
  /**
   * Close modal and restore focus
   * @param {HTMLElement} modal - Modal element
   */
  function closeModal(modal) {
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
    document.querySelector('[data-action="open-cart"]').focus();
  }
  
  /**
   * Attach event listeners
   */
  function attachEventListeners() {
    // Filter buttons
    DOM.filterButtons.forEach(button => {
      button.addEventListener('click', () => filterProducts(button.dataset.filter));
    });
  
    // Cart modal
    DOM.openCartBtn.addEventListener('click', () => {
      DOM.cartModal.classList.remove('hidden');
      DOM.cartModal.setAttribute('aria-hidden', 'false');
      trapFocus(DOM.cartModal);
    });
  
    // Close modals
    document.querySelectorAll('.close-modal').forEach(button => {
      button.addEventListener('click', () => {
        document.querySelectorAll('.modal').forEach(modal => closeModal(modal));
      });
    });
  
    // Search form
    DOM.searchForm.addEventListener('submit', e => {
      e.preventDefault();
      const query = DOM.searchInput.value.trim();
      if (query) fetchProducts(query);
    });
  
    // Debounced search input
    DOM.searchInput.addEventListener(
      'input',
      debounce(() => {
        const query = DOM.searchInput.value.trim();
        if (query) fetchProducts(query);
      }, CONFIG.DEBOUNCE_DELAY)
    );
  
    // Toggle search bar
    DOM.toggleSearchBtn.addEventListener('click', () => {
      DOM.searchForm.parentElement.classList.toggle('hidden');
      if (!DOM.searchForm.parentElement.classList.contains('hidden')) {
        DOM.searchInput.focus();
      }
    });
  
    // Poll for updates
    setInterval(() => {
      if (document.visibilityState === 'visible') fetchProducts(state.lastQuery);
    }, CONFIG.POLL_INTERVAL);
  
    // Close modals on outside click
    document.querySelectorAll('.modal').forEach(modal => {
      modal.addEventListener('click', e => {
        if (e.target === modal) closeModal(modal);
      });
    });
  }
  
  /**
   * Attach product-specific event listeners
   */
  function attachProductEventListeners() {
    document.querySelectorAll('.add-to-cart').forEach(button => {
      button.addEventListener('click', () => addToCart(button.dataset.id));
    });
    document.querySelectorAll('.quick-view').forEach(button => {
      button.addEventListener('click', () => showQuickView(button.dataset.id));
    });
    document.querySelectorAll('.wishlist').forEach(button => {
      button.addEventListener('click', () => {
        showSnackbar('Added to wishlist!', 'success');
      });
    });
  
    // Keyboard navigation for product cards
    document.querySelectorAll('.card-product').forEach(card => {
      card.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          card.querySelector('.quick-view').click();
        }
      });
    });
  }