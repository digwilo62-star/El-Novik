/* ============================================================
   EL-NOVIK Admin Dashboard
   Tab switching, uploads, lists, delete actions
   ============================================================ */

document.addEventListener('DOMContentLoaded', function() {

  /* ---------- Auth guard — verify token before showing anything ---------- */
  fetch('/api/me', { credentials: 'include' })
    .then(function(res) {
      if (!res.ok) {
        window.location.href = '/admin/login.html';
      }
    })
    .catch(function() {
      window.location.href = '/admin/login.html';
    });

  /* ---------- Helpers ---------- */
  function $(sel) { return document.querySelector(sel); }
  function $$(sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); }

  function showToast(toastEl, message, type) {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.className = 'admin-toast is-' + type;
    toastEl.hidden = false;
    setTimeout(function() {
      toastEl.hidden = true;
    }, 4500);
  }

  function setLoading(btn, on) {
    if (!btn) return;
    if (on) {
      btn.classList.add('is-loading');
      btn.disabled = true;
    } else {
      btn.classList.remove('is-loading');
      btn.disabled = false;
    }
  }

  function formatNaira(n) {
    if (!n) return 'Price on request';
    return '₦' + Number(n).toLocaleString('en-NG');
  }

  /* ============================================================
     TAB SWITCHING
     ============================================================ */
  var tabs = $$('.admin-tab');
  var panels = {
    products: $('#panelProducts'),
    gallery: $('#panelGallery')
  };

  tabs.forEach(function(tab) {
    tab.addEventListener('click', function() {
      var name = tab.getAttribute('data-tab');

      tabs.forEach(function(t) {
        t.classList.remove('is-active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('is-active');
      tab.setAttribute('aria-selected', 'true');

      Object.keys(panels).forEach(function(key) {
        if (panels[key]) panels[key].classList.remove('is-active');
      });
      if (panels[name]) panels[name].classList.add('is-active');
    });
  });

  /* ============================================================
     LOGOUT
     ============================================================ */
  var logoutBtn = $('#logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function() {
      fetch('/api/logout', { method: 'POST', credentials: 'include' })
        .then(function() { window.location.href = '/admin/login.html'; })
        .catch(function() { window.location.href = '/admin/login.html'; });
    });
  }

  /* ============================================================
     UPLOAD ZONE — generic drag/drop + preview manager
     ============================================================ */
  function setupUploadZone(zoneId, inputId, previewsId, options) {
    var zone = document.getElementById(zoneId);
    var input = document.getElementById(inputId);
    var previews = document.getElementById(previewsId);
    if (!zone || !input || !previews) return null;

    var files = [];
    var maxFiles = (options && options.maxFiles) || 5;

    function render() {
      previews.innerHTML = '';
      files.forEach(function(file, idx) {
        var wrap = document.createElement('div');
        wrap.className = 'upload-preview';

        var isVideo = file.type.indexOf('video/') === 0;
        var url = URL.createObjectURL(file);

        if (isVideo) {
          var v = document.createElement('video');
          v.src = url;
          v.muted = true;
          wrap.appendChild(v);
        } else {
          var img = document.createElement('img');
          img.src = url;
          img.alt = '';
          wrap.appendChild(img);
        }

        var removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'upload-preview-remove';
        removeBtn.innerHTML = '×';
        removeBtn.setAttribute('aria-label', 'Remove');
        removeBtn.addEventListener('click', function() {
          files.splice(idx, 1);
          render();
        });
        wrap.appendChild(removeBtn);

        previews.appendChild(wrap);
      });
    }

    function addFiles(newFiles) {
      var arr = Array.prototype.slice.call(newFiles);
      arr.forEach(function(f) {
        if (files.length < maxFiles) files.push(f);
      });
      render();
    }

    zone.addEventListener('click', function() {
      input.click();
    });

    input.addEventListener('change', function(e) {
      if (e.target.files && e.target.files.length) {
        addFiles(e.target.files);
        input.value = '';
      }
    });

    zone.addEventListener('dragover', function(e) {
      e.preventDefault();
      zone.classList.add('is-drag');
    });
    zone.addEventListener('dragleave', function() {
      zone.classList.remove('is-drag');
    });
    zone.addEventListener('drop', function(e) {
      e.preventDefault();
      zone.classList.remove('is-drag');
      if (e.dataTransfer && e.dataTransfer.files) {
        addFiles(e.dataTransfer.files);
      }
    });

    return {
      getFiles: function() { return files; },
      clear: function() { files = []; render(); }
    };
  }

  var productUpload = setupUploadZone('productDropZone', 'p-images', 'productPreviews', { maxFiles: 5 });
  var galleryUpload = setupUploadZone('galleryDropZone', 'g-media', 'galleryPreviews', { maxFiles: 10 });

  /* ============================================================
     PRODUCT FORM SUBMIT
     ============================================================ */
  var productForm = $('#productForm');
  var productSubmit = $('#productSubmit');
  var productReset = $('#productReset');
  var productToast = $('#productToast');

  if (productForm) {
    productForm.addEventListener('submit', function(e) {
      e.preventDefault();

      var name = $('#p-name').value.trim();
      var category = $('#p-category').value;
      var files = productUpload ? productUpload.getFiles() : [];

      if (!name || !category) {
        showToast(productToast, 'Please fill in the product name and category.', 'error');
        return;
      }
      if (!files.length) {
        showToast(productToast, 'Please add at least one product image.', 'error');
        return;
      }

      var formData = new FormData();
      formData.append('name', name);
      formData.append('category', category);
      formData.append('price', $('#p-price').value || '0');
      formData.append('description', $('#p-description').value.trim());
      formData.append('stock', $('#p-stock').value);
      files.forEach(function(file) {
        formData.append('images', file);
      });

      setLoading(productSubmit, true);

      fetch('/api/products', {
        method: 'POST',
        credentials: 'include',
        body: formData
      })
      .then(function(res) {
        return res.json().then(function(data) {
          return { ok: res.ok, data: data };
        });
      })
      .then(function(result) {
        setLoading(productSubmit, false);
        if (result.ok) {
          showToast(productToast, 'Product published successfully.', 'success');
          productForm.reset();
          if (productUpload) productUpload.clear();
          loadProducts();
        } else {
          showToast(productToast, result.data.error || 'Upload failed.', 'error');
        }
      })
      .catch(function(err) {
        setLoading(productSubmit, false);
        showToast(productToast, 'Network error. Try again.', 'error');
      });
    });
  }

  if (productReset) {
    productReset.addEventListener('click', function() {
      if (productUpload) productUpload.clear();
    });
  }

  /* ============================================================
     GALLERY FORM SUBMIT
     ============================================================ */
  var galleryForm = $('#galleryForm');
  var gallerySubmit = $('#gallerySubmit');
  var galleryReset = $('#galleryReset');
  var galleryToast = $('#galleryToast');

  if (galleryForm) {
    galleryForm.addEventListener('submit', function(e) {
      e.preventDefault();

      var files = galleryUpload ? galleryUpload.getFiles() : [];
      if (!files.length) {
        showToast(galleryToast, 'Please add at least one photo or video.', 'error');
        return;
      }

      var formData = new FormData();
      formData.append('caption', $('#g-caption').value.trim());
      files.forEach(function(file) {
        formData.append('media', file);
      });

      setLoading(gallerySubmit, true);

      fetch('/api/gallery', {
        method: 'POST',
        credentials: 'include',
        body: formData
      })
      .then(function(res) {
        return res.json().then(function(data) {
          return { ok: res.ok, data: data };
        });
      })
      .then(function(result) {
        setLoading(gallerySubmit, false);
        if (result.ok) {
          showToast(galleryToast, 'Uploaded to gallery successfully.', 'success');
          galleryForm.reset();
          if (galleryUpload) galleryUpload.clear();
          loadGallery();
        } else {
          showToast(galleryToast, result.data.error || 'Upload failed.', 'error');
        }
      })
      .catch(function(err) {
        setLoading(gallerySubmit, false);
        showToast(galleryToast, 'Network error. Try again.', 'error');
      });
    });
  }

  if (galleryReset) {
    galleryReset.addEventListener('click', function() {
      if (galleryUpload) galleryUpload.clear();
    });
  }

  /* ============================================================
     LOAD AND RENDER EXISTING PRODUCTS
     ============================================================ */
  var productsList = $('#productsList');
  var productsCount = $('#productsCount');

  function loadProducts() {
    fetch('/api/products', { credentials: 'include' })
      .then(function(res) { return res.json(); })
      .then(function(products) {
        if (productsCount) productsCount.textContent = products.length;
        if (!productsList) return;

        if (!products.length) {
          productsList.innerHTML = '<div class="admin-empty"><p>No products yet. Add your first one above.</p></div>';
          return;
        }

        productsList.innerHTML = '';
        products.forEach(function(p) {
          var item = document.createElement('div');
          item.className = 'admin-item';

          var thumb = (p.images && p.images[0] && p.images[0].thumb) || p.image || '';

          item.innerHTML = '' +
            '<div class="admin-item-thumb">' +
              (thumb ? '<img src="' + thumb + '" alt="" />' : '') +
            '</div>' +
            '<div class="admin-item-text">' +
              '<span class="admin-item-name">' + escapeHtml(p.name) + '</span>' +
              '<span class="admin-item-meta">' + escapeHtml((p.category || '').toUpperCase()) + ' &middot; ' + formatNaira(p.price) + (p.stock === false ? ' &middot; Out of stock' : '') + '</span>' +
            '</div>' +
            '<button class="admin-item-delete" data-id="' + p.id + '" aria-label="Delete">' +
              '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>' +
            '</button>';

          productsList.appendChild(item);
        });

        // Attach delete handlers
        $$('.admin-item-delete', productsList).forEach(function(btn) {
          btn.addEventListener('click', function() {
            var id = btn.getAttribute('data-id');
            if (!confirm('Delete this product? This cannot be undone.')) return;
            fetch('/api/products/' + id, { method: 'DELETE', credentials: 'include' })
              .then(function() { loadProducts(); })
              .catch(function() { alert('Delete failed.'); });
          });
        });
      })
      .catch(function() {
        if (productsList) productsList.innerHTML = '<div class="admin-empty"><p>Failed to load products.</p></div>';
      });
  }

  /* ============================================================
     LOAD AND RENDER GALLERY
     ============================================================ */
  var galleryList = $('#galleryList');
  var galleryCount = $('#galleryCount');

  function loadGallery() {
    fetch('/api/gallery', { credentials: 'include' })
      .then(function(res) { return res.json(); })
      .then(function(items) {
        if (galleryCount) galleryCount.textContent = items.length;
        if (!galleryList) return;

        if (!items.length) {
          galleryList.innerHTML = '<div class="admin-empty"><p>No gallery items yet. Upload your first above.</p></div>';
          return;
        }

        galleryList.innerHTML = '';
        items.forEach(function(g) {
          var item = document.createElement('div');
          item.className = 'admin-item';

          var thumbHtml;
          if (g.type === 'video') {
            thumbHtml =
              '<video src="' + g.src + '" muted></video>' +
              '<span class="admin-item-video-badge">' +
                '<svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>' +
              '</span>';
          } else {
            thumbHtml = '<img src="' + (g.thumb || g.src) + '" alt="" />';
          }

          item.innerHTML = '' +
            '<div class="admin-item-thumb">' + thumbHtml + '</div>' +
            '<div class="admin-item-text">' +
              '<span class="admin-item-name">' + escapeHtml(g.caption || (g.type === 'video' ? 'Video' : 'Photo')) + '</span>' +
              '<span class="admin-item-meta">' + g.type.toUpperCase() + '</span>' +
            '</div>' +
            '<button class="admin-item-delete" data-id="' + g.id + '" aria-label="Delete">' +
              '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>' +
            '</button>';

          galleryList.appendChild(item);
        });

        $$('.admin-item-delete', galleryList).forEach(function(btn) {
          btn.addEventListener('click', function() {
            var id = btn.getAttribute('data-id');
            if (!confirm('Delete this gallery item? This cannot be undone.')) return;
            fetch('/api/gallery/' + id, { method: 'DELETE', credentials: 'include' })
              .then(function() { loadGallery(); })
              .catch(function() { alert('Delete failed.'); });
          });
        });
      })
      .catch(function() {
        if (galleryList) galleryList.innerHTML = '<div class="admin-empty"><p>Failed to load gallery.</p></div>';
      });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Initial load
  loadProducts();
  loadGallery();

});