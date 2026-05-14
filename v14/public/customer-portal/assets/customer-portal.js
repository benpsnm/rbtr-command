// PSNM Customer Portal — Shared Client Logic

// API helper
async function apiCall(endpoint, options = {}) {
  const response = await fetch(endpoint, {
    ...options,
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
}

// Format currency
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(amount / 100); // Assuming amount is in pence
}

// Format date
function formatDate(dateString) {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// Check authentication
async function checkAuth() {
  try {
    const data = await apiCall('/api/customer/me');
    return data.customer;
  } catch (e) {
    // Not authenticated, redirect to login
    if (window.location.pathname !== '/customer-portal/login.html') {
      window.location.href = '/customer-portal/login.html';
    }
    return null;
  }
}

// Set active nav item
function setActiveNav(pageName) {
  const navLinks = document.querySelectorAll('.portal-nav-list a');
  navLinks.forEach(link => {
    if (link.getAttribute('href').includes(pageName)) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}

// Show loading state
function setLoading(element, isLoading) {
  if (isLoading) {
    element.classList.add('loading');
  } else {
    element.classList.remove('loading');
  }
}

// Show alert message
function showAlert(message, type = 'success') {
  const alert = document.createElement('div');
  alert.className = `alert alert-${type}`;
  alert.textContent = message;

  const main = document.querySelector('.portal-main') || document.body;
  main.insertBefore(alert, main.firstChild);

  setTimeout(() => alert.remove(), 5000);
}

// Export for use in pages
if (typeof window !== 'undefined') {
  window.PSNM = {
    apiCall,
    formatCurrency,
    formatDate,
    checkAuth,
    setActiveNav,
    setLoading,
    showAlert,
  };
}
