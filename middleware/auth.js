// middleware/auth.js

// Protect specific routes using req.oidc set by express-openid-connect in server.js
const requiresAuth = (req, res, next) => {
  if (!req.oidc || !req.oidc.isAuthenticated || !req.oidc.isAuthenticated()) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  next();
};

module.exports = { requiresAuth };