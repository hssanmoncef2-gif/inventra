import { useState, useEffect } from 'react';
import { useI18n } from '../context/I18nContext';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const ROLES = ['owner', 'manager', 'employee'];
const roleColor = { admin: 'badge-red', owner: 'badge-amber', manager: 'badge-blue', employee: 'badge-teal' };

function UserModal({ user, currentUser, onClose, onSave }) {
  const { t } = useI18n();
  const isNew = !user;
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    password: '',
    role: user?.role || 'employee',
    isActive: user?.isActive ?? true,
    permissions: user?.permissions || { canAddInventory: false, canEditInventory: false, canDeleteInventory: false },
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isNew && (!form.name || !form.email || !form.password)) {
      toast.error('Name, email and password are required'); return;
    }
    setLoading(true);
    try {
      if (isNew) {
        await api.post('/auth/register', form);
        toast.success('User created successfully');
      } else {
        await api.put('/users/' + user._id, form);
        toast.success('User updated successfully');
      }
      onSave(); onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || 'Error saving user');
    } finally { setLoading(false); }
  };

  const setPerm = (key, val) => setForm(f => ({ ...f, permissions: { ...f.permissions, [key]: val } }));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{isNew ? 'Add User' : 'Edit User'}</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose} style={{ fontSize: '1.3rem' }}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Full Name {isNew && '*'}</label>
              <input className="form-input" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="Jane Smith" />
            </div>
            <div className="form-group">
              <label className="form-label">Email {isNew && '*'}</label>
              <input className="form-input" type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} placeholder="jane@company.com" disabled={!isNew} />
            </div>
            {isNew && (
              <div className="form-group">
                <label className="form-label">Password *</label>
                <input className="form-input" type="password" value={form.password} onChange={e => setForm(f => ({...f, password: e.target.value}))} placeholder="Min. 8 characters" />
              </div>
            )}
            {currentUser.role === 'admin' && (
              <div className="form-group">
                <label className="form-label">Role</label>
                <select className="form-select" value={form.role} onChange={e => setForm(f => ({...f, role: e.target.value}))}>
                  {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                </select>
              </div>
            )}
            {form.role === 'employee' && (
              <div>
                <div className="form-label" style={{ marginBottom: 10 }}>Employee Permissions</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, background: 'var(--bg-surface-2)', padding: 14, borderRadius: 8 }}>
                  {[['canAddInventory','Can add inventory items'],['canEditInventory','Can edit inventory items'],['canDeleteInventory','Can delete inventory items']].map(([key, label]) => (
                    <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: '.88rem' }}>
                      <input type="checkbox" checked={form.permissions[key]} onChange={e => setPerm(key, e.target.checked)} style={{ width: 16, height: 16, accentColor: 'var(--brand-primary)' }} />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
            )}
            {!isNew && currentUser.role === 'admin' && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: '.88rem' }}>
                <input type="checkbox" checked={form.isActive} onChange={e => setForm(f => ({...f, isActive: e.target.checked}))} style={{ width: 16, height: 16, accentColor: 'var(--brand-primary)' }} />
                Account Active
              </label>
            )}
          </div>
          <div className="flex gap-3 mt-4" style={{ justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Saving...' : (isNew ? 'Create User' : 'Save Changes')}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/users');
      setUsers(res.data.data);
    } catch { toast.error('Failed to load users'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleDeactivate = async (userId) => {
    if (!confirm('Deactivate this user?')) return;
    try {
      await api.delete('/users/' + userId);
      toast.success('User deactivated');
      load();
    } catch { toast.error('Failed to deactivate user'); }
  };

  const filtered = users.filter(u =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.role?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page-wrap">
      <div className="flex items-center justify-between mb-6">
        <div><h1>Users</h1><p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>{users.length} users total</p></div>
        <button className="btn btn-primary" onClick={() => setModal('new')}>+ Add User</button>
      </div>

      <div className="card mb-4" style={{ padding: '14px 18px' }}>
        <div className="search-wrap">
          <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input className="form-input search-input" placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="table-wrap">
        {loading ? <div className="page-loader"><div className="spinner" /></div>
        : filtered.length === 0 ? (
          <div className="empty-state"><div className="empty-state-icon">👥</div><p style={{ fontWeight: 600 }}>No users found</p></div>
        ) : (
          <table>
            <thead><tr>
              <th>User</th><th>Email</th><th>Role</th><th>Permissions</th><th>Status</th><th>Last Login</th><th>Actions</th>
            </tr></thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u._id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="avatar" style={{ width: 36, height: 36, fontSize: '.8rem' }}>{u.name?.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2)}</div>
                      <span style={{ fontWeight: 600 }}>{u.name}</span>
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '.86rem' }}>{u.email}</td>
                  <td><span className={`badge ${roleColor[u.role] || 'badge-gray'}`}>{u.role}</span></td>
                  <td>
                    {u.role === 'employee' ? (
                      <div style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>
                        {u.permissions?.canAddInventory && <span className="badge badge-teal" style={{ marginRight: 3 }}>Add</span>}
                        {u.permissions?.canEditInventory && <span className="badge badge-blue" style={{ marginRight: 3 }}>Edit</span>}
                        {u.permissions?.canDeleteInventory && <span className="badge badge-red">Del</span>}
                        {!u.permissions?.canAddInventory && !u.permissions?.canEditInventory && !u.permissions?.canDeleteInventory && <span style={{ color: 'var(--text-muted)' }}>View only</span>}
                      </div>
                    ) : <span style={{ color: 'var(--text-muted)', fontSize: '.82rem' }}>Full access</span>}
                  </td>
                  <td><span className={`badge ${u.isActive ? 'badge-green' : 'badge-red'}`}>{u.isActive ? 'Active' : 'Inactive'}</span></td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '.8rem' }}>{u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : 'Never'}</td>
                  <td>
                    <div className="flex gap-2">
                      <button className="btn btn-ghost btn-sm" onClick={() => setModal(u)}>Edit</button>
                      {currentUser.role === 'admin' && u._id !== currentUser.id && u.isActive && (
                        <button className="btn btn-danger btn-sm" onClick={() => handleDeactivate(u._id)}>Disable</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {(modal === 'new' || (modal && typeof modal === 'object')) && (
        <UserModal user={modal === 'new' ? null : modal} currentUser={currentUser} onClose={() => setModal(null)} onSave={load} />
      )}
    </div>
  );
}
