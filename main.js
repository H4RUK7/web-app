import { renderProducts, renderRecommendations, renderRecentlyViewed, addRecentlyViewed, renderQuickView } from './products.js';
import { initCart, addToCart, updateCartCount, renderCart, updateCartItem, removeCartItem, initiateCheckout } from './cart.js';
import { animateProducts, animateModal, animateOnHover, resetHover } from './animations.js';
import { initForms } from './forms.js';
import { initLazyLoad } from './lazyload.js';

// Initialize
initCart();
initForms();
initLazyLoad();
renderProducts();
renderRecommendations();
renderRecentlyViewed();
animateProducts();

// Search functionality
const searchInput = document.getElementById('search-input');
let debounceTimeout;

searchInput.addEventListener('input', () => {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
        const filter = document.querySelector('.filter-bar .active')?.dataset.filter || 'all';
        renderProducts(filter, searchInput.value);
        animateProducts();
    }, 300);
});

// Toggle search bar
document.querySelector('[data-action="toggle-search"]').addEventListener('click', () => {
    const searchBar = document.getElementById('search-bar');
    searchBar.classList.toggle('hidden');
    if (!searchBar.classList.contains('hidden')) {
        searchInput.focus();
    }
});

// Filter products
document.querySelector('.filter-bar').addEventListener('click', e => {
    const button = e.target.closest('button');
    if (button) {
        document.querySelectorAll('.filter-bar button').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        renderProducts(button.dataset.filter, searchInput.value);
        animateProducts();
    }
});

// Navigation category filters
document.querySelector('.navigation-menu').addEventListener('click', e => {
    const category = e.target.closest('[data-category]')?.dataset.category;
    if (category) {
        e.preventDefault();
        renderProducts(category);
        animateProducts();
        document.querySelectorAll('.filter-bar button').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`.filter-bar [data-filter="${category}"]`)?.classList.add('active');
        window.scrollTo({ top: document.getElementById('products').offsetTop - 80, behavior: 'smooth' });
    }
});

// Cart modal
const cartModal = document.getElementById('cart-modal');
document.querySelector('[data-action="open-cart"]').addEventListener('click', () => {
    renderCart();
    cartModal.classList.remove('hidden');
    animateModal(cartModal.querySelector('.modal-content'));
    cartModal.querySelector('.close-modal').focus();
});

document.querySelector('#cart-modal .close-modal').addEventListener('click', () => {
    cartModal.classList.add('hidden');
});

// Quick view modal
const quickViewModal = document.getElementById('quick-view-modal');
document.addEventListener('click', e => {
    const quickViewBtn = e.target.closest('.quick-view-btn');
    if (quickViewBtn) {
        const productId = parseInt(quickViewBtn.dataset.id);
        addRecentlyViewed(productId);
        renderQuickView(productId);
        quickViewModal.classList.remove('hidden');
        animateModal(quickViewModal.querySelector('.modal-content'));
        quickViewModal.querySelector('.close-modal').focus();
        initLazyLoad();
    }
});

document.querySelector('#quick-view-modal .close-modal').addEventListener('click', () => {
    quickViewModal.classList.add('hidden');
});

// Add to cart
document.addEventListener('click', e => {
    const addBtn = e.target.closest('button[data-id]:not(.quick-view-btn)');
    if (addBtn) {
        const productId = parseInt(addBtn.dataset.id);
        addToCart(productId);
    }
});

// Update cart items
document.getElementById('cart-items').addEventListener('input', e => {
    if (e.target.type === 'number') {
        const productId = parseInt(e.target.dataset.id);
        const quantity = parseInt(e.target.value);
        updateCartItem(productId, quantity);
    }
});

// Remove cart item
document.getElementById('cart-items').addEventListener('click', e => {
    const removeBtn = e.target.closest('.remove-item');
    if (removeBtn) {
        const productId = parseInt(removeBtn.dataset.id);
        removeCartItem(productId);
    }
});

// Checkout
document.getElementById('checkout-form').addEventListener('submit', async e => {
    e.preventDefault();
    await initiateCheckout();
});

// Smooth scrolling
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', e => {
        e.preventDefault();
        const target = document.querySelector(anchor.getAttribute('href'));
        if (target) {
            window.scrollTo({ top: target.offsetTop - 80, behavior: 'smooth' });
        }
    });
});

// Hover animations
document.addEventListener('mouseover', e => {
    const card = e.target.closest('.product-card');
    if (card) animateOnHover(card);
});

document.addEventListener('mouseout', e => {
    const card = e.target.closest('.product-card');
    if (card) resetHover(card);
});

// Keyboard accessibility
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        if (!cartModal.classList.contains('hidden')) cartModal.classList.add('hidden');
        if (!quickViewModal.classList.contains('hidden')) quickViewModal.classList.add('hidden');
    }
});

// Trap focus in modals
function trapFocus(modal) {
    const focusable = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    modal.addEventListener('keydown', e => {
        if (e.key === 'Tab') {
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        }
    });
}

trapFocus(cartModal);
trapFocus(quickViewModal);