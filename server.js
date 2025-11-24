// server.js
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const db = require('./db/connect');
const { exec } = require('child_process');

const swaggerUi = require('swagger-ui-express');
const swaggerDoc = require('./swagger/swagger.json');

const { auth } = require('express-openid-connect');

const app = express();
const PORT = process.env.PORT || 8080;
const isProd = process.env.NODE_ENV === 'production';

// Trim environment variables
const BASE_URL = process.env.BASE_URL.trim();
const ISSUER_BASE_URL = process.env.AUTH0_ISSUER_BASE_URL.trim();
const AUTH0_CLIENT_ID = process.env.AUTH0_CLIENT_ID.trim();
const AUTH0_SECRET = process.env.AUTH0_SECRET.trim();

console.log("Auth0 config:", {
  BASE_URL,
  ISSUER_BASE_URL,
  AUTH0_CLIENT_ID_SET: !!AUTH0_CLIENT_ID,
  AUTH0_SECRET_SET: !!AUTH0_SECRET
});

app.use(express.json());
app.use(cors());

// Auth0 middleware
app.use(
  auth({
    authRequired: false,
    auth0Logout: true,
    baseURL: BASE_URL,
    clientID: AUTH0_CLIENT_ID,
    issuerBaseURL: ISSUER_BASE_URL,
    secret: AUTH0_SECRET,
  })
);

// 🔥 FORCE /login route to work manually
app.get('/login', (req, res) => {
  return res.oidc.login({
    returnTo: '/api-docs'
  });
});

// 🔥 FORCE /logout route to work manually
app.get('/logout', (req, res) => {
  return res.oidc.logout({
    returnTo: BASE_URL
  });
});

// Root route → Auto redirect to login or docs
app.get('/', (req, res) => {
  if (req.oidc.isAuthenticated()) {
    return res.redirect('/api-docs');
  }
  return res.redirect('/login');
});

// Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc));

// Routes
app.use('/api/people', require('./routes/people'));
app.use('/api/companies', require('./routes/companies'));

db.initDb((err) => {
  if (err) {
    console.error('DB init failed:', err);
    process.exit(1);
  }

  const listenArgs = isProd ? [PORT] : [PORT, 'localhost'];

  app.listen(...listenArgs, () => {
    const url = `${BASE_URL}`;
    console.log(`🚀 Server running at ${url}`);
  });
});

