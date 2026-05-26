/* ============================================================
   EL-NOVIK — Frontend interactivity
   ============================================================ */

document.addEventListener('DOMContentLoaded', function() {


    
  /* ---------- Helpers ---------- */
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
  function on(el, ev, fn) { if (el) el.addEventListener(ev, fn); }

  /* ============================================================
     1.  Footer year
     ============================================================ */
  var yearEl = $('#footerYear');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ============================================================
     2.  Theme toggle
     ============================================================ */
  var themeToggle = $('#themeToggle');
  var root = document.documentElement;

  function setTheme(theme) {
    if (theme === 'dark') {
      root.setAttribute('data-theme', 'dark');
    } else {
      root.removeAttribute('data-theme');
    }
    try { localStorage.setItem('elnovik-theme', theme); } catch (e) {}
  }

  if (themeToggle) {
    themeToggle.addEventListener('click', function() {
      var current = root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
      setTheme(current === 'dark' ? 'light' : 'dark');
    });
  }

  /* ============================================================
     3.  Sticky header
     ============================================================ */
  var header = $('#siteHeader');
  if (header) {
    var onScroll = function() {
      if (window.scrollY > 8) header.classList.add('is-scrolled');
      else header.classList.remove('is-scrolled');
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ============================================================
     4.  Mobile navigation — right-side drawer
     ============================================================ */
  var navToggle = $('#navToggle');
  var navMobile = $('#navMobile');
  var navMobileBackdrop = $('#navMobileBackdrop');
  var navMobileClose = $('#navMobileClose');

  function closeNavMobile() {
    if (navMobile) navMobile.classList.remove('is-open');
    if (navMobileBackdrop) navMobileBackdrop.classList.remove('is-open');
    if (navToggle) navToggle.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('is-nav-locked');
  }

  function openNavMobile() {
    if (navMobile) navMobile.classList.add('is-open');
    if (navMobileBackdrop) navMobileBackdrop.classList.add('is-open');
    if (navToggle) navToggle.setAttribute('aria-expanded', 'true');
    document.body.classList.add('is-nav-locked');
  }

 if (navToggle) {
    navToggle.addEventListener('click', function() {
      if (!navMobile) return;
      if (window.innerWidth >= 900) return; // Desktop guard — never open on desktop
      if (navMobile.classList.contains('is-open')) closeNavMobile();
      else openNavMobile();
    });
  }

  if (navMobileClose) {
    navMobileClose.addEventListener('click', closeNavMobile);
  }

  if (navMobileBackdrop) {
    navMobileBackdrop.addEventListener('click', closeNavMobile);
  }

  if (navMobile) {
    $$('.nav-mobile-list a, .nav-mobile-cta', navMobile).forEach(function(link) {
      link.addEventListener('click', closeNavMobile);
    });
  }

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && navMobile && navMobile.classList.contains('is-open')) {
      closeNavMobile();
    }
  });

  /* ============================================================
     4.  Mobile drawer — simple and reliable
     ============================================================ */
  var hamburger = document.getElementById('navToggle');
  var drawer = document.getElementById('drawer');
  var drawerBack = document.getElementById('drawerBack');
  var drawerX = document.getElementById('drawerX');

  function openDrawer() {
    if (drawer) drawer.classList.add('show');
    if (drawerBack) drawerBack.classList.add('show');
    if (hamburger) hamburger.setAttribute('aria-expanded', 'true');
    document.body.classList.add('elv-locked');
  }

  function closeDrawer() {
    if (drawer) drawer.classList.remove('show');
    if (drawerBack) drawerBack.classList.remove('show');
    if (hamburger) hamburger.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('elv-locked');
  }

  if (hamburger) {
    hamburger.addEventListener('click', function(e) {
      e.preventDefault();
      // Hard guard — never open drawer on desktop
      if (window.innerWidth >= 900) {
        closeDrawer();
        return;
      }
      if (drawer && drawer.classList.contains('show')) {
        closeDrawer();
      } else {
        openDrawer();
      }
    });
  }

  // On any resize that crosses into desktop, force-close the drawer
  window.addEventListener('resize', function() {
    if (window.innerWidth >= 900) {
      closeDrawer();
    }
  });

  if (drawerX) drawerX.addEventListener('click', closeDrawer);
  if (drawerBack) drawerBack.addEventListener('click', closeDrawer);

  if (drawer) {
    var drawerLinks = drawer.getElementsByTagName('a');
    for (var i = 0; i < drawerLinks.length; i++) {
      drawerLinks[i].addEventListener('click', closeDrawer);
    }
  }

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && drawer && drawer.classList.contains('show')) {
      closeDrawer();
    }
  });

  window.addEventListener('resize', function() {
    if (window.innerWidth >= 900 && drawer && drawer.classList.contains('show')) {
      closeDrawer();
    }
  });

  /* ============================================================
     5.  Product modal
     ============================================================ */
  var productModal = $('#productModal');
  var modalClose = $('#modalClose');
  var modalCategory = $('#modalCategory');
  var modalTitle = $('#modalTitle');
  var modalPrice = $('#modalPrice');
  var modalStock = $('#modalStock');
  var modalDesc = $('#modalDesc');
  var modalMainImg = $('#modalMainImage');
  var modalThumbs = $('#modalThumbs');
  var modalWhatsApp = $('#modalWhatsApp');

  var WHATSAPP_NUMBER = '2349031482001';

  function formatPrice(price) {
    if (!price || price === 0) return 'Price on request';
    return '₦' + Number(price).toLocaleString('en-NG');
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

  function closeModal() {
    if (!productModal) return;
    productModal.classList.remove('is-open');
    productModal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('is-modal-locked');
  }

  function openModalWith(product) {
    if (!productModal || !product) return;

    if (modalCategory) modalCategory.textContent = (product.category || 'Product').toUpperCase();
    if (modalTitle) modalTitle.textContent = product.name || 'Untitled';

    if (modalPrice) {
      modalPrice.textContent = formatPrice(product.price);
      if (product.price) modalPrice.classList.remove('is-poa');
      else modalPrice.classList.add('is-poa');
    }

    if (modalStock) {
      var inStock = product.stock !== false;
      modalStock.textContent = inStock ? 'In stock' : 'Out of stock';
      if (inStock) modalStock.classList.remove('is-out');
      else modalStock.classList.add('is-out');
    }

    if (modalDesc) {
      var desc = product.description || 'Contact us for full product details.';
      modalDesc.innerHTML = '<p>' + escapeHtml(desc).replace(/\n+/g, '</p><p>') + '</p>';
    }

    var images = (product.images && product.images.length) ? product.images : (product.image ? [product.image] : []);
    if (modalMainImg && images.length) {
      modalMainImg.src = images[0];
      modalMainImg.alt = product.name || '';
    }

    if (modalThumbs) {
      modalThumbs.innerHTML = '';
      if (images.length > 1) {
        images.forEach(function(src, i) {
          var thumb = document.createElement('button');
          thumb.className = 'modal-thumb' + (i === 0 ? ' is-active' : '');
          thumb.innerHTML = '<img src="' + escapeHtml(src) + '" alt="" loading="lazy" />';
          thumb.addEventListener('click', function() {
            if (modalMainImg) modalMainImg.src = src;
            $$('.modal-thumb', modalThumbs).forEach(function(t) { t.classList.remove('is-active'); });
            thumb.classList.add('is-active');
          });
          modalThumbs.appendChild(thumb);
        });
      }
    }

    if (modalWhatsApp) {
      var msg = encodeURIComponent('Hi EL-NOVIK, I\'m interested in the ' + product.name + '. Is it available?');
      modalWhatsApp.href = 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + msg;
    }

    productModal.classList.add('is-open');
    productModal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('is-modal-locked');
  }

  if (modalClose) modalClose.addEventListener('click', closeModal);

  if (productModal) {
    $$('[data-close-modal]', productModal).forEach(function(el) {
      el.addEventListener('click', closeModal);
    });
  }

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && productModal && productModal.classList.contains('is-open')) {
      closeModal();
    }
  });

  /* ============================================================
     6.  Product cards + fetch + filter + search
     ============================================================ */
  function renderProductCard(product) {
    var card = document.createElement('button');
    card.className = 'product-card';
    card.type = 'button';
    card.setAttribute('data-category', product.category || 'other');

    var img = (product.images && product.images[0]) || product.image || '';
    var cat = (product.category || '').charAt(0).toUpperCase() + (product.category || '').slice(1);

    card.innerHTML = '' +
      '<div class="product-img-wrap">' +
        (img ? '<img class="product-img" src="' + escapeHtml(img) + '" alt="' + escapeHtml(product.name || '') + '" loading="lazy" />' : '<div class="product-img-placeholder"></div>') +
        (cat ? '<span class="product-chip">' + escapeHtml(cat) + '</span>' : '') +
        (product.featured ? '<span class="product-flag">New</span>' : '') +
      '</div>' +
      '<div class="product-body">' +
        '<h3 class="product-name">' + escapeHtml(product.name || 'Untitled') + '</h3>' +
        '<div class="product-meta">' +
          '<span class="product-price' + (!product.price ? ' is-poa' : '') + '">' + formatPrice(product.price) + '</span>' +
          '<span class="product-view">View<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M13 5l7 7-7 7"/></svg></span>' +
        '</div>' +
      '</div>';

    card.addEventListener('click', function() { openModalWith(product); });
    return card;
  }

  var DEMO_PRODUCTS = [
    { id: 'demo-1', name: 'Talking Drum (Iya Ilu)', category: 'traditional', price: 0,
      description: 'Hand-carved Yoruba talking drum, professionally tuned.',
      images: ['assets/images/traditional.webp'], featured: true },
    { id: 'demo-2', name: 'Acoustic Guitar — Dreadnought', category: 'modern', price: 95000,
      description: 'Solid spruce top, mahogany back and sides. Tested in-shop.',
      images: ['assets/images/modern.webp'] },
    { id: 'demo-3', name: 'Studio Audio Mixer — 12 Channel', category: 'electronics', price: 0,
      description: 'Professional 12-channel mixer for churches, studios, live use.',
      images: ['assets/images/electronics.webp'], featured: true },
    { id: 'demo-4', name: 'Shekere — Traditional', category: 'traditional', price: 18000,
      description: 'Hand-strung shekere, perfect for traditional ensembles.',
      images: ['assets/images/traditional.webp'] },
    { id: 'demo-5', name: 'Digital Keyboard 61-key', category: 'modern', price: 145000,
      description: 'Touch-sensitive 61-key keyboard with weighted feel.',
      images: ['assets/images/modern.webp'] },
    { id: 'demo-6', name: 'XLR Cable — 10m Pro', category: 'electronics', price: 8500,
      description: 'Professional balanced XLR cable. Built for stage and studio.',
      images: ['assets/images/electronics.webp'] }
  ];

  var allProducts = [];
  var activeFilter = 'all';
  var activeSearch = '';

  function fetchProducts() {
    return fetch('/api/products', { cache: 'no-store' })
      .then(function(res) {
        if (!res.ok) throw new Error('API offline');
        return res.json();
      })
      .then(function(data) {
        return Array.isArray(data) ? data : (data.products || []);
      })
      .catch(function() {
        return DEMO_PRODUCTS;
      });
  }

  function updateCounts(products) {
    var counts = { all: products.length, traditional: 0, modern: 0, electronics: 0, accessories: 0 };
    products.forEach(function(p) {
      if (counts.hasOwnProperty(p.category)) counts[p.category]++;
    });
    function setCount(id, n) {
      var el = $('#' + id);
      if (el) el.textContent = n;
    }
    setCount('countAll', counts.all);
    setCount('countTraditional', counts.traditional);
    setCount('countModern', counts.modern);
    setCount('countElectronics', counts.electronics);
    setCount('countAccessories', counts.accessories);
  }

  var productGrid = $('#productGrid');
  var productEmpty = $('#productEmpty');
  var productSearch = $('#productSearch');
  var filterChips = $$('.filter-chip');
  var clearFiltersBtn = $('#clearFilters');

  function filterAndRender() {
    if (!productGrid) return;
    var filtered = allProducts;
    if (activeFilter !== 'all') {
      filtered = filtered.filter(function(p) { return p.category === activeFilter; });
    }
    if (activeSearch) {
      var q = activeSearch.toLowerCase();
      filtered = filtered.filter(function(p) {
        return (p.name || '').toLowerCase().indexOf(q) > -1 ||
               (p.description || '').toLowerCase().indexOf(q) > -1;
      });
    }
    productGrid.innerHTML = '';
    if (!filtered.length) {
      if (productEmpty) productEmpty.hidden = false;
      return;
    }
    if (productEmpty) productEmpty.hidden = true;
    filtered.forEach(function(p) { productGrid.appendChild(renderProductCard(p)); });
  }

  filterChips.forEach(function(chip) {
    chip.addEventListener('click', function() {
      filterChips.forEach(function(c) {
        c.classList.remove('is-active');
        c.setAttribute('aria-pressed', 'false');
      });
      chip.classList.add('is-active');
      chip.setAttribute('aria-pressed', 'true');
      activeFilter = chip.getAttribute('data-filter') || 'all';
      filterAndRender();
    });
  });

  if (productSearch) {
    var searchTimer;
    productSearch.addEventListener('input', function(e) {
      clearTimeout(searchTimer);
      var val = e.target.value;
      searchTimer = setTimeout(function() {
        activeSearch = (val || '').trim();
        filterAndRender();
      }, 180);
    });
  }

  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener('click', function() {
      activeFilter = 'all';
      activeSearch = '';
      if (productSearch) productSearch.value = '';
      filterChips.forEach(function(c) {
        var isAll = c.getAttribute('data-filter') === 'all';
        if (isAll) {
          c.classList.add('is-active');
          c.setAttribute('aria-pressed', 'true');
        } else {
          c.classList.remove('is-active');
          c.setAttribute('aria-pressed', 'false');
        }
      });
      filterAndRender();
    });
  }

  if (productGrid) {
    fetchProducts().then(function(products) {
      allProducts = products;
      updateCounts(products);

      var urlParams = new URLSearchParams(window.location.search);
      var urlCategory = urlParams.get('category');

      if (urlCategory) {
        var chip = null;
        for (var i = 0; i < filterChips.length; i++) {
          if (filterChips[i].getAttribute('data-filter') === urlCategory) {
            chip = filterChips[i];
            break;
          }
        }
        if (chip) chip.click();
        else filterAndRender();
      } else {
        filterAndRender();
      }
    });
  }

});


