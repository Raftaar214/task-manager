const express = require('express');
const supabase = require('../db/supabase');
const requireAuth = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth('employee'));

// Employee only ever sees their own tasks (filtered by employee_id from their
// own session token, not something the client can change).
router.get('/tasks', async (req, res) => {
  const { data, error } = await supabase
    .from('tasks')
    .select('id, title, description, status, created_at, updated_at')
    .eq('employee_id', req.user.id)
    .order('updated_at', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Opening a pending task moves it to "open".
router.post('/tasks/:id/open', async (req, res) => {
  const { data, error } = await supabase
    .from('tasks')
    .update({ status: 'open', updated_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .eq('employee_id', req.user.id)
    .eq('status', 'pending')
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Task not found or already opened' });
  res.json(data);
});

// Marking an open task complete sends it to the manager for review.
router.post('/tasks/:id/complete', async (req, res) => {
  const { data, error } = await supabase
    .from('tasks')
    .update({ status: 'completed', updated_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .eq('employee_id', req.user.id)
    .eq('status', 'open')
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Task not found or not currently open' });
  res.json(data);
});

module.exports = router;
