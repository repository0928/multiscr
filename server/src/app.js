const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors({
  origin: process.env.CLIENT_URL || '*',
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));

// Routes（延遲載入，降低啟動記憶體）
app.use('/api/auth',     (req, res, next) => require('./routes/auth')(req, res, next));
app.use('/api/subjects', (req, res, next) => require('./routes/subjects')(req, res, next));
app.use('/api/students', (req, res, next) => require('./routes/students')(req, res, next));
app.use('/api/subjects', (req, res, next) => require('./routes/items')(req, res, next));
app.use('/api/subjects', (req, res, next) => require('./routes/scores')(req, res, next));

// Health check
app.get('/api/health', (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
