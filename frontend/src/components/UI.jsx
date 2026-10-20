export const fmt = (n) => Number(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

export function Loading() {
  return <div className="spinner" aria-label="Loading" />;
}

export function Empty({ title, children, action }) {
  return (
    <div className="card empty">
      <h3>{title}</h3>
      <p>{children}</p>
      {action}
    </div>
  );
}

export function ErrorBox({ error }) {
  return (
    <div className="error">
      <strong>{error.message}</strong>
      {error.details?.errors && (
        <ul>{error.details.errors.map((d, i) => <li key={i}>{d}</li>)}</ul>
      )}
    </div>
  );
}

export function StatCard({ label, value }) {
  return (
    <div className="card stat">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
    </div>
  );
}

export function Badge({ value }) {
  if (!value) return <span className="badge">Not analyzed</span>;
  return <span className={`badge ${value}`}>{value === 'unusual' ? 'Unusual' : 'Normal'}</span>;
}
