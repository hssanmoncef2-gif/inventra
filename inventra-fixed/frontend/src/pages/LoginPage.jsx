import { useState } from 'react';
import { useI18n } from '../context/I18nContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const { login } = useAuth();
  const { t } = useI18n();
  const { dark, toggle } = useTheme();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) return toast.error('Please fill all fields');
    setLoading(true);
    try {
      await login(form.email, form.password);
      toast.success(t('welcomeBack') + '!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-base)', padding: 16, position: 'relative',
    }}>
      {/* Background decoration */}
      <div style={{
        position: 'absolute', top: '-20%', right: '-10%',
        width: '50vw', height: '50vw', maxWidth: 600,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(13,148,136,.12) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '-10%', left: '-10%',
        width: '40vw', height: '40vw', maxWidth: 500,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(245,158,11,.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Theme toggle */}
      <button
        className={`theme-toggle ${dark ? 'dark-on' : ''}`}
        onClick={toggle}
        style={{ position: 'absolute', top: 24, right: 24 }}
        aria-label="Toggle theme"
      >
        <div className="toggle-thumb" />
      </button>

      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontSize: '3.5rem', marginBottom: 8 }}>📦</div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: '2rem', letterSpacing: '-1px' }}>Inventra</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: 6, fontSize: '.9rem' }}>{t('inventoryPlatform')}</p>
        </div>

        <div className="card" style={{ padding: 36 }}>
          <h2 style={{ marginBottom: 24, fontSize: '1.3rem' }}>{t('signIn')}</h2>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div className="form-group">
              <label className="form-label">{t('emailAddress')}</label>
              <input
                type="email"
                className="form-input"
                placeholder="you@company.com"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                autoFocus
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPwd ? 'text' : 'password'}
                  className="form-input"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  autoComplete="current-password"
                  style={{ paddingRight: 44 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(s => !s)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text-muted)', fontSize: '.8rem', padding: '4px 6px',
                  }}
                >
                  {showPwd ? t('hide') : t('show')}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={loading}
              style={{ marginTop: 4 }}
            >
              {loading ? <><span className="spinner" style={{ width: 16, height: 16 }} /> {t('signingIn')}</> : 'Sign In'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: '.8rem', color: 'var(--text-muted)' }}>
          {t('contactAdmin')}
        </p>
      </div>
    </div>
  );
}
