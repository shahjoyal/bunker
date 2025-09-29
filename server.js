// server.js - diagnostic / verbose version
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// REQUEST LOGGER (very verbose)
app.use((req, res, next) => {
  console.log(`REQ ▶ ${req.method} ${req.url}`);
  console.log('  Accepts:', req.headers.accept);
  console.log('  Host:', req.headers.host);
  console.log('  Origin:', req.headers.origin);
  if (['POST','PUT','PATCH'].includes(req.method)) {
    // we will log body when parsed
    // but don't block: use a short delay to allow express.json to run
    setTimeout(() => {
      console.log('  Body (parsed):', JSON.stringify(req.body));
    }, 5);
  }
  next();
});

// serve static files from /public
app.use(express.static(path.join(__dirname, 'public')));

// --- simple debug endpoint to test reachability & echo back what we receive
app.post('/api/debug', (req, res) => {
  return res.json({
    ok: true,
    path: '/api/debug',
    received: {
      headers: req.headers,
      body: req.body
    }
  });
});

// --- your normal API routes (kept minimal for clarity)
const RowSchema = new mongoose.Schema({
  coal: String,
  percentages: [Number],
  gcv: Number,
  cost: Number
}, { _id: false });
const BlendSchema = new mongoose.Schema({
  rows: [RowSchema],
  flows: [Number],
  generation: Number,
  createdAt: { type: Date, default: Date.now }
});
const Blend = mongoose.models.Blend || mongoose.model('Blend', BlendSchema);

// REAL ROUTES
app.post('/api/blend', async (req, res) => {
  try {
    const { rows, flows, generation } = req.body;
    if (!Array.isArray(rows) || !Array.isArray(flows)) {
      return res.status(400).json({ error: 'Invalid payload: rows[] and flows[] required' });
    }
    const doc = new Blend({ rows, flows, generation });
    await doc.save();
    res.status(201).json({ message: 'Saved', id: doc._id });
  } catch (err) {
    console.error('SERVER ERROR on /api/blend ->', err);
    res.status(500).json({ error: err.message || 'server error' });
  }
});

app.get('/api/blend/latest', async (req, res) => {
  try {
    const latest = await Blend.findOne().sort({ createdAt: -1 }).lean();
    if (!latest) return res.status(404).json({ error: 'No blends found' });
    res.json(latest);
  } catch (err) {
    console.error('SERVER ERROR on /api/blend/latest ->', err);
    res.status(500).json({ error: err.message || 'server error' });
  }
});

app.put('/api/blend/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rows, flows, generation } = req.body;
    if (!Array.isArray(rows) || !Array.isArray(flows)) {
      return res.status(400).json({ error: 'Invalid payload: rows[] and flows[] required' });
    }
    const updated = await Blend.findByIdAndUpdate(id, { rows, flows, generation, ts: Date.now() }, { new: true });
    if (!updated) return res.status(404).json({ error: 'Blend not found' });
    res.json({ message: 'Updated', id: updated._id });
  } catch (err) {
    console.error('SERVER ERROR on /api/blend/:id ->', err);
    res.status(500).json({ error: err.message || 'server error' });
  }
});

// MONGODB connection (simple)
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('ERROR: MONGO_URI not set in .env');
  process.exit(1);
}
mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => {
    console.error('MongoDB connection error:', err.message || err);
    process.exit(1);
  });

// HTML fallback only if client accepts HTML
app.get(/.*/, (req, res) => {
  if (req.accepts('html')) {
    return res.sendFile(path.join(__dirname, 'public', 'input.html'));
  }
  return res.status(404).type('text').send('Not found');
});

// start
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
