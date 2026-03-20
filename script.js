// script.js
import { db } from './firebase.js';
import { collection, onSnapshot, query, where, addDoc } from 'firebase/firestore';

// Replace this with your actual Gmail address
const MY_EMAIL_ADDRESS = "myemail@gmail.com";

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

window.addToCart = function(name, price, currency, btnElement) {
    const existingItem = cart.find(item => item.name === name);
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({ name, price: parseFloat(price), currency: currency || 'USD', quantity: 1 });
    }
    saveCart();
    
    // Visual feedback
    const originalText = btnElement.textContent;
    btnElement.textContent = "Added!";
    btnElement.style.backgroundColor = "#28a745"; // Success green
    btnElement.style.color = "white";
    setTimeout(() => {
        btnElement.textContent = originalText;
        btnElement.style.backgroundColor = ""; // Reset to default
        btnElement.style.color = "";
    }, 1500);
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
        const currencySymbol = item.currency === 'GBP' ? '£' : item.currency === 'EUR' ? '€' : '$';
        html += `
            <div class="cart-item">
                <div class="cart-item-info">
                    <strong>${item.name}</strong><br>
                    <span style="color: #666;">${currencySymbol}${item.price.toFixed(2)} each</span>
                </div>
                <div class="cart-item-qty">
                    <button type="button" class="qty-btn" onclick="changeQty(${index}, -1)">-</button>
                    <span style="font-weight:bold; width: 20px; text-align:center;">${item.quantity}</span>
                    <button type="button" class="qty-btn" onclick="changeQty(${index}, 1)">+</button>
                </div>
                <div class="cart-item-price">${currencySymbol}${itemTotal.toFixed(2)}</div>
                <div class="cart-item-remove">
                    <button type="button" class="remove-btn" onclick="removeItem(${index})">Remove</button>
                </div>
            </div>
        `;
    });

    const totalCurrency = cart.length > 0 ? (cart[0].currency === 'GBP' ? '£' : cart[0].currency === 'EUR' ? '€' : '$') : '$';
    html += `<div class="cart-total">Total: ${totalCurrency}${total.toFixed(2)}</div>`;
    cartDisplay.innerHTML = html;
}

// --- FIRESTORE DATA FETCHING ---
function loadPartsFromFirestore() {
    const featuredGrid = document.getElementById('featuredPartsGrid');
    const catalogGrid = document.getElementById('catalogPartsGrid');
    
    if (!featuredGrid && !catalogGrid) return; // Not on a page that needs parts

    const partsRef = collection(db, 'parts');
    
    onSnapshot(partsRef, (snapshot) => {
        let featuredHtml = '';
        let catalogHtml = '';
        
        // Get category filter from URL if on catalog page
        const urlParams = new URLSearchParams(window.location.search);
        const categoryFilter = urlParams.get('category');
        
        let partsFound = false;

        snapshot.forEach((doc) => {
            const part = doc.data();
            const currencySymbol = part.currency === 'GBP' ? '£' : part.currency === 'EUR' ? '€' : '$';
            const partHtml = `
                <div class="card">
                    <img src="${part.imageUrl}" alt="${part.name}">
                    <h3>${part.name}</h3>
                    <p>${part.description}</p>
                    <div class="price">${currencySymbol}${part.price.toFixed(2)}</div>
                    <button class="btn add-to-cart-btn" onclick="addToCart('${part.name.replace(/'/g, "\\'")}', ${part.price}, '${part.currency || 'USD'}', this)">Add to Cart</button>
                </div>
            `;
            
            // For Home Page (Featured Parts)
            if (featuredGrid && part.featured) {
                featuredHtml += partHtml;
            }
            
            // For Catalog Page
            if (catalogGrid) {
                if (!categoryFilter || part.category === categoryFilter || part.category === 'general') {
                    catalogHtml += partHtml;
                    partsFound = true;
                }
            }
        });
        
        if (featuredGrid) {
            featuredGrid.innerHTML = featuredHtml || '<p style="grid-column: 1/-1; text-align: center;">No featured parts available.</p>';
        }
        
        if (catalogGrid) {
            catalogGrid.innerHTML = catalogHtml || '<p style="grid-column: 1/-1; text-align: center;">No parts found in this category.</p>';
        }
    }, (error) => {
        console.error("Error loading parts:", error);
        if (featuredGrid) featuredGrid.innerHTML = '<p style="color:red;">Error loading parts.</p>';
        if (catalogGrid) catalogGrid.innerHTML = '<p style="color:red;">Error loading parts.</p>';
        
        if (error.message && error.message.includes('permission')) {
            const errInfo = {
                error: error.message,
                authInfo: { userId: null, email: null, emailVerified: false, isAnonymous: true, tenantId: null, providerInfo: [] },
                operationType: 'get',
                path: 'parts'
            };
            console.error('Firestore Error: ', JSON.stringify(errInfo));
            throw new Error(JSON.stringify(errInfo));
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    
    // Initialize Cart Count
    updateCartCount();
    
    // Render Cart if on Order Page
    renderCart();
    
    // Load dynamic parts from Firestore
    loadPartsFromFirestore();

    // Handle Order Form Submission
    const orderForm = document.getElementById('orderForm');
    if (orderForm) {
        orderForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            if (cart.length === 0) {
                alert("Your cart is empty!");
                return;
            }

            const submitBtn = orderForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Processing...';

            const fullName = document.getElementById('fullName').value;
            const email = document.getElementById('email').value;
            const phone = document.getElementById('phone').value;
            const address = document.getElementById('address').value;
            const notes = document.getElementById('notes').value;
            
            let orderItemsText = '';
            let grandTotal = 0;
            
            const orderItems = [];

            cart.forEach(item => {
                const itemTotal = item.price * item.quantity;
                grandTotal += itemTotal;
                const currencySymbol = item.currency === 'GBP' ? '£' : item.currency === 'EUR' ? '€' : '$';
                orderItemsText += `- ${item.quantity}x ${item.name} (${currencySymbol}${item.price.toFixed(2)} each) = ${currencySymbol}${itemTotal.toFixed(2)}\n`;
                
                orderItems.push({
                    name: item.name,
                    price: item.price,
                    currency: item.currency || 'USD',
                    quantity: item.quantity
                });
            });
            const totalCurrency = cart.length > 0 ? (cart[0].currency === 'GBP' ? '£' : cart[0].currency === 'EUR' ? '€' : '$') : '$';
            orderItemsText += `\nGRAND TOTAL: ${totalCurrency}${grandTotal.toFixed(2)}\n`;
            
            try {
                // Save to Firestore
                await addDoc(collection(db, 'orders'), {
                    fullName,
                    email,
                    phone,
                    address,
                    notes: notes || "",
                    items: orderItems,
                    totalAmount: grandTotal,
                    status: 'placed',
                    createdAt: Date.now()
                });

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
                
                // Clear cart
                alert("Order placed successfully! An email draft has been opened.");
                cart = [];
                saveCart();
                renderCart();
                orderForm.reset();
            } catch (error) {
                console.error("Error placing order:", error);
                alert("There was an error placing your order. Please try again.");
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Place Order';
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
