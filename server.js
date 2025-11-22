// server.js
const path = require('path');
// Load .env first
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const db = require('./db/connect');
const { exec } = require('child_process');

const swaggerUi = require('swagger-ui-express');
const swaggerDoc = require('./swagger/swagger.json');

// 🔐 NEW: OAuth via Auth0
const { auth } = require('express-openid-connect');

const app = express();
const PORT = process.env.PORT || 8080;
const isProd = process.env.NODE_ENV === 'production';

// ──────────────────────────────────────────────
//  Basic Middleware
// ──────────────────────────────────────────────
app.use(express.json());
app.use(cors());

// 🔍 Debug: log Auth0 env values at startup
console.log("Auth0 config on startup:", {
  BASE_URL: process.env.BASE_URL,
  AUTH0_ISSUER_BASE_URL: process.env.AUTH0_ISSUER_BASE_URL,
  AUTH0_CLIENT_ID: !!process.env.AUTH0_CLIENT_ID,
  AUTH0_SECRET: !!process.env.AUTH0_SECRET
});

// 🔐 NEW: OAuth Middleware
app.use(
  auth({
    authRequired: false,
    auth0Logout: true,
    baseURL: process.env.BASE_URL,
    clientID: process.env.AUTH0_CLIENT_ID,
    issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL,
    secret: process.env.AUTH0_SECRET,
  })
);

// 🔐 NEW: OAuth Middleware (adds /login, /logout, /callback)
app.use(
  auth({
    authRequired: false,                // public routes allowed
    auth0Logout: true,
    baseURL: process.env.BASE_URL,      // http://localhost:8080
    clientID: process.env.AUTH0_CLIENT_ID,
    issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL,
    secret: process.env.AUTH0_SECRET,
  })
);

// OPTIONAL: Test profile route (useful for your video)
app.get('/profile', (req, res) => {
  if (!req.oidc || !req.oidc.isAuthenticated()) {
    return res.status(401).json({ message: "Not logged in" });
  }
  res.json(req.oidc.user);
});

// Dev request log
if (!isProd) {
  app.use((req, _res, next) => {
    console.log('> Incoming:', req.method, ' ', req.url);
    next();
  });
}

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc));

// Health check
app.get('/', (_req, res) => res.json({ ok: true, docs: '/api-docs' }));

// ──────────────────────────────────────────────
//  API ROUTES
// ──────────────────────────────────────────────
const peopleRoutes = require('./routes/people');
app.use('/api/people', peopleRoutes);

const companiesRoutes = require('./routes/companies');
app.use('/api/companies', companiesRoutes);

// Auto-open browser when local
function openBrowser(url) {
  if (isProd) return;
  const platform = process.platform;
  if (platform === 'win32') exec(`start "" "${url}"`);
  else if (platform === 'darwin') exec(`open "${url}"`);
  else exec(`xdg-open "${url}"`);
}

// Start DB + server
db.initDb((err) => {
  if (err) {
    console.error('❌ DB init failed:', err);
    process.exit(1);
  }

  const listenArgs = isProd ? [PORT] : [PORT, 'localhost'];

  app.listen(...listenArgs, () => {
    const url = `http://localhost:${PORT}`;
    console.log(`🚀 Server running at ${url}`);
    openBrowser(url);
  });
});
