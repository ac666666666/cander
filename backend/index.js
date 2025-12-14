const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

// 获取所有事件
app.get('/api/events', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM events');
    const events = rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      location: row.location,
      start: row.start_time,
      end: row.end_time,
      timezone: row.timezone,
      allDay: Boolean(row.all_day),
      recurrence: {
        rrule: row.recurrence_rule,
        exdates: row.recurrence_exdates ? JSON.parse(row.recurrence_exdates) : undefined
      },
      alarms: row.alarms, // mysql2 自动解析 JSON 列
      notificationIds: row.notification_ids
    }));
    res.json(events);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// 创建事件
app.post('/api/events', async (req, res) => {
  const event = req.body;
  try {
    await db.query(
      `INSERT INTO events 
      (id, title, description, location, start_time, end_time, timezone, all_day, recurrence_rule, recurrence_exdates, alarms, notification_ids) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        event.id,
        event.title || '',
        event.description || '',
        event.location || '',
        event.start,
        event.end,
        event.timezone || '',
        event.allDay ? 1 : 0,
        event.recurrence?.rrule || null,
        event.recurrence?.exdates ? JSON.stringify(event.recurrence.exdates) : null,
        JSON.stringify(event.alarms || []),
        JSON.stringify(event.notificationIds || [])
      ]
    );
    res.status(201).json({ message: 'Event created', id: event.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// 更新事件
app.put('/api/events/:id', async (req, res) => {
  const { id } = req.params;
  const event = req.body;
  try {
    await db.query(
      `UPDATE events SET 
      title=?, description=?, location=?, start_time=?, end_time=?, timezone=?, all_day=?, recurrence_rule=?, recurrence_exdates=?, alarms=?, notification_ids=?
      WHERE id=?`,
      [
        event.title || '',
        event.description || '',
        event.location || '',
        event.start,
        event.end,
        event.timezone || '',
        event.allDay ? 1 : 0,
        event.recurrence?.rrule || null,
        event.recurrence?.exdates ? JSON.stringify(event.recurrence.exdates) : null,
        JSON.stringify(event.alarms || []),
        JSON.stringify(event.notificationIds || []),
        id
      ]
    );
    res.json({ message: 'Event updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update event' });
  }
});

// 删除事件
app.delete('/api/events/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM events WHERE id = ?', [id]);
    res.json({ message: 'Event deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

// --- Todos API ---

// 获取所有 Todos
app.get('/api/todos', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM todos ORDER BY created_at DESC');
    const todos = rows.map(row => ({
      id: row.id,
      title: row.title,
      done: Boolean(row.done),
      priority: row.priority,
      deadline: row.deadline,
      createdAt: Number(row.created_at),
      quadrant: row.quadrant
    }));
    res.json(todos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch todos' });
  }
});

// 创建 Todo
app.post('/api/todos', async (req, res) => {
  const todo = req.body;
  try {
    await db.query(
      `INSERT INTO todos (id, title, done, priority, deadline, created_at, quadrant) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        todo.id,
        todo.title,
        todo.done ? 1 : 0,
        todo.priority || 'medium',
        todo.deadline || null,
        todo.createdAt || Date.now(),
        todo.quadrant || null
      ]
    );
    res.status(201).json({ message: 'Todo created', id: todo.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create todo' });
  }
});

// 更新 Todo
app.put('/api/todos/:id', async (req, res) => {
  const { id } = req.params;
  const todo = req.body;
  // 构建动态更新 SQL
  const fields = [];
  const values = [];
  if (todo.title !== undefined) { fields.push('title=?'); values.push(todo.title); }
  if (todo.done !== undefined) { fields.push('done=?'); values.push(todo.done ? 1 : 0); }
  if (todo.priority !== undefined) { fields.push('priority=?'); values.push(todo.priority); }
  if (todo.deadline !== undefined) { fields.push('deadline=?'); values.push(todo.deadline); }
  if (todo.quadrant !== undefined) { fields.push('quadrant=?'); values.push(todo.quadrant); }
  
  if (fields.length === 0) return res.json({ message: 'Nothing to update' });

  values.push(id);
  
  try {
    await db.query(`UPDATE todos SET ${fields.join(', ')} WHERE id=?`, values);
    res.json({ message: 'Todo updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update todo' });
  }
});

// 删除 Todo
app.delete('/api/todos/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM todos WHERE id = ?', [id]);
    res.json({ message: 'Todo deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete todo' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
