$(document).ready(function () {
    // Global cart variable (in-memory storage)
    let cart = [];
    const taxRate = 0.10; // 10% tax rate

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
                renderProducts(products);
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
                        <div class="cart-item-details"> {/* Added this wrapper */}
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
});
