// middleware/auth.js

// This middleware protects routes using Auth0 login.
// It checks if the user is authenticated before allowing the request.

const requiresAuth = (req, res, next) => {
  if (!req.oidc || !req.oidc.isAuthenticated()) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
};

module.exports = { requiresAuth };
