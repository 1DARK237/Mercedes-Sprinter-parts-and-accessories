import { auth, db } from './firebase.js';
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from 'firebase/auth';
import { collection, onSnapshot, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';

const loginSection = document.getElementById('loginSection');
const dashboardSection = document.getElementById('dashboardSection');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const loginError = document.getElementById('loginError');
const partsList = document.getElementById('partsList');

const partModal = document.getElementById('partModal');
const addPartBtn = document.getElementById('addPartBtn');
const cancelBtn = document.getElementById('cancelBtn');
const partForm = document.getElementById('partForm');
const imageInput = document.getElementById('partImage');
const imagePreview = document.getElementById('imagePreview');
const partImageUrl = document.getElementById('partImageUrl');
const partCurrency = document.getElementById('partCurrency');
const formError = document.getElementById('formError');
const modalTitle = document.getElementById('modalTitle');

const tabParts = document.getElementById('tabParts');
const tabOrders = document.getElementById('tabOrders');
const partsView = document.getElementById('partsView');
const ordersView = document.getElementById('ordersView');
const ordersList = document.getElementById('ordersList');

let currentParts = [];
let currentOrders = [];
let unsubscribeParts = null;
let unsubscribeOrders = null;

// --- ERROR HANDLING ---
function handleFirestoreError(error, operationType, path) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// --- AUTHENTICATION ---
const provider = new GoogleAuthProvider();

loginBtn.addEventListener('click', async () => {
    try {
        loginError.textContent = '';
        await signInWithPopup(auth, provider);
    } catch (error) {
        console.error("Login error:", error);
        loginError.textContent = "Failed to sign in. " + error.message;
    }
});

logoutBtn.addEventListener('click', async () => {
    await signOut(auth);
});

onAuthStateChanged(auth, (user) => {
    if (user) {
        // Check if user is the authorized admin
        if (user.email === 'durellnji23@gmail.com' && user.emailVerified) {
            loginSection.classList.add('hidden');
            dashboardSection.classList.remove('hidden');
            logoutBtn.classList.remove('hidden');
            loadParts();
            loadOrders();
        } else {
            loginError.textContent = "Access denied. You are not an authorized admin.";
            signOut(auth);
        }
    } else {
        loginSection.classList.remove('hidden');
        dashboardSection.classList.add('hidden');
        logoutBtn.classList.add('hidden');
        if (unsubscribeParts) {
            unsubscribeParts();
            unsubscribeParts = null;
        }
        if (unsubscribeOrders) {
            unsubscribeOrders();
            unsubscribeOrders = null;
        }
    }
});

// --- TABS LOGIC ---
tabParts.addEventListener('click', () => {
    tabParts.classList.add('active');
    tabOrders.classList.remove('active');
    partsView.classList.remove('hidden');
    ordersView.classList.add('hidden');
});

tabOrders.addEventListener('click', () => {
    tabOrders.classList.add('active');
    tabParts.classList.remove('active');
    ordersView.classList.remove('hidden');
    partsView.classList.add('hidden');
});

// --- LOAD PARTS ---
function loadParts() {
    const partsRef = collection(db, 'parts');
    unsubscribeParts = onSnapshot(partsRef, (snapshot) => {
        currentParts = [];
        partsList.innerHTML = '';
        
        if (snapshot.empty) {
            partsList.innerHTML = '<p>No parts found. Add one above.</p>';
            return;
        }

        snapshot.forEach((doc) => {
            const part = { id: doc.id, ...doc.data() };
            currentParts.push(part);
            
            const currencySymbol = part.currency === 'GBP' ? '£' : part.currency === 'EUR' ? '€' : '$';
            const row = document.createElement('div');
            row.className = 'part-row';
            row.innerHTML = `
                <div class="part-info">
                    <img src="${part.imageUrl}" alt="${part.name}">
                    <div>
                        <strong>${part.name}</strong><br>
                        <span style="color: #666;">${currencySymbol}${part.price.toFixed(2)} | ${part.category} ${part.featured ? '| ★ Featured' : ''}</span>
                    </div>
                </div>
                <div class="part-actions">
                    <button class="btn edit-btn" data-id="${part.id}" style="background: var(--accent-color); padding: 5px 10px;">Edit</button>
                    <button class="btn delete-btn" data-id="${part.id}" style="background: #ff4d4d; padding: 5px 10px;">Delete</button>
                </div>
            `;
            partsList.appendChild(row);
        });

        // Attach event listeners to buttons
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => openEditModal(e.target.dataset.id));
        });
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => deletePart(e.target.dataset.id));
        });
    }, (error) => {
        console.error("Error fetching parts:", error);
        partsList.innerHTML = `<p style="color:red;">Error loading parts: ${error.message}</p>`;
        if (error.message && error.message.includes('permission')) {
            handleFirestoreError(error, 'get', 'parts');
        }
    });
}

// --- LOAD ORDERS ---
function loadOrders() {
    const ordersRef = collection(db, 'orders');
    unsubscribeOrders = onSnapshot(ordersRef, (snapshot) => {
        currentOrders = [];
        let html = '';
        
        // Sort orders by date descending
        const docs = [];
        snapshot.forEach(doc => docs.push({ id: doc.id, ...doc.data() }));
        docs.sort((a, b) => b.createdAt - a.createdAt);
        
        docs.forEach((order) => {
            currentOrders.push(order);
            const date = new Date(order.createdAt).toLocaleString();
            
            let itemsHtml = '';
            order.items.forEach(item => {
                const currencySymbol = item.currency === 'GBP' ? '£' : item.currency === 'EUR' ? '€' : '$';
                itemsHtml += `
                    <div class="order-item">
                        <span>${item.quantity}x ${item.name}</span>
                        <span>${currencySymbol}${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                `;
            });
            
            html += `
                <div class="order-card">
                    <div class="order-header">
                        <div>
                            <h3 style="margin-bottom: 5px;">Order #${order.id.slice(0, 8)}</h3>
                            <p style="color: #666; font-size: 0.85rem;">${date}</p>
                        </div>
                        <div>
                            <span class="order-status status-${order.status}">${order.status.toUpperCase()}</span>
                        </div>
                    </div>
                    <div style="margin-bottom: 10px;">
                        <strong>Customer:</strong> ${order.fullName} (${order.email})<br>
                        <strong>Phone:</strong> ${order.phone}<br>
                        <strong>Address:</strong> ${order.address}
                    </div>
                    <div class="order-items">
                        ${itemsHtml}
                        <div style="border-top: 1px solid #ddd; margin-top: 5px; padding-top: 5px; text-align: right; font-weight: bold;">
                            Total: ${order.items.length > 0 ? (order.items[0].currency === 'GBP' ? '£' : order.items[0].currency === 'EUR' ? '€' : '$') : '$'}${order.totalAmount.toFixed(2)}
                        </div>
                    </div>
                    ${order.notes ? `<p><strong>Notes:</strong> ${order.notes}</p>` : ''}
                    <div style="margin-top: 15px; text-align: right;">
                        ${order.status === 'placed' ? 
                            `<button class="btn" onclick="markOrderSent('${order.id}')" style="padding: 5px 10px; font-size: 0.9rem;">Mark as Sent</button>` : 
                            `<button class="btn" disabled style="padding: 5px 10px; font-size: 0.9rem; background: #ccc;">Already Sent</button>`
                        }
                    </div>
                </div>
            `;
        });
        
        ordersList.innerHTML = html || '<p>No orders found.</p>';
    }, (error) => {
        console.error("Error fetching orders:", error);
        ordersList.innerHTML = `<p style="color:red;">Error loading orders: ${error.message}</p>`;
        if (error.message && error.message.includes('permission')) {
            handleFirestoreError(error, 'get', 'orders');
        }
    });
}

window.markOrderSent = async function(id) {
    if (!confirm("Are you sure you want to mark this order as sent?")) return;
    try {
        await updateDoc(doc(db, 'orders', id), {
            status: 'sent'
        });
    } catch (error) {
        console.error("Error updating order:", error);
        alert("Error updating order: " + error.message);
        if (error.message && error.message.includes('permission')) {
            handleFirestoreError(error, 'update', `orders/${id}`);
        }
    }
};

// --- IMAGE HANDLING (Resize & Base64) ---
imageInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(event) {
        const img = new Image();
        img.onload = function() {
            // Resize image to max 800px width/height to save space
            const canvas = document.createElement('canvas');
            const MAX_SIZE = 800;
            let width = img.width;
            let height = img.height;
            
            if (width > height) {
                if (width > MAX_SIZE) {
                    height *= MAX_SIZE / width;
                    width = MAX_SIZE;
                }
            } else {
                if (height > MAX_SIZE) {
                    width *= MAX_SIZE / height;
                    height = MAX_SIZE;
                }
            }
            
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            
            // Compress to JPEG
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            
            // Check size (Firestore limit is 1MB, we aim for < 800KB)
            if (dataUrl.length > 800000) {
                formError.textContent = "Image is too large even after compression. Please choose a smaller image.";
                imageInput.value = '';
                return;
            }
            
            partImageUrl.value = dataUrl;
            imagePreview.src = dataUrl;
            imagePreview.style.display = 'block';
            formError.textContent = '';
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
});

// --- MODAL HANDLING ---
addPartBtn.addEventListener('click', () => {
    partForm.reset();
    document.getElementById('partId').value = '';
    partImageUrl.value = '';
    partCurrency.value = 'USD';
    imagePreview.style.display = 'none';
    imagePreview.src = '';
    formError.textContent = '';
    modalTitle.textContent = 'Add New Part';
    // Make image required for new parts
    imageInput.required = true;
    partModal.classList.remove('hidden');
});

cancelBtn.addEventListener('click', () => {
    partModal.classList.add('hidden');
});

function openEditModal(id) {
    const part = currentParts.find(p => p.id === id);
    if (!part) return;
    
    document.getElementById('partId').value = part.id;
    document.getElementById('partName').value = part.name;
    document.getElementById('partDesc').value = part.description;
    document.getElementById('partPrice').value = part.price;
    partCurrency.value = part.currency || 'USD';
    document.getElementById('partCategory').value = part.category;
    document.getElementById('partFeatured').checked = part.featured || false;
    
    partImageUrl.value = part.imageUrl;
    imagePreview.src = part.imageUrl;
    imagePreview.style.display = 'block';
    
    // Image not required when editing
    imageInput.required = false;
    
    formError.textContent = '';
    modalTitle.textContent = 'Edit Part';
    partModal.classList.remove('hidden');
}

// --- SAVE PART ---
partForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    formError.textContent = '';
    
    const id = document.getElementById('partId').value;
    const name = document.getElementById('partName').value.trim();
    const description = document.getElementById('partDesc').value.trim();
    const price = parseFloat(document.getElementById('partPrice').value);
    const currency = partCurrency.value;
    const category = document.getElementById('partCategory').value;
    const featured = document.getElementById('partFeatured').checked;
    const imageUrl = partImageUrl.value;
    
    if (!imageUrl) {
        formError.textContent = "Please upload an image.";
        return;
    }
    
    const partData = {
        name,
        description,
        price,
        currency,
        category,
        featured,
        imageUrl
    };
    
    try {
        const submitBtn = partForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving...';
        
        if (id) {
            // Update existing
            const docRef = doc(db, 'parts', id);
            // We don't update createdAt
            await updateDoc(docRef, partData);
        } else {
            // Create new
            partData.createdAt = Date.now();
            const newDocRef = doc(collection(db, 'parts'));
            await setDoc(newDocRef, partData);
        }
        
        partModal.classList.add('hidden');
    } catch (error) {
        console.error("Error saving part:", error);
        formError.textContent = "Error saving part: " + error.message;
        if (error.message && error.message.includes('permission')) {
            handleFirestoreError(error, id ? 'update' : 'create', 'parts');
        }
    } finally {
        const submitBtn = partForm.querySelector('button[type="submit"]');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Save Part';
    }
});

// --- DELETE PART ---
async function deletePart(id) {
    if (!confirm("Are you sure you want to delete this part? This cannot be undone.")) return;
    
    try {
        await deleteDoc(doc(db, 'parts', id));
    } catch (error) {
        console.error("Error deleting part:", error);
        alert("Error deleting part: " + error.message);
        if (error.message && error.message.includes('permission')) {
            handleFirestoreError(error, 'delete', `parts/${id}`);
        }
    }
}
