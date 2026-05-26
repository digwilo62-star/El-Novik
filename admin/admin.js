/* ============================================================
   EL-NOVIK Admin Frontend
   ============================================================ */

document.addEventListener('DOMContentLoaded', function() {

  /* ---------- LOGIN FORM ---------- */
  var loginForm = document.getElementById('loginForm');
  var authError = document.getElementById('authError');
  var loginSubmit = document.getElementById('loginSubmit');
  var togglePassword = document.getElementById('togglePassword');
  var passwordInput = document.getElementById('auth-password');

  // Show/hide password
  if (togglePassword && passwordInput) {
    togglePassword.addEventListener('click', function() {
      var isHidden = passwordInput.type === 'password';
      passwordInput.type = isHidden ? 'text' : 'password';
      togglePassword.setAttribute('aria-label', isHidden ? 'Hide password' : 'Show password');
    });
  }

  if (loginForm) {
    loginForm.addEventListener('submit', function(e) {
      e.preventDefault();

      if (authError) authError.hidden = true;

      var username = document.getElementById('auth-username').value.trim();
      var password = document.getElementById('auth-password').value;

      if (!username || !password) {
        showError('Please enter both username and password.');
        return;
      }

      if (loginSubmit) {
        loginSubmit.classList.add('is-loading');
        loginSubmit.disabled = true;
      }

      fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username: username, password: password })
      })
      .then(function(res) {
        return res.json().then(function(data) {
          return { ok: res.ok, status: res.status, data: data };
        });
      })
      .then(function(result) {
        if (result.ok && result.data.success) {
          // Redirect to dashboard
          window.location.href = '/admin/dashboard.html';
        } else {
          showError(result.data.error || 'Sign in failed. Please try again.');
          resetSubmit();
        }
      })
      .catch(function(err) {
        showError('Connection error. Make sure the server is running.');
        resetSubmit();
      });
    });
  }

  function showError(msg) {
    if (!authError) return;
    authError.textContent = msg;
    authError.hidden = false;
  }

  function resetSubmit() {
    if (loginSubmit) {
      loginSubmit.classList.remove('is-loading');
      loginSubmit.disabled = false;
    }
  }

});