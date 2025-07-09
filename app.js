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
            let actionButtonsHtml = '';

            if (stock > 0) {
                actionButtonsHtml = `
                    <input type="number" class="form-control form-control-sm product-quantity-input mr-2" value="1" min="1" max="${stock}" style="width: 60px;" data-product-id="${product.id}">
                    <button class="btn btn-primary btn-sm add-to-cart flex-grow-1 mr-1" data-id="${product.id}" data-name="${product.title}" data-price="${product.price.toFixed(2)}">
                        Add
                    </button>
                    <button class="btn btn-outline-secondary btn-sm view-details flex-grow-1" data-id="${product.id}">Details</button>`;
            } else {
                actionButtonsHtml = `
                    <input type="number" class="form-control form-control-sm product-quantity-input mr-2" value="1" min="1" disabled style="width: 60px;" data-product-id="${product.id}">
                    <button class="btn btn-secondary btn-sm add-to-cart flex-grow-1 mr-1" data-id="${product.id}" data-name="${product.title}" data-price="${product.price.toFixed(2)}" disabled>
                        Add
                    </button>
                    <button class="btn btn-outline-secondary btn-sm view-details flex-grow-1" data-id="${product.id}">Details</button>`;
            }

            const productCard = `
                <div class="col-12 col-md-6 col-lg-4 mb-4"> {/* Added col-12 for explicit stacking on XS */}
                    <div class="card h-100 ${outOfStockClass}">
                        <img src="${product.image}" class="card-img-top" alt="${product.title}">
                        <div class="card-body d-flex flex-column">
                            <h5 class="card-title">${product.title}</h5>
                            <p class="card-text mt-auto font-weight-bold">$${product.price.toFixed(2)}</p>
                            <div class="mt-2"> <!-- Container for stock and action buttons -->
                                <p class="mb-1 stock-display">
                                    ${stock > 0 ? `<i class="fas fa-check-circle text-success mr-1"></i><span class="text-success">In Stock: ${stock}</span>` : `<i class="fas fa-ban text-danger mr-1"></i><span class="text-danger">Out of Stock</span>`}
                                </p>
                                <div class="d-flex mt-1 align-items-center">
                                    ${actionButtonsHtml}
                                </div>
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
    function updateCartItemCountBadge() {
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        $('#cart-item-count-badge').text(totalItems);
    }

    function renderCart() {
        // Target both sidebar and modal elements
        const $cartItemsTargets = $('#cart-items-sidebar, #cart-items-modal');
        const $cartEmptyMessageTargets = $('#cart-empty-message-sidebar, #cart-empty-message-modal');

        $cartItemsTargets.empty(); // Clear previous items

        if (cart.length === 0) {
            $cartEmptyMessageTargets.show();
        } else {
            $cartEmptyMessageTargets.hide();
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
                // Append to both sidebar and modal item lists
                // Note: This means remove buttons and quantity inputs will have duplicate dynamic behavior
                // if not handled carefully by event delegation (which we are using, so it should be okay).
                $cartItemsTargets.append(cartItemHtml);
            });
        }
        calculateTotals();
        updateCartItemCountBadge(); // Update badge
    }

    function calculateTotals() {
        let subtotal = 0;
        cart.forEach(item => { subtotal += item.price * item.quantity; });
        const tax = subtotal * taxRate;
        const total = subtotal + tax;

        // Update totals in both sidebar and modal
        $('#subtotal-sidebar, #subtotal-modal').text(`$${subtotal.toFixed(2)}`);
        $('#tax-sidebar, #tax-modal').text(`$${tax.toFixed(2)}`);
        $('#total-sidebar, #total-modal').text(`$${total.toFixed(2)}`);
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
        const $button = $(this);
        const productId = parseInt($button.data('id'));
        const productName = $button.data('name');
        const productPrice = parseFloat($button.data('price'));

        // Find the quantity input associated with this button
        // It's the preceding sibling input with class .product-quantity-input
        const $quantityInput = $button.closest('.d-flex').find('.product-quantity-input');
        let quantityToAdd = parseInt($quantityInput.val());

        if (isNaN(quantityToAdd) || quantityToAdd <= 0) {
            showToast("Please enter a valid quantity.", 'warning');
            $quantityInput.val(1); // Reset to 1
            return;
        }

        const productInCatalog = allProducts.find(p => p.id === productId);

        if (!productInCatalog) {
            showToast("Error: Product not found.", 'error');
            return;
        }

        if (productInCatalog.inventory < quantityToAdd) {
            showToast(`Only ${productInCatalog.inventory} of "${productName}" in stock. Cannot add ${quantityToAdd}.`, 'warning');
            $quantityInput.val(productInCatalog.inventory > 0 ? productInCatalog.inventory : 1); // Adjust to max available or 1
             if(productInCatalog.inventory === 0) $quantityInput.prop('disabled', true);
            return;
        }

        // Decrement inventory by quantityToAdd
        productInCatalog.inventory -= quantityToAdd;
        saveProductsToLocalStorage(); // Save updated inventory

        // Add to cart or update quantity
        const existingCartItem = cart.find(item => item.id === productId);
        if (existingCartItem) {
            existingCartItem.quantity += quantityToAdd;
        } else {
            cart.push({ id: productId, name: productName, price: productPrice, quantity: quantityToAdd });
        }

        saveCartToLocalStorage();
        showToast(`${quantityToAdd} unit(s) of "${productName}" added to cart.`, 'success');
        renderCart();

        // Re-render products to update stock display, button state, and max value of quantity input
        renderProducts(currentProducts);
        // $quantityInput.val(1); // Reset quantity input on card to 1 after adding - optional UX choice
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

    // Combined event handlers for sidebar and modal cart actions
    $(document).on('click', '#checkout-button-sidebar, #checkout-button-modal', function () {
        const isModalCheckout = $(this).attr('id') === 'checkout-button-modal';

        if (cart.length === 0) {
            showToast("Your cart is empty.", 'warning');
            return;
        }

        // 1. Gather Data
        const currentSubtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const currentTaxAmount = currentSubtotal * taxRate;
        const currentGrandTotal = currentSubtotal + currentTaxAmount;

        const totalsForInvoice = {
            subtotal: currentSubtotal,
            taxAmount: currentTaxAmount,
            grandTotal: currentGrandTotal
        };

        // 2. Generate Invoice HTML
        const invoiceHtml = generateInvoiceHtml([...cart], totalsForInvoice, taxRate); // Pass a copy of cart

        // 3. Open and Print Invoice
        const invoiceWindow = window.open('', '_blank', 'width=800,height=600');
        if (invoiceWindow) {
            invoiceWindow.document.write(invoiceHtml);
            invoiceWindow.document.close(); // Important for some browsers to finish loading

            // Delay print slightly to ensure content is rendered in the new window
            setTimeout(() => {
                invoiceWindow.print();
                // Optional: Close window after print dialog is handled.
                // Behavior varies across browsers (e.g., Chrome might close before printing is done by user)
                // invoiceWindow.onafterprint = function(){ invoiceWindow.close(); };
            }, 500); // 500ms delay, adjust if needed
        } else {
            showToast("Could not open invoice window. Please check your popup blocker.", 'warning');
        }

        // 4. Proceed with existing checkout actions
        showToast("Checkout successful! Thank you.", 'success');
        cart = [];
        saveCartToLocalStorage();
        renderCart();
        // Inventory was already adjusted when items were added/modified in cart.
        // No further inventory changes needed here for this client-side simulation.

        if (isModalCheckout) {
            $('#cartModal').modal('hide');
        }
    });

    $(document).on('click', '#clear-cart-button-sidebar, #clear-cart-button-modal', function () {
        const isModalClear = $(this).attr('id') === 'clear-cart-button-modal';

        if (cart.length === 0) {
            showToast("Cart is already empty.", 'info');
            return;
        }

        if (confirm("Are you sure you want to clear all items from your cart?")) {
            // Return stock for all items in cart
            cart.forEach(cartItem => {
                const productInCatalog = allProducts.find(p => p.id === cartItem.id);
                if (productInCatalog) {
                    productInCatalog.inventory += cartItem.quantity;
                }
            });
            saveProductsToLocalStorage(); // Save updated inventory

            cart = []; // Clear the in-memory cart
            saveCartToLocalStorage(); // Update localStorage for cart

            showToast("Cart cleared.", 'info');
            renderCart(); // Update cart UI
            renderProducts(currentProducts); // Update product grid (stock display, button states)

            if (isModalClear && cart.length === 0) { // Also hide modal if cleared from modal and now empty
                // Or simply always hide if cleared from modal:
                // $('#cartModal').modal('hide');
            }
        }
    });

    // --- Initial Setup ---
    loadCartFromLocalStorage();
    renderCart();
    fetchProducts(); // This will load from localStorage if available, or fetch from API and init inventory

    // --- Invoice Generation ---
    function generateInvoiceHtml(cartDetails, totals, taxRate) {
        const transactionDate = new Date();
        let itemsHtml = '';
        cartDetails.forEach(item => {
            itemsHtml += `
                <tr>
                    <td>${item.name}</td>
                    <td style="text-align:right;">${item.quantity}</td>
                    <td style="text-align:right;">$${item.price.toFixed(2)}</td>
                    <td style="text-align:right;">$${(item.price * item.quantity).toFixed(2)}</td>
                </tr>
            `;
        });

        const invoiceHtml = `
            <html>
            <head>
                <title>Invoice / Receipt</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
                    .invoice-container { width: 100%; max-width: 800px; margin: auto; padding: 20px; border: 1px solid #eee; }
                    h1, h2, h3 { text-align: center; color: #333; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background-color: #f2f2f2; }
                    .totals { float: right; width: 300px; margin-top: 20px; }
                    .totals table { width: 100%; }
                    .totals th, .totals td { border: none; padding: 5px; }
                    .totals th { text-align: left; }
                    .totals td { text-align: right; }
                    .footer { text-align: center; margin-top: 30px; font-size: 0.9em; color: #777; }
                    .item-details { margin-bottom: 30px; }
                    .store-name { font-size: 2em; font-weight: bold; margin-bottom:0; }
                    .receipt-title { font-size: 1.5em; margin-top:0; margin-bottom: 20px; }
                    .date-time { text-align:center; margin-bottom:20px; font-size: 0.9em; }
                    @media print {
                        body { margin: 0; color: #000; background-color: #fff; }
                        .invoice-container { border: none; box-shadow: none; padding: 0; }
                        .no-print { display: none !important; }
                        /* Additional print-specific styles if needed */
                    }
                </style>
            </head>
            <body>
                <div class="invoice-container">
                    <h1 class="store-name">Awesome POS Store</h1>
                    <h2 class="receipt-title">RECEIPT</h2>
                    <div class="date-time">
                        Date: ${transactionDate.toLocaleDateString()}<br>
                        Time: ${transactionDate.toLocaleTimeString()}
                    </div>

                    <div class="item-details">
                        <h3>Order Details</h3>
                        <table>
                            <thead>
                                <tr>
                                    <th>Item</th>
                                    <th style="text-align:right;">Qty</th>
                                    <th style="text-align:right;">Unit Price</th>
                                    <th style="text-align:right;">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${itemsHtml}
                            </tbody>
                        </table>
                    </div>

                    <div class="totals">
                        <table>
                            <tr>
                                <th>Subtotal:</th>
                                <td>$${totals.subtotal.toFixed(2)}</td>
                            </tr>
                            <tr>
                                <th>Tax (${(taxRate * 100).toFixed(0)}%):</th>
                                <td>$${totals.taxAmount.toFixed(2)}</td>
                            </tr>
                            <tr>
                                <th style="font-weight:bold; font-size: 1.1em;">Grand Total:</th>
                                <td style="font-weight:bold; font-size: 1.1em;">$${totals.grandTotal.toFixed(2)}</td>
                            </tr>
                        </table>
                    </div>
                    <div style="clear:both;"></div>
                    <div class="footer">
                        Thank you for your purchase!
                    </div>
                </div>
            </body>
            </html>
        `;
        return invoiceHtml;
    }

    // --- Item Detail Modal Logic ---
    $(document).on('click', '.view-details', function () {
        const productId = parseInt($(this).data('id'));
        const product = allProducts.find(p => p.id === productId);

        if (product) {
            $('#modalProductName').text(product.title);
            $('#modalProductImage').attr('src', product.image).attr('alt', product.title);
            $('#modalProductCategory').text(product.category);
            $('#modalProductPrice').text(`$${product.price.toFixed(2)}`);
            $('#modalProductDescription').text(product.description);

            const stock = product.inventory !== undefined ? product.inventory : 0;
            if (stock > 0) {
                $('#modalProductStock').text(`In Stock: ${stock}`).removeClass('text-danger').addClass('text-success');
                $('#modal-add-to-cart-controls').show();
                $('#modalProductQuantity').attr('max', stock).val(1).prop('disabled', false);
                $('#modalAddToCartButton').data('id', product.id)
                                          .data('name', product.title)
                                          .data('price', product.price.toFixed(2))
                                          .prop('disabled', false)
                                          .text('Add to Cart');
            } else {
                $('#modalProductStock').text('Out of Stock').removeClass('text-success').addClass('text-danger');
                $('#modal-add-to-cart-controls').show(); // Show controls but disable them
                $('#modalProductQuantity').val(1).prop('disabled', true);
                $('#modalAddToCartButton').prop('disabled', true).text('Out of Stock');
            }

            $('#productDetailModal').modal('show');
        } else {
            showToast("Could not load product details.", 'error');
        }
    });

    // Handle "Add to Cart" from modal
    $('#modalAddToCartButton').on('click', function() {
        const productId = parseInt($(this).data('id'));
        const productName = $(this).data('name');
        const productPrice = parseFloat($(this).data('price'));
        let quantityToAdd = parseInt($('#modalProductQuantity').val());

        if (isNaN(quantityToAdd) || quantityToAdd <= 0) {
            showToast("Please enter a valid quantity.", 'warning');
            $('#modalProductQuantity').val(1); // Reset to 1
            return;
        }

        const productInCatalog = allProducts.find(p => p.id === productId);
        if (!productInCatalog) {
            showToast("Error: Product not found.", 'error');
            return;
        }

        if (productInCatalog.inventory < quantityToAdd) {
            showToast(`Only ${productInCatalog.inventory} of "${productName}" in stock. Cannot add ${quantityToAdd}.`, 'warning');
            $('#modalProductQuantity').val(productInCatalog.inventory > 0 ? productInCatalog.inventory : 1);
            return;
        }

        productInCatalog.inventory -= quantityToAdd;
        saveProductsToLocalStorage();

        const existingCartItem = cart.find(item => item.id === productId);
        if (existingCartItem) {
            existingCartItem.quantity += quantityToAdd;
        } else {
            cart.push({ id: productId, name: productName, price: productPrice, quantity: quantityToAdd });
        }

        saveCartToLocalStorage();
        showToast(`${quantityToAdd} unit(s) of "${productName}" added to cart.`, 'success');
        renderCart();
        renderProducts(currentProducts); // Re-render product grid to reflect stock changes

        $('#productDetailModal').modal('hide'); // Hide modal after adding
    });
});
