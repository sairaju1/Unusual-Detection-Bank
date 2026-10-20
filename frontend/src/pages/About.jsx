export default function About() {
  return (
    <>
      <h1>About</h1>
      <div className="card">
        <h3>Objective</h3>
        <p>Flag unusual bank transactions in uploaded statements so a reviewer can look at them first. Flags are not fraud findings.</p>
      </div>
      <div className="card">
        <h3>Technology stack</h3>
        <p>React + Vite, Recharts, Axios (frontend) · Node.js, Express, Multer, MongoDB with Mongoose (backend) · Python, Flask, scikit-learn, pandas (ML service).</p>
      </div>
      <div className="card">
        <h3>How Isolation Forest works</h3>
        <p>It builds random decision trees that split the data. Points that get isolated after few splits are considered unusual, because rare values are easy to separate. Scores are relative to the statement being analyzed.</p>
      </div>
      <div className="card">
        <h3>Architecture</h3>
        <p>Browser → Express API (port 4000) → Flask ML service (port 5001), with MongoDB storing statements, transactions, and analysis runs.</p>
      </div>
      <div className="card">
        <h3>Limitations and future scope</h3>
        <p>Unsupervised model with no verified fraud labels, so no accuracy figures are reported. Small statements give weak results. Future work: labeled data for evaluation, per-customer history, and per-transaction feature explanations.</p>
      </div>
    </>
  );
}
