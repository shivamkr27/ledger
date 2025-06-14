// Constants
const API_BASE_URL = 'http://localhost:5000/api';

// Utility functions
function normalizeString(str) {
    return str ? str.trim().toLowerCase() : '';
}

function compareStrings(a, b) {
    return normalizeString(a) === normalizeString(b);
}

function normalizeRateData(rate) {
    return {
        itemName: normalizeString(rate.itemName || rate.item),
        category: normalizeString(rate.category || rate.type),
        rate: rate.rate || 0
    };
}

function normalizeInventoryData(item) {
    return {
        itemName: normalizeString(item.itemName || item.item),
        category: normalizeString(item.category || item.type),
        quantity: item.quantity || 0,
        unitPrice: item.unitPrice || item.rate || 0
    };
}

function normalizeOrderData(order) {
    return {
        item: normalizeString(order.item),
        type: normalizeString(order.type),
        quantity: order.quantity || 0,
        rate: order.rate || 0
    };
}
//const ITEM_TYPES = ['Cement', 'Sand', 'Steel Rod'];

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

// Ledger Section
const ledgerSection = document.getElementById('ledger-section');
const customerSelect = document.getElementById('customer-select');
const ledgerTable = document.getElementById('ledger-table');
const ledgerModal = document.getElementById('ledger-modal');
const ledgerForm = document.getElementById('ledger-form');
const addLedgerBtn = document.getElementById('add-ledger-btn');

// Wholesaler Section
const wholesalerSection = document.getElementById('wholesaler-section');
const wholesalerTable = document.getElementById('wholesaler-table')?.querySelector('tbody');
const wholesalerModal = document.getElementById('wholesaler-modal');
const wholesalerForm = document.getElementById('wholesaler-form');
const addWholesalerBtn = document.getElementById('add-wholesaler-btn');

// Staff Section
const staffSection = document.getElementById('staff-section');
const staffTable = document.getElementById('staff-table')?.querySelector('tbody');
const staffModal = document.getElementById('staff-modal');
const staffForm = document.getElementById('staff-form');
const addStaffBtn = document.getElementById('add-staff-btn');

// Find Section
const findSection = document.getElementById('find-section');
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const searchResults = document.getElementById('search-results');

// State
let currentOrderId = null;
let currentRateId = null;
let currentInventoryId = null;
let rates = [];
let inventory = [];

// Debug logging for script loading
console.log('Dashboard script loaded');

// Authentication
async function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'index.html';
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/auth/verify`, {
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
        case 'wholesaler':
            loadWholesalerTransactions();
            break;
        case 'staff':
            loadStaff();
            break;
        case 'ledger':
            loadLedgers();
            break;
    }
}

// Utility functions
function showNotification(message, type = 'success') {
    console.log('Showing notification:', message, type);
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

function showModal(modalId) {
    console.log('Attempting to show modal:', modalId);
    const modal = document.getElementById(modalId);
    if (!modal) {
        console.error('Modal not found:', modalId);
        return;
    }
    console.log('Modal found:', modal);
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function hideModal(modalId) {
    console.log('Attempting to hide modal:', modalId);
    const modal = document.getElementById(modalId);
    if (!modal) {
        console.error('Modal not found:', modalId);
        return;
    }
    console.log('Modal found:', modal);
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
    // Reset form if exists
    const form = modal.querySelector('form');
    if (form) {
        form.reset();
        if (modalId === 'rate-modal') {
            currentRateId = null; // Reset current rate ID when closing modal
        }
    }
}

// API request function
async function makeApiRequest(endpoint, options = {}) {
    try {
        // Get token from localStorage
        const token = localStorage.getItem('token');
        
        if (!token) {
            throw new Error('No authentication token found. Please login.');
        }

        // Set default options
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        };

        // Merge options
        const mergedOptions = {
            ...defaultOptions,
            ...options
        };

        // Make the request
        let response = await fetch(`${API_BASE_URL}${endpoint}`, mergedOptions);

        // Handle errors
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            
            // Handle specific error cases
            if (response.status === 401) {
                try {
                    // Try to refresh token
                    const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        }
                    });

                    if (!refreshResponse.ok) {
                        throw new Error('Failed to refresh token');
                    }

                    const refreshData = await refreshResponse.json();
                    localStorage.setItem('token', refreshData.token);
                    
                    // Retry the original request with new token
                    response = await fetch(`${API_BASE_URL}${endpoint}`, mergedOptions);
                    
                    if (!response.ok) {
                        throw new Error('Request failed after token refresh');
                    }
                    
                    return response;
                } catch (refreshError) {
                    console.error('Token refresh failed:', refreshError);
                    throw new Error('Session expired. Please login again.');
                }
            } else {
                throw new Error(errorData.message || `Request failed with status: ${response.status}`);
            }
        }

        return response;
    } catch (error) {
        console.error('API request failed:', error);
        // Show notification with specific error message
        let errorMessage = error.message;
        if (error.message.includes('401')) {
            errorMessage = 'Session expired. Please login again.';
        } else if (error.message.includes('403')) {
            errorMessage = 'Access denied. Please contact administrator.';
        }
        
        showNotification(errorMessage || 'Request failed', 'error');
        throw error;
    }
}

// Load orders with proper error handling and field mapping
async function loadOrders() {
    try {
        console.log('Loading orders...');
        
        // Try to load orders
        let response;
        try {
            response = await makeApiRequest('/orders');
        } catch (error) {
            if (error.message === 'Session expired. Please login again.') {
                // Try to refresh token
                const { getToken, isTokenExpired } = await import('../utils/token.js');
                const currentToken = getToken();
                
                if (currentToken && !isTokenExpired()) {
                    try {
                        // Try to refresh the token
                        const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${currentToken}`
                            }
                        });

                        if (!refreshResponse.ok) {
                            throw new Error('Failed to refresh token');
                        }

                        const refreshData = await refreshResponse.json();
                        const { setToken } = await import('../utils/token.js');
                        setToken(refreshData.token);
                        
                        // Try the request again with new token
                        response = await makeApiRequest('/orders');
                    } catch (refreshError) {
                        console.error('Token refresh failed:', refreshError);
                        throw error; // Re-throw original error
                    }
                } else {
                    throw error; // Re-throw original error
                }
            } else {
                throw error; // Re-throw other errors
            }
        }

        if (!response.ok) {
            throw new Error(`Failed to load orders: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log('Raw orders data:', data);

        // Ensure we have an array of orders
        const orders = Array.isArray(data) ? data : [];

        const ordersTable = document.getElementById('orders-table');
        if (!ordersTable) {
            console.error('Orders table not found');
            return;
        }

        // Clear existing rows except header
        const tbody = ordersTable.querySelector('tbody');
        if (tbody) {
            tbody.innerHTML = '';
        }

        if (orders.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="13" class="text-center">No orders found</td>';
            tbody.appendChild(row);
            return;
        }

        // Add orders to table
        orders.forEach(order => {
            try {
                console.log('Processing order:', order);
                const totalAmount = order.quantity * order.rate;
                const dueAmount = totalAmount - (order.paidAmount || 0);

                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${order._id || 'N/A'}</td>
                    <td>${order.customerName || 'N/A'}</td>
                    <td>${order.customerNumber || 'N/A'}</td>
                    <td>${order.item || 'N/A'}</td>
                    <td>${order.type || 'N/A'}</td>
                    <td>${order.quantity || 0}</td>
                    <td>₹${(order.rate || 0).toFixed(2)}</td>
                    <td>₹${totalAmount.toFixed(2)}</td>
                    <td>₹${(order.paidAmount || 0).toFixed(2)}</td>
                    <td>₹${dueAmount.toFixed(2)}</td>
                    <td>${order.deliveryStatus || 'Pending'}</td>
                    <td>${order.deliveryDateTime ? new Date(order.deliveryDateTime).toLocaleString() : 'N/A'}</td>
                    <td>
                        <button class="edit-btn" onclick="editOrder('${order._id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="delete-btn" onclick="deleteOrder('${order._id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                `;
                tbody.appendChild(row);
            } catch (itemError) {
                console.error('Error processing order item:', itemError);
                console.error('Problematic order:', order);
                const errorRow = document.createElement('tr');
                errorRow.innerHTML = `
                    <td>${order._id || 'N/A'}</td>
                    <td>${order.customerName || 'N/A'}</td>
                    <td>${order.customerNumber || 'N/A'}</td>
                    <td>Error loading items</td>
                    <td>N/A</td>
                    <td>0</td>
                    <td>₹0.00</td>
                    <td>₹0.00</td>
                    <td>₹0.00</td>
                    <td>₹0.00</td>
                    <td>Error</td>
                    <td>N/A</td>
                    <td>
                        <button class="edit-btn" onclick="editOrder('${order._id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="delete-btn" onclick="deleteOrder('${order._id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                `;
                tbody.appendChild(errorRow);
            }
        });
    } catch (error) {
        console.error('Error loading orders:', error);
        showNotification('Error loading orders. Please try again.', 'error');
    }
}

// Rates Section
async function loadRates() {
    try {
        console.log('Loading rates...');
        const response = await makeApiRequest('/rates');

        if (!response.ok) {
            throw new Error(`Failed to load rates: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log('Rates loaded:', data);

        // Ensure we have an array of rates
        const rates = Array.isArray(data) ? data : [];

        const ratesTable = document.getElementById('rates-table');
        if (!ratesTable) {
            console.error('Rates table not found');
            return;
        }

        // Clear existing rows except header
        const tbody = ratesTable.querySelector('tbody');
        if (tbody) {
            tbody.innerHTML = '';
        }

        if (rates.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="4" class="text-center">No rates found</td>';
            tbody.appendChild(row);
            return;
        }

        // Add rates to table
        rates.forEach(rate => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${rate.item || 'N/A'}</td>
                <td>${rate.type || 'N/A'}</td>
                <td>₹${(rate.rate || 0).toFixed(2)}</td>
                <td>
                    <button class="edit-btn" onclick="editRate('${rate._id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="delete-btn" onclick="deleteRate('${rate._id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Error loading rates:', error);
        showNotification('Error loading rates. Please try again.', 'error');
    }
}

// Inventory Section
async function loadInventory() {
    try {
        console.log('Loading inventory...');
        const response = await makeApiRequest('/inventory');
        const data = await response.json();
        console.log('Raw inventory data:', data);

        if (!response.ok) {
            throw new Error(`Failed to load inventory: ${response.status} ${response.statusText}`);
        }

        const inventory = Array.isArray(data) ? data : [];
        const inventoryTable = document.getElementById('inventory-table');
        if (!inventoryTable) {
            console.error('Inventory table not found');
            return;
        }

        const tbody = inventoryTable.querySelector('tbody');
        if (tbody) {
            tbody.innerHTML = '';
        }

        if (inventory.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="8" class="text-center">No inventory items found</td>';
            tbody.appendChild(row);
            return;
        }

        // Add inventory items to table
        inventory.forEach(item => {
            const threshold = item.threshold || 0;
            const status = item.quantity <= threshold ? 'Low' : 'Normal';
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.itemName || item.name || 'Unknown'}</td>
                <td>${item.category || item.type || 'Unknown'}</td>
                <td>${item.quantity || 0}</td>
                <td>₹${(item.unitPrice || item.rate || 0).toFixed(2)}</td>
                <td>${status}</td>
                <td class="status-cell">
                    <span class="status-badge ${status === 'Low' ? 'low-stock' : 'normal-stock'}">
                        Threshold: ${threshold}
                        <br>
                        Status: ${status}
                    </span>
                </td>
                <td>
                    <button class="btn btn-sm btn-primary edit-btn" onclick="editInventory('${item._id}')">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn btn-sm btn-danger delete-btn" onclick="deleteInventory('${item._id}')">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Error loading inventory:', error);
        showNotification('Error loading inventory. Please try again.', 'error');
    }
}

// Authentication check
function isAuthenticated() {
    const token = localStorage.getItem('token');
    return !!token;
}
async function handleOrderSubmit(event) {
    event.preventDefault();
    const orderForm = event.target;
    const formData = new FormData(orderForm);
    const data = {
        customerName: formData.get('customerName')?.trim() || '',
        customerNumber: formData.get('customerNumber')?.trim() || '',
        item: formData.get('item')?.trim() || '',
        type: formData.get('type')?.trim() || '',
        quantity: parseFloat(formData.get('quantity')) || 0,
        paidAmount: parseFloat(formData.get('paidAmount')) || 0,
        deliveryStatus: formData.get('deliveryStatus')?.trim() || 'Pending',
        deliveryDateTime: formData.get('deliveryDateTime') || new Date().toISOString(),
        orderId: Date.now().toString(),
        status: 'Pending',
        paymentStatus: 'Pending',
        orderDate: new Date().toISOString(),
        totalAmount: 0,
        rate: 0
    };

    const requiredFields = ['customerName', 'customerNumber', 'item', 'type', 'quantity', 'paidAmount', 'deliveryDateTime'];
    const missingFields = requiredFields.filter(field => !data[field] || data[field] === '');
    
    if (missingFields.length > 0) {
        showNotification(`Please fill in all required fields: ${missingFields.join(', ')}`, 'error');
        return;
    }

    try {
        // Get rates and inventory
        try {
            // Get rates and inventory
            const [ratesResponse, inventoryResponse] = await Promise.all([
                makeApiRequest('/rates'),
                makeApiRequest('/inventory')
            ]);

            if (!ratesResponse.ok || !inventoryResponse.ok) {
                throw new Error('Failed to fetch rates or inventory data');
            }

            const rates = await ratesResponse.json();
            const inventory = await inventoryResponse.json();

            // Debug logging
            console.log('Order data:', {
                item: data.item,
                type: data.type,
                quantity: data.quantity
            });
            console.log('Inventory items:', inventory.map(item => ({
                itemName: item.itemName,
                category: item.category,
                quantity: item.quantity
            })));

            // Normalize and log incoming data
            const normalizedOrder = normalizeOrderData(data);
            console.log('Normalized order data:', normalizedOrder);

            // Normalize rates data
            const normalizedRates = rates.map(normalizeRateData);
            console.log('Normalized rates:', normalizedRates);

            // Find matching rate
            const rate = normalizedRates.find(r => {
                const match = compareStrings(r.itemName, normalizedOrder.item) &&
                           compareStrings(r.category, normalizedOrder.type);
                
                if (!match) {
                    console.log('Checking rate:', {
                        rateItem: r.itemName,
                        rateType: r.category,
                        orderItem: normalizedOrder.item,
                        orderType: normalizedOrder.type,
                        matches: {
                            item: compareStrings(r.itemName, normalizedOrder.item),
                            type: compareStrings(r.category, normalizedOrder.type)
                        }
                    });
                }
                
                return match;
            });

            if (!rate) {
                console.log('All normalized rates:', normalizedRates);
                throw new Error(`Rate not found for ${normalizedOrder.item} (${normalizedOrder.type})`);
            }

            // Update order data with normalized values
            data.rate = rate.rate;
            data.item = rate.itemName;
            data.type = rate.category;

            // Find inventory
            const itemInventory = inventory.find(item => {
                const match = item.itemName.toLowerCase() === data.item.toLowerCase() &&
                           item.category.toLowerCase() === data.type.toLowerCase();
                if (match) {
                    console.log('Found matching inventory:', item);
                } else {
                    console.log('Checking:', {
                        itemName: item.itemName,
                        category: item.category,
                        matches: {
                            itemName: item.itemName.toLowerCase() === data.item.toLowerCase(),
                            category: item.category.toLowerCase() === data.type.toLowerCase()
                        }
                    });
                }
                return match;
            });

            if (!itemInventory) {
                throw new Error(`Item ${data.item} (${data.type}) not found in inventory`);
            }

            // Prepare order data
            const orderData = {
                customerName: data.customerName,
                customerNumber: data.customerNumber,
                item: data.item,
                type: data.type,
                quantity: Number(data.quantity),
                paidAmount: Number(data.paidAmount),
                deliveryStatus: data.deliveryStatus,
                deliveryDateTime: data.deliveryDateTime,
                orderDate: data.orderDate,
                rate: Number(data.rate),
                orderId: data.orderId,
                status: data.status,
                paymentStatus: data.paymentStatus,
                totalAmount: Number(data.quantity) * Number(data.rate)
            };

            // Submit the order
            const response = await makeApiRequest('/orders', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(orderData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to save order');
            }

            // Update inventory
            const updatedInventory = {
                ...itemInventory,
                quantity: itemInventory.quantity - data.quantity
            };

            await makeApiRequest(`/inventory/${itemInventory._id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updatedInventory)
            });

            const savedOrder = await response.json();
            showNotification('Order saved successfully!', 'success');
            closeModal('order-modal');
            loadOrders();
            loadInventory();
            return;

        } catch (error) {
            console.error('Error creating order:', error);
            showNotification(`Order submission failed: ${error.message}`, 'error');
            return;
        }

        // Calculate total amount
        orderData.totalAmount = orderData.quantity * orderData.rate;

        try {
            try {
                // Submit the order
                const response = await makeApiRequest('/orders', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(orderData)
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Failed to save order');
                }

                const savedOrder = await response.json();
                showNotification('Order saved successfully!', 'success');
                closeModal('order-modal');
                loadOrders();
                loadInventory(); // Refresh inventory display
                
                return;
            } catch (error) {
                console.error('Error creating order:', error);
                showNotification(`Order submission failed: ${error.message}`, 'error');
                return;
            }
        } catch (error) {
            console.error('Error creating order:', error);
            showNotification(`Order submission failed: ${error.message}`, 'error');
        }
    } catch (error) {
        console.error('Error creating order:', error);
        showNotification(`Order submission failed: ${error.message}`, 'error');
    }
}

// Helper function to validate inventory before order submission
async function validateInventoryForOrder(orderData) {
    try {
        // Normalize and log incoming order data
        const normalizedOrder = normalizeOrderData(orderData);
        console.log('Validating inventory for order:', normalizedOrder);

        // Get current inventory
        const inventoryResponse = await makeApiRequest('/inventory');
        const inventory = await inventoryResponse.json();

        // Normalize inventory data
        const normalizedInventory = inventory.map(normalizeInventoryData);
        console.log('Normalized inventory:', normalizedInventory);

        // Find matching inventory item
        const itemInventory = normalizedInventory.find(item => 
            compareStrings(item.itemName, normalizedOrder.item) &&
            compareStrings(item.category, normalizedOrder.type)
        );

        if (!itemInventory) {
            return { isValid: false, message: `Item ${orderData.item} (${orderData.type}) not found in inventory` };
        }

        if (itemInventory.quantity < orderData.quantity) {
            return { 
                isValid: false, 
                message: `Insufficient stock for ${orderData.item} (${orderData.type}). Available: ${itemInventory.quantity}, Required: ${orderData.quantity}`
            };
        }

        return { isValid: true };
    } catch (error) {
        console.error('Error validating inventory:', error);
        return { isValid: false, message: 'Failed to check inventory. Please try again.' };
    }
}

// Handle rate form submission
async function handleRateSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const data = {
        item: formData.get('item').trim(),
        type: formData.get('type').trim(),
        rate: parseFloat(formData.get('rate'))
    };

    // Validate required fields
    if (!data.item || !data.type || isNaN(data.rate)) {
        showNotification('Please fill in all required fields', 'error');
        return;
    }

    try {
        // Check if rate already exists for this item and type
        const response = await makeApiRequest('/rates');
        if (!response.ok) {
            throw new Error('Failed to check existing rates');
        }

        const existingRates = await response.json();
        const existingRate = existingRates.find(r =>
            r._id !== currentRateId && // Exclude current rate when editing
            r.item.toLowerCase() === data.item.toLowerCase() &&
            r.type.toLowerCase() === data.type.toLowerCase()
        );

        if (existingRate) {
            showNotification(`A rate already exists for ${data.item} (${data.type}). Please choose a different combination.`, 'error');
            return;
        }

        // If no existing rate, proceed with creation/update
        const endpoint = currentRateId ? `/rates/${currentRateId}` : '/rates';
        const method = currentRateId ? 'PUT' : 'POST';

        const createResponse = await makeApiRequest(endpoint, {
            method: method,
            body: JSON.stringify(data)
        });

        if (!createResponse.ok) {
            const error = await createResponse.json();
            throw new Error(error.message || 'Failed to save rate');
        }

        hideModal('rate-modal');
        showNotification(currentRateId ? 'Rate updated successfully' : 'Rate added successfully', 'success');
        currentRateId = null; // Reset current rate ID
        await loadRates();
    } catch (error) {
        console.error('Error saving rate:', error);
        showNotification(error.message || 'Error saving rate', 'error');
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
        if (!inventoryData.itemName?.trim() || !inventoryData.category?.trim()) {
            throw new Error('Item name and category are required');
            
            // Normalize case for consistency
            inventoryData.itemName = inventoryData.itemName.trim().toLowerCase();
            inventoryData.category = inventoryData.category.trim().toLowerCase();
        }

        if (isNaN(inventoryData.quantity) || isNaN(inventoryData.unitPrice) || isNaN(inventoryData.threshold)) {
            throw new Error('Quantity, unit price, and threshold must be valid numbers');
        }

        if (inventoryData.quantity < 0 || inventoryData.unitPrice < 0 || inventoryData.threshold < 0) {
            throw new Error('Quantity, unit price, and threshold must be non-negative numbers');
        }

        console.log('Submitting inventory data:', inventoryData);

        await makeApiRequest('/inventory', {
            method: 'POST',
            body: JSON.stringify(inventoryData)
        });

        hideModal(inventoryModal);
        await loadInventory();

        // Show success message
        if (inventoryData.quantity > inventoryData.quantity) {
            alert(`Inventory updated successfully! Total quantity is now ${inventoryData.quantity}`);
        } else {
            alert('Inventory item added successfully!');
        }
    } catch (error) {
        showNotification('Error saving inventory', 'error');
    }
}

// CRUD Operations
async function editOrder(orderId) {
    try {
        const order = await makeApiRequest(`/orders/${orderId}`);

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
        showNotification('Error loading order', 'error');
    }
}

async function deleteOrder(orderId) {
    if (!confirm('Are you sure you want to delete this order?')) return;

    try {
        await makeApiRequest(`/orders/${orderId}`, {
            method: 'DELETE'
        });
        loadOrders();
    } catch (error) {
        showNotification('Error deleting order', 'error');
    }
}

async function editRate(rateId) {
    try {
        console.log('Editing rate with ID:', rateId);

        // First, get all rates and find the specific rate
        const response = await makeApiRequest('/rates');

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to load rates');
        }

        const rates = await response.json();
        const rate = rates.find(r => r._id === rateId);

        if (!rate) {
            throw new Error('Rate not found');
        }

        console.log('Rate data loaded:', rate);

        // Populate form
        const form = document.getElementById('rate-form');
        if (!form) {
            throw new Error('Rate form not found');
        }

        form.elements.item.value = rate.item || '';
        form.elements.type.value = rate.type || '';
        form.elements.rate.value = rate.rate || '';

        // Store the current rate ID
        currentRateId = rateId;

        // Show modal
        showModal('rate-modal');

        // Reset form submission handler to use the main handler
        form.onsubmit = handleRateSubmit;
    } catch (error) {
        console.error('Error loading rate:', error);
        showNotification(error.message || 'Error loading rate details', 'error');
    }
}

async function deleteRate(rateId) {
    if (!confirm('Are you sure you want to delete this rate?')) {
        return;
    }

    try {
        const response = await makeApiRequest(`/rates/${rateId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to delete rate');
        }

        showNotification('Rate deleted successfully', 'success');
        await loadRates();
    } catch (error) {
        console.error('Error deleting rate:', error);
        showNotification(error.message || 'Error deleting rate', 'error');
    }
}

async function editInventory(inventoryId) {
    try {
        const response = await makeApiRequest(`/inventory/${inventoryId}`);
        const item = await response.json();
        
        if (!response.ok) {
            throw new Error('Failed to fetch inventory item');
        }

        currentInventoryId = inventoryId;
        const inventoryForm = document.getElementById('inventory-form');
        if (!inventoryForm) {
            throw new Error('Inventory form not found');
        }

        // Fill the form with item data
        inventoryForm.itemName.value = item.itemName || '';
        inventoryForm.category.value = item.category || '';
        inventoryForm.quantity.value = item.quantity || 0;
        inventoryForm.unitPrice.value = item.unitPrice || 0;
        inventoryForm.threshold.value = item.threshold || 0;

        showModal('inventory-modal');
    } catch (error) {
        console.error('Error editing inventory:', error);
        showNotification(`Error editing inventory: ${error.message}`, 'error');
    }
}

async function deleteInventory(inventoryId) {
    if (!confirm('Are you sure you want to delete this inventory item? This action cannot be undone.')) {
        return;
    }

    try {
        const response = await makeApiRequest(`/inventory/${inventoryId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error('Failed to delete inventory item');
        }

        await loadInventory();
        showNotification('Inventory item deleted successfully', 'success');
    } catch (error) {
        console.error('Error deleting inventory:', error);
        showNotification(`Error deleting inventory: ${error.message}`, 'error');
    }
}

// Ledger Section
async function loadLedgers() {
    try {
        console.log('Loading ledgers...');
        const response = await makeApiRequest('/ledger');

        if (!response.ok) {
            throw new Error(`Failed to load ledgers: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log('Ledgers loaded:', data);

        // Ensure we have an array of ledgers
        const ledgers = Array.isArray(data) ? data : [];

        const ledgerTable = document.getElementById('ledger-table');
        if (!ledgerTable) {
            console.error('Ledger table not found');
            return;
        }

        // Clear existing rows except header
        const tbody = ledgerTable.querySelector('tbody');
        if (tbody) {
            tbody.innerHTML = '';
        }

        if (ledgers.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="6" class="text-center">No ledger entries found</td>';
            tbody.appendChild(row);
            return;
        }

        // Add ledger entries to table
        ledgers.forEach(ledger => {
            const row = document.createElement('tr');
            const dueAmount = (ledger.totalAmount || 0) - (ledger.paidAmount || 0);
            row.innerHTML = `
                <td>${ledger.customerName || 'N/A'}</td>
                <td>${ledger.customerPhone || 'N/A'}</td>
                <td>₹${(ledger.totalAmount || 0).toFixed(2)}</td>
                <td>₹${(ledger.paidAmount || 0).toFixed(2)}</td>
                <td>₹${dueAmount.toFixed(2)}</td>
                <td>
                    <button class="edit-btn" onclick="editLedger('${ledger._id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="delete-btn" onclick="deleteLedger('${ledger._id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });

        // Update customer select dropdown
        const customerSelect = document.getElementById('customer-select');
        if (customerSelect) {
            customerSelect.innerHTML = '<option value="">Select Customer</option>';
            const uniqueCustomers = new Map();

            ledgers.forEach(ledger => {
                const key = `${ledger.customerName}|${ledger.customerPhone}`;
                if (!uniqueCustomers.has(key)) {
                    uniqueCustomers.set(key, {
                        name: ledger.customerName,
                        phone: ledger.customerPhone,
                        totalAmount: 0,
                        paidAmount: 0
                    });
                }
                const customer = uniqueCustomers.get(key);
                customer.totalAmount += ledger.totalAmount || 0;
                customer.paidAmount += ledger.paidAmount || 0;
            });

            uniqueCustomers.forEach((customer, key) => {
                const option = document.createElement('option');
                option.value = key;
                const dueAmount = customer.totalAmount - customer.paidAmount;
                option.textContent = `${customer.name} (${customer.phone}) - Due: ₹${dueAmount.toFixed(2)}`;
                customerSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading ledgers:', error);
        showNotification('Error loading ledgers. Please try again.', 'error');
    }
}

async function loadCustomerLedger(customerNumber) {
    try {
        if (!isAuthenticated()) {
            window.location.href = 'index.html';
            return;
        }

        const ledger = await makeApiRequest(`/ledger/${customerNumber}`);
        displayLedger(ledger);
    } catch (error) {
        showNotification('Error loading customer ledger', 'error');
    }
}

function displayLedger(ledger) {
    const tbody = ledgerTable.querySelector('tbody');
    tbody.innerHTML = '';

    if (!ledger.orders || ledger.orders.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="no-data">No orders found for this customer</td>
            </tr>
        `;
        updateSummary(0, 0, 0);
        return;
    }

    ledger.orders.forEach(order => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${order._id}</td>
            <td>${order.item}</td>
            <td>${order.quantity}</td>
            <td>₹${order.unitPrice.toFixed(2)}</td>
            <td>${new Date(order.orderDate).toLocaleString()}</td>
            <td>₹${order.payment.toFixed(2)}</td>
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

    // Update summary
    updateSummary(ledger.totalAmount, ledger.totalPaid, ledger.dueAmount);

    // Add event listeners for edit and delete buttons
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', () => handleEditLedgerEntry(btn.dataset.id));
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', () => handleDeleteLedgerEntry(btn.dataset.id));
    });
}

function updateSummary(totalAmount, totalPaid, dueAmount) {
    document.getElementById('total-amount').textContent = `₹${totalAmount.toFixed(2)}`;
    document.getElementById('total-paid').textContent = `₹${totalPaid.toFixed(2)}`;
    const dueElement = document.getElementById('due-amount');
    dueElement.textContent = `₹${dueAmount.toFixed(2)}`;

    // Add color class based on due amount
    dueElement.classList.remove('positive', 'negative');
    if (dueAmount < 0) {
        dueElement.classList.add('negative');
    } else if (dueAmount > 0) {
        dueElement.classList.add('positive');
    }
}

async function handleLedgerSubmit(event) {
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
        quantity: Number(form.quantity.value),
        unitPrice: Number(form.unitPrice.value),
        orderDate: form.orderDate.value,
        payment: Number(form.payment.value)
    };

    try {
        await makeApiRequest('/ledger', {
            method: 'POST',
            body: JSON.stringify(formData)
        });
        hideModal(ledgerModal);
        form.reset();
        await loadLedgers();
        await loadCustomerLedger(formData.customerNumber);

        showNotification('Ledger entry saved successfully', 'success');
    } catch (error) {
        showNotification('Error saving ledger entry', 'error');
    }
}

async function handleEditLedgerEntry(orderId) {
    try {
        const customerNumber = customerSelect.value;
        if (!customerNumber) {
            alert('Please select a customer first');
            return;
        }

        const ledger = await makeApiRequest(`/ledger/${customerNumber}`);
        const order = ledger.orders.find(o => o._id === orderId);

        if (!order) {
            throw new Error('Order not found');
        }

        // Populate form
        const form = ledgerForm;
        form.customerName.value = ledger.customerName;
        form.customerNumber.value = ledger.customerNumber;
        form.item.value = order.item;
        form.quantity.value = order.quantity;
        form.unitPrice.value = order.unitPrice;
        form.orderDate.value = new Date(order.orderDate).toISOString().slice(0, 16);
        form.payment.value = order.payment;

        // Show modal
        showModal(ledgerModal);

        // Update form submission handler
        form.onsubmit = async (e) => {
            e.preventDefault();

            try {
                await makeApiRequest(`/ledger/${customerNumber}/${orderId}`, {
                    method: 'PUT',
                    body: JSON.stringify({
                        item: form.item.value.trim(),
                        quantity: Number(form.quantity.value),
                        unitPrice: Number(form.unitPrice.value),
                        orderDate: form.orderDate.value,
                        payment: Number(form.payment.value)
                    })
                });
                hideModal(ledgerModal);
                form.reset();
                await loadCustomerLedger(customerNumber);

                showNotification('Ledger entry updated successfully', 'success');
            } catch (error) {
                showNotification('Error updating ledger entry', 'error');
            }
        };
    } catch (error) {
        showNotification('Error loading ledger entry', 'error');
    }
}

async function handleDeleteLedgerEntry(orderId) {
    if (!confirm('Are you sure you want to delete this ledger entry?')) {
        return;
    }

    try {
        const customerNumber = customerSelect.value;
        if (!customerNumber) {
            alert('Please select a customer first');
            return;
        }

        await makeApiRequest(`/ledger/${customerNumber}/${orderId}`, {
            method: 'DELETE'
        });
        await loadCustomerLedger(customerNumber);
        showNotification('Ledger entry deleted successfully', 'success');
    } catch (error) {
        console.error('Error deleting ledger entry:', error);
        showNotification('Error deleting ledger entry', 'error');
    }
}


// Wholesaler Section
async function loadWholesalerTransactions() {
    try {
        console.log('Loading wholesaler transactions...');
        const response = await makeApiRequest('/wholesaler');
        const data = await response.json();
        console.log('Raw wholesaler data:', data);

        if (!response.ok) {
            throw new Error(`Failed to load transactions: ${response.status} ${response.statusText}`);
        }

        const transactions = Array.isArray(data) ? data : [];
        const transactionsTable = document.getElementById('wholesaler-table');
        if (!transactionsTable) {
            console.error('Wholesaler table not found');
            return;
        }

        const tbody = transactionsTable.querySelector('tbody');
        if (tbody) {
            tbody.innerHTML = '';
        }

        if (transactions.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="8" class="text-center">No transactions found</td>';
            tbody.appendChild(row);
            return;
        }

        // Add transactions to table
        transactions.forEach(transaction => {
            const status = transaction.status || transaction.paymentStatus || 'Pending';
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${transaction.wholesalerName || transaction.name || transaction.wholesaler?.name || 'Unknown'}</td>
                <td>${transaction.billNo || transaction.billNumber || transaction.invoiceNumber || 'N/A'}</td>
                <td>${transaction.itemName || transaction.item || transaction.product || 'Unknown'}</td>
                <td>${transaction.category || transaction.type || transaction.itemType || 'Unknown'}</td>
                <td>${transaction.quantity || 0}</td>
                <td>₹${(transaction.unitPrice || transaction.rate || transaction.price || 0).toFixed(2)}</td>
                <td>₹${(transaction.totalAmount || transaction.total || transaction.amount || 0).toFixed(2)}</td>
                <td>${status}</td>
                <td>
                    <button class="edit-btn" onclick="editWholesaler('${transaction._id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="delete-btn" onclick="deleteWholesaler('${transaction._id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Error loading wholesaler transactions:', error);
        showNotification('Error loading transactions. Please try again.', 'error');
    }
}

// Wholesaler form handling
function initializeFormHandlers() {
    console.log('Initializing form handlers');

    // Add event listeners for add buttons
    const addButtons = {
        'add-order': document.getElementById('add-order'),
        'add-rate': document.getElementById('add-rate'),
        'add-inventory': document.getElementById('add-inventory'),
        'add-wholesaler': document.getElementById('add-wholesaler'),
        'add-staff': document.getElementById('add-staff')
    };

    Object.entries(addButtons).forEach(([buttonId, button]) => {
        if (!button) {
            console.error('Button not found:', buttonId);
            return;
        }
        console.log('Adding click listener to button:', buttonId);
        button.addEventListener('click', () => {
            console.log('Button clicked:', buttonId);
            const modalId = buttonId.replace('add-', '') + '-modal';
            console.log('Attempting to show modal:', modalId);
            showModal(modalId);
        });
    });

    // Add event listeners for close buttons
    const modals = {
        'order-modal': document.getElementById('order-modal'),
        'rate-modal': document.getElementById('rate-modal'),
        'inventory-modal': document.getElementById('inventory-modal'),
        'wholesaler-modal': document.getElementById('wholesaler-modal'),
        'staff-modal': document.getElementById('staff-modal')
    };

    Object.entries(modals).forEach(([modalId, modal]) => {
        if (!modal) {
            console.error('Modal not found:', modalId);
            return;
        }
        const closeBtn = modal.querySelector('.close-btn');
        if (!closeBtn) {
            console.error('Close button not found in modal:', modalId);
            return;
        }
        console.log('Adding close listener to modal:', modalId);
        closeBtn.addEventListener('click', () => {
            console.log('Close button clicked for modal:', modalId);
            hideModal(modalId);
        });
    });

    // Add click outside to close functionality
    window.addEventListener('click', (event) => {
        Object.entries(modals).forEach(([modalId, modal]) => {
            if (event.target === modal) {
                console.log('Clicked outside modal:', modalId);
                hideModal(modalId);
            }
        });
    });

    // Form submissions with error handling
    const forms = {
        'order-form': handleOrderSubmit,
        'rate-form': handleRateSubmit,
        'inventory-form': handleInventorySubmit,
        'wholesaler-form': handleWholesalerSubmit,
        'staff-form': handleStaffSubmit
    };

    Object.entries(forms).forEach(([formId, handler]) => {
        const form = document.getElementById(formId);
        if (form) {
            console.log('Adding submit handler to form:', formId);
            form.addEventListener('submit', (event) => {
                try {
                    handler(event);
                } catch (error) {
                    console.error(`Error in ${formId} submission:`, error);
                    showNotification('Error submitting form', 'error');
                }
            });
        } else {
            console.error('Form not found:', formId);
        }
    });
}

// Initialize wholesaler form
function initializeWholesalerForm() {
    const quantityInput = document.getElementById('quantity');
    const rateInput = document.getElementById('rate');
    const totalAmountInput = document.getElementById('totalAmount');
    const paidInput = document.getElementById('paid');
    const typeSelect = document.getElementById('type');

    if (quantityInput && rateInput && totalAmountInput && paidInput) {
        const calculateTotal = () => {
            const quantity = parseFloat(quantityInput.value) || 0;
            const rate = parseFloat(rateInput.value) || 0;
            const total = quantity * rate;
            totalAmountInput.value = `₹${total.toFixed(2)}`;

            // Update paid input max value
            paidInput.max = total;
            if (parseFloat(paidInput.value) > total) {
                paidInput.value = total;
            }
        };

        quantityInput.addEventListener('input', calculateTotal);
        rateInput.addEventListener('input', calculateTotal);
        paidInput.addEventListener('input', () => {
            const total = parseFloat(totalAmountInput.value.replace('₹', '')) || 0;
            const paid = parseFloat(paidInput.value) || 0;
            if (paid > total) {
                paidInput.value = total;
            }
        });

        // Initialize total on form load
        calculateTotal();
    }

    // Initialize type select if it exists
    if (typeSelect) {
        const types = ['Cement', 'Sand', 'Steel Rod', 'Bricks', 'Other'];
        types.forEach(type => {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = type;
            typeSelect.appendChild(option);
        });
    }
}

// Load staff with proper error handling and field mapping
async function loadStaff() {
    try {
        console.log('Loading staff...');
        const response = await makeApiRequest('/staff');

        if (!response.ok) {
            throw new Error(`Failed to load staff: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log('Raw staff data:', data); // Debug log

        // Ensure we have an array of staff members
        const staff = Array.isArray(data) ? data : [];

        const staffTable = document.getElementById('staff-table');
        if (!staffTable) {
            console.error('Staff table not found');
            return;
        }

        // Clear existing rows except header
        const tbody = staffTable.querySelector('tbody');
        if (tbody) {
            tbody.innerHTML = '';
        }

        if (staff.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="5" class="text-center">No staff members found</td>';
            tbody.appendChild(row);
            return;
        }

        // Add staff members to table
        staff.forEach(member => {
            console.log('Processing staff member:', member); // Debug log
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${member.staffName || member.name || 'N/A'}</td>
                <td>${member.staffId || member.id || member._id || 'N/A'}</td>
                <td>${member.role || member.position || 'N/A'}</td>
                <td>${member.phone || member.contactNumber || member.phoneNumber || 'N/A'}</td>
                <td>${member.email || member.emailAddress || 'N/A'}</td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Error loading staff:', error);
        showNotification('Error loading staff. Please try again.', 'error');
    }
}

// Find Section
async function handleSearch() {
    const searchTerm = searchInput.value.trim();
    if (!searchTerm) {
        alert('Please enter a search term');
        return;
    }

    try {
        const results = await makeApiRequest(`/find/${encodeURIComponent(searchTerm)}`);
        displaySearchResults(results);
    } catch (error) {
        showNotification('Error performing search', 'error');
    }
}

// Display search results
function displaySearchResults(results) {
    searchResults.innerHTML = '';

    // Helper function to create result category
    function createResultCategory(title, items) {
        if (items.length === 0) return '';

        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'result-category';
        categoryDiv.innerHTML = `
            <h3>${title}</h3>
            ${items.map(item => `
                <div class="result-item">
                    <h4>${item.title}</h4>
                    ${Object.entries(item.details).map(([key, value]) => `
                        <p><strong>${key}:</strong> ${value}</p>
                    `).join('')}
                    <button class="view-btn" data-type="${item.type}" data-id="${item.id}">
                        View Details
                    </button>
                </div>
            `).join('')}
        `;
        return categoryDiv;
    }

    // Add result categories
    if (results.orders.length > 0) {
        searchResults.appendChild(createResultCategory('Orders', results.orders));
    }
    if (results.rates.length > 0) {
        searchResults.appendChild(createResultCategory('Rates', results.rates));
    }
    if (results.inventory.length > 0) {
        searchResults.appendChild(createResultCategory('Inventory', results.inventory));
    }
    if (results.ledgers.length > 0) {
        searchResults.appendChild(createResultCategory('Ledger', results.ledgers));
    }
    if (results.wholesalers.length > 0) {
        searchResults.appendChild(createResultCategory('Wholesaler', results.wholesalers));
    }
    if (results.staff.length > 0) {
        searchResults.appendChild(createResultCategory('Staff', results.staff));
    }

    // Add event listeners for view buttons
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const type = btn.dataset.type;
            const id = btn.dataset.id;

            // Switch to the appropriate section
            document.querySelectorAll('.section').forEach(section => {
                section.classList.remove('active');
            });
            document.getElementById(`${type.toLowerCase()}-section`).classList.add('active');

            // Update sidebar active state
            document.querySelectorAll('.sidebar-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            document.querySelector(`.sidebar-btn[data-section="${type.toLowerCase()}"]`).classList.add('active');
        });
    });
}

// Initialize the dashboard
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded');

    // Initialize form handlers
    initializeFormHandlers();
    initializeWholesalerForm();
    initializeOrderForm();

    // Initialize sidebar navigation
    initializeSidebar();

    // Load initial data
    loadOrders();
    loadRates();
    loadInventory();
    loadLedgers();
    loadWholesalerTransactions();
    loadStaff();
});

// Initialize sidebar navigation
function initializeSidebar() {
    console.log('Initializing sidebar navigation');

    // Get all sidebar buttons
    const sidebarButtons = document.querySelectorAll('.sidebar-btn');
    console.log('Found sidebar buttons:', sidebarButtons.length);

    // Add click event listeners to each button
    sidebarButtons.forEach(button => {
        console.log('Adding click listener to button:', button.id);
        button.addEventListener('click', () => {
            try {
                // Get the section ID from the button's data-section attribute
                const sectionId = button.getAttribute('data-section');
                console.log('Button clicked, section:', sectionId);

                if (!sectionId) {
                    console.error('No data-section attribute found on button');
                    return;
                }

                // Remove active class from all buttons and sections
                document.querySelectorAll('.sidebar-btn').forEach(btn => {
                    btn.classList.remove('active');
                });
                document.querySelectorAll('.section').forEach(section => {
                    section.classList.remove('active');
                });

                // Add active class to clicked button
                button.classList.add('active');

                // Show the corresponding section
                const section = document.getElementById(`${sectionId}-section`);
                if (section) {
                    console.log('Showing section:', sectionId);
                    section.classList.add('active');

                    // Load section data
                    switch (sectionId) {
                        case 'orders':
                            loadOrders();
                            break;
                        case 'rates':
                            loadRates();
                            break;
                        case 'inventory':
                            loadInventory();
                            break;
                        case 'ledger':
                            loadLedgers();
                            break;
                        case 'wholesaler':
                            loadWholesalerTransactions();
                            break;
                        case 'staff':
                            loadStaff();
                            break;
                        default:
                            console.warn('Unknown section:', sectionId);
                    }
                } else {
                    console.error('Section not found:', sectionId);
                }
            } catch (error) {
                console.error('Error in sidebar navigation:', error);
                showNotification('Error switching section', 'error');
            }
        });
    });

    // Set initial active section
    const defaultSection = document.querySelector('.sidebar-btn[data-section="orders"]');
    if (defaultSection) {
        defaultSection.click();
    }
}

// Add click outside modal to close
document.addEventListener('click', (event) => {
    try {
        if (event.target.classList.contains('modal')) {
            hideModal(event.target.id);
        }
    } catch (error) {
        console.error('Error in modal click outside handler:', error);
    }
});

// Add escape key to close modal
document.addEventListener('keydown', (event) => {
    try {
        if (event.key === 'Escape') {
            const openModal = document.querySelector('.modal[style="display: block"]');
            if (openModal) {
                hideModal(openModal.id);
            }
        }
    } catch (error) {
        console.error('Error in escape key handler:', error);
    }
});

// Load customers for ledger section
async function loadCustomers() {
    try {
        const orders = await makeApiRequest('/orders');
        const customerMap = new Map();

        orders.forEach(order => {
            const key = `${order.customerName}|${order.customerNumber}`;
            if (!customerMap.has(key)) {
                customerMap.set(key, {
                    name: order.customerName,
                    number: order.customerNumber,
                    totalAmount: 0,
                    totalPaid: 0,
                    orders: []
                });
            }
            const customer = customerMap.get(key);
            const orderAmount = order.quantity * order.rate;
            customer.totalAmount += orderAmount;
            customer.totalPaid += order.paidAmount;
            customer.orders.push(order);
        });

        const customerSelect = document.getElementById('customer-select');
        customerSelect.innerHTML = '<option value="">Select Customer</option>';

        Array.from(customerMap.values()).forEach(customer => {
            const option = document.createElement('option');
            option.value = `${customer.name}|${customer.number}`;
            const dueAmount = customer.totalAmount - customer.totalPaid;
            option.textContent = `${customer.name} (${customer.number}) - Due: ₹${dueAmount.toFixed(2)}`;
            customerSelect.appendChild(option);
        });
    } catch (error) {
        showNotification('Error loading customers', 'error');
    }
}

// Handle customer selection in ledger
async function handleCustomerSelect(event) {
    const [name, number] = event.target.value.split('|');
    if (!name || !number) return;

    try {
        const orders = await makeApiRequest('/orders');
        const customerOrders = orders.filter(order =>
            order.customerName === name && order.customerNumber === number
        );

        // Calculate totals
        const totalAmount = customerOrders.reduce((sum, order) => sum + (order.quantity * order.rate), 0);
        const totalPaid = customerOrders.reduce((sum, order) => sum + order.paidAmount, 0);
        const dueAmount = totalAmount - totalPaid;

        // Update summary
        document.getElementById('total-amount').textContent = `₹${totalAmount.toFixed(2)}`;
        document.getElementById('total-paid').textContent = `₹${totalPaid.toFixed(2)}`;
        document.getElementById('due-amount').textContent = `₹${dueAmount.toFixed(2)}`;
    } catch (error) {
        showNotification('Error loading customer orders', 'error');
    }
}

// Handle wholesaler form submission
async function handleWholesalerSubmit(event) {
    event.preventDefault();

    const form = event.target;
    const formData = new FormData(form);

    // Get form values
    const wholesalerName = formData.get('wholesalerName');
    const billNo = formData.get('billNo');
    const item = formData.get('item');
    const type = formData.get('type');
    const quantity = parseFloat(formData.get('quantity'));
    const rate = parseFloat(formData.get('rate'));
    const paid = parseFloat(formData.get('paid'));

    // Calculate total amount
    const totalAmount = quantity * rate;

    // Validate paid amount
    if (paid > totalAmount) {
        alert('Paid amount cannot be greater than total amount');
        return;
    }

    try {
        const response = await makeApiRequest('/wholesaler', {
            method: 'POST',
            body: JSON.stringify({
                wholesalerName,
                billNo,
                item,
                type,
                quantity,
                rate,
                totalAmount,
                paid
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to save wholesaler transaction');
        }

        // Close modal and reset form
        hideModal('wholesaler-modal');
        form.reset();

        // Refresh wholesaler transactions
        await loadWholesalerTransactions();

        // Show success message
        showNotification('Wholesaler transaction saved successfully', 'success');
    } catch (error) {
        console.error('Error saving wholesaler transaction:', error);
        showNotification(error.message || 'Failed to save wholesaler transaction', 'error');
    }
}

// Add event listener for quantity and rate changes to calculate total
document.getElementById('quantity').addEventListener('input', calculateTotal);
document.getElementById('rate').addEventListener('input', calculateTotal);

function calculateTotal() {
    const quantity = parseFloat(document.getElementById('quantity').value) || 0;
    const rate = parseFloat(document.getElementById('rate').value) || 0;
    const total = quantity * rate;
    document.getElementById('totalAmount').value = total.toFixed(2);
}

async function handleStaffSubmit(event) {
    event.preventDefault();
    console.log('Staff form submitted');

    try {
        const staffName = document.getElementById('staffName');
        const staffId = document.getElementById('staffId');
        const staffRole = document.getElementById('staffRole');
        const staffPhone = document.getElementById('staffPhone');
        const staffEmail = document.getElementById('staffEmail');

        if (!staffName || !staffId || !staffRole || !staffPhone || !staffEmail) {
            console.error('Required form elements not found');
            return;
        }

        const formData = {
            staffName: staffName.value.trim(),
            staffId: staffId.value.trim(),
            role: staffRole.value,
            phone: staffPhone.value.trim(),
            email: staffEmail.value.trim(),
            hireDate: new Date().toISOString()
        };

        // Validate form data
        if (!formData.staffName) {
            showNotification('Please enter staff name', 'error');
            return;
        }
        if (!formData.staffId) {
            showNotification('Please enter staff ID', 'error');
            return;
        }
        if (!formData.role) {
            showNotification('Please select role', 'error');
            return;
        }
        if (!formData.phone) {
            showNotification('Please enter phone number', 'error');
            return;
        }
        if (!formData.email) {
            showNotification('Please enter email', 'error');
            return;
        }

        console.log('Submitting staff data:', formData);

        const response = await makeApiRequest('/staff', {
            method: 'POST',
            body: JSON.stringify(formData)
        });

        console.log('Staff member saved:', response);
        showNotification('Staff member added successfully');
        hideModal('staff-modal');
        document.getElementById('staff-form').reset();
        await loadStaff();
    } catch (error) {
        console.error('Error saving staff member:', error);
        showNotification('Error saving staff member', 'error');
    }
}

// Initialize order form
function initializeOrderForm() {
    const form = document.getElementById('order-form');
    if (!form) {
        console.error('Order form not found');
        return;
    }

    // Get form elements with null checks
    const itemSelect = document.getElementById('orderItem');
    const typeSelect = document.getElementById('orderType');
    const quantityInput = document.getElementById('orderQuantity');
    const rateInput = document.getElementById('orderRate');
    const totalAmountInput = document.getElementById('orderTotalAmount'); // This should be added to HTML
    const paidAmountInput = document.getElementById('orderPaidAmount');

    // Verify all elements exist
    if (!itemSelect || !typeSelect || !quantityInput || !rateInput || !totalAmountInput || !paidAmountInput) {
        console.error('One or more form elements not found');
        return;
    }

    // Load rates and inventory when form opens
    const orderModal = document.getElementById('order-modal');
    if (orderModal) {
        orderModal.addEventListener('show.bs.modal', async () => {
            try {
                // Load rates
                const ratesResponse = await makeApiRequest('/rates');
                if (!ratesResponse.ok) {
                    throw new Error('Failed to load rates');
                }
                const rates = await ratesResponse.json();

                // Load inventory
                const inventoryResponse = await makeApiRequest('/inventory');
                if (!inventoryResponse.ok) {
                    throw new Error('Failed to load inventory');
                }
                const inventory = await inventoryResponse.json();

                // Combine rates and inventory to show only items with both rate and inventory
                const availableItems = rates.filter(rate =>
                    inventory.some(inv =>
                        inv.name.toLowerCase() === rate.item.toLowerCase() &&
                        inv.type.toLowerCase() === rate.type.toLowerCase() &&
                        inv.quantity > 0
                    )
                );

                // Populate item select
                const items = [...new Set(availableItems.map(r => r.item))];
                itemSelect.innerHTML = '<option value="">Select Item</option>';
                items.forEach(item => {
                    const option = document.createElement('option');
                    option.value = item;
                    option.textContent = item;
                    itemSelect.appendChild(option);
                });
            } catch (error) {
                console.error('Error loading data:', error);
                showNotification('Error loading data', 'error');
            }
        });
    }

    // Rest of the initialization code remains the same...
}