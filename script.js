// script.js

// Replace this with your actual Gmail address
const MY_EMAIL_ADDRESS = "dantimberlake62@gmail.com";

// --- CART LOGIC ---
let cart = JSON.parse(localStorage.getItem('sprinterCart')) || [];

function saveCart() {
    localStorage.setItem('sprinterCart', JSON.stringify(cart));
    updateCartCount();
}

function updateCartCount() {
    const countElements = document.querySelectorAll('#cartCount');
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    countElements.forEach(el => el.textContent = totalItems);
}

// Global functions for inline HTML onclick handlers
window.changeQty = function(index, delta) {
    cart[index].quantity += delta;
    if (cart[index].quantity <= 0) {
        cart.splice(index, 1);
    }
    saveCart();
    renderCart();
};

window.removeItem = function(index) {
    cart.splice(index, 1);
    saveCart();
    renderCart();
};

function renderCart() {
    const cartDisplay = document.getElementById('cartDisplay');
    const checkoutFormContainer = document.getElementById('checkoutFormContainer');
    
    if (!cartDisplay) return; // Not on the order page
    
    if (cart.length === 0) {
        cartDisplay.innerHTML = '<p style="text-align:center; padding: 20px;">Your cart is empty. <a href="catalog.html" style="color:var(--accent-color); text-decoration:underline; font-weight:bold;">Browse parts</a>.</p>';
        if (checkoutFormContainer) checkoutFormContainer.style.display = 'none';
        return;
    }

    if (checkoutFormContainer) checkoutFormContainer.style.display = 'block';
    
    let html = '<h3 style="margin-bottom: 15px; color: var(--accent-color);">Cart Items</h3>';
    let total = 0;

    cart.forEach((item, index) => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        html += `
            <div class="cart-item">
                <div class="cart-item-info">
                    <strong>${item.name}</strong><br>
                    <span style="color: #666;">$${item.price.toFixed(2)} each</span>
                </div>
                <div class="cart-item-qty">
                    <button type="button" class="qty-btn" onclick="changeQty(${index}, -1)">-</button>
                    <span style="font-weight:bold; width: 20px; text-align:center;">${item.quantity}</span>
                    <button type="button" class="qty-btn" onclick="changeQty(${index}, 1)">+</button>
                </div>
                <div class="cart-item-price">$${itemTotal.toFixed(2)}</div>
                <div class="cart-item-remove">
                    <button type="button" class="remove-btn" onclick="removeItem(${index})">Remove</button>
                </div>
            </div>
        `;
    });

    html += `<div class="cart-total">Total: $${total.toFixed(2)}</div>`;
    cartDisplay.innerHTML = html;
}

document.addEventListener('DOMContentLoaded', () => {
    
    // Initialize Cart Count
    updateCartCount();
    
    // Render Cart if on Order Page
    renderCart();

    // Add to Cart Buttons
    document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const name = e.target.getAttribute('data-name');
            const price = parseFloat(e.target.getAttribute('data-price'));
            
            const existingItem = cart.find(item => item.name === name);
            if (existingItem) {
                existingItem.quantity += 1;
            } else {
                cart.push({ name, price, quantity: 1 });
            }
            saveCart();
            
            // Visual feedback
            const originalText = e.target.textContent;
            e.target.textContent = "Added!";
            e.target.style.backgroundColor = "#28a745"; // Success green
            e.target.style.color = "white";
            setTimeout(() => {
                e.target.textContent = originalText;
                e.target.style.backgroundColor = ""; // Reset to default
                e.target.style.color = "";
            }, 1500);
        });
    });

    // Handle Order Form Submission
    const orderForm = document.getElementById('orderForm');
    if (orderForm) {
        orderForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            if (cart.length === 0) {
                alert("Your cart is empty!");
                return;
            }

            const fullName = document.getElementById('fullName').value;
            const email = document.getElementById('email').value;
            const phone = document.getElementById('phone').value;
            const address = document.getElementById('address').value;
            const notes = document.getElementById('notes').value;
            
            let orderItemsText = '';
            let grandTotal = 0;
            
            cart.forEach(item => {
                const itemTotal = item.price * item.quantity;
                grandTotal += itemTotal;
                orderItemsText += `- ${item.quantity}x ${item.name} ($${item.price.toFixed(2)} each) = $${itemTotal.toFixed(2)}\n`;
            });
            orderItemsText += `\nGRAND TOTAL: $${grandTotal.toFixed(2)}\n`;
            
            const subject = encodeURIComponent(`New Order from ${fullName}`);
            const body = encodeURIComponent(
                `Order Details:\n\n` +
                `Full Name: ${fullName}\n` +
                `Email: ${email}\n` +
                `Phone: ${phone}\n\n` +
                `ITEMS ORDERED:\n${orderItemsText}\n` +
                `Delivery Address:\n${address}\n\n` +
                `Additional Notes:\n${notes}`
            );
            
            window.location.href = `mailto:${MY_EMAIL_ADDRESS}?subject=${subject}&body=${body}`;
            
            // Optional: Clear cart after opening mail client
            if(confirm("Order email generated! Would you like to clear your cart now?")) {
                cart = [];
                saveCart();
                renderCart();
                orderForm.reset();
            }
        });
    }

    // Handle Contact Form Submission
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const name = document.getElementById('name').value;
            const email = document.getElementById('email').value;
            const message = document.getElementById('message').value;
            
            const subject = encodeURIComponent(`Contact Inquiry from ${name}`);
            const body = encodeURIComponent(
                `Contact Details:\n\n` +
                `Name: ${name}\n` +
                `Email: ${email}\n\n` +
                `Message:\n${message}`
            );
            
            window.location.href = `mailto:${MY_EMAIL_ADDRESS}?subject=${subject}&body=${body}`;
        });
    }
});
