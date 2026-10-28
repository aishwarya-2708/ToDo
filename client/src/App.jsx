import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { api, initCsrf } from './api.js';
import { AuthPage } from './components/AuthPage.jsx';
import { Dashboard } from './components/Dashboard.jsx';

function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const unauth = () => { setUser(null); navigate('/login'); };
    window.addEventListener('taskmate:unauthorized', unauth);
    (async () => {
      try { await initCsrf(); const result = await api.me(); setUser(result.data.user); navigate('/'); }
      catch { navigate('/login'); }
      finally { setChecking(false); }
    })();
    return () => window.removeEventListener('taskmate:unauthorized', unauth);
  }, []);

  const onAuth = useCallback((nextUser) => { setUser(nextUser); navigate('/'); }, [navigate]);
  if (checking) return <div className="app-loading"><span className="brand-mark">T</span><span>Getting your workspace ready…</span></div>;

  return <Routes>
    <Route path="/login" element={user ? <Navigate to="/" replace /> : <AuthPage mode="login" onAuth={onAuth} />} />
    <Route path="/register" element={user ? <Navigate to="/" replace /> : <AuthPage mode="register" onAuth={onAuth} />} />
    <Route path="/" element={user ? <Dashboard user={user} onLogout={() => setUser(null)} /> : <Navigate to="/login" replace />} />
    <Route path="*" element={<Navigate to={user ? '/' : '/login'} replace />} />
  </Routes>;
}

export default App;
