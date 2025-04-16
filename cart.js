export function initCart() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    updateCartCount();
    toggleCheckoutButton(cart);
    return cart;
}

export function addToCart(productId) {
    fetch('/api/products')
        .then(response => response.json())
        .then(products => {
            const cart = JSON.parse(localStorage.getItem('cart')) || [];
            const product = products.find(p => p.id === productId);
            const cartItem = cart.find(item => item.id === productId);

            if (cartItem) {
                cartItem.quantity += 1;
            } else {
                cart.push({ ...product, quantity: 1 });
            }

            localStorage.setItem('cart', JSON.stringify(cart));
            updateCartCount();
            toggleCheckoutButton(cart);
        });
}

export function updateCartCount() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    document.getElementById('cart-count').textContent = totalItems;
}

export function renderCart() {
    const cartItems = document.getElementById('cart-items');
    const cartTotal = document.getElementById('cart-total');
    const cart = JSON.parse(localStorage.getItem('cart')) || [];

    cartItems.innerHTML = '';
    let total = 0;

    cart.forEach(item => {
        total += item.price * item.quantity;
        const li = document.createElement('li');
        li.innerHTML = `
            <img data-src="${item.image}" alt="${item.name}" class="lazy">
            <span>${item.name} ($${item.price.toFixed(2)})</span>
            <div>
                <input type="number" min="1" value="${item.quantity}" data-id="${item.id}" aria-label="Quantity for ${item.name}">
                <button class="remove-item" data-id="${item.id}" aria-label="Remove ${item.name}">
                    <i class="ri-delete-bin-line"></i>
                </button>
            </div>
        `;
        cartItems.appendChild(li);
    });

    cartTotal.textContent = `Total: $${total.toFixed(2)}`;
    toggleCheckoutButton(cart);
}

export function updateCartItem(productId, quantity) {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const cartItem = cart.find(item => item.id === productId);

    if (cartItem) {
        if (quantity > 0) {
            cartItem.quantity = quantity;
        } else {
            const index = cart.findIndex(item => item.id === productId);
            cart.splice(index, 1);
        }
        localStorage.setItem('cart', JSON.stringify(cart));
        updateCartCount();
        renderCart();
    }
}

export function removeCartItem(productId) {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const cartItem = cart.find(item => item.id === productId);
    if (cartItem) {
        const index = cart.findIndex(item => item.id === productId);
        cart.splice(index, 1);
        localStorage.setItem('cart', JSON.stringify(cart));
        updateCartCount();
        renderCart();
        showUndoSnackbar(cartItem);
    }
}

function showUndoSnackbar(item) {
    const snackbar = document.getElementById('undo-snackbar');
    snackbar.classList.remove('hidden');
    const undoBtn = snackbar.querySelector('.undo-btn');
    undoBtn.onclick = () => {
        addToCart(item.id);
        snackbar.classList.add('hidden');
    };
    setTimeout(() => snackbar.classList.add('hidden'), 5000);
}

function toggleCheckoutButton(cart) {
    const checkoutBtn = document.getElementById('checkout-btn');
    checkoutBtn.disabled = cart.length === 0;
}

export async function initiateCheckout() {
    const checkoutBtn = document.getElementById('checkout-btn');
    const loading = document.getElementById('checkout-loading');
    checkoutBtn.disabled = true;
    loading.classList.remove('hidden');

    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    if (cart.length === 0) return;

    const lineItems = cart.map(item => ({
        price_data: {
            currency: 'usd',
            product_data: {
                name: item.name,
                description: item.description,
                images: [item.image],
            },
            unit_amount: Math.round(item.price * 100),
        },
        quantity: item.quantity,
    }));

    try {
        const response = await fetch('/api/create-checkout-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ line_items: lineItems }),
        });

        if (!response.ok) throw new Error('Checkout failed');
        const session = await response.json();

        const stripe = Stripe('pk_test_51Q4w3vRvM7vW7XzQvQz5k5b5xA5nY8x3tYhJ8nG6sYk9mR7kG8zQz5k5b5xA5nY8x3tYhJ8nG6sYk9mR7kG8z'); // Replace with your key
        await stripe.redirectToCheckout({ sessionId: session.id });
    } catch (error) {
        console.error('Checkout error:', error);
        alert('Failed to initiate checkout. Please try again.');
    } finally {
        checkoutBtn.disabled = false;
        loading.classList.add('hidden');
    }
}