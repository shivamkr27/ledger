document.addEventListener('DOMContentLoaded', () => {
  const authModal = document.getElementById('auth-modal');
  const loginForm = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');
  const authTabs = document.querySelectorAll('.auth-tab');
  const closeModalBtn = document.getElementById('auth-modal-close');
  const loginBtn = document.querySelector('a[href="#login-btn"], #login-btn');
  const signupBtn = document.getElementById('signup-btn');

  // Show modal
  function showAuthModal() {
    if (authModal) authModal.classList.add('show');
  }

  // Hide modal
  function hideAuthModal() {
    if (authModal) authModal.classList.remove('show');
  }

  // Switch between login and signup tabs
  function switchTab(tabName) {
    authTabs.forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === tabName);
    });

    if (loginForm) loginForm.classList.toggle('active', tabName === 'login');
    if (signupForm) signupForm.classList.toggle('active', tabName === 'signup');
  }

  // Only add event listeners if elements exist
  if (loginBtn) {
    loginBtn.addEventListener('click', (e) => {
      e.preventDefault();
      showAuthModal();
      switchTab('login');
    });
  }
  if (signupBtn) {
    signupBtn.addEventListener('click', () => {
      showAuthModal();
      switchTab('signup');
    });
  }
  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', hideAuthModal);
  }
  if (authModal) {
    authModal.addEventListener('click', (e) => {
      if (e.target === authModal) {
        hideAuthModal();
      }
    });
  }
  if (authTabs) {
    authTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        switchTab(tab.dataset.tab);
      });
    });
  }

  // Show error message
  function showError(element, message) {
    const errorDiv = element.nextElementSibling;
    if (!errorDiv || !errorDiv.classList.contains('error-message')) {
      const newErrorDiv = document.createElement('div');
      newErrorDiv.className = 'error-message';
      element.parentNode.insertBefore(newErrorDiv, element.nextSibling);
      newErrorDiv.textContent = message;
      newErrorDiv.classList.add('show');
    } else {
      errorDiv.textContent = message;
      errorDiv.classList.add('show');
    }
  }

  // Clear error message
  function clearError(element) {
    const errorDiv = element.nextElementSibling;
    if (errorDiv && errorDiv.classList.contains('error-message')) {
      errorDiv.classList.remove('show');
    }
  }

  // Form validation
  function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function validatePassword(password) {
    return password.length >= 6;
  }

  // Login form submission
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    let isValid = true;

    // Validate email
    if (!validateEmail(email)) {
      showError(document.getElementById('login-email'), 'Please enter a valid email address');
      isValid = false;
    } else {
      clearError(document.getElementById('login-email'));
    }

    // Validate password
    if (!validatePassword(password)) {
      showError(document.getElementById('login-password'), 'Password must be at least 6 characters');
      isValid = false;
    } else {
      clearError(document.getElementById('login-password'));
    }

    if (!isValid) return;

    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Login failed');
      }

      const data = await response.json();

      // Store token in both localStorage and cookie
      localStorage.setItem('token', data.token);
      document.cookie = `token=${data.token}; path=/; SameSite=Lax`;
      
      // Redirect to dashboard
      window.location.href = 'dashboard.html';
      
      // Log success
      console.log('Login successful, token stored');
    } catch (error) {
      showError(document.getElementById('login-password'), error.message);
    }
  });

  // Signup form submission
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const fullName = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('signup-confirm-password').value;
    let isValid = true;

    // Validate full name
    if (!fullName.trim()) {
      showError(document.getElementById('signup-name'), 'Please enter your full name');
      isValid = false;
    } else {
      clearError(document.getElementById('signup-name'));
    }

    // Validate email
    if (!validateEmail(email)) {
      showError(document.getElementById('signup-email'), 'Please enter a valid email address');
      isValid = false;
    } else {
      clearError(document.getElementById('signup-email'));
    }

    // Validate password
    if (!validatePassword(password)) {
      showError(document.getElementById('signup-password'), 'Password must be at least 6 characters');
      isValid = false;
    } else {
      clearError(document.getElementById('signup-password'));
    }

    // Validate confirm password
    if (password !== confirmPassword) {
      showError(document.getElementById('signup-confirm-password'), 'Passwords do not match');
      isValid = false;
    } else {
      clearError(document.getElementById('signup-confirm-password'));
    }

    if (!isValid) return;

    try {
      const response = await fetch('http://localhost:5000/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ fullName, email, password })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Signup failed');
      }

      const data = await response.json();

      // Store token in both localStorage and cookie
      localStorage.setItem('token', data.token);
      document.cookie = `token=${data.token}; path=/; SameSite=Lax`;
      
      // Redirect to dashboard
      window.location.href = 'dashboard.html';
      
      // Log success
      console.log('Signup successful, token stored');
    } catch (error) {
      showError(document.getElementById('signup-email'), error.message);
    }
  });

  // Check if user is already logged in
  const token = localStorage.getItem('token');
  if (token) {
    window.location.href = 'dashboard.html';
  }
}); 