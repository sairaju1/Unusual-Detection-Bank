const mongoose = require('mongoose');
const { Schema } = mongoose;

const User = mongoose.model('User', new Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
}, { timestamps: true }));

const Statement = mongoose.model('Statement', new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  fileName: String,
  fileHash: { type: String, required: true },
  rowCount: Number,
  uploadedAt: { type: Date, default: Date.now },
}));
// Same file can be uploaded once per user, not once globally.
Statement.collection.createIndex({ userId: 1, fileHash: 1 }, { unique: true });

const Transaction = mongoose.model('Transaction', new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  statementId: { type: Schema.Types.ObjectId, ref: 'Statement', required: true, index: true },
  transactionId: { type: String, required: true },
  date: { type: Date, required: true },
  description: String,
  amount: Number,
  type: { type: String, enum: ['debit', 'credit'] },
  prediction: { type: String, enum: ['normal', 'unusual', null], default: null },
  anomalyScore: { type: Number, default: null },
  analysisId: { type: Schema.Types.ObjectId, default: null },
  reviewStatus: { type: String, enum: ['pending', 'reviewed'], default: 'pending' },
  reviewNotes: { type: String, default: '' },
}));
Transaction.collection.createIndex({ statementId: 1, transactionId: 1 }, { unique: true });

const AnalysisRun = mongoose.model('AnalysisRun', new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  statementId: { type: Schema.Types.ObjectId, ref: 'Statement', required: true },
  contamination: Number,
  total: Number,
  unusualCount: Number,
  createdAt: { type: Date, default: Date.now },
}));

module.exports = { User, Statement, Transaction, AnalysisRun };
