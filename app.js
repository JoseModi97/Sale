$(document).ready(function () {
    // Global variables
    let cart = [];
    const taxRate = 0.10; // 10% tax rate
    let allProducts = []; // To store all products fetched from API
    let currentProducts = []; // To store products currently being displayed (after filtering)
    let selectedCategory = 'all'; // To store the selected category
    let searchTerm = ''; // To store the current search term

    // Function to display an error message
    function displayErrorMessage(message) {
        // Remove any existing error message
        $('#error-message-container').remove();

        // Create a new error message element
        const errorHtml = `
            <div id="error-message-container" class="alert alert-danger alert-dismissible fade show" role="alert">
                ${message}
                <button type="button" class="close" data-dismiss="alert" aria-label="Close">
                    <span aria-hidden="true">&times;</span>
                </button>
            </div>
        `;
        // Prepend to the body so it's noticeable
        $('body').prepend(errorHtml);
    }

    // FR1: Load product data from FakeStore API
    function fetchProducts() {
        $.getJSON('https://fakestoreapi.com/products')
            .done(function (products) {
                allProducts = products; // Store all products
                currentProducts = allProducts; // Initially, all products are current
                renderProducts(currentProducts);
                fetchCategories(); // Fetch categories after products are loaded
            })
            .fail(function (jqXHR, textStatus, errorThrown) {
                // NFR3: Gracefully handle network errors
                console.error("Failed to fetch products:", textStatus, errorThrown);
                displayErrorMessage("Could not load products from the server. Please check your internet connection and try again later.");
                $('#product-grid').html('<p class="text-danger text-center">Failed to load products.</p>'); // Update grid
            });
    }

    // FR2: Display product cards
    function renderProducts(products) {
        const $productGrid = $('#product-grid');
        $productGrid.empty(); // Clear existing products or loading message

        if (!products || products.length === 0) {
            $productGrid.html('<p class="text-center">No products available at the moment.</p>');
            return;
        }

        products.forEach(product => {
            const productCard = `
                <div class="col-lg-4 col-md-6 mb-4">
                    <div class="card h-100">
                        <img src="${product.image}" class="card-img-top" alt="${product.title}">
                        <div class="card-body d-flex flex-column">
                            <h5 class="card-title">${product.title}</h5>
                            <p class="card-text mt-auto font-weight-bold">$${product.price.toFixed(2)}</p>
                            <button class="btn btn-primary add-to-cart mt-2"
                                    data-id="${product.id}"
                                    data-name="${product.title}"
                                    data-price="${product.price.toFixed(2)}">
                                Add to Cart
                            </button>
                        </div>
                    </div>
                </div>
            `;
            $productGrid.append(productCard);
        });
    }

    // FR3: Add selected product to cart
    $(document).on('click', '.add-to-cart', function () {
        const productId = $(this).data('id');
        const productName = $(this).data('name');
        const productPrice = parseFloat($(this).data('price'));

        const existingItem = cart.find(item => item.id === productId);

        if (existingItem) {
            existingItem.quantity++;
        } else {
            cart.push({
                id: productId,
                name: productName,
                price: productPrice,
                quantity: 1
            });
        }
        // NFR4: Cart data stored only in memory (achieved by using the `cart` array)
        renderCart();
    });

    // FR4 & FR6: Display cart contents and allow removing/updating quantity
    function renderCart() {
        const $cartItems = $('#cart-items');
        const $cartEmptyMessage = $('#cart-empty-message');

        $cartItems.empty(); // Clear previous items, but not the empty message

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
                    </div>
                `;
                $cartItems.append(cartItemHtml);
            });
        }
        calculateTotals();
    }

    // Handle quantity change in cart
    $(document).on('change', '.cart-item-quantity', function () {
        const itemIndex = $(this).data('index');
        const newQuantity = parseInt($(this).val());

        if (newQuantity > 0) {
            cart[itemIndex].quantity = newQuantity;
        } else {
            // If quantity is set to 0 or less, remove the item
            cart.splice(itemIndex, 1);
        }
        renderCart();
    });

    // Handle removing item from cart
    $(document).on('click', '.remove-from-cart', function () {
        const itemIndex = $(this).data('index');
        cart.splice(itemIndex, 1);
        renderCart();
    });

    // FR5: Calculate and display subtotal, tax, and total
    function calculateTotals() {
        let subtotal = 0;
        cart.forEach(item => {
            subtotal += item.price * item.quantity;
        });

        const tax = subtotal * taxRate;
        const total = subtotal + tax;

        $('#subtotal').text(`$${subtotal.toFixed(2)}`);
        $('#tax').text(`$${tax.toFixed(2)}`);
        $('#total').text(`$${total.toFixed(2)}`);
    }

    // FR7: Simulate checkout
    $('#checkout-button').on('click', function () {
        if (cart.length === 0) {
            alert("Your cart is empty. Add some products before checking out.");
            return;
        }
        // Simulate successful checkout
        alert("Checkout successful! Thank you for your purchase.\nYour cart will now be cleared.");

        cart = []; // Clear the cart
        renderCart(); // Re-render cart (will show empty message and zero totals)
    });

    // Initial setup
    fetchProducts(); // Load products when the page is ready
    renderCart(); // Initialize cart display (empty at first)

    function fetchCategories() {
        $.getJSON('https://fakestoreapi.com/products/categories')
            .done(function (categories) {
                renderCategoryFilters(categories);
            })
            .fail(function (jqXHR, textStatus, errorThrown) {
                console.error("Failed to fetch categories:", textStatus, errorThrown);
                // Optionally display an error message for categories
                $('#category-filters').html('<p class="text-danger">Could not load categories.</p>');
            });
    }

    function renderCategoryFilters(categories) {
        const $categoryFilters = $('#category-filters');
        $categoryFilters.empty();

        // Add "All Categories" button
        const allButton = `<button class="btn btn-outline-secondary active category-filter-btn m-1" data-category="all">All Categories</button>`;
        $categoryFilters.append(allButton);

        categories.forEach(category => {
            const categoryButton = `<button class="btn btn-outline-secondary category-filter-btn m-1" data-category="${category}">${category}</button>`;
            $categoryFilters.append(categoryButton);
        });
    }

    $(document).on('click', '.category-filter-btn', function () {
        selectedCategory = $(this).data('category');

        // Update active state for buttons
        $('.category-filter-btn').removeClass('active');
        $(this).addClass('active');

        applyFilters();
    });

    function applyFilters() {
        // Start with all products
        let filteredProducts = allProducts;

        // Apply category filter
        if (selectedCategory !== 'all') {
            filteredProducts = filteredProducts.filter(product => product.category === selectedCategory);
        }

        // Apply search filter (if searchTerm is not empty)
        if (searchTerm) {
            const lowerSearchTerm = searchTerm.toLowerCase();
            filteredProducts = filteredProducts.filter(product =>
                product.title.toLowerCase().includes(lowerSearchTerm) ||
                product.description.toLowerCase().includes(lowerSearchTerm)
            );
        }

        currentProducts = filteredProducts;
        renderProducts(currentProducts);

        if (currentProducts.length === 0) {
            $('#product-grid').html('<p class="text-center text-muted mt-4">No products match your filters.</p>');
        }
    }

    // Event listener for search input
    $('#search-input').on('keyup', function () {
        searchTerm = $(this).val();
        applyFilters();
    });

    // --- Toast Notification Function ---
    function showToast(message, type = 'info') {
        const toastId = 'toast-' + new Date().getTime();
        let toastHeaderClass = 'bg-info text-white'; // Default
        let toastIcon = '<i class="fas fa-info-circle mr-2"></i>'; // Font Awesome icon (add FA link if not present)

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
                toastHeaderClass = 'bg-warning text-dark'; // Dark text for warning bg
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
                <div class="toast-body">
                    ${message}
                </div>
            </div>
        `;

        $('#toast-container').append(toastHtml);
        $('#' + toastId).toast('show');

        // Remove the toast from DOM after it's hidden
        $('#' + toastId).on('hidden.bs.toast', function () {
            $(this).remove();
        });
    }

    // --- localStorage Cart Functions ---
    const CART_STORAGE_KEY = 'posCart';

    function saveCartToLocalStorage() {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    }

    function loadCartFromLocalStorage() {
        const storedCart = localStorage.getItem(CART_STORAGE_KEY);
        if (storedCart) {
            cart = JSON.parse(storedCart);
            renderCart(); // This will also call calculateTotals
        }
    }

    function clearCartFromLocalStorage() {
        localStorage.removeItem(CART_STORAGE_KEY);
    }

    // --- Integrate Toasts & localStorage ---
    // Add to cart
    $(document).on('click', '.add-to-cart', function () {
        const productId = $(this).data('id');
        const productName = $(this).data('name');
        const productPrice = parseFloat($(this).data('price'));

        const existingItem = cart.find(item => item.id === productId);

        if (existingItem) {
            existingItem.quantity++;
        } else {
            cart.push({
                id: productId,
                name: productName,
                price: productPrice,
                quantity: 1
            });
        }
        saveCartToLocalStorage(); // Save cart after modification
        showToast(`"${productName}" added to cart.`, 'success'); // Toast notification
        renderCart();
    });

    // Handle quantity change in cart
    $(document).on('change', '.cart-item-quantity', function () {
        const itemIndex = $(this).data('index');
        const newQuantity = parseInt($(this).val());

        if (newQuantity > 0) {
            cart[itemIndex].quantity = newQuantity;
        } else {
            // If quantity is set to 0 or less, remove the item
            cart.splice(itemIndex, 1);
        }
        saveCartToLocalStorage(); // Save cart after modification
        renderCart();
    });

    // Handle removing item from cart
    $(document).on('click', '.remove-from-cart', function () {
        const itemIndex = $(this).data('index');
        cart.splice(itemIndex, 1);
        saveCartToLocalStorage(); // Save cart after modification
        renderCart();
    });

    // Checkout
    $('#checkout-button').on('click', function () {
        if (cart.length === 0) {
            showToast("Your cart is empty. Add some products before checking out.", 'warning');
            return;
        }
        showToast("Checkout successful! Thank you.", 'success');

        cart = []; // Clear the in-memory cart
        saveCartToLocalStorage(); // Save empty cart to localStorage (effectively clearing it)
        // Or clearCartFromLocalStorage(); // Alternative: explicitly remove the key
        renderCart(); // Re-render cart (will show empty message and zero totals)
    });

    // Initial setup
    loadCartFromLocalStorage(); // Load cart from localStorage when page loads
    renderCart(); // Always render cart on load (empty or populated)
    fetchProducts(); // Load products when the page is ready
});
