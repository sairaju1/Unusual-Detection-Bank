import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { api } from '../services/api.js';
import { Loading, ErrorBox, Empty, StatCard, Badge, fmt } from '../components/UI.jsx';

export default function Dashboard() {
  const [s, setS] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => { api.stats().then(setS).catch(setErr); }, []);

  if (err) return <ErrorBox error={err} />;
  if (!s) return <Loading />;
  if (!s.totalTransactions) {
    return <Empty title="No data yet" action={<Link className="btn" to="/upload">Upload a statement</Link>}>Upload a CSV statement to see results here.</Empty>;
  }

  const pie = [{ name: 'Normal', value: s.normalCount }, { name: 'Unusual', value: s.unusualCount }];

  return (
    <>
      <h1>Dashboard</h1>
      <div className="grid-stats">
        <StatCard label="Transactions analyzed" value={fmt(s.totalTransactions)} />
        <StatCard label="Unusual" value={fmt(s.unusualCount)} />
        <StatCard label="Normal" value={fmt(s.normalCount)} />
        <StatCard label="% flagged" value={`${s.flaggedPercent}%`} />
        <StatCard label="Total value" value={fmt(s.totalValue)} />
      </div>
      {s.unanalyzedCount > 0 && <p className="muted">{s.unanalyzedCount} transactions have not been analyzed yet. Run analysis from the Upload page.</p>}
      <div className="two-col">
        <div className="card">
          <h3>Normal vs unusual</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={pie} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90}>
                <Cell fill="#93c5fd" /><Cell fill="#0b1f4d" />
              </Pie>
              <Tooltip /><Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <h3>Monthly transaction value</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={s.monthly}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" /><YAxis /><Tooltip />
              <Bar dataKey="value" fill="#1e40af" name="Value" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="card">
        <h3>Recent unusual transactions</h3>
        {s.recentUnusual.length === 0 ? <p className="muted">No unusual transactions flagged.</p> : (
          <table>
            <thead><tr><th>ID</th><th>Date</th><th>Description</th><th>Amount</th><th>Score</th><th /></tr></thead>
            <tbody>
              {s.recentUnusual.map((t) => (
                <tr key={t._id}>
                  <td>{t.transactionId}</td>
                  <td>{new Date(t.date).toLocaleDateString()}</td>
                  <td>{t.description}</td>
                  <td>{fmt(t.amount)}</td>
                  <td>{t.anomalyScore?.toFixed(4)}</td>
                  <td><Link to={`/transactions/${t._id}`}>View</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
