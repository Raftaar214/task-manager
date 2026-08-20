const express = require('express');
const bcrypt = require('bcryptjs');
const supabase = require('../db/supabase');
const requireAuth = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth('manager'));

// ---- Employees ----

router.get('/employees', async (req, res) => {
  const { data, error } = await supabase
    .from('employees')
    .select('id, name, username, created_at')
    .eq('manager_id', req.user.id)
    .order('created_at', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post('/employees', async (req, res) => {
  const { name, username, password } = req.body || {};
  if (!name || !username || !password) {
    return res.status(400).json({ error: 'name, username and password are required' });
  }

  const password_hash = await bcrypt.hash(password, 10);
  const { data, error } = await supabase
    .from('employees')
    .insert({ manager_id: req.user.id, name, username, password_hash })
    .select('id, name, username, created_at')
    .single();

  if (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'Username already taken' });
    return res.status(500).json({ error: error.message });
  }
  res.status(201).json(data);
});

// Removing an employee also removes their tasks (DB foreign key ON DELETE CASCADE),
// so no orphaned task rows are left behind.
router.delete('/employees/:id', async (req, res) => {
  const { error } = await supabase
    .from('employees')
    .delete()
    .eq('id', req.params.id)
    .eq('manager_id', req.user.id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

router.post('/employees/:id/password', async (req, res) => {
  const { password } = req.body || {};
  if (!password) {
    return res.status(400).json({ error: 'password is required' });
  }

  const password_hash = await bcrypt.hash(password, 10);
  const { data, error } = await supabase
    .from('employees')
    .update({ password_hash })
    .eq('id', req.params.id)
    .eq('manager_id', req.user.id)
    .select('id')
    .single();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Employee not found' });
  
  res.json({ ok: true });
});

// ---- Tasks ----

// All tasks this manager has assigned, grouped by status, newest first.
router.get('/tasks', async (req, res) => {
  const { data, error } = await supabase
    .from('tasks')
    .select('id, title, description, status, created_at, updated_at, employee_id, employees(name, username)')
    .eq('manager_id', req.user.id)
    .order('updated_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post('/tasks', async (req, res) => {
  const { employee_id, title, description } = req.body || {};
  if (!employee_id || !title) {
    return res.status(400).json({ error: 'employee_id and title are required' });
  }

  // Make sure the employee actually belongs to this manager.
  const { data: employee } = await supabase
    .from('employees')
    .select('id')
    .eq('id', employee_id)
    .eq('manager_id', req.user.id)
    .maybeSingle();
  if (!employee) return res.status(404).json({ error: 'Employee not found' });

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      manager_id: req.user.id,
      employee_id,
      title,
      description: description || '',
      status: 'pending',
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// Manager reviews a completed task. approve -> history. reject -> back to open
// so the employee can revisit it.
router.post('/tasks/:id/review', async (req, res) => {
  const { approve } = req.body || {};
  const nextStatus = approve ? 'history' : 'open';

  const { data, error } = await supabase
    .from('tasks')
    .update({ status: nextStatus, updated_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .eq('manager_id', req.user.id)
    .eq('status', 'completed')
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Task not found or not awaiting review' });
  res.json(data);
});

router.delete('/tasks/:id', async (req, res) => {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', req.params.id)
    .eq('manager_id', req.user.id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

module.exports = router;
