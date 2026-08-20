require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');

const authRoutes = require('./routes/auth');
const managerRoutes = require('./routes/manager');
const employeeRoutes = require('./routes/employee');

const app = express();

app.use(express.json());
app.use(cookieParser());

// Static frontend (plain HTML/CSS/JS — no credentials ever embedded in it,
// everything sensitive stays server-side).
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth', authRoutes);
app.use('/api/manager', managerRoutes);
app.use('/api/employee', employeeRoutes);

app.get('/health', (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;
