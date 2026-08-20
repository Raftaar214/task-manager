const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const sessionsFile = path.join(__dirname, '../sessions.json');

// Reads the session token from an httpOnly cookie (never accessible to
// page-inspect / localStorage / client JS), verifies it, and attaches
// { id, role, name } to req.user.
function requireAuth(role) {
  return (req, res, next) => {
    const token = req.cookies && req.cookies.session;
    if (!token) return res.status(401).json({ error: 'Not logged in' });

    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      
      // Force logout check
      try {
        const sessions = JSON.parse(fs.readFileSync(sessionsFile, 'utf8'));
        if (sessions[payload.id] && sessions[payload.id] !== payload.sessionId) {
          res.clearCookie('session');
          return res.status(401).json({ error: 'Logged in from another device' });
        }
      } catch (e) {
        // file missing or corrupt, ignore
      }

      if (role && payload.role !== role) {
        return res.status(403).json({ error: 'Not authorized' });
      }
      req.user = payload;
      next();
    } catch (err) {
      return res.status(401).json({ error: 'Session expired, please log in again' });
    }
  };
}

module.exports = requireAuth;
