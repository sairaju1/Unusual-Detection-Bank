import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api.js';
import { Loading, ErrorBox, Empty, Badge, fmt } from '../components/UI.jsx';

const blank = { page: 1, limit: 20, search: '', type: '', from: '', to: '' };

// Same table serves All Transactions and Unusual Transactions.
export default function Transactions({ unusualOnly = false }) {
  const [filters, setFilters] = useState({ ...blank, prediction: unusualOnly ? 'unusual' : '' });
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    setData(null); setErr(null);
    const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ''));
    api.transactions(params).then(setData).catch(setErr);
  }, [filters, reload]);

  const set = (patch) => setFilters((f) => ({ ...f, ...patch, page: patch.page ?? 1 }));
  const markReviewed = async (t) => {
    try { await api.review(t._id, t.reviewStatus === 'reviewed' ? 'pending' : 'reviewed'); setReload((r) => r + 1); }
    catch (e) { setErr(e); }
  };

  return (
    <>
      <h1>{unusualOnly ? 'Unusual Transactions' : 'All Transactions'}</h1>
      <div className="card">
        <input placeholder="Search description" value={filters.search} onChange={(e) => set({ search: e.target.value })} />
        <select value={filters.type} onChange={(e) => set({ type: e.target.value })}>
          <option value="">All types</option><option value="debit">Debit</option><option value="credit">Credit</option>
        </select>
        {!unusualOnly && (
          <select value={filters.prediction} onChange={(e) => set({ prediction: e.target.value })}>
            <option value="">All predictions</option><option value="unusual">Unusual</option><option value="normal">Normal</option>
          </select>
        )}
        <label className="muted"> From <input type="date" value={filters.from} onChange={(e) => set({ from: e.target.value })} /></label>
        <label className="muted"> To <input type="date" value={filters.to} onChange={(e) => set({ to: e.target.value })} /></label>
      </div>
      {err && <ErrorBox error={err} />}
      {!data && !err && <Loading />}
      {data && data.total === 0 && (
        <Empty title="Nothing to show" action={<Link className="btn" to="/upload">Upload a statement</Link>}>
          {unusualOnly ? 'No unusual transactions match these filters, or no analysis has been run yet.' : 'No transactions match these filters.'}
        </Empty>
      )}
      {data && data.total > 0 && (
        <div className="card">
          <table>
            <thead><tr><th>ID</th><th>Date</th><th>Description</th><th>Amount</th><th>Type</th><th>Prediction</th><th>Score</th><th>Review</th><th /></tr></thead>
            <tbody>
              {data.items.map((t) => (
                <tr key={t._id}>
                  <td>{t.transactionId}</td>
                  <td>{new Date(t.date).toLocaleDateString()}</td>
                  <td>{t.description}</td>
                  <td>{fmt(t.amount)}</td>
                  <td>{t.type}</td>
                  <td><Badge value={t.prediction} /></td>
                  <td>{t.anomalyScore?.toFixed(4) ?? '—'}</td>
                  <td><span className={`badge ${t.reviewStatus}`}>{t.reviewStatus}</span></td>
                  <td>
                    <Link to={`/transactions/${t._id}`}>View</Link>{' '}
                    <button className="secondary" onClick={() => markReviewed(t)}>
                      {t.reviewStatus === 'reviewed' ? 'Undo' : 'Mark reviewed'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="pager">
            <button className="secondary" disabled={data.page <= 1} onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}>Prev</button>
            <span>Page {data.page} of {data.pages || 1} · {data.total} total</span>
            <button className="secondary" disabled={data.page >= data.pages} onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}>Next</button>
          </div>
        </div>
      )}
    </>
  );
}
