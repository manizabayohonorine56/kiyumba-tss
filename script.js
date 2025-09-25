// Configurable API base + fetch helper with timeout
const PUBLIC_API_BASE = localStorage.getItem('API_BASE') || '';
function apiUrlPublic(path) { return `${PUBLIC_API_BASE}${path}`; }
async function apiFetchPublic(path, options = {}, timeoutMs = 15000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const resp = await fetch(apiUrlPublic(path), { ...options, signal: controller.signal });
        return resp;
    } finally {
        clearTimeout(id);
    }
}

// DOM Content Loaded
document.addEventListener('DOMContentLoaded', function() {
    // Mobile Menu Toggle
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    const navLinks = document.querySelectorAll('.nav-link');

    // Toggle mobile menu (guard for pages without navbar)
    if (hamburger && navMenu) {
        hamburger.addEventListener('click', function() {
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
        });
    }

    // Close mobile menu when clicking on a link (guarded)
    navLinks.forEach(link => {
        link.addEventListener('click', function() {
            if (hamburger && navMenu) {
                hamburger.classList.remove('active');
                navMenu.classList.remove('active');
            }
        });
    });

    // Smooth scrolling for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Navbar scroll effect (guarded)
    window.addEventListener('scroll', function() {
        const navbar = document.querySelector('.navbar');
        if (!navbar) return;
        if (window.scrollY > 50) {
            navbar.style.background = 'rgba(255, 255, 255, 0.95)';
            navbar.style.backdropFilter = 'blur(10px)';
        } else {
            navbar.style.background = '#fff';
            navbar.style.backdropFilter = 'none';
        }
    });

    // Login Form Handler: bind for any page that has a #loginForm
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        // Attach handler even if input IDs differ between pages (e.g., #email vs #loginEmail)
        loginForm.addEventListener('submit', handleLogin);
    }

    // Fade in animation on scroll
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, observerOptions);

    // Observe elements for fade-in animation
    document.querySelectorAll('.about-card, .program-card, .contact-item').forEach(el => {
        el.classList.add('fade-in');
        observer.observe(el);
    });

    // Contact form handling
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Get form data
            const formData = new FormData(contactForm);
            const name = formData.get('name');
            const email = formData.get('email');
            const phone = formData.get('phone');
            const message = formData.get('message');
            
            // Basic validation
            if (!name || !email || !message) {
                showNotification('Please fill in all fields', 'error');
                return;
            }
            
            if (!isValidEmail(email)) {
                showNotification('Please enter a valid email address', 'error');
                return;
            }
            
            // Contact form submission
            const data = {
                name: name,
                email: email,
                phone: phone || '',
                message: message
            };

            try {
                const response = await apiFetchPublic('/api/contact', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(data)
                });

                const result = await response.json();

                if (response.ok) {
                    showNotification('Message sent successfully! We\'ll get back to you soon.', 'success');
                    contactForm.reset();
                } else {
                    showNotification(result.error || 'Failed to send message. Please try again.', 'error');
                }
            } catch (error) {
                console.error('Error:', error);
                showNotification('Failed to send message. Please check your connection and try again.', 'error');
            }
        });
    }

    // SMS send button functionality
    const sendSmsBtn = document.getElementById('sendSmsBtn');
    if (sendSmsBtn) {
        sendSmsBtn.addEventListener('click', async function() {
            const name = document.getElementById('contactName').value;
            const phone = document.getElementById('contactPhone').value;
            const message = document.getElementById('contactMessage').value;

            if (!name || !phone || !message) {
                showNotification('Please fill in your name, phone number, and message to send SMS.', 'error');
                return;
            }

            if (!phone.match(/^\+?[1-9]\d{1,14}$/)) {
                showNotification('Please enter a valid phone number (e.g., +250XXXXXXXXX).', 'error');
                return;
            }

            try {
                const response = await apiFetchPublic('/api/send-sms', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        name: name,
                        phone: phone,
                        message: message
                    })
                });

                const result = await response.json();

                if (response.ok) {
                    showNotification('SMS sent successfully! We\'ll respond to your message soon.', 'success');
                    document.getElementById('contactForm').reset();
                } else {
                    showNotification(result.error || 'Failed to send SMS. Please try again or use email instead.', 'error');
                }
            } catch (error) {
                console.error('SMS Error:', error);
                showNotification('Failed to send SMS. Please check your connection and try again.', 'error');
            }
        });
    }

    // Email validation function
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Notification system
    function showNotification(message, type = 'info') {
        // Remove existing notifications
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(notification => notification.remove());
        
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-message">${message}</span>
                <button class="notification-close">&times;</button>
            </div>
        `;
        
        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
            color: white;
            padding: 16px 20px;
            border-radius: 8px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
            z-index: 10000;
            transform: translateX(400px);
            transition: transform 0.3s ease;
            max-width: 400px;
        `;
        
        // Add to page
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // Close button functionality
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => {
            notification.style.transform = 'translateX(400px)';
            setTimeout(() => notification.remove(), 300);
        });
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.transform = 'translateX(400px)';
                setTimeout(() => notification.remove(), 300);
            }
        }, 5000);
    }

    // Add loading animation to buttons
    document.querySelectorAll('.btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            if (this.classList.contains('loading')) return;
            
            // Add loading state for form submissions
            if (this.type === 'submit') {
                this.classList.add('loading');
                const originalText = this.innerHTML;
                this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
                
                setTimeout(() => {
                    this.classList.remove('loading');
                    this.innerHTML = originalText;
                }, 2000);
            }
        });
    });

    // Parallax effect for hero section
    window.addEventListener('scroll', function() {
        const scrolled = window.pageYOffset;
        const hero = document.querySelector('.hero');
        if (hero) {
            hero.style.transform = `translateY(${scrolled * 0.5}px)`;
        }
    });

    // Counter animation for statistics (if added later)
    function animateCounter(element, target, duration = 2000) {
        let start = 0;
        const increment = target / (duration / 16);
        
        const timer = setInterval(() => {
            start += increment;
            element.textContent = Math.floor(start);
            
            if (start >= target) {
                element.textContent = target;
                clearInterval(timer);
            }
        }, 16);
    }

    // Initialize counters when they come into view
    const counters = document.querySelectorAll('.counter');
    counters.forEach(counter => {
        observer.observe(counter);
        counter.addEventListener('animateCounter', () => {
            const target = parseInt(counter.getAttribute('data-target'));
            animateCounter(counter, target);
        });
    });

    // Add hover effects to cards
    document.querySelectorAll('.about-card, .program-card').forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-10px) scale(1.02)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
        });
    });

    // Typing effect for hero title (optional enhancement)
    function typeWriter(element, text, speed = 100) {
        let i = 0;
        element.innerHTML = '';
        
        function type() {
            if (i < text.length) {
                element.innerHTML += text.charAt(i);
                i++;
                setTimeout(type, speed);
            }
        }
        
        type();
    }

    // Initialize typing effect for hero title
    const heroTitle = document.querySelector('.hero-title');
    if (heroTitle) {
        const originalText = heroTitle.textContent;
        // Uncomment the line below to enable typing effect
        // typeWriter(heroTitle, originalText, 80);
    }

    // Search functionality (for future implementation)
    function initializeSearch() {
        const searchInput = document.getElementById('searchInput');
        const searchResults = document.getElementById('searchResults');
        
        if (searchInput && searchResults) {
            searchInput.addEventListener('input', function() {
                const query = this.value.toLowerCase().trim();
                
                if (query.length > 2) {
                    // Simulate search results
                    const results = [
                        { title: 'Primary Education Program', url: '#programs' },
                        { title: 'Secondary Education Program', url: '#programs' },
                        { title: 'About Our School', url: '#about' },
                        { title: 'Contact Information', url: '#contact' }
                    ].filter(item => item.title.toLowerCase().includes(query));
                    
                    displaySearchResults(results);
                } else {
                    searchResults.innerHTML = '';
                    searchResults.style.display = 'none';
                }
            });
        }
    }

    function displaySearchResults(results) {
        const searchResults = document.getElementById('searchResults');
        
        if (results.length > 0) {
            searchResults.innerHTML = results.map(result => 
                `<div class="search-result-item">
                    <a href="${result.url}">${result.title}</a>
                </div>`
            ).join('');
            searchResults.style.display = 'block';
        } else {
            searchResults.innerHTML = '<div class="search-result-item">No results found</div>';
            searchResults.style.display = 'block';
        }
    }

    // Initialize search if elements exist
    initializeSearch();

    // Console welcome message
    console.log('%c🎓 Welcome to Kiyumba School Management System!', 
        'color: #2563eb; font-size: 16px; font-weight: bold;');
    console.log('%cWebsite developed with modern web technologies', 
        'color: #64748b; font-size: 12px;');
});

// Make showNotification available globally so handlers defined outside
// DOMContentLoaded (like handleLogin) can call it.
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());

    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-message">${message}</span>
            <button class="notification-close">&times;</button>
        </div>
    `;

    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
        color: white;
        padding: 16px 20px;
        border-radius: 8px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
        z-index: 10000;
        transform: translateX(400px);
        transition: transform 0.3s ease;
        max-width: 400px;
    `;

    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);

    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
        notification.style.transform = 'translateX(400px)';
        setTimeout(() => notification.remove(), 300);
    });

    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.transform = 'translateX(400px)';
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
}

// Utility functions
const Utils = {
    // Debounce function for performance optimization
    debounce: function(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    
    // Throttle function for scroll events
    throttle: function(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },
    
    // Format date function
    formatDate: function(date) {
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }).format(date);
    },
    
    // Validate form data
    validateForm: function(formData) {
        const errors = [];
        
        for (const [key, value] of formData.entries()) {
            if (!value.trim()) {
                errors.push(`${key} is required`);
            }
        }
        
        return errors;
    }
};

// Login Handler Function
async function handleLogin(e) {
    e.preventDefault();
    // Support multiple login form variants:
    // - admin.html uses inputs with ids: #email, #password
    // - index.html uses inputs with ids: #loginEmail, #loginPassword
    // Prefer inputs inside the submitted form when possible.
    const form = e.target && (e.target.tagName === 'FORM' ? e.target : e.target.closest('form')) || document.getElementById('loginForm');

    const emailEl = form.querySelector('input[name="email"], #email, #loginEmail');
    const passwordEl = form.querySelector('input[name="password"], #password, #loginPassword');

    const email = emailEl ? emailEl.value.trim() : '';
    const password = passwordEl ? passwordEl.value : '';
    const submitBtn = document.querySelector('.login-submit-btn');
    
    // Show loading state
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
    submitBtn.disabled = true;
    
    try {
        // Try admin login first
        const adminResponse = await apiFetchPublic('/api/admin/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        if (adminResponse.ok) {
            const adminData = await adminResponse.json();
            
            // Store admin token and user data
            localStorage.setItem('adminToken', adminData.token);
            localStorage.setItem('currentUser', JSON.stringify(adminData.user));
            
            showNotification('Admin login successful! Redirecting to dashboard...', 'success');
            
            // Redirect to admin dashboard
            setTimeout(() => {
                window.location.href = '/admin';
            }, 1500);
            
            return;
        }
        
        // If admin login fails, try student login (if implemented)
        const adminError = await adminResponse.json();
        
        if (adminResponse.status === 401) {
            // Check if this looks like a student email
            if (email.includes('student') || !email.includes('admin')) {
                showNotification('Student portal is not yet implemented. Please use admin credentials for now.', 'info');
            } else {
                showNotification('Invalid admin credentials. Please check your email and password.', 'error');
            }
        } else {
            showNotification('Login failed: ' + (adminError.error || 'Unknown error'), 'error');
        }
        
    } catch (error) {
        console.error('Login error:', error);
        showNotification('Network error. Please check your connection and try again.', 'error');
    } finally {
        // Reset button state
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// Auto-fill demo credentials
function fillDemoCredentials(type) {
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    
    if (type === 'admin') {
        emailInput.value = 'admin@kiyumbaschool.edu';
        passwordInput.value = 'admin123';
    } else if (type === 'student') {
        emailInput.value = 'student@kiyumbaschool.edu';
        passwordInput.value = 'student123';
    }
    
    showNotification(`Demo ${type} credentials filled in!`, 'info');
}

// Add event listeners when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Login form handler (guarded to only bind on pages with expected fields)
    const loginForm = document.getElementById('loginForm');
    const loginEmailInput2 = document.getElementById('email');
    const loginPasswordInput2 = document.getElementById('password');
    if (loginForm && loginEmailInput2 && loginPasswordInput2) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Forgot password handler
    const forgotPasswordLink = document.getElementById('forgotPasswordLink');
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', function(e) {
            e.preventDefault();
            showNotification('Password reset functionality will be implemented soon.', 'info');
        });
    }

    // Make demo credentials clickable
    const credentialItems = document.querySelectorAll('.credential-item');
    credentialItems.forEach((item, index) => {
        item.style.cursor = 'pointer';
        item.style.padding = '0.5rem';
        item.style.borderRadius = '4px';
        item.style.transition = 'background-color 0.2s ease';
        
        item.addEventListener('mouseenter', function() {
            this.style.backgroundColor = '#e5e7eb';
        });
        
        item.addEventListener('mouseleave', function() {
            this.style.backgroundColor = 'transparent';
        });
        
        item.addEventListener('click', function() {
            if (index === 0) {
                fillDemoCredentials('admin');
            } else if (index === 1) {
                fillDemoCredentials('student');
            }
        });
    });
});

// Export for module usage (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Utils };
}
