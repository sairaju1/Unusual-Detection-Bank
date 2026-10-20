import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import { Login, Register } from './pages/Auth.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Upload from './pages/Upload.jsx';
import Transactions from './pages/Transactions.jsx';
import Details from './pages/Details.jsx';
import Reports from './pages/Reports.jsx';
import About from './pages/About.jsx';
import { Loading } from './components/UI.jsx';

const links = [
  ['/', 'Dashboard'],
  ['/upload', 'Upload Statement'],
  ['/transactions', 'All Transactions'],
  ['/unusual', 'Unusual Transactions'],
  ['/reports', 'Reports'],
  ['/about', 'About'],
];

export default function App() {
  const { user, ready, logout } = useAuth();

  if (!ready) return <div className="center"><Loading /></div>;

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <h2>Unusual<br />Transactions</h2>
        <nav>
          {links.map(([to, label]) => (
            <NavLink key={to} to={to} end={to === '/'}>{label}</NavLink>
          ))}
        </nav>
        <div className="userbox">
          <div>{user.name}</div>
          <small>{user.email}</small>
          <button className="secondary" onClick={logout}>Log out</button>
        </div>
      </aside>
      <main className="content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/unusual" element={<Transactions unusualOnly />} />
          <Route path="/transactions/:id" element={<Details />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/about" element={<About />} />
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="/register" element={<Navigate to="/" replace />} />
          <Route path="*" element={<p>Page not found.</p>} />
        </Routes>
      </main>
    </div>
  );
}
