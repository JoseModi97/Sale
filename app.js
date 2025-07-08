$(document).ready(function () {
    // Global variables
    let cart = [];
    const taxRate = 0.10; // 10% tax rate
    let allProducts = []; // To store all products fetched from API (now with inventory)
    let currentProducts = []; // To store products currently being displayed (after filtering)
    let selectedCategory = 'all'; // To store the selected category
    let searchTerm = ''; // To store the current search term

    // --- localStorage Keys ---
    const CART_STORAGE_KEY = 'posCart';
    const PRODUCTS_STORAGE_KEY = 'posProducts';

    // --- UI Helper Functions ---
    function displayErrorMessage(message) {
        $('#error-message-container').remove();
        const errorHtml = `
            <div id="error-message-container" class="alert alert-danger alert-dismissible fade show" role="alert">
                ${message}
                <button type="button" class="close" data-dismiss="alert" aria-label="Close">
                    <span aria-hidden="true">&times;</span>
                </button>
            </div>
        `;
        $('body').prepend(errorHtml);
    }

    function showToast(message, type = 'info') {
        const toastId = 'toast-' + new Date().getTime();
        let toastHeaderClass = 'bg-info text-white';
        let toastIcon = '<i class="fas fa-info-circle mr-2"></i>';

        switch (type) {
            case 'success':
                toastHeaderClass = 'bg-success text-white';
                toastIcon = '<i class="fas fa-check-circle mr-2"></i>';
                break;
            case 'error':
                toastHeaderClass = 'bg-danger text-white';
                toastIcon = '<i class="fas fa-exclamation-triangle mr-2"></i>';
                break;
            case 'warning':
                toastHeaderClass = 'bg-warning text-dark';
                toastIcon = '<i class="fas fa-exclamation-circle mr-2"></i>';
                break;
        }

        const toastHtml = `
            <div id="${toastId}" class="toast" role="alert" aria-live="assertive" aria-atomic="true" data-delay="3000">
                <div class="toast-header ${toastHeaderClass}">
                    ${toastIcon}
                    <strong class="mr-auto">Notification</strong>
                    <button type="button" class="ml-2 mb-1 close" data-dismiss="toast" aria-label="Close">
                        <span aria-hidden="true" class="${type === 'warning' ? '' : 'text-white'}">&times;</span>
                    </button>
                </div>
                <div class="toast-body">${message}</div>
            </div>`;
        $('#toast-container').append(toastHtml);
        $('#' + toastId).toast('show').on('hidden.bs.toast', function () { $(this).remove(); });
    }

    // --- localStorage Functions ---
    function saveCartToLocalStorage() {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    }

    function loadCartFromLocalStorage() {
        const storedCart = localStorage.getItem(CART_STORAGE_KEY);
        if (storedCart) {
            cart = JSON.parse(storedCart);
        }
    }

    function saveProductsToLocalStorage() {
        localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(allProducts));
    }

    function loadProductsFromLocalStorage() {
        const storedProducts = localStorage.getItem(PRODUCTS_STORAGE_KEY);
        if (storedProducts) {
            allProducts = JSON.parse(storedProducts);
            return true;
        }
        return false;
    }

    function initializeInventory(products) {
        return products.map(product => {
            const isOutOfStock = Math.random() < 0.2;
            const stock = isOutOfStock ? 0 : Math.floor(Math.random() * 15) + 1;
            return { ...product, inventory: stock, originalInventory: stock }; // Store original for reference if needed
        });
    }

    // --- Product Fetching and Rendering ---
    function fetchProducts() {
        if (loadProductsFromLocalStorage()) {
            console.log("Products loaded from localStorage with inventory.");
            selectedCategory = 'all';
            searchTerm = '';
            $('#search-input').val('');
            applyFilters();
            fetchCategories();
            return;
        }

        console.log("Fetching products from API...");
        $.getJSON('https://fakestoreapi.com/products')
            .done(function (products) {
                allProducts = initializeInventory(products);
                saveProductsToLocalStorage();
                currentProducts = allProducts;
                renderProducts(currentProducts);
                fetchCategories();
            })
            .fail(function (jqXHR, textStatus, errorThrown) {
                console.error("Failed to fetch products:", textStatus, errorThrown);
                displayErrorMessage("Could not load products. Please check your connection and try again.");
                $('#product-grid').html('<p class="text-danger text-center">Failed to load products.</p>');
            });
    }

    function renderProducts(productsToRender) {
        const $productGrid = $('#product-grid');
        $productGrid.empty();

        if (!productsToRender) {
             if ($('#product-grid').html().trim() === '') {
                // This case should ideally be handled by applyFilters setting a message for empty currentProducts
             }
            return;
        }
        // Message for empty productsToRender (e.g. "No products match your filters") is handled by applyFilters

        productsToRender.forEach(product => {
            const stock = product.inventory !== undefined ? product.inventory : 0;
            const outOfStockClass = stock <= 0 ? 'out-of-stock' : '';
            const productCard = `
                <div class="col-lg-4 col-md-6 mb-4">
                    <div class="card h-100 ${outOfStockClass}">
                        <img src="${product.image}" class="card-img-top" alt="${product.title}">
                        <div class="card-body d-flex flex-column">
                            <h5 class="card-title">${product.title}</h5>
                            <p class="card-text mt-auto font-weight-bold">$${product.price.toFixed(2)}</p>
                            <div class="mt-2">
                                <p class="mb-1 stock-display ${stock > 0 ? 'text-success' : 'text-danger'}">
                                    ${stock > 0 ? `In Stock: ${stock}` : 'Out of Stock'}
                                </p>
                                <button class="btn btn-primary add-to-cart mt-1"
                                        data-id="${product.id}"
                                        data-name="${product.title}"
                                        data-price="${product.price.toFixed(2)}"
                                        ${stock <= 0 ? 'disabled' : ''}>
                                    ${stock <= 0 ? 'Unavailable' : 'Add to Cart'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>`;
            $productGrid.append(productCard);
        });
    }

    function fetchCategories() {
        $.getJSON('https://fakestoreapi.com/products/categories')
            .done(renderCategoryFilters)
            .fail(function (jqXHR, textStatus, errorThrown) {
                console.error("Failed to fetch categories:", textStatus, errorThrown);
                $('#category-filters').html('<p class="text-danger">Could not load categories.</p>');
            });
    }

    function renderCategoryFilters(categories) {
        const $categoryFilters = $('#category-filters').empty();
        $('<button class="btn btn-outline-secondary active category-filter-btn m-1" data-category="all">All Categories</button>').appendTo($categoryFilters);
        categories.forEach(category => {
            $(`<button class="btn btn-outline-secondary category-filter-btn m-1" data-category="${category}">${category}</button>`).appendTo($categoryFilters);
        });
    }

    // --- Filtering Logic ---
    function applyFilters() {
        let filteredProducts = [...allProducts]; // Start with a copy of all products

        if (selectedCategory !== 'all') {
            filteredProducts = filteredProducts.filter(p => p.category === selectedCategory);
        }

        if (searchTerm) {
            const lowerSearchTerm = searchTerm.toLowerCase();
            filteredProducts = filteredProducts.filter(p =>
                p.title.toLowerCase().includes(lowerSearchTerm) ||
                p.description.toLowerCase().includes(lowerSearchTerm)
            );
        }

        currentProducts = filteredProducts;
        renderProducts(currentProducts);

        if (currentProducts.length === 0 && $('#product-grid').html().trim() === '') {
            $('#product-grid').html('<p class="text-center text-muted mt-4">No products match your filters.</p>');
        }
    }

    // --- Cart Functions ---
    function renderCart() {
        const $cartItems = $('#cart-items').empty();
        const $cartEmptyMessage = $('#cart-empty-message');

        if (cart.length === 0) {
            $cartEmptyMessage.show();
        } else {
            $cartEmptyMessage.hide();
            cart.forEach((item, index) => {
                const cartItemHtml = `
                    <div class="list-group-item d-flex justify-content-between align-items-center">
                        <div class="cart-item-details">
                            <span class="cart-item-name">${item.name}</span>
                            <small class="form-text text-muted">$${item.price.toFixed(2)} each</small>
                        </div>
                        <div class="d-flex align-items-center">
                            <input type="number" class="form-control form-control-sm cart-item-quantity mr-2" value="${item.quantity}" min="1" data-index="${index}" style="width: 60px;">
                            <button class="btn btn-danger btn-sm remove-from-cart" data-index="${index}">&times;</button>
                        </div>
                    </div>`;
                $cartItems.append(cartItemHtml);
            });
        }
        calculateTotals();
    }

    function calculateTotals() {
        let subtotal = 0;
        cart.forEach(item => { subtotal += item.price * item.quantity; });
        const tax = subtotal * taxRate;
        const total = subtotal + tax;
        $('#subtotal').text(`$${subtotal.toFixed(2)}`);
        $('#tax').text(`$${tax.toFixed(2)}`);
        $('#total').text(`$${total.toFixed(2)}`);
    }

    // --- Event Handlers ---
    $(document).on('click', '.category-filter-btn', function () {
        selectedCategory = $(this).data('category');
        $('.category-filter-btn').removeClass('active');
        $(this).addClass('active');
        applyFilters();
    });

    $('#search-input').on('keyup', function () {
        searchTerm = $(this).val();
        applyFilters();
    });

    // Add to cart
    $(document).on('click', '.add-to-cart', function () {
        const productId = parseInt($(this).data('id'));
        const productName = $(this).data('name');
        const productPrice = parseFloat($(this).data('price'));

        const productInCatalog = allProducts.find(p => p.id === productId);

        if (!productInCatalog) {
            showToast("Error: Product not found.", 'error');
            return;
        }

        if (productInCatalog.inventory <= 0) {
            showToast(`Sorry, "${productName}" is out of stock.`, 'warning');
            // Ensure button is disabled if somehow clicked (though it should be)
            $(this).prop('disabled', true).text('Unavailable');
            return;
        }

        // Check if item is already in cart to potentially just increment quantity
        const existingCartItem = cart.find(item => item.id === productId);

        if (existingCartItem) {
            // If we allow adding more of an existing cart item, ensure stock is available
            // The current logic assumes if button is clickable, 1 unit is available.
            // If quantity selector on card existed, this check would be more complex.
            existingCartItem.quantity++;
        } else {
            cart.push({ id: productId, name: productName, price: productPrice, quantity: 1 });
        }

        // Decrement inventory
        productInCatalog.inventory--;
        saveProductsToLocalStorage(); // Save updated inventory

        // Re-render products to update stock display and button state
        // This might be broad if many products; could optimize to update only the specific card
        renderProducts(currentProducts);

        saveCartToLocalStorage();
        showToast(`"${productName}" added to cart.`, 'success');
        renderCart();
    });

    $(document).on('change', '.cart-item-quantity', function () {
        const itemIndex = parseInt($(this).data('index'));
        const newQuantity = parseInt($(this).val()); // The desired new quantity

        if (isNaN(newQuantity)) { // Handle invalid input
            renderCart(); // Re-render to reset to old value if input was non-numeric
            return;
        }

        const cartItem = cart[itemIndex];
        if (!cartItem) return; // Should not happen

        const productInCatalog = allProducts.find(p => p.id === cartItem.id);
        if (!productInCatalog) {
            showToast("Error: Product data not found for cart item.", 'error');
            return;
        }

        const oldQuantity = cartItem.quantity;
        const quantityChange = newQuantity - oldQuantity; // positive if increasing, negative if decreasing

        if (newQuantity <= 0) { // Removing item or invalid input treated as removal
            productInCatalog.inventory += oldQuantity; // Return all stock of this item
            cart.splice(itemIndex, 1);
            showToast(`"${cartItem.name}" removed from cart.`, 'info');
        } else {
            if (quantityChange > 0) { // Trying to increase quantity
                if (productInCatalog.inventory < quantityChange) {
                    // Not enough additional stock available
                    showToast(`Cannot increase quantity. Only ${productInCatalog.inventory} more "${productInCatalog.name}" in stock.`, 'warning');
                    // Set quantity to max possible (current cart quantity + available inventory)
                    cartItem.quantity = oldQuantity + productInCatalog.inventory;
                    productInCatalog.inventory = 0; // All remaining stock taken
                } else {
                    // Enough stock
                    productInCatalog.inventory -= quantityChange;
                    cartItem.quantity = newQuantity;
                }
            } else { // Decreasing quantity (quantityChange is negative or zero)
                productInCatalog.inventory -= quantityChange; // Subtracting a negative increases inventory
                cartItem.quantity = newQuantity;
            }
        }

        saveProductsToLocalStorage(); // Persist inventory changes
        saveCartToLocalStorage();   // Persist cart changes
        renderCart();               // Update cart UI
        renderProducts(currentProducts); // Update product grid (stock display, button states)
    });

    $(document).on('click', '.remove-from-cart', function () {
        const itemIndex = parseInt($(this).data('index'));

        // Ensure itemIndex is a valid index for the cart array
        if (isNaN(itemIndex) || itemIndex < 0 || itemIndex >= cart.length) {
            console.error("Invalid itemIndex for cart removal:", itemIndex, "Cart length:", cart.length);
            showToast("Error: Could not remove item. Invalid data.", 'error');
            return; // Exit if index is invalid
        }

        const cartItem = cart[itemIndex]; // Now we know itemIndex is valid

        const productInCatalog = allProducts.find(p => p.id === cartItem.id);
        if (productInCatalog) {
            productInCatalog.inventory += cartItem.quantity; // Return the quantity to stock
            saveProductsToLocalStorage(); // Persist inventory change
        } else {
            showToast(`Error: Could not find product (ID: ${cartItem.id}) in catalog to restock.`, 'error');
        }

        const removedItemName = cartItem.name; // Get name before splicing
        cart.splice(itemIndex, 1);

        saveCartToLocalStorage();
        showToast(`"${removedItemName}" removed from cart.`, 'info');
        renderCart();
        renderProducts(currentProducts); // Update product grid (stock display, button states)
    });

    $('#checkout-button').on('click', function () {
        if (cart.length === 0) {
            showToast("Your cart is empty.", 'warning');
            return;
        }
        showToast("Checkout successful! Thank you.", 'success');
        cart = [];
        saveCartToLocalStorage();
        renderCart();
        // Note: Inventory is not "permanently" reduced beyond cart additions in this client-side sim.
    });

    // --- Initial Setup ---
    loadCartFromLocalStorage();
    renderCart();
    fetchProducts(); // This will load from localStorage if available, or fetch from API and init inventory
});
