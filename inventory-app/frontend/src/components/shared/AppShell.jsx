import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useI18n } from '../../context/I18nContext';
import Chatbot from '../chatbot/Chatbot';
import toast from 'react-hot-toast';

const Icons = {
  dashboard: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
      <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
    </svg>
  ),
  inventory: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
      <polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
    </svg>
  ),
  users: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  reports: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>
  ),
  logout: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
  sun: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:16,height:16}}>
      <circle cx="12" cy="12" r="5"/>
      <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>
  ),
  moon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:16,height:16}}>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  ),
};

const roleColors = { admin: 'badge-red', owner: 'badge-amber', manager: 'badge-blue', employee: 'badge-teal' };
const LANGS = [
  { code: 'en', label: 'EN' },
  { code: 'fr', label: 'FR' },
  { code: 'ar', label: 'ع' },
];

export default function AppShell() {
  const { user, logout, canManage } = useAuth();
  const { dark, toggle } = useTheme();
  const { t, lang, setLang } = useI18n();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    toast.success(t('logout'));
    navigate('/login');
  };

  const initials = user?.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span className="sidebar-logo-icon">📦</span>
          <div>
            <div className="sidebar-logo-text">{t('appName')}</div>
            <div className="sidebar-logo-sub">{t('appSub')}</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <span className="nav-group-label">{t('main')}</span>
          <NavLink to="/dashboard" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
            {Icons.dashboard} {t('dashboard')}
          </NavLink>
          <NavLink to="/inventory" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
            {Icons.inventory} {t('inventory')}
          </NavLink>
          {canManage && (
            <>
              <span className="nav-group-label">{t('management')}</span>
              <NavLink to="/users" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
                {Icons.users} {t('users')}
              </NavLink>
              <NavLink to="/reports" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
                {Icons.reports} {t('reports')}
              </NavLink>
            </>
          )}
        </nav>

        <div className="sidebar-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 4px', marginBottom: 8 }}>
            <div className="avatar">{initials}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '.84rem', fontWeight: 600, color: '#c5dbd8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</div>
              <span className={`badge ${roleColors[user?.role] || 'badge-gray'}`} style={{ fontSize: '.65rem' }}>{user?.role}</span>
            </div>
          </div>
          <button className="nav-item" onClick={handleLogout} style={{ color: '#f87171' }}>
            {Icons.logout} {t('logout')}
          </button>
        </div>
      </aside>

      <div className="main-content flex-col" style={{ minHeight: '100vh' }}>
        <header className="topbar">
          <div className="topbar-title" />
          <div className="topbar-actions" style={{ gap: 12 }}>
            {/* Language switcher */}
            <div style={{ display: 'flex', gap: 3, background: 'var(--bg-surface-2)', borderRadius: 8, padding: 3 }}>
              {LANGS.map(l => (
                <button
                  key={l.code}
                  onClick={() => setLang(l.code)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 6,
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '.78rem',
                    fontWeight: 700,
                    background: lang === l.code ? 'var(--brand-primary)' : 'transparent',
                    color: lang === l.code ? '#fff' : 'var(--text-secondary)',
                    transition: 'all .15s',
                    fontFamily: l.code === 'ar' ? 'system-ui, sans-serif' : 'inherit',
                  }}
                >
                  {l.label}
                </button>
              ))}
            </div>
            <span style={{ fontSize: '.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
              {dark ? Icons.moon : Icons.sun}
            </span>
            <button className={`theme-toggle ${dark ? 'dark-on' : ''}`} onClick={toggle} aria-label="Toggle dark mode">
              <div className="toggle-thumb" />
            </button>
          </div>
        </header>
        <main style={{ flex: 1 }}>
          <Outlet />
        </main>
      </div>

      <Chatbot />
    </div>
  );
}
