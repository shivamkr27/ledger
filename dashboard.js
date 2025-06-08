// Constants
const API_URL = 'http://localhost:5000/api';
const ITEM_TYPES = ['Cement', 'Sand', 'Steel Rod'];

// DOM Elements
const sidebarBtns = document.querySelectorAll('.sidebar-btn');
const sections = document.querySelectorAll('.section');
const logoutBtn = document.getElementById('logout-btn');
const orderDate = document.getElementById('order-date');
const addOrderBtn = document.getElementById('add-order-btn');
const addRateBtn = document.getElementById('add-rate-btn');
const addInventoryBtn = document.getElementById('add-inventory-btn');
const orderModal = document.getElementById('order-modal');
const rateModal = document.getElementById('rate-modal');
const inventoryModal = document.getElementById('inventory-modal');
const closeBtns = document.querySelectorAll('.close-btn');
const orderForm = document.getElementById('order-form');
const rateForm = document.getElementById('rate-form');
const inventoryForm = document.getElementById('inventory-form');
const ordersTable = document.getElementById('orders-table')?.querySelector('tbody');
const ratesTable = document.getElementById('rates-table')?.querySelector('tbody');
const inventoryTable = document.getElementById('inventory-table')?.querySelector('tbody');

// State
let currentOrderId = null;
let currentRateId = null;
let currentInventoryId = null;
let rates = [];
let inventory = [];

// Authentication
async function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'index.html';
        return;
    }

    try {
        const response = await fetch(`${API_URL}/auth/verify`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                localStorage.removeItem('token');
                window.location.href = 'index.html';
            } else {
                throw new Error('Failed to verify token');
            }
            return;
        }

        // Continue with loading data
        await loadOrders();
        await loadRates();
        await loadInventory();
    } catch (error) {
        console.error('Auth error:', error);
        // Only redirect on actual auth errors
        if (error.message === 'Failed to verify token') {
            localStorage.removeItem('token');
            window.location.href = 'index.html';
        }
    }
}

// Helper function to get cookie value
function getCookie(name) {
    try {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return null;
    } catch (error) {
        console.error('Error getting cookie:', error);
        return null;
    }
}

// Section Switching
function switchSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });

    // Show selected section
    document.getElementById(`${sectionId}-section`).classList.add('active');

    // Update sidebar buttons
    document.querySelectorAll('.sidebar-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-section="${sectionId}"]`).classList.add('active');

    // Load section data
    switch (sectionId) {
        case 'orders':
            loadOrders();
            break;
        case 'rate':
            loadRates();
            break;
        case 'inventory':
            loadInventory();
            break;
    }
}

// Orders Section
async function loadOrders() {
    try {
        if (!isAuthenticated()) {
            window.location.href = 'index.html';
            return;
        }

        const dateInput = document.getElementById('order-date');
        const selectedDate = dateInput.value ? new Date(dateInput.value) : new Date();

        // Set time to start of day
        selectedDate.setHours(0, 0, 0, 0);
        const nextDay = new Date(selectedDate);
        nextDay.setDate(nextDay.getDate() + 1);

        console.log('Loading orders for date:', selectedDate.toISOString());

        const response = await fetch(`${API_URL}/orders?startDate=${selectedDate.toISOString()}&endDate=${nextDay.toISOString()}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load orders');
        }

        const orders = await response.json();
        console.log('Loaded orders:', orders);

        const tbody = document.querySelector('#orders-table tbody');
        tbody.innerHTML = '';

        if (orders.length === 0) {
            const tr = document.createElement('tr');
            tr.innerHTML = '<td colspan="13" class="no-data">No orders found for this date</td>';
            tbody.appendChild(tr);
            return;
        }

        orders.forEach(order => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${order.orderId}</td>
                <td>${order.customerName}</td>
                <td>${order.customerNumber}</td>
                <td>${order.item}</td>
                <td>${order.type}</td>
                <td>${order.quantity}</td>
                <td>₹${order.rate.toFixed(2)}</td>
                <td>₹${order.totalAmount.toFixed(2)}</td>
                <td>₹${order.paidAmount.toFixed(2)}</td>
                <td>₹${order.dueAmount.toFixed(2)}</td>
                <td>${order.deliveryStatus}</td>
                <td>${new Date(order.deliveryDateTime).toLocaleString()}</td>
                <td>
                    <button class="edit-btn" data-id="${order._id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="delete-btn" data-id="${order._id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        // Add event listeners for edit and delete buttons
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', () => handleEditOrder(btn.dataset.id));
        });

        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', () => handleDeleteOrder(btn.dataset.id));
        });

    } catch (error) {
        console.error('Error loading orders:', error);
        alert('Error loading orders. Please try again.');
    }
}

// Rates Section
async function loadRates() {
    try {
        const response = await fetch(`${API_URL}/rates`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        if (!Array.isArray(data)) {
            console.error('Invalid rates data:', data);
            throw new Error('Invalid rates data received from server');
        }

        rates = data;
        displayRates(data);
    } catch (error) {
        console.error('Error loading rates:', error);
        if (ratesTable) {
            ratesTable.innerHTML = `
                <tr>
                    <td colspan="4" class="error-message">
                        Failed to load rates: ${error.message}
                    </td>
                </tr>
            `;
        }
    }
}

function displayRates(rates) {
    if (!ratesTable) return;

    ratesTable.innerHTML = '';
    if (!rates || rates.length === 0) {
        ratesTable.innerHTML = `
            <tr>
                <td colspan="4" class="no-data">No rates found</td>
            </tr>
        `;
        return;
    }

    rates.forEach(rate => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${rate.item || ''}</td>
            <td>${rate.type || ''}</td>
            <td>${rate.rate || 0}</td>
            <td>
                <button onclick="editRate('${rate._id}')" class="edit-btn">Edit</button>
                <button onclick="deleteRate('${rate._id}')" class="delete-btn">Delete</button>
            </td>
        `;
        ratesTable.appendChild(row);
    });
}

// Inventory Section
async function loadInventory() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            console.error('No authentication token found');
            return;
        }

        console.log('Loading inventory items...');
        const response = await fetch(`${API_URL}/inventory`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                alert('Session expired. Please log in again.');
                window.location.href = 'index.html';
                return;
            }
            const error = await response.json();
            throw new Error(error.message || 'Failed to fetch inventory');
        }

        const inventory = await response.json();
        console.log('Loaded inventory:', inventory);

        if (!inventoryTable) {
            console.error('Inventory table not found');
            return;
        }

        inventoryTable.innerHTML = '';

        if (!Array.isArray(inventory) || inventory.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="7" class="no-data">No inventory items found</td>';
            inventoryTable.appendChild(row);
            return;
        }

        inventory.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.itemName}</td>
                <td>${item.category}</td>
                <td>${item.quantity}</td>
                <td>₹${item.unitPrice.toFixed(2)}</td>
                <td>${item.threshold}</td>
                <td><span class="status ${item.status.toLowerCase().replace(' ', '-')}">${item.status}</span></td>
                <td>
                    <button class="edit-btn" data-id="${item._id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="delete-btn" data-id="${item._id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            inventoryTable.appendChild(row);
        });

        // Add event listeners for edit and delete buttons
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', () => handleEditInventory(btn.dataset.id));
        });

        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', () => handleDeleteInventory(btn.dataset.id));
        });
    } catch (error) {
        console.error('Error loading inventory:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack
        });
        if (inventoryTable) {
            inventoryTable.innerHTML = `
                <tr>
                    <td colspan="7" class="error-message">
                        Error loading inventory. Please try again.
                    </td>
                </tr>
            `;
        }
    }
}

// Modal functions
function showModal(modal) {
    if (!modal) return;
    modal.style.display = 'flex';
    modal.classList.add('active');
}

function hideModal(modal) {
    if (!modal) return;
    modal.style.display = 'none';
    modal.classList.remove('active');
    if (modal.querySelector('form')) {
        modal.querySelector('form').reset();
    }
}

// Authentication check
function isAuthenticated() {
    const token = localStorage.getItem('token');
    return !!token;
}

// Handle order form submission
async function handleOrderSubmit(event) {
    event.preventDefault();

    if (!isAuthenticated()) {
        alert('Your session has expired. Please login again.');
        window.location.href = 'index.html';
        return;
    }

    const form = event.target;
    const formData = {
        customerName: form.customerName.value.trim(),
        customerNumber: form.customerNumber.value.trim(),
        item: form.item.value.trim(),
        type: form.type.value.trim(),
        quantity: Number(form.quantity.value),
        paidAmount: Number(form.paidAmount.value),
        deliveryStatus: form.deliveryStatus.value,
        deliveryDateTime: form.deliveryDateTime.value
    };

    // Validate required fields
    if (!formData.customerName || !formData.customerNumber || !formData.item ||
        !formData.type || isNaN(formData.quantity) || isNaN(formData.paidAmount) ||
        !formData.deliveryStatus || !formData.deliveryDateTime) {
        alert('Please fill in all fields with valid values');
        return;
    }

    // Validate numeric fields
    if (formData.quantity <= 0 || formData.paidAmount < 0) {
        alert('Quantity must be greater than 0 and paid amount must be non-negative');
        return;
    }

    try {
        console.log('Submitting order:', formData);
        const response = await fetch(`${API_URL}/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Server error response:', data);
            if (data.errors && Array.isArray(data.errors)) {
                throw new Error(data.errors.join('\n'));
            }
            throw new Error(data.message || 'Failed to save order');
        }

        console.log('Order saved successfully:', data);

        // Close modal and refresh orders
        hideModal(orderModal);
        form.reset();
        await loadOrders();

        // Show success message
        alert('Order saved successfully!');
    } catch (error) {
        console.error('Error saving order:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack
        });
        alert(`Error saving order: ${error.message}`);
    }
}

// Handle rate form submission
async function handleRateSubmit(event) {
    event.preventDefault();

    if (!isAuthenticated()) {
        alert('Your session has expired. Please login again.');
        window.location.href = 'index.html';
        return;
    }

    const form = event.target;
    const formData = {
        item: form.item.value.trim(),
        type: form.type.value.trim(),
        rate: parseFloat(form.rate.value)
    };

    // Validate required fields
    if (!formData.item || !formData.type || isNaN(formData.rate)) {
        alert('Please fill in all fields with valid values');
        return;
    }

    // Validate rate is non-negative
    if (formData.rate < 0) {
        alert('Rate must be a non-negative number');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/rates`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(formData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to save rate');
        }

        const data = await response.json();
        console.log('Rate saved successfully:', data);

        // Close modal and refresh rates
        hideModal(rateModal);
        form.reset();
        await loadRates();

        // Show success message
        alert('Rate saved successfully!');
    } catch (error) {
        console.error('Error saving rate:', error);
        alert(`Error saving rate: ${error.message}`);
    }
}

// Handle inventory form submission
async function handleInventorySubmit(e) {
    e.preventDefault();
    console.log('Handling inventory submit...');

    const token = localStorage.getItem('token');
    if (!token) {
        alert('Please log in to continue');
        window.location.href = 'index.html';
        return;
    }

    try {
        const formData = new FormData(e.target);
        const inventoryData = {
            itemName: formData.get('itemName'),
            category: formData.get('category'),
            quantity: parseFloat(formData.get('quantity')),
            unitPrice: parseFloat(formData.get('unitPrice')),
            threshold: parseFloat(formData.get('threshold'))
        };

        // Validate data before sending
        if (!inventoryData.itemName || !inventoryData.category) {
            throw new Error('Item name and category are required');
        }

        if (isNaN(inventoryData.quantity) || isNaN(inventoryData.unitPrice) || isNaN(inventoryData.threshold)) {
            throw new Error('Quantity, unit price, and threshold must be valid numbers');
        }

        if (inventoryData.quantity < 0 || inventoryData.unitPrice < 0 || inventoryData.threshold < 0) {
            throw new Error('Quantity, unit price, and threshold must be non-negative numbers');
        }

        console.log('Submitting inventory data:', inventoryData);

        const response = await fetch(`${API_URL}/inventory`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(inventoryData)
        });

        const data = await response.json();
        console.log('Server response:', data);

        if (!response.ok) {
            if (response.status === 401) {
                alert('Session expired. Please log in again.');
                window.location.href = 'index.html';
                return;
            }

            // Handle validation errors
            if (response.status === 400) {
                if (data.errors) {
                    throw new Error(data.errors.join('\n'));
                }
                throw new Error(data.message || 'Validation error');
            }

            // Handle server errors
            throw new Error(data.error || data.message || 'Failed to save inventory');
        }

        console.log('Inventory saved successfully:', data);

        // Hide modal and refresh inventory list
        hideModal(inventoryModal);
        await loadInventory();

        // Show success message
        if (data.quantity > inventoryData.quantity) {
            alert(`Inventory updated successfully! Total quantity is now ${data.quantity}`);
        } else {
            alert('Inventory item added successfully!');
        }
    } catch (error) {
        console.error('Error saving inventory:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack
        });

        // Show error message to user
        if (error.message.includes('\n')) {
            // If there are multiple error messages, show them in a more readable format
            alert('Please fix the following errors:\n\n' + error.message);
        } else {
            alert(error.message || 'Error saving inventory. Please try again.');
        }
    }
}

// CRUD Operations
async function editOrder(orderId) {
    try {
        const response = await fetch(`${API_URL}/orders/${orderId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        const order = await response.json();

        // Populate form
        orderForm.elements.customerName.value = order.customerName;
        orderForm.elements.customerNumber.value = order.customerNumber;
        orderForm.elements.item.value = order.item;
        orderForm.elements.type.value = order.type;
        orderForm.elements.quantity.value = order.quantity;
        orderForm.elements.paidAmount.value = order.paidAmount;
        orderForm.elements.deliveryStatus.value = order.deliveryStatus;
        orderForm.elements.deliveryDateTime.value = order.deliveryDateTime;

        currentOrderId = orderId;
        showModal(orderModal);
    } catch (error) {
        console.error('Error loading order:', error);
        alert('Failed to load order details');
    }
}

async function deleteOrder(orderId) {
    if (!confirm('Are you sure you want to delete this order?')) return;

    try {
        const response = await fetch(`${API_URL}/orders/${orderId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) throw new Error('Failed to delete order');

        loadOrders();
    } catch (error) {
        console.error('Error deleting order:', error);
        alert('Failed to delete order');
    }
}

async function editRate(rateId) {
    try {
        const response = await fetch(`${API_URL}/rates/${rateId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        const rate = await response.json();

        // Populate form
        rateForm.elements.item.value = rate.item;
        rateForm.elements.type.value = rate.type;
        rateForm.elements.rate.value = rate.rate;

        currentRateId = rateId;
        showModal(rateModal);
    } catch (error) {
        console.error('Error loading rate:', error);
        alert('Failed to load rate details');
    }
}

async function deleteRate(rateId) {
    if (!confirm('Are you sure you want to delete this rate?')) return;

    try {
        const response = await fetch(`${API_URL}/rates/${rateId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) throw new Error('Failed to delete rate');

        loadRates();
    } catch (error) {
        console.error('Error deleting rate:', error);
        alert('Failed to delete rate');
    }
}

async function editInventory(inventoryId) {
    try {
        const response = await fetch(`${API_URL}/inventory/${inventoryId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch inventory item');
        }

        const item = await response.json();
        currentInventoryId = inventoryId;

        // Fill the form with item data
        inventoryForm.itemName.value = item.itemName;
        inventoryForm.category.value = item.category;
        inventoryForm.quantity.value = item.quantity;
        inventoryForm.unitPrice.value = item.unitPrice;
        inventoryForm.threshold.value = item.threshold;

        showModal(inventoryModal);
    } catch (error) {
        console.error('Error editing inventory:', error);
        alert('Failed to edit inventory item');
    }
}

async function deleteInventory(inventoryId) {
    if (!confirm('Are you sure you want to delete this inventory item?')) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/inventory/${inventoryId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to delete inventory item');
        }

        await loadInventory();
    } catch (error) {
        console.error('Error deleting inventory:', error);
        alert('Failed to delete inventory item');
    }
}

// Event Listeners
function initializeEventListeners() {
    console.log('Initializing event listeners...');

    // Sidebar button clicks
    if (sidebarBtns.length > 0) {
        sidebarBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const section = btn.getAttribute('data-section');
                switchSection(section);
            });
        });
        console.log('Sidebar buttons initialized');
    }

    // Logout button
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('token');
            window.location.href = 'index.html';
        });
        console.log('Logout button initialized');
    }

    // Close buttons for modals
    if (closeBtns.length > 0) {
        closeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const modal = btn.closest('.modal');
                hideModal(modal);
            });
        });
        console.log('Close buttons initialized');
    }

    // Add Order button
    if (addOrderBtn && orderModal) {
        addOrderBtn.addEventListener('click', () => {
            console.log('Add Order button clicked');
            currentOrderId = null;
            if (orderForm) orderForm.reset();
            showModal(orderModal);
        });
        console.log('Add Order button initialized');
    }

    // Add Rate button
    if (addRateBtn && rateModal) {
        addRateBtn.addEventListener('click', () => {
            console.log('Add Rate button clicked');
            currentRateId = null;
            if (rateForm) rateForm.reset();
            showModal(rateModal);
        });
        console.log('Add Rate button initialized');
    }

    // Add Inventory button
    if (addInventoryBtn && inventoryModal) {
        addInventoryBtn.addEventListener('click', () => {
            console.log('Add Inventory button clicked');
            currentInventoryId = null;
            if (inventoryForm) inventoryForm.reset();
            showModal(inventoryModal);
        });
        console.log('Add Inventory button initialized');
    }

    // Form submissions
    if (orderForm) {
        orderForm.addEventListener('submit', handleOrderSubmit);
        console.log('Order form initialized');
    }
    if (rateForm) {
        rateForm.addEventListener('submit', handleRateSubmit);
        console.log('Rate form initialized');
    }
    if (inventoryForm) {
        inventoryForm.addEventListener('submit', handleInventorySubmit);
        console.log('Inventory form initialized');
    }

    // Close modals when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            hideModal(e.target);
        }
    });

    console.log('All event listeners initialized');
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded');

    // Initialize event listeners
    initializeEventListeners();

    // Check authentication
    checkAuth();

    // Debug logging
    console.log('DOM Elements Status:');
    console.log('Add Order Button:', addOrderBtn);
    console.log('Add Rate Button:', addRateBtn);
    console.log('Add Inventory Button:', addInventoryBtn);
    console.log('Order Modal:', orderModal);
    console.log('Rate Modal:', rateModal);
    console.log('Inventory Modal:', inventoryModal);
    console.log('Order Form:', orderForm);
    console.log('Rate Form:', rateForm);
    console.log('Inventory Form:', inventoryForm);

    // Initialize date filter
    initializeDateFilter();
    loadOrders();
});

// Initialize date filter
function initializeDateFilter() {
    const dateInput = document.getElementById('order-date');
    if (dateInput) {
        // Set default date to today
        const today = new Date().toISOString().split('T')[0];
        dateInput.value = today;

        // Add event listener for date changes
        dateInput.addEventListener('change', () => {
            loadOrders();
        });
    }
}

// Add CSS for error and no-data messages
const style = document.createElement('style');
style.textContent = `
    .error-message {
        color: #dc3545;
        text-align: center;
        padding: 1rem;
    }
    .no-data {
        color: #6c757d;
        text-align: center;
        padding: 1rem;
    }
`;
document.head.appendChild(style);