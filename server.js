/* ============================================================
   EL-NOVIK Server
   - Serves the public site
   - Handles admin login
   - Accepts product + gallery uploads
   - Resizes images automatically
   ============================================================ */

require('dotenv').config();

const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const sharp = require('sharp');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser'); 
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary from .env
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const app = express();
const PORT = process.env.PORT || 3000;

/* ---------- Config from .env ---------- */
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'changeme';
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-me';

// Pre-hash the admin password so we never compare plaintext
const ADMIN_PASSWORD_HASH = bcrypt.hashSync(ADMIN_PASSWORD, 10);

/* ---------- Paths ---------- */
const DATA_DIR = path.join(__dirname, 'data');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json');
const GALLERY_FILE = path.join(DATA_DIR, 'gallery.json');

// Make sure JSON "database" files exist
function ensureFile(filepath, fallback) {
  if (!fs.existsSync(filepath)) {
    fs.writeFileSync(filepath, JSON.stringify(fallback, null, 2));
  }
}
ensureFile(PRODUCTS_FILE, []);
ensureFile(GALLERY_FILE, []);

/* ---------- Middleware ---------- */
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

// Serve public site (everything at top level)
app.use(express.static(path.join(__dirname), {
  extensions: ['html'],
  index: 'index.html'
}));

// Serve uploaded files
app.use('/uploads', express.static(UPLOADS_DIR));

/* ---------- Helpers: read/write JSON ---------- */
function readJSON(filepath) {
  try {
    return JSON.parse(fs.readFileSync(filepath, 'utf-8'));
  } catch (err) {
    return [];
  }
}
function writeJSON(filepath, data) {
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
}
function nextId(items) {
  if (!items.length) return 1;
  return Math.max(...items.map(i => i.id || 0)) + 1;
}

/* ---------- Authentication ---------- */
function requireAuth(req, res, next) {
  const token = req.cookies && req.cookies.elv_token;
  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid session' });
  }
}

/* ---------- Multer (file uploads) ---------- */
const uploadStorage = multer.memoryStorage();
const upload = multer({
  storage: uploadStorage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB max per file
});

/* ---------- Image processing ---------- */
async function saveResizedImage(buffer, filename, folder) {
  // Resize/compress with sharp first (keeps uploads fast + small)
  const optimized = await sharp(buffer)
    .resize({ width: 1600, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();

  // Upload the optimized image to Cloudinary
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'elnovik/' + folder,
        resource_type: 'image',
        format: 'webp'
      },
      (error, result) => {
        if (error) {
          console.error('Cloudinary image error:', error);
          return reject(error);
        }
        const base = result.secure_url;
        const sized = function(w) {
          return base.replace('/upload/', '/upload/w_' + w + ',c_limit,q_auto,f_webp/');
        };
        resolve({
          thumb: sized(400),
          card:  sized(800),
          full:  result.secure_url
        });
      }
    );
    uploadStream.end(optimized);
  });
}

async function saveVideo(buffer, filename, folder) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'elnovik/' + folder,
        resource_type: 'video'
      },
      (error, result) => {
        if (error) {
          console.error('Cloudinary video error:', error);
          return reject(error);
        }
        resolve(result.secure_url);
      }
    );
    uploadStream.end(buffer);
  });
}
/* ============================================================
   PUBLIC API  (no login required)
   ============================================================ */

// List all products (used by products.html)
app.get('/api/products', (req, res) => {
  const products = readJSON(PRODUCTS_FILE);
  // Sort newest first
  products.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  res.json(products);
});

// List all gallery items (used by gallery.html)
app.get('/api/gallery', (req, res) => {
  const items = readJSON(GALLERY_FILE);
  items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  res.json(items);
});

/* ============================================================
   AUTH API
   ============================================================ */

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  if (username !== ADMIN_USERNAME) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const valid = bcrypt.compareSync(password, ADMIN_PASSWORD_HASH);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Create a token good for 24 hours
  const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '24h' });

  const isProduction = process.env.NODE_ENV === 'production' || !!process.env.RENDER;

  res.cookie('elv_token', token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000
  });

  res.json({ success: true });
});

app.post('/api/logout', (req, res) => {
  const isProduction = process.env.NODE_ENV === 'production' || !!process.env.RENDER;
  res.clearCookie('elv_token', {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax'
  });
  res.json({ success: true });
});

app.get('/api/me', requireAuth, (req, res) => {
  res.json({ username: req.user.username });
});

/* ============================================================
   ADMIN API  (login required)
   ============================================================ */

// --- Products ---

app.post('/api/products', requireAuth, upload.array('images', 5), async (req, res) => {
  try {
    const { name, category, price, description, stock } = req.body;
    if (!name || !category) {
      return res.status(400).json({ error: 'Name and category are required' });
    }

    const files = req.files || [];
    const imageObjects = [];
    for (const file of files) {
      const sized = await saveResizedImage(file.buffer, file.originalname, 'products');
      imageObjects.push({
        thumb: sized.thumb,
        card:  sized.card,
        full:  sized.full
      });
    }

    const products = readJSON(PRODUCTS_FILE);
    const newProduct = {
      id: nextId(products),
      name: name.trim(),
      category: category.trim().toLowerCase(),
      price: price ? Number(price) : 0,
      description: description ? description.trim() : '',
      stock: stock === 'false' ? false : true,
      images: imageObjects,
      image: imageObjects.length ? imageObjects[0].card : null,
      createdAt: Date.now()
    };

    products.push(newProduct);
    writeJSON(PRODUCTS_FILE, products);

    res.status(201).json(newProduct);
  } catch (err) {
    console.error('Product upload error:', err);
    res.status(500).json({ error: 'Upload failed: ' + err.message });
  }
});

app.delete('/api/products/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const products = readJSON(PRODUCTS_FILE);
  const product = products.find(p => p.id === id);
  if (!product) return res.status(404).json({ error: 'Not found' });

  // Delete files from disk
  if (product.images && product.images.length) {
    product.images.forEach(img => {
      ['thumb', 'card', 'full'].forEach(size => {
        if (img[size]) {
          const filepath = path.join(__dirname, img[size]);
          if (fs.existsSync(filepath)) {
            try { fs.unlinkSync(filepath); } catch (e) {}
          }
        }
      });
    });
  }

  const remaining = products.filter(p => p.id !== id);
  writeJSON(PRODUCTS_FILE, remaining);
  res.json({ success: true });
});

// --- Gallery ---

app.post('/api/gallery', requireAuth, upload.array('media', 10), async (req, res) => {
  try {
    const { caption } = req.body;
    const files = req.files || [];
    if (!files.length) return res.status(400).json({ error: 'No files provided' });

    const items = readJSON(GALLERY_FILE);
    const newItems = [];

    for (const file of files) {
      const isVideo = file.mimetype.startsWith('video/');
      let entry;

      if (isVideo) {
        const videoUrl = await saveVideo(file.buffer, file.originalname, 'gallery');
        entry = {
          id: nextId(items.concat(newItems)),
          type: 'video',
          src: videoUrl,
          caption: caption ? caption.trim() : '',
          createdAt: Date.now()
        };
      } else {
        const sized = await saveResizedImage(file.buffer, file.originalname, 'gallery');
        entry = {
          id: nextId(items.concat(newItems)),
          type: 'photo',
          thumb: sized.thumb,
          card:  sized.card,
          full:  sized.full,
          src:   sized.full,
          caption: caption ? caption.trim() : '',
          createdAt: Date.now()
        };
      }
      newItems.push(entry);
    }

    const updated = items.concat(newItems);
    writeJSON(GALLERY_FILE, updated);

    res.status(201).json(newItems);
  } catch (err) {
    console.error('Gallery upload error:', err);
    res.status(500).json({ error: 'Upload failed: ' + err.message });
  }
});

app.delete('/api/gallery/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const items = readJSON(GALLERY_FILE);
  const item = items.find(i => i.id === id);
  if (!item) return res.status(404).json({ error: 'Not found' });

  // Delete files
  const filesToDelete = item.type === 'video'
    ? [item.src]
    : [item.thumb, item.card, item.full].filter(Boolean);

  filesToDelete.forEach(rel => {
    const filepath = path.join(__dirname, rel);
    if (fs.existsSync(filepath)) {
      try { fs.unlinkSync(filepath); } catch (e) {}
    }
  });

  const remaining = items.filter(i => i.id !== id);
  writeJSON(GALLERY_FILE, remaining);
  res.json({ success: true });
});

/* ============================================================
   ADMIN PAGE PROTECTION
   Anyone trying /admin (without /admin/login.html) → redirect
   ============================================================ */

app.get('/admin', (req, res) => {
  const token = req.cookies && req.cookies.elv_token;
  if (token) {
    try {
      jwt.verify(token, JWT_SECRET);
      return res.redirect('/admin/dashboard.html');
    } catch (e) {}
  }
  res.redirect('/admin/login.html');
});

/* ============================================================
   START
   ============================================================ */

app.listen(PORT, () => {
  console.log('');
  console.log('  ╔════════════════════════════════════════╗');
  console.log('  ║   EL-NOVIK server running              ║');
  console.log('  ╠════════════════════════════════════════╣');
  console.log(`  ║   Public site:  http://localhost:${PORT}   ║`);
  console.log(`  ║   Admin login:  http://localhost:${PORT}/admin  ║`);
  console.log('  ╚════════════════════════════════════════╝');
  console.log('');
});