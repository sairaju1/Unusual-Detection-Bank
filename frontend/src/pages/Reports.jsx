import { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { Loading, ErrorBox, StatCard, fmt } from '../components/UI.jsx';

export default function Reports() {
  const [s, setS] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => { api.stats().then(setS).catch(setErr); }, []);

  const download = async () => {
    try {
      const blob = await api.exportCsv();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'analysis-report.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) { setErr(e); }
  };

  if (err) return <ErrorBox error={err} />;
  if (!s) return <Loading />;

  return (
    <>
      <h1>Reports</h1>
      <div className="grid-stats">
        <StatCard label="Total transactions" value={fmt(s.totalTransactions)} />
        <StatCard label="Unusual" value={fmt(s.unusualCount)} />
        <StatCard label="Normal" value={fmt(s.normalCount)} />
        <StatCard label="Not analyzed" value={fmt(s.unanalyzedCount)} />
        <StatCard label="% flagged" value={`${s.flaggedPercent}%`} />
        <StatCard label="Total value (absolute)" value={fmt(s.totalValue)} />
      </div>
      <div className="card">
        <h3>Monthly breakdown</h3>
        {s.monthly.length === 0 ? <p className="muted">No data.</p> : (
          <table>
            <thead><tr><th>Month</th><th>Transactions</th><th>Total value</th></tr></thead>
            <tbody>{s.monthly.map((m) => <tr key={m.month}><td>{m.month}</td><td>{m.count}</td><td>{fmt(m.value)}</td></tr>)}</tbody>
          </table>
        )}
      </div>
      <div className="card">
        <h3>Export</h3>
        <p className="muted">Download all transactions with their predictions and review status as CSV.</p>
        <button onClick={download}>Download analysis CSV</button>
      </div>
    </>
  );
}
