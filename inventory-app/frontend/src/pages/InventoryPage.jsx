import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import toast from 'react-hot-toast';

const UNITS = ['pcs', 'kg', 'g', 'l', 'ml', 'm', 'box', 'pack', 'pair', 'set', 'roll'];

function ItemModal({ item, onClose, onSave }) {
  const { t, fmtCur } = useI18n();
  const [form, setForm] = useState({
    name: item?.name || '', reference: item?.reference || '', category: item?.category || '',
    description: item?.description || '', price: item?.price ?? '', quantity: item?.quantity ?? '',
    unit: item?.unit || 'pcs', minStock: item?.minStock ?? '5',
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(item?.image?.url || null);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const fileRef = useRef();

  useEffect(() => {
    api.get('/inventory/categories').then(r => setCategories(r.data.data)).catch(() => {});
  }, []);

  const handleImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5MB'); return; }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.reference || form.price === '' || form.quantity === '') {
      toast.error('Name, reference, price and quantity are required');
      return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v !== undefined && v !== null) fd.append(k, v); });
      if (imageFile) fd.append('image', imageFile);
      if (item?._id) {
        await api.put('/inventory/' + item._id, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('Item updated');
      } else {
        await api.post('/inventory', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('Item created');
      }
      onSave(); onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || 'Error saving item');
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{item ? t('editItem') : t('addNewItem')}</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose} style={{ fontSize: '1.2rem' }}>x</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="grid-2" style={{ gap: 16, marginBottom: 16 }}>
            <div className="form-group">
              <label className="form-label">{t('itemName')} {t('required')}</label>
              <input className="form-input" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="Product name" />
            </div>
            <div className="form-group">
              <label className="form-label">{t('referenceSKU')} {t('required')}</label>
              <input className="form-input" value={form.reference} onChange={e => setForm(f => ({...f, reference: e.target.value.toUpperCase()}))} placeholder="SKU-001" />
            </div>
            <div className="form-group">
              <label className="form-label">{t('pricePerUnit')} {t('required')}</label>
              <input className="form-input" type="number" min="0" step="0.001" value={form.price} onChange={e => setForm(f => ({...f, price: e.target.value}))} placeholder="0.000" />
            </div>
            <div className="form-group">
              <label className="form-label">{t('quantity')} {t('required')}</label>
              <input className="form-input" type="number" min="0" step="1" value={form.quantity} onChange={e => setForm(f => ({...f, quantity: e.target.value}))} placeholder="0" />
            </div>
            <div className="form-group">
              <label className="form-label">{t('unit')}</label>
              <select className="form-select" value={form.unit} onChange={e => setForm(f => ({...f, unit: e.target.value}))}>
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">{t('category')}</label>
              <input className="form-input" list="cat-list" value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value}))} placeholder="Electronics, Food..." />
              <datalist id="cat-list">{categories.map(c => <option key={c} value={c} />)}</datalist>
            </div>
            <div className="form-group">
              <label className="form-label">{t('minStockAlert')}</label>
              <input className="form-input" type="number" min="0" value={form.minStock} onChange={e => setForm(f => ({...f, minStock: e.target.value}))} />
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="form-label">{t('description')}</label>
            <textarea className="form-textarea" value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} placeholder="Optional description..." />
          </div>
          <div className="form-group" style={{ marginBottom: 24 }}>
            <label className="form-label">{t('productImage')}</label>
            <div className="upload-zone" onClick={() => fileRef.current?.click()}>
              {imagePreview ? (
                <img src={imagePreview} alt="Preview" style={{ maxHeight: 120, borderRadius: 8, margin: '0 auto', display: 'block' }} />
              ) : (
                <div><div style={{ fontSize: '2rem', marginBottom: 8 }}>📷</div><p style={{ color: 'var(--text-secondary)', fontSize: '.86rem' }}>{t('clickToUpload')}</p></div>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={handleImage} />
          </div>
          <div className="flex gap-3" style={{ justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>{t('cancel')}</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? t('saving') : (item ? t('updateItem') : t('addNewItem'))}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function InventoryPage() {
  const { user, canManage } = useAuth();
  const { t, fmtCur } = useI18n();
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState([]);
  const [sortBy, setSortBy] = useState('createdAt');
  const [modal, setModal] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const searchTimeout = useRef();

  const canAdd = canManage || user?.permissions?.canAddInventory;
  const canEdit = canManage || user?.permissions?.canEditInventory;
  const canDelete = canManage || user?.permissions?.canDeleteInventory;

  const load = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 20, sortBy };
      if (search) params.search = search;
      if (category) params.category = category;
      const res = await api.get('/inventory', { params });
      setItems(res.data.data);
      setPagination(p => ({ ...p, ...res.data.pagination, page }));
    } catch { toast.error('Failed to load inventory'); }
    finally { setLoading(false); }
  }, [search, category, sortBy]);

  useEffect(() => { load(1); }, [category, sortBy]);
  useEffect(() => {
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => load(1), 400);
    return () => clearTimeout(searchTimeout.current);
  }, [search]);

  useEffect(() => {
    api.get('/inventory/categories').then(r => setCategories(r.data.data)).catch(() => {});
  }, []);

  const handleDelete = async () => {
    try {
      await api.delete('/inventory/' + deleteId);
      toast.success('Item deleted'); setDeleteId(null); load(pagination.page);
    } catch { toast.error('Failed to delete item'); }
  };

  return (
    <div className="page-wrap">
      <div className="flex items-center justify-between mb-6">
        <div><h1>{t('inventoryTitle')}</h1><p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>{pagination.total} {t('items')}</p></div>
        {canAdd && <button className="btn btn-primary" onClick={() => setModal('add')}>{t('addItem')}</button>}
      </div>

      <div className="card mb-4" style={{ padding: '16px 20px' }}>
        <div className="flex gap-3" style={{ flexWrap: 'wrap' }}>
          <div className="search-wrap" style={{ flex: 1, minWidth: 200 }}>
            <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input className="form-input search-input" placeholder={t('searchItems')} value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="form-select" style={{ minWidth: 160 }} value={category} onChange={e => setCategory(e.target.value)}>
            <option value="">{t('allCategories')}</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="form-select" style={{ minWidth: 160 }} value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="createdAt">{t('newestFirst')}</option>
            <option value="name">{t('nameAZ')}</option>
            <option value="price">{t('price')}</option>
            <option value="quantity">{t('quantity')}</option>
          </select>
        </div>
      </div>

      <div className="table-wrap">
        {loading ? <div className="page-loader"><div className="spinner" /></div>
        : items.length === 0 ? (
          <div className="empty-state"><div className="empty-state-icon">📦</div><p style={{ fontWeight: 600 }}>{t('noItemsFound')}</p><p style={{ fontSize: '.84rem' }}>{canAdd ? t('addFirstItem') : t('inventoryEmpty')}</p></div>
        ) : (
          <table>
            <thead><tr>
              <th>{t('item')}</th><th>{t('reference')}</th><th>{t('category')}</th>
              <th>{t('priceUnit')}</th><th>{t('qty')}</th><th>{t('totalValue')}</th><th>{t('status')}</th>
              {(canEdit || canDelete) && <th>{t('actions')}</th>}
            </tr></thead>
            <tbody>
              {items.map(item => (
                <tr key={item._id}>
                  <td><div className="flex items-center gap-3">
                    {item.image?.url ? <img src={item.image.url} alt={item.name} className="item-image" /> : <div className="item-image-placeholder">📦</div>}
                    <div><div style={{ fontWeight: 600 }}>{item.name}</div>{item.description && <div style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>{item.description.slice(0,45)}{item.description.length > 45 ? '...' : ''}</div>}</div>
                  </div></td>
                  <td><code style={{ fontSize: '.78rem', background: 'var(--bg-surface-2)', padding: '2px 6px', borderRadius: 4 }}>{item.reference}</code></td>
                  <td>{item.category ? <span className="chip">{item.category}</span> : <span style={{ color: 'var(--text-muted)' }}>-</span>}</td>
                  <td style={{ fontWeight: 600 }}>{fmtCur(item.price)}<span style={{ fontSize: '.73rem', color: 'var(--text-muted)', marginLeft: 3 }}>/{item.unit}</span></td>
                  <td><span style={{ fontWeight: 700, color: item.quantity === 0 ? 'var(--brand-danger)' : item.isLowStock ? 'var(--brand-warning)' : 'inherit' }}>{item.quantity} {item.unit}</span></td>
                  <td style={{ fontWeight: 600 }}>{fmtCur(item.totalValue)}</td>
                  <td>{item.quantity === 0 ? <span className="badge badge-red">{t('outOfStock')}</span> : item.isLowStock ? <span className="badge badge-amber">{t('lowStock')}</span> : <span className="badge badge-green">{t('inStockBadge')}</span>}</td>
                  {(canEdit || canDelete) && <td><div className="flex gap-2">
                    {canEdit && <button className="btn btn-ghost btn-sm" onClick={() => setModal(item)}>{t('edit')}</button>}
                    {canDelete && <button className="btn btn-danger btn-sm" onClick={() => setDeleteId(item._id)}>{t('del')}</button>}
                  </div></td>}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {pagination.pages > 1 && (
        <div className="flex items-center justify-between mt-4" style={{ color: 'var(--text-secondary)', fontSize: '.85rem' }}>
          <span>{t('page')} {pagination.page} {t('of')} {pagination.pages}</span>
          <div className="flex gap-2">
            <button className="btn btn-secondary btn-sm" disabled={pagination.page === 1} onClick={() => load(pagination.page - 1)}>{t('prevPage')}</button>
            <button className="btn btn-secondary btn-sm" disabled={pagination.page === pagination.pages} onClick={() => load(pagination.page + 1)}>{t('nextPage')}</button>
          </div>
        </div>
      )}

      {(modal === 'add' || (modal && typeof modal === 'object')) && (
        <ItemModal item={modal === 'add' ? null : modal} onClose={() => setModal(null)} onSave={() => load(pagination.page)} />
      )}

      {deleteId && (
        <div className="modal-overlay" onClick={() => setDeleteId(null)}>
          <div className="modal" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: 12 }}>{t('deleteItem')}</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>{t('cannotUndo')}</p>
            <div className="flex gap-3" style={{ justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setDeleteId(null)}>{t('cancel')}</button>
              <button className="btn btn-danger" onClick={handleDelete}>{t('delete')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
