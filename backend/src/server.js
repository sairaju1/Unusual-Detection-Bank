require('dotenv').config();
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const multer = require('multer');
const axios = require('axios');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, Statement, Transaction, AnalysisRun } = require('./models');
const { parseStatement } = require('./config/csv');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 16) {
  console.error('JWT_SECRET must be set in backend/.env (at least 16 characters). See .env.example.');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 4000;
const ML_URL = process.env.ML_SERVICE_URL || 'http://localhost:5001';
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

app.use(cors());
app.use(express.json());

const ok = (res, data, status = 200) => res.status(status).json({ success: true, data });
const fail = (res, status, error, details) => res.status(status).json({ success: false, error, details });
const isId = (id) => mongoose.isValidObjectId(id);

// Every /api route needs a live database, except health and auth.
app.use('/api', (req, res, next) => {
  if (req.path === '/health' || mongoose.connection.readyState === 1) return next();
  return fail(res, 503, 'Database not connected. Check MONGODB_URI in backend/.env.');
});

// Auth: public for /health and /auth/*, everything else needs a valid Bearer token.
app.use('/api', (req, res, next) => {
  if (req.path === '/health' || req.path.startsWith('/auth/')) return next();
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return fail(res, 401, 'Please log in.');
  try {
    req.userId = jwt.verify(token, JWT_SECRET).sub;
    return next();
  } catch {
    return fail(res, 401, 'Session expired. Please log in again.');
  }
});

const sign = (user) => jwt.sign({ sub: String(user._id) }, JWT_SECRET, { expiresIn: '7d' });
const publicUser = (u) => ({ id: String(u._id), name: u.name, email: u.email });

app.get('/api/health', (req, res) =>
  ok(res, { api: 'up', db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' }));

// ---------- auth ----------
app.post('/api/auth/register', async (req, res) => {
  const name = String(req.body?.name || '').trim();
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  if (!name) return fail(res, 400, 'Name is required.');
  if (!EMAIL_RE.test(email)) return fail(res, 400, 'Enter a valid email address.');
  if (password.length < 8) return fail(res, 400, 'Password must be at least 8 characters.');
  if (await User.exists({ email })) return fail(res, 409, 'An account with this email already exists.');
  const user = await User.create({ name, email, passwordHash: await bcrypt.hash(password, 12) });
  return ok(res, { token: sign(user), user: publicUser(user) }, 201);
});

app.post('/api/auth/login', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  const user = await User.findOne({ email });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return fail(res, 401, 'Invalid email or password.');
  }
  return ok(res, { token: sign(user), user: publicUser(user) });
});

app.get('/api/auth/me', async (req, res) => {
  const user = await User.findById(req.userId).lean();
  return user ? ok(res, publicUser(user)) : fail(res, 401, 'Account not found. Please log in again.');
});

// ---------- statements ----------
app.post('/api/statements/upload', upload.single('file'), async (req, res) => {
  if (!req.file) return fail(res, 400, 'No file uploaded. Use form field "file".');
  if (!req.file.originalname.toLowerCase().endsWith('.csv')) return fail(res, 400, 'Only .csv files are accepted.');

  const { rows, errors, totalErrors } = parseStatement(req.file.buffer);
  if (errors.length) return fail(res, 422, 'Validation failed', { errors, totalErrors });

  const fileHash = crypto.createHash('sha256').update(req.file.buffer).digest('hex');
  const existing = await Statement.findOne({ userId: req.userId, fileHash }).lean();
  if (existing) return ok(res, { statement: existing, duplicate: true }, 200);

  const statement = await Statement.create({ userId: req.userId, fileName: req.file.originalname, fileHash, rowCount: rows.length });
  await Transaction.insertMany(rows.map((r) => ({ ...r, userId: req.userId, statementId: statement._id })));
  return ok(res, { statement, duplicate: false, preview: rows.slice(0, 10) }, 201);
});

app.post('/api/analysis/:statementId', async (req, res) => {
  const { statementId } = req.params;
  if (!isId(statementId)) return fail(res, 400, 'Invalid statement id');
  const statement = await Statement.findOne({ _id: statementId, userId: req.userId }).lean();
  if (!statement) return fail(res, 404, 'Statement not found');

  const contamination = req.body?.contamination ?? 0.05;
  const txs = await Transaction.find({ statementId, userId: req.userId }).sort({ date: 1 }).lean();
  if (txs.length < 10) return fail(res, 422, 'At least 10 transactions are needed for analysis.');

  let mlResponse;
  try {
    const payload = txs.map((t) => ({ amount: t.amount, type: t.type, date: t.date.toISOString() }));
    mlResponse = (await axios.post(`${ML_URL}/predict`, { transactions: payload, contamination }, { timeout: 60000 })).data;
  } catch (e) {
    if (e.code === 'ECONNREFUSED') return fail(res, 503, 'ML service is unavailable. Start ml-service first.');
    return fail(res, 502, 'ML service returned an error.', e.response?.data || e.message);
  }

  const run = await AnalysisRun.create({ userId: req.userId, statementId, contamination, total: txs.length, unusualCount: 0 });
  await Transaction.bulkWrite(mlResponse.results.map((r) => ({
    updateOne: {
      filter: { _id: txs[r.index]._id, userId: req.userId },
      update: { prediction: r.prediction, anomalyScore: r.anomaly_score, analysisId: run._id },
    },
  })));
  const unusualCount = mlResponse.results.filter((r) => r.prediction === 'unusual').length;
  await AnalysisRun.updateOne({ _id: run._id }, { unusualCount });
  return ok(res, {
    analysisId: run._id, total: txs.length, unusualCount, normalCount: txs.length - unusualCount,
    scoreDirection: mlResponse.score_direction, warnings: mlResponse.warnings || [],
  }, 201);
});

app.get('/api/analysis/history', async (req, res) =>
  ok(res, await AnalysisRun.find({ userId: req.userId }).sort({ createdAt: -1 }).limit(50).lean()));

// ---------- transactions ----------
app.get('/api/transactions', async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, parseInt(req.query.limit, 10) || 20);
  const q = { userId: req.userId };
  if (req.query.statementId && isId(req.query.statementId)) q.statementId = req.query.statementId;
  if (req.query.type) q.type = req.query.type;
  if (req.query.prediction) q.prediction = req.query.prediction;
  if (req.query.from || req.query.to) {
    q.date = {};
    if (req.query.from) q.date.$gte = new Date(req.query.from);
    if (req.query.to) q.date.$lte = new Date(req.query.to);
  }
  if (req.query.search) q.description = { $regex: escapeRegex(req.query.search), $options: 'i' };
  const [items, total] = await Promise.all([
    Transaction.find(q).sort({ date: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Transaction.countDocuments(q),
  ]);
  return ok(res, { items, page, limit, total, pages: Math.ceil(total / limit) });
});

app.get('/api/transactions/unusual', async (req, res) => {
  const items = await Transaction.find({ userId: req.userId, prediction: 'unusual' }).sort({ anomalyScore: -1 }).limit(200).lean();
  return ok(res, items);
});

app.get('/api/transactions/:id', async (req, res) => {
  if (!isId(req.params.id)) return fail(res, 400, 'Invalid transaction id');
  const tx = await Transaction.findOne({ _id: req.params.id, userId: req.userId }).lean();
  return tx ? ok(res, tx) : fail(res, 404, 'Transaction not found');
});

app.patch('/api/transactions/:id/review', async (req, res) => {
  if (!isId(req.params.id)) return fail(res, 400, 'Invalid transaction id');
  const { reviewStatus, reviewNotes = '' } = req.body || {};
  if (!['pending', 'reviewed'].includes(reviewStatus)) return fail(res, 400, 'reviewStatus must be pending or reviewed');
  const tx = await Transaction.findOneAndUpdate(
    { _id: req.params.id, userId: req.userId },
    { reviewStatus, reviewNotes: String(reviewNotes).slice(0, 500) },
    { new: true }
  ).lean();
  return tx ? ok(res, tx) : fail(res, 404, 'Transaction not found');
});

// ---------- dashboard and reports ----------
app.get('/api/dashboard/stats', async (req, res) => {
  const uid = new mongoose.Types.ObjectId(req.userId);
  const [counts, value, monthly, recentUnusual] = await Promise.all([
    Transaction.aggregate([{ $match: { userId: uid } }, { $group: { _id: '$prediction', n: { $sum: 1 } } }]),
    Transaction.aggregate([{ $match: { userId: uid } }, { $group: { _id: null, total: { $sum: { $abs: '$amount' } } } }]),
    Transaction.aggregate([
      { $match: { userId: uid } },
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$date' } }, count: { $sum: 1 }, value: { $sum: { $abs: '$amount' } } } },
      { $sort: { _id: 1 } },
    ]),
    Transaction.find({ userId: req.userId, prediction: 'unusual' }).sort({ anomalyScore: -1 }).limit(5).lean(),
  ]);
  const byKey = Object.fromEntries(counts.map((c) => [c._id ?? 'unanalyzed', c.n]));
  const total = counts.reduce((s, c) => s + c.n, 0);
  const unusual = byKey.unusual || 0;
  return ok(res, {
    totalTransactions: total,
    unusualCount: unusual,
    normalCount: byKey.normal || 0,
    unanalyzedCount: byKey.unanalyzed || 0,
    flaggedPercent: total ? Number(((unusual / total) * 100).toFixed(2)) : 0,
    totalValue: value[0]?.total || 0,
    monthly: monthly.map((m) => ({ month: m._id, count: m.count, value: m.value })),
    recentUnusual,
  });
});

app.get('/api/reports/export', async (req, res) => {
  const txs = await Transaction.find({ userId: req.userId }).sort({ date: 1 }).lean();
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = ['transaction_id,date,description,amount,type,prediction,anomaly_score,review_status'];
  for (const t of txs) {
    lines.push([t.transactionId, t.date.toISOString(), esc(t.description), t.amount, t.type, t.prediction ?? '', t.anomalyScore ?? '', t.reviewStatus].join(','));
  }
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="analysis-report.csv"');
  res.send(lines.join('\n'));
});

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) return fail(res, 400, `Upload error: ${err.message}`);
  console.error(err);
  return fail(res, 500, 'Internal server error');
});

async function start() {
  if (process.env.MONGODB_URI) {
    try {
      await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
      console.log('MongoDB connected');
    } catch (e) {
      console.error('MongoDB connection failed:', e.message);
    }
  } else {
    console.warn('MONGODB_URI not set. DB routes will return 503.');
  }
  app.listen(PORT, () => console.log(`API listening on http://localhost:${PORT}`));
}

start();
