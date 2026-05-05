import { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import toast from 'react-hot-toast';

export default function ReportsPage() {
  const { user } = useAuth();
  const { t, fmtCur, fmt } = useI18n();
  const [data, setData] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [filter, setFilter] = useState({ category: '', status: '' });
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [analyticsRes, itemsRes, catRes] = await Promise.all([
          api.get('/inventory/analytics'),
          api.get('/inventory', { params: { limit: 1000, sortBy: 'category' } }),
          api.get('/inventory/categories'),
        ]);
        setData(analyticsRes.data.data);
        setItems(itemsRes.data.data);
        setCategories(catRes.data.data);
      } catch { toast.error('Failed to load report data'); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const filteredItems = items.filter(item => {
    if (filter.category && item.category !== filter.category) return false;
    if (filter.status === 'low' && !item.isLowStock) return false;
    if (filter.status === 'out' && item.quantity !== 0) return false;
    if (filter.status === 'ok' && (item.isLowStock || item.quantity === 0)) return false;
    return true;
  });

  const exportPDF = async () => {
    setExporting(true);
    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');

      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const now = new Date();

      doc.setFillColor(13, 148, 136);
      doc.rect(0, 0, 297, 22, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('INVENTRA — Inventory Report', 14, 14);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generated: ${now.toLocaleString()} | By: ${user.name} (${user.role})`, 200, 14);

      doc.setTextColor(30, 30, 30);
      doc.setFontSize(9);
      const summary = data?.summary || {};
      const boxes = [
        [t('totalSKUsLabel'), fmt(summary.totalItems)],
        [t('totalUnitsLabel'), fmt(summary.totalUnits)],
        [t('inventoryValue'), fmtCur(summary.totalValue)],
        [t('lowStockAlerts'), fmt(summary.lowStockCount)],
      ];
      boxes.forEach(([label, val], i) => {
        const x = 14 + i * 68;
        doc.setFillColor(248, 250, 251);
        doc.roundedRect(x, 26, 62, 18, 2, 2, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text(String(val), x + 6, 37);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(100, 120, 118);
        doc.text(label, x + 6, 42);
        doc.setTextColor(30, 30, 30);
      });

      if (data?.byCategory?.length) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(t('categoryBreakdown'), 14, 54);
        autoTable(doc, {
          startY: 57,
          head: [[t('category'), t('items'), t('totalUnitsCol'), t('totalValue'), t('sharePercent')]],
          body: data.byCategory.map(c => [
            c._id || 'Uncategorized',
            c.count,
            fmt(c.totalUnits),
            fmtCur(c.totalValue),
            summary.totalValue ? (c.totalValue / summary.totalValue * 100).toFixed(1) + '%' : '0%',
          ]),
          theme: 'grid',
          headStyles: { fillColor: [13, 148, 136], textColor: 255, fontSize: 8 },
          bodyStyles: { fontSize: 8 },
          margin: { left: 14 },
          tableWidth: 130,
        });
      }

      const finalY = doc.lastAutoTable?.finalY || 57;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(t('inventoryTitle'), 14, finalY + 10);

      autoTable(doc, {
        startY: finalY + 13,
        head: [[t('ref'), t('name'), t('category'), t('priceUnit'), t('qty'), t('unit'), t('totalValue'), t('status')]],
        body: filteredItems.map(item => [
          item.reference, item.name, item.category || '-',
          fmtCur(item.price), item.quantity, item.unit, fmtCur(item.totalValue),
          item.quantity === 0 ? t('outOfStock').toUpperCase() : item.isLowStock ? t('lowStock').toUpperCase() : 'OK',
        ]),
        theme: 'striped',
        headStyles: { fillColor: [15, 40, 35], textColor: 255, fontSize: 8 },
        bodyStyles: { fontSize: 7.5 },
        columnStyles: { 7: { fontStyle: 'bold' } },
        margin: { left: 14, right: 14 },
      });

      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(160, 160, 160);
        doc.text(`Page ${i} of ${pageCount} — Inventra Report`, 14, doc.internal.pageSize.height - 6);
      }

      doc.save(`inventory-report-${now.toISOString().split('T')[0]}.pdf`);
      toast.success('PDF exported successfully!');
    } catch (err) {
      console.error(err);
      toast.error('PDF export failed');
    } finally { setExporting(false); }
  };

  if (loading) return <div className="page-loader"><div className="spinner" style={{ width: 32, height: 32 }} /></div>;

  const summary = data?.summary || {};

  return (
    <div className="page-wrap">
      <div className="flex items-center justify-between mb-6">
        <div><h1>{t('reportsTitle')}</h1><p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>{t('fullAnalysis')}</p></div>
        <button className="btn btn-primary" onClick={exportPDF} disabled={exporting}>
          {exporting ? t('generating') : t('exportPDF')}
        </button>
      </div>

      <div className="grid-4 mb-6">
        {[
          { label: t('totalSKUsLabel'), value: fmt(summary.totalItems), icon: '📦', cls: 'teal' },
          { label: t('totalUnitsLabel'), value: fmt(summary.totalUnits), icon: '🔢', cls: 'amber' },
          { label: t('inventoryValue'), value: fmtCur(summary.totalValue), icon: '💰', cls: 'blue' },
          { label: t('lowStockItems'), value: fmt(summary.lowStockCount), icon: '⚠️', cls: 'red' },
        ].map(s => (
          <div key={s.label} className={`stat-card ${s.cls}`}>
            <div className="stat-card-icon" style={{ background: 'var(--bg-surface-2)' }}>{s.icon}</div>
            <div className="stat-card-value" style={{ fontSize: s.cls === 'blue' ? '1.3rem' : '2rem' }}>{s.value}</div>
            <div className="stat-card-label">{s.label}</div>
          </div>
        ))}
      </div>

      {data?.byCategory?.length > 0 && (
        <div className="card mb-6">
          <h3 className="mb-4">{t('categoryBreakdown')}</h3>
          <div className="table-wrap">
            <table>
              <thead><tr><th>{t('category')}</th><th>{t('items')}</th><th>{t('totalUnitsCol')}</th><th>{t('totalValue')}</th><th>{t('sharePercent')}</th></tr></thead>
              <tbody>
                {data.byCategory.map(cat => (
                  <tr key={cat._id}>
                    <td style={{ fontWeight: 600 }}>{cat._id || 'Uncategorized'}</td>
                    <td>{cat.count}</td>
                    <td>{fmt(cat.totalUnits)}</td>
                    <td style={{ fontWeight: 700 }}>{fmtCur(cat.totalValue)}</td>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="progress-bar" style={{ flex: 1 }}>
                          <div className="progress-fill" style={{ width: `${summary.totalValue ? (cat.totalValue / summary.totalValue * 100) : 0}%`, background: 'var(--brand-primary)' }} />
                        </div>
                        <span style={{ fontSize: '.82rem', fontWeight: 600, minWidth: 40 }}>
                          {summary.totalValue ? (cat.totalValue / summary.totalValue * 100).toFixed(1) : 0}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card">
        <div className="flex items-center justify-between mb-4" style={{ flexWrap: 'wrap', gap: 12 }}>
          <h3>{t('inventoryTitle')} ({filteredItems.length} {t('items')})</h3>
          <div className="flex gap-3">
            <select className="form-select" style={{ minWidth: 150 }} value={filter.category} onChange={e => setFilter(f => ({...f, category: e.target.value}))}>
              <option value="">{t('allCategoriesFilter')}</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select className="form-select" style={{ minWidth: 140 }} value={filter.status} onChange={e => setFilter(f => ({...f, status: e.target.value}))}>
              <option value="">{t('allStatuses')}</option>
              <option value="ok">{t('inStockBadge')}</option>
              <option value="low">{t('lowStock')}</option>
              <option value="out">{t('outOfStock')}</option>
            </select>
          </div>
        </div>
        <div className="table-wrap">
          {filteredItems.length === 0 ? (
            <div className="empty-state"><div className="empty-state-icon">📊</div><p>{t('noItemsMatch')}</p></div>
          ) : (
            <table>
              <thead><tr><th>{t('ref')}</th><th>{t('name')}</th><th>{t('category')}</th><th>{t('priceUnit')}</th><th>{t('qty')}</th><th>{t('totalValue')}</th><th>{t('status')}</th></tr></thead>
              <tbody>
                {filteredItems.map(item => (
                  <tr key={item._id}>
                    <td><code style={{ fontSize: '.78rem', background: 'var(--bg-surface-2)', padding: '2px 6px', borderRadius: 4 }}>{item.reference}</code></td>
                    <td style={{ fontWeight: 600 }}>{item.name}</td>
                    <td>{item.category || <span style={{ color: 'var(--text-muted)' }}>-</span>}</td>
                    <td>{fmtCur(item.price)}</td>
                    <td style={{ fontWeight: 700 }}>{item.quantity} {item.unit}</td>
                    <td style={{ fontWeight: 700 }}>{fmtCur(item.totalValue)}</td>
                    <td>
                      {item.quantity === 0 ? <span className="badge badge-red">{t('outOfStock')}</span>
                      : item.isLowStock ? <span className="badge badge-amber">{t('lowStock')}</span>
                      : <span className="badge badge-green">{t('inStockBadge')}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
