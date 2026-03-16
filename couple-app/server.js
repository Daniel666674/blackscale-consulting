require('dotenv').config();
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-me';
const DATA_FILE = path.join(__dirname, 'data.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── Data helpers ────────────────────────────────────────────────────────────

function readData() {
  const raw = fs.readFileSync(DATA_FILE, 'utf8');
  return JSON.parse(raw);
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ─── Seed default users on startup ───────────────────────────────────────────

async function seedUsers() {
  const data = readData();
  if (data.users && data.users.length > 0) return;

  const defaults = [
    { id: '1', username: 'alex', plainPassword: 'alex123', displayName: 'Alex' },
    { id: '2', username: 'sam',  plainPassword: 'sam123',  displayName: 'Sam'  },
  ];

  const users = await Promise.all(
    defaults.map(async (u) => ({
      id: u.id,
      username: u.username,
      password: await bcrypt.hash(u.plainPassword, 10),
      displayName: u.displayName,
    }))
  );

  data.users = users;
  writeData(data);
  console.log('Default users seeded: alex / sam');
}

// ─── Auth middleware ──────────────────────────────────────────────────────────

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// ─── Auth routes ─────────────────────────────────────────────────────────────

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  const data = readData();
  const user = data.users.find(
    (u) => u.username.toLowerCase() === username.toLowerCase()
  );

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, displayName: user.displayName },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({ token, user: { id: user.id, username: user.username, displayName: user.displayName } });
});

app.get('/api/me', authenticate, (req, res) => {
  const data = readData();
  const user = data.users.find((u) => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ id: user.id, username: user.username, displayName: user.displayName });
});

// ─── Tasks routes ─────────────────────────────────────────────────────────────

app.get('/api/tasks', authenticate, (req, res) => {
  const data = readData();
  res.json(data.tasks);
});

app.post('/api/tasks', authenticate, (req, res) => {
  const { title, description, dueDate, priority, assignedTo } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Title is required' });
  }

  const data = readData();
  const task = {
    id: generateId(),
    title: title.trim(),
    description: description ? description.trim() : '',
    dueDate: dueDate || null,
    priority: priority || 'medium',
    assignedTo: assignedTo || 'both',
    completed: false,
    createdBy: req.user.id,
    createdByName: req.user.displayName,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  data.tasks.unshift(task);
  writeData(data);
  res.status(201).json(task);
});

app.put('/api/tasks/:id', authenticate, (req, res) => {
  const data = readData();
  const idx = data.tasks.findIndex((t) => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Task not found' });

  const allowed = ['title', 'description', 'dueDate', 'priority', 'assignedTo', 'completed'];
  const updates = {};
  allowed.forEach((field) => {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  });

  data.tasks[idx] = { ...data.tasks[idx], ...updates, updatedAt: new Date().toISOString() };
  writeData(data);
  res.json(data.tasks[idx]);
});

app.delete('/api/tasks/:id', authenticate, (req, res) => {
  const data = readData();
  const idx = data.tasks.findIndex((t) => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Task not found' });

  data.tasks.splice(idx, 1);
  writeData(data);
  res.json({ success: true });
});

// ─── Events routes ────────────────────────────────────────────────────────────

app.get('/api/events', authenticate, (req, res) => {
  const data = readData();
  res.json(data.events);
});

app.post('/api/events', authenticate, (req, res) => {
  const { title, date, time, description, allDay } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Title is required' });
  }
  if (!date) {
    return res.status(400).json({ error: 'Date is required' });
  }

  const data = readData();
  const event = {
    id: generateId(),
    title: title.trim(),
    date,
    time: allDay ? null : (time || null),
    description: description ? description.trim() : '',
    allDay: !!allDay,
    createdBy: req.user.id,
    createdByName: req.user.displayName,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  data.events.push(event);
  // Keep sorted by date
  data.events.sort((a, b) => {
    const da = a.date + (a.time ? 'T' + a.time : 'T00:00');
    const db = b.date + (b.time ? 'T' + b.time : 'T00:00');
    return da.localeCompare(db);
  });
  writeData(data);
  res.status(201).json(event);
});

app.put('/api/events/:id', authenticate, (req, res) => {
  const data = readData();
  const idx = data.events.findIndex((e) => e.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Event not found' });

  const allowed = ['title', 'date', 'time', 'description', 'allDay'];
  const updates = {};
  allowed.forEach((field) => {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  });

  data.events[idx] = { ...data.events[idx], ...updates, updatedAt: new Date().toISOString() };
  data.events.sort((a, b) => {
    const da = a.date + (a.time ? 'T' + a.time : 'T00:00');
    const db = b.date + (b.time ? 'T' + b.time : 'T00:00');
    return da.localeCompare(db);
  });
  writeData(data);
  res.json(data.events.find((e) => e.id === req.params.id));
});

app.delete('/api/events/:id', authenticate, (req, res) => {
  const data = readData();
  const idx = data.events.findIndex((e) => e.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Event not found' });

  data.events.splice(idx, 1);
  writeData(data);
  res.json({ success: true });
});

// ─── Catch-all → SPA ─────────────────────────────────────────────────────────

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── Start ────────────────────────────────────────────────────────────────────

seedUsers().then(() => {
  app.listen(PORT, () => {
    console.log(`Couple App running on http://localhost:${PORT}`);
  });
});
