import { useState, useEffect } from 'react';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';

ChartJS.register(ArcElement, Tooltip, Legend);

const COLORS = ['#0d9488','#f59e0b','#3b82f6','#8b5cf6','#ef4444','#10b981','#f97316','#06b6d4'];

export default function DashboardPage() {
  const { user, isAdmin, isOwner, canManage } = useAuth();
  const { t, fmtCur, fmt, lang } = useI18n();
  const [data, setData] = useState(null);
  const [adminData, setAdminData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const invRes = await api.get('/inventory/analytics');
        setData(invRes.data.data);
        if (isAdmin) {
          const adminRes = await api.get('/users/admin/overview');
          setAdminData(adminRes.data.data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isAdmin]);

  if (loading) return <div className="page-loader"><div className="spinner" style={{ width: 32, height: 32 }} /></div>;

  const chartData = data?.byCategory?.length ? {
    labels: data.byCategory.map(c => c._id && c._id.trim() ? c._id.trim().charAt(0).toUpperCase() + c._id.trim().slice(1) : 'Uncategorized'),
    datasets: [{
      data: data.byCategory.map(c => c.totalValue),
      backgroundColor: COLORS,
      borderWidth: 0,
      hoverOffset: 6,
    }],
  } : null;

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { font: { family: 'Plus Jakarta Sans' }, color: 'var(--text-secondary)', padding: 16, boxWidth: 12 },
      },
      tooltip: {
        callbacks: {
          label: (ctx) => ` ${ctx.label}: ${fmtCur(ctx.raw)} (${((ctx.raw / data.summary.totalValue) * 100).toFixed(1)}%)`,
        },
      },
    },
  };

  const dateLocale = lang === 'ar' ? 'ar-TN' : lang === 'fr' ? 'fr-FR' : 'en-US';

  return (
    <div className="page-wrap">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1>{t('dashboard')}</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>{t('welcomeBack')}, {user.name} 👋</p>
        </div>
        <span style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>
          {new Date().toLocaleDateString(dateLocale, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </span>
      </div>

      {/* Stats */}
      <div className="grid-4 mb-6">
        <div className="stat-card teal">
          <div className="stat-card-icon" style={{ background: 'rgba(13,148,136,.12)', color: 'var(--brand-primary)' }}>📦</div>
          <div className="stat-card-value">{fmt(data?.summary?.totalItems || 0)}</div>
          <div className="stat-card-label">{t('totalSKUs')}</div>
        </div>
        <div className="stat-card amber">
          <div className="stat-card-icon" style={{ background: 'rgba(245,158,11,.12)', color: 'var(--brand-accent)' }}>🔢</div>
          <div className="stat-card-value">{fmt(data?.summary?.totalUnits || 0)}</div>
          <div className="stat-card-label">{t('totalUnits')}</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-card-icon" style={{ background: 'rgba(59,130,246,.12)', color: 'var(--brand-info)' }}>💰</div>
          <div className="stat-card-value" style={{ fontSize: '1.4rem' }}>{fmtCur(data?.summary?.totalValue || 0)}</div>
          <div className="stat-card-label">{t('inventoryValue')}</div>
        </div>
        <div className="stat-card red">
          <div className="stat-card-icon" style={{ background: 'rgba(239,68,68,.12)', color: 'var(--brand-danger)' }}>⚠️</div>
          <div className="stat-card-value">{fmt(data?.summary?.lowStockCount || 0)}</div>
          <div className="stat-card-label">{t('lowStockAlerts')}</div>
        </div>
      </div>

      {/* Admin stats */}
      {isAdmin && adminData && (
        <div className="grid-4 mb-6">
          <div className="stat-card">
            <div className="stat-card-icon" style={{ background: 'rgba(139,92,246,.12)', color: '#8b5cf6' }}>👥</div>
            <div className="stat-card-value">{adminData.totalUsers}</div>
            <div className="stat-card-label">{t('activeUsers')}</div>
          </div>
          {adminData.usersByRole?.map(r => (
            <div key={r._id} className="stat-card">
              <div className="stat-card-icon" style={{ background: 'rgba(16,185,129,.12)', color: '#10b981' }}>🏷️</div>
              <div className="stat-card-value">{r.count}</div>
              <div className="stat-card-label">{r._id?.charAt(0).toUpperCase() + r._id?.slice(1)}s</div>
            </div>
          ))}
        </div>
      )}

      <div className="grid-2" style={{ gap: 24 }}>
        {(isAdmin || isOwner || canManage) && (
          <div className="card">
            <h3 className="mb-4">{t('inventoryByCategory')}</h3>
            {chartData ? (
              <div style={{ maxWidth: 320, margin: '0 auto' }}>
                <Pie data={chartData} options={chartOptions} />
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-state-icon">📊</div>
                <p>{t('noCategoryData')}</p>
              </div>
            )}
          </div>
        )}

        <div className="card">
          <h3 className="mb-4">{t('categoryBreakdown')}</h3>
          {data?.byCategory?.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {data.byCategory.slice(0, 6).map((cat, i) => {
                const pct = data.summary.totalValue ? (cat.totalValue / data.summary.totalValue * 100).toFixed(1) : 0;
                return (
                  <div key={cat._id}>
                    <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
                      <div className="flex items-center gap-2">
                        <div style={{ width: 10, height: 10, borderRadius: 2, background: COLORS[i % COLORS.length], flexShrink: 0 }} />
                        <span style={{ fontSize: '.86rem', fontWeight: 500 }}>{cat._id && cat._id.trim() ? cat._id.trim().charAt(0).toUpperCase() + cat._id.trim().slice(1) : 'Uncategorized'}</span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '.84rem', fontWeight: 700 }}>{fmtCur(cat.totalValue)}</span>
                        <span style={{ fontSize: '.74rem', color: 'var(--text-muted)', marginLeft: 6 }}>{pct}%</span>
                      </div>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${pct}%`, background: COLORS[i % COLORS.length] }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-state"><div className="empty-state-icon">📦</div><p>{t('noCategories')}</p></div>
          )}
        </div>
      </div>

      {/* Low stock alerts */}
      {data?.lowStockItems?.length > 0 && (
        <div className="card mt-4">
          <div className="flex items-center justify-between mb-4">
            <h3 style={{ color: 'var(--brand-danger)' }}>{t('lowStockAlertsTitle')}</h3>
            <span className="badge badge-red">{data.lowStockItems.length} {t('items')}</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t('item')}</th><th>{t('reference')}</th><th>{t('inStock')}</th><th>{t('minRequired')}</th><th>{t('status')}</th>
                </tr>
              </thead>
              <tbody>
                {data.lowStockItems.map(item => (
                  <tr key={item._id}>
                    <td style={{ fontWeight: 600 }}>{item.name}</td>
                    <td><code style={{ fontSize: '.8rem', background: 'var(--bg-surface-2)', padding: '2px 6px', borderRadius: 4 }}>{item.reference}</code></td>
                    <td><span style={{ fontWeight: 700, color: item.quantity === 0 ? 'var(--brand-danger)' : 'var(--brand-warning)' }}>{item.quantity}</span></td>
                    <td>{item.minStock}</td>
                    <td><span className="badge badge-red">{item.quantity === 0 ? t('outOfStock') : t('lowStock')}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
