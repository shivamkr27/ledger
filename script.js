document.addEventListener('DOMContentLoaded', () => {
    // Benefits section functionality
    const benefitItems = document.querySelectorAll('.benefit-item');
    const benefitDescription = document.querySelector('.benefit-description');
    const descriptions = {
        1: {
            title: 'Real-time Analytics',
            icon: 'fas fa-chart-line',
            text: 'Get instant insights into your business performance with our advanced analytics dashboard. Track sales trends, customer behavior, and inventory levels in real-time.'
        },
        2: {
            title: 'Mobile Accessibility',
            icon: 'fas fa-mobile-alt',
            text: 'Access your business data anytime, anywhere with our mobile app. Manage transactions, check inventory, and generate bills on the go.'
        },
        3: {
            title: 'Cloud Backup',
            icon: 'fas fa-cloud',
            text: 'Your data is automatically backed up to our secure cloud servers. Never lose important business information again.'
        },
        4: {
            title: 'Secure Data',
            icon: 'fas fa-shield-alt',
            text: 'We use advanced encryption to protect your business data. Only authorized users can access your information.'
        },
        5: {
            title: 'Time Saving',
            icon: 'fas fa-clock',
            text: 'Automate repetitive tasks and streamline your workflow. Spend less time on paperwork and more time growing your business.'
        },
        6: {
            title: 'Cost Effective',
            icon: 'fas fa-money-bill-wave',
            text: 'Save money by eliminating paper costs and reducing manual labor. Our solution is designed to be affordable for small businesses.'
        },
        7: {
            title: 'Customer Insights',
            icon: 'fas fa-users',
            text: 'Get valuable insights into customer behavior and preferences. Personalize your service to meet their needs better.'
        },
        8: {
            title: 'Automatic Updates',
            icon: 'fas fa-sync',
            text: 'Stay up-to-date with the latest features and improvements. Our system automatically updates to ensure you always have the best tools.'
        }
    };

    // Initialize with first benefit's content
    if (benefitItems.length > 0) {
        const firstBenefit = benefitItems[0];
        updateDescription(firstBenefit);
        firstBenefit.classList.add('active');
    }

    // Add click handlers for benefits
    benefitItems.forEach(item => {
        item.addEventListener('click', () => {
            // Remove active class from all items
            benefitItems.forEach(i => i.classList.remove('active'));

            // Add active class to clicked item
            item.classList.add('active');

            // Update description
            updateDescription(item);
        });
    });

    // Function to update description
    function updateDescription(item) {
        const benefitId = item.getAttribute('data-benefit');
        const description = descriptions[benefitId];

        if (description && benefitDescription) {
            benefitDescription.innerHTML = `
                <div class="benefit-header">
                    <h3>${description.title}</h3>
                    <i class="${description.icon}"></i>
                </div>
                <div class="benefit-text">
                    <p>${description.text}</p>
                </div>
            `;
        }
    }

    // Smooth scrolling for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });

    // FAQ functionality (using the second implementation)
    const faqQuestions = document.querySelectorAll('.faq-question');
    faqQuestions.forEach(question => {
        question.addEventListener('click', () => {
            const answer = question.nextElementSibling;
            answer.classList.toggle('show');

            // Close other FAQ answers if this one is opened
            if (answer.classList.contains('show')) {
                const otherAnswers = document.querySelectorAll('.faq-answer');
                otherAnswers.forEach(otherAnswer => {
                    if (otherAnswer !== answer) {
                        otherAnswer.classList.remove('show');
                    }
                });
            }
        });
    });

    // Contact Form Validation and Submission
    const contactForm = document.getElementById('contact-form');
    contactForm.addEventListener('submit', (e) => {
        e.preventDefault();

        // Get form values
        const formData = new FormData(contactForm);
        const name = formData.get('name');
        const email = formData.get('email');
        const phone = formData.get('phone');
        const subject = formData.get('subject');
        const reason = formData.get('reason');
        const message = formData.get('message');

        // Validate form
        let isValid = true;
        const errorMessages = [];

        if (!name.trim()) {
            errorMessages.push('Please enter your full name');
            isValid = false;
        }

        if (!email.trim()) {
            errorMessages.push('Please enter your email address');
            isValid = false;
        } else if (!isValidEmail(email)) {
            errorMessages.push('Please enter a valid email address');
            isValid = false;
        }

        if (!subject.trim()) {
            errorMessages.push('Please enter a subject');
            isValid = false;
        }

        if (!reason) {
            errorMessages.push('Please select a reason for contacting');
            isValid = false;
        }

        if (!message.trim()) {
            errorMessages.push('Please enter your message');
            isValid = false;
        }

        // Display error messages
        if (!isValid) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error';
            errorDiv.innerHTML = errorMessages.join('<br>');
            contactForm.insertBefore(errorDiv, contactForm.firstChild);
            setTimeout(() => {
                errorDiv.remove();
            }, 5000);
            return;
        }

        // Show success message (placeholder for actual submission)
        alert('Thank you for your message! We will get back to you soon.');
        contactForm.reset();
    });

    // Email validation function
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Auth Modal Functionality
    const authModal = document.getElementById('auth-modal');
    const loginBtn = document.querySelector('a[href="#login-btn"]');
    const signupBtn = document.getElementById('signup-btn');
    const closeModalBtn = document.getElementById('auth-modal-close');
    const authTabs = document.querySelectorAll('.auth-tab');
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');

    // Show modal
    function showAuthModal() {
        authModal.classList.add('show');
    }

    // Hide modal
    function hideAuthModal() {
        authModal.classList.remove('show');
    }

    // Switch between login and signup tabs
    function switchTab(tabName) {
        authTabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });

        loginForm.classList.toggle('active', tabName === 'login');
        signupForm.classList.toggle('active', tabName === 'signup');
    }

    // Event listeners for modal
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

    authTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            switchTab(tab.dataset.tab);
        });
    });

    // Close modal when clicking outside
    authModal.addEventListener('click', (e) => {
        if (e.target === authModal) {
            hideAuthModal();
        }
    });

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

            // Store token and redirect
            localStorage.setItem('token', data.token);
            window.location.href = 'dashboard.html';
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

            // Store token and redirect
            localStorage.setItem('token', data.token);
            window.location.href = 'dashboard.html';
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

// Navigation active state on scroll
window.addEventListener('scroll', () => {
    const sections = document.querySelectorAll('section');
    const navLinks = document.querySelectorAll('.nav-links a');
    let current = '';

    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;

        if (window.scrollY >= sectionTop - 100) {
            current = section.getAttribute('id');
        }
    });

    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href').slice(1) === current) {
            link.classList.add('active');
        }
    });
});