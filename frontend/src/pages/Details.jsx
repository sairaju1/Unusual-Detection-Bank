import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../services/api.js';
import { Loading, ErrorBox, Badge, fmt } from '../components/UI.jsx';

// Rule-based checks are hand-written heuristics, separate from the Isolation Forest output.
const rules = (t) => {
  const hour = new Date(t.date).getUTCHours();
  return [
    ['Amount above 50,000', Math.abs(t.amount) > 50000],
    ['Posted between 00:00 and 05:00', hour >= 0 && hour < 5],
    ['Very small amount (below 1, possible card test)', Math.abs(t.amount) < 1],
  ];
};

export default function Details() {
  const { id } = useParams();
  const [t, setT] = useState(null);
  const [err, setErr] = useState(null);
  const [notes, setNotes] = useState('');
  const [saved, setSaved] = useState('');

  useEffect(() => {
    api.transaction(id).then((tx) => { setT(tx); setNotes(tx.reviewNotes || ''); }).catch(setErr);
  }, [id]);

  const review = async (status) => {
    try { setT(await api.review(id, status, notes)); setSaved('Saved.'); }
    catch (e) { setErr(e); }
  };

  if (err) return <ErrorBox error={err} />;
  if (!t) return <Loading />;

  return (
    <>
      <p><Link to="/transactions">← Back to transactions</Link></p>
      <h1>Transaction {t.transactionId}</h1>
      <div className="two-col">
        <div className="card">
          <h3>Record</h3>
          <p><strong>Date:</strong> {new Date(t.date).toLocaleString()}</p>
          <p><strong>Description:</strong> {t.description}</p>
          <p><strong>Amount:</strong> {fmt(t.amount)}</p>
          <p><strong>Type:</strong> {t.type}</p>
          <p><strong>Review status:</strong> <span className={`badge ${t.reviewStatus}`}>{t.reviewStatus}</span></p>
        </div>
        <div className="card">
          <h3>Model output (Isolation Forest)</h3>
          <p><strong>Prediction:</strong> <Badge value={t.prediction} /></p>
          <p><strong>Anomaly score:</strong> {t.anomalyScore?.toFixed(4) ?? 'Not analyzed'}</p>
          <p className="muted">
            Higher score means more unusual compared with the other transactions in this statement.
            Scores are relative, not probabilities, and a flag is not proof of fraud.
          </p>
        </div>
      </div>
      <div className="card">
        <h3>Rule-based indicators</h3>
        <p className="muted">These are simple checks, separate from the model.</p>
        {rules(t).map(([label, hit]) => (
          <div className="rule" key={label}>{hit ? '⚠️' : '✓'} {label}: <strong>{hit ? 'Yes' : 'No'}</strong></div>
        ))}
      </div>
      <div className="card">
        <h3>Reviewer</h3>
        <textarea rows={3} style={{ width: '100%' }} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Review notes" maxLength={500} />
        <p>
          <button onClick={() => review('reviewed')}>Mark reviewed</button>{' '}
          <button className="secondary" onClick={() => review('pending')}>Mark pending</button>
          {saved && <span className="muted"> {saved}</span>}
        </p>
      </div>
    </>
  );
}
