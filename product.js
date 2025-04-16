export async function fetchProducts() {
    const response = await fetch('/api/products');
    return await response.json();
}

export async function renderProducts(filter = 'all', searchQuery = '', container = '.product-list') {
    const productList = document.querySelector(container);
    productList.innerHTML = '';

    let filteredProducts = await fetchProducts();

    if (filter !== 'all') {
        filteredProducts = filteredProducts.filter(p => p.category === filter);
    }

    if (searchQuery) {
        filteredProducts = filteredProducts.filter(p =>
            p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.category.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }

    if (filteredProducts.length === 0) {
        productList.innerHTML = '<p>No products found.</p>';
        return;
    }

    filteredProducts.forEach(product => {
        const li = document.createElement('li');
        li.className = 'product-card';
        li.innerHTML = `
            <img data-src="${product.image}" alt="${product.name}" class="lazy">
            <div>
                <h3>${product.name}</h3>
                <p>${product.description}</p>
                <p>$${product.price.toFixed(2)}</p>
                <div class="actions">
                    <button class="btn-filled-dark" data-id="${product.id}">
                        <i class="ri-shopping-cart-line"></i> Add to Cart
                    </button>
                    <button class="btn-filled-dark quick-view-btn" data-id="${product.id}">
                        <i class="ri-eye-line"></i> Quick View
                    </button>
                </div>
            </div>
        `;
        productList.appendChild(li);
    });
}

export async function renderRecommendations() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const categories = [...new Set(cart.map(item => item.category))];
    let recommended = await fetchProducts();
    recommended = recommended.filter(p => categories.includes(p.category) && !cart.some(c => c.id === p.id)).slice(0, 4);
    if (recommended.length > 0) {
        const container = document.querySelector('#recommendations .product-list');
        container.innerHTML = '';
        recommended.forEach(product => {
            const li = document.createElement('li');
            li.className = 'product-card';
            li.innerHTML = `
                <img data-src="${product.image}" alt="${product.name}" class="lazy">
                <div>
                    <h3>${product.name}</h3>
                    <p>${product.description}</p>
                    <p>$${product.price.toFixed(2)}</p>
                    <div class="actions">
                        <button class="btn-filled-dark" data-id="${product.id}">
                            <i class="ri-shopping-cart-line"></i> Add to Cart
                        </button>
                        <button class="btn-filled-dark quick-view-btn" data-id="${product.id}">
                            <i class="ri-eye-line"></i> Quick View
                        </button>
                    </div>
                </div>
            `;
            container.appendChild(li);
        });
    }
}

export function renderRecentlyViewed() {
    const viewed = JSON.parse(localStorage.getItem('recentlyViewed')) || [];
    if (viewed.length === 0) return;

    fetchProducts().then(products => {
        const viewedProducts = products.filter(p => viewed.includes(p.id)).slice(0, 4);
        const container = document.querySelector('#recently-viewed .product-list');
        container.innerHTML = '';
        viewedProducts.forEach(product => {
            const li = document.createElement('li');
            li.className = 'product-card';
            li.innerHTML = `
                <img data-src="${product.image}" alt="${product.name}" class="lazy">
                <div>
                    <h3>${product.name}</h3>
                    <p>${product.description}</p>
                    <p>$${product.price.toFixed(2)}</p>
                    <div class="actions">
                        <button class="btn-filled-dark" data-id="${product.id}">
                            <i class="ri-shopping-cart-line"></i> Add to Cart
                        </button>
                        <button class="btn-filled-dark quick-view-btn" data-id="${product.id}">
                            <i class="ri-eye-line"></i> Quick View
                        </button>
                    </div>
                </div>
            `;
            container.appendChild(li);
        });
    });
}

export function addRecentlyViewed(productId) {
    let viewed = JSON.parse(localStorage.getItem('recentlyViewed')) || [];
    viewed = [productId, ...viewed.filter(id => id !== productId)].slice(0, 10);
    localStorage.setItem('recentlyViewed', JSON.stringify(viewed));
    renderRecentlyViewed();
}

export function renderQuickView(productId) {
    fetchProducts().then(products => {
        const product = products.find(p => p.id === productId);
        if (!product) return;

        const quickViewContent = document.getElementById('quick-view-content');
        quickViewContent.innerHTML = `
            <img data-src="${product.image}" alt="${product.name}" class="lazy">
            <div>
                <h3>${product.name}</h3>
                <p>${product.description}</p>
                <p>$${product.price.toFixed(2)}</p>
                <button class="btn-filled-dark" data-id="${product.id}">
                    <i class="ri-shopping-cart-line"></i> Add to Cart
                </button>
            </div>
        `;
    });
}