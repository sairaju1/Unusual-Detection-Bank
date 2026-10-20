import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api.js';
import { ErrorBox, fmt } from '../components/UI.jsx';

const REQUIRED = ['transaction_id', 'date', 'description', 'amount', 'type'];

export default function Upload() {
  const [file, setFile] = useState(null);
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [upload, setUpload] = useState(null);
  const [analysis, setAnalysis] = useState(null);

  // Client-side check of extension and header row; the backend validates again.
  const pick = async (f) => {
    setErr(null); setUpload(null); setAnalysis(null);
    if (!f) return;
    if (!f.name.toLowerCase().endsWith('.csv')) return setErr({ message: 'Only .csv files are accepted.' });
    const header = (await f.text()).split(/\r?\n/)[0].toLowerCase();
    const missing = REQUIRED.filter((c) => !header.includes(c));
    if (missing.length) return setErr({ message: `Missing required columns: ${missing.join(', ')}` });
    setFile(f);
  };

  const run = async (fn, set) => {
    setBusy(true); setErr(null);
    try { set(await fn()); } catch (e) { setErr(e); } finally { setBusy(false); }
  };

  return (
    <>
      <h1>Upload Statement</h1>
      {err && <ErrorBox error={err} />}
      <div className="card">
        <label
          className={`dropzone ${drag ? 'drag' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files[0]); }}
        >
          <p>Drag a CSV here, or click to choose a file</p>
          <p className="muted">Required columns: {REQUIRED.join(', ')}</p>
          <input type="file" accept=".csv" hidden onChange={(e) => pick(e.target.files[0])} />
        </label>
        {file && <p>Selected: <strong>{file.name}</strong></p>}
        <button disabled={!file || busy} onClick={() => run(() => api.upload(file), setUpload)}>
          {busy ? 'Uploading…' : 'Upload'}
        </button>
      </div>

      {upload && (
        <div className="card">
          <div className={upload.duplicate ? 'error' : 'success'}>
            {upload.duplicate ? 'This exact file was already uploaded. Using the existing statement.' : `Uploaded ${upload.statement.rowCount} transactions.`}
          </div>
          {upload.preview && (
            <>
              <h3>Preview (first 10)</h3>
              <table>
                <thead><tr><th>ID</th><th>Date</th><th>Description</th><th>Amount</th><th>Type</th></tr></thead>
                <tbody>
                  {upload.preview.map((t) => (
                    <tr key={t.transactionId}><td>{t.transactionId}</td><td>{new Date(t.date).toLocaleString()}</td><td>{t.description}</td><td>{fmt(t.amount)}</td><td>{t.type}</td></tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
          <p>
            <button disabled={busy} onClick={() => run(() => api.analyze(upload.statement._id), setAnalysis)}>
              {busy ? 'Analyzing…' : 'Analyze Transactions'}
            </button>
          </p>
        </div>
      )}

      {analysis && (
        <div className="card">
          <h3>Analysis complete</h3>
          <p>{analysis.total} analyzed · <strong>{analysis.unusualCount}</strong> unusual · {analysis.normalCount} normal</p>
          <p className="muted">Unusual means statistically rare within this statement. It is not a confirmed fraud finding.</p>
          <Link className="btn" to="/unusual">View unusual transactions</Link>{' '}
          <Link className="btn secondary" to="/">Dashboard</Link>
        </div>
      )}
    </>
  );
}
