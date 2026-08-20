const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const supabase = require('../db/supabase');

const router = express.Router();

const os = require('os');
const sessionsFile = process.env.VERCEL ? path.join(os.tmpdir(), 'sessions.json') : path.join(__dirname, '../sessions.json');

function getActiveSessions() {
  try {
    return JSON.parse(fs.readFileSync(sessionsFile, 'utf8'));
  } catch {
    return {};
  }
}

function setActiveSession(userId, sessionId) {
  const sessions = getActiveSessions();
  sessions[userId] = sessionId;
  fs.writeFileSync(sessionsFile, JSON.stringify(sessions, null, 2));
}

function clearActiveSession(userId) {
  const sessions = getActiveSessions();
  delete sessions[userId];
  fs.writeFileSync(sessionsFile, JSON.stringify(sessions, null, 2));
}

const COOKIE_OPTS = {
  httpOnly: true,       // not readable via document.cookie / page inspect JS console
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 8 * 60 * 60 * 1000, // 8 hours
};

router.post('/login', async (req, res) => {
  const { username, password, role } = req.body || {};
  if (!username || !password || !role) {
    return res.status(400).json({ error: 'Username, password, and role are required' });
  }

  if (role === 'manager') {
    const { data: manager } = await supabase
      .from('managers')
      .select('*')
      .eq('username', username)
      .maybeSingle();

    if (manager) {
      const ok = await bcrypt.compare(password, manager.password_hash);
      if (!ok) return res.status(401).json({ error: 'Invalid username or password' });

      const sessionId = crypto.randomUUID();
      setActiveSession(manager.id, sessionId);

      const token = jwt.sign(
        { id: manager.id, role: 'manager', name: manager.name, sessionId },
        process.env.JWT_SECRET,
        { expiresIn: '8h' }
      );
      res.cookie('session', token, COOKIE_OPTS);
      return res.json({ role: 'manager', name: manager.name });
    }
  } else if (role === 'employee') {
    const { data: employee } = await supabase
      .from('employees')
      .select('*')
      .eq('username', username)
      .maybeSingle();

    if (employee) {
      const ok = await bcrypt.compare(password, employee.password_hash);
      if (!ok) return res.status(401).json({ error: 'Invalid username or password' });

      const sessionId = crypto.randomUUID();
      setActiveSession(employee.id, sessionId);

      const token = jwt.sign(
        { id: employee.id, role: 'employee', name: employee.name, manager_id: employee.manager_id, sessionId },
        process.env.JWT_SECRET,
        { expiresIn: '8h' }
      );
      res.cookie('session', token, COOKIE_OPTS);
      return res.json({ role: 'employee', name: employee.name });
    }
  }

  return res.status(401).json({ error: 'Invalid username or password' });
});

router.post('/logout', (req, res) => {
  const token = req.cookies && req.cookies.session;
  if (token) {
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      clearActiveSession(payload.id);
    } catch (e) {
      // invalid token, ignore
    }
  }
  res.clearCookie('session');
  res.json({ ok: true });
});

router.get('/me', (req, res) => {
  const token = req.cookies && req.cookies.session;
  if (!token) return res.status(401).json({ error: 'Not logged in' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if session was overwritten
    const activeSessions = getActiveSessions();
    if (activeSessions[payload.id] && activeSessions[payload.id] !== payload.sessionId) {
      res.clearCookie('session');
      return res.status(401).json({ error: 'Logged in from another device' });
    }

    res.json({ role: payload.role, name: payload.name });
  } catch {
    res.status(401).json({ error: 'Session expired' });
  }
});

module.exports = router;
