import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '../api';
import cdrrmdLogo from '../assets/cdrrmd-logo.png';
import type { AdminAccount } from '../types';

type Props = {
  onLogout: () => void;
  onOpenDashboard: () => void;
  onOpenMonitoring: () => void;
  onOpenEvacuationAreas: () => void;
  onAuthError: () => void;
};

type AdminForm = {
  id: number | null;
  adminId: string;
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  address: string;
  contactNumber: string;
};

const EMPTY_FORM: AdminForm = {
  id: null,
  adminId: '',
  username: '',
  email: '',
  password: '',
  firstName: '',
  lastName: '',
  address: '',
  contactNumber: '',
};

function toForm(admin: AdminAccount): AdminForm {
  return {
    id: admin.id,
    adminId: admin.admin_id || '',
    username: admin.username || '',
    email: admin.email || '',
    password: '',
    firstName: admin.first_name || '',
    lastName: admin.last_name || '',
    address: admin.address || '',
    contactNumber: admin.contact_number || '',
  };
}

export default function AdminPage({ onLogout, onOpenDashboard, onOpenMonitoring, onOpenEvacuationAreas, onAuthError }: Props) {
  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState<AdminForm>(EMPTY_FORM);

  const isEdit = form.id !== null;

  async function loadAdmins() {
    setLoading(true);
    setError(null);

    try {
      const response = await api.get('/admins');
      setAdmins(Array.isArray(response.data) ? response.data : []);
    } catch (err: any) {
      if (err?.response?.status === 401) {
        onAuthError();
        return;
      }
      setError(err?.response?.data?.message || 'Failed to load admin accounts.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAdmins();
  }, []);

  function openAddForm() {
    setForm(EMPTY_FORM);
    setIsFormOpen(true);
  }

  function openEditForm(admin: AdminAccount) {
    setForm(toForm(admin));
    setIsFormOpen(true);
  }

  async function onSubmitForm(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const payload = {
        username: form.username,
        email: form.email,
        password: form.password,
        firstName: form.firstName,
        lastName: form.lastName,
        address: form.address,
        contactNumber: form.contactNumber,
      };

      if (isEdit && form.id !== null) {
        await api.put(`/admins/${form.id}`, payload);
      } else {
        await api.post('/admins', payload);
      }

      setIsFormOpen(false);
      setForm(EMPTY_FORM);
      await loadAdmins();
    } catch (err: any) {
      if (err?.response?.status === 401) {
        onAuthError();
        return;
      }
      setError(err?.response?.data?.message || 'Failed to save admin account.');
    } finally {
      setSaving(false);
    }
  }

  async function onDeleteAdmin(admin: AdminAccount) {
    const confirmed = window.confirm(`Delete admin ${admin.username}?`);
    if (!confirmed) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await api.delete(`/admins/${admin.id}`);
      await loadAdmins();
    } catch (err: any) {
      if (err?.response?.status === 401) {
        onAuthError();
        return;
      }
      setError(err?.response?.data?.message || 'Failed to delete admin account.');
    } finally {
      setSaving(false);
    }
  }

  const rows = useMemo(() => admins, [admins]);

  return (
    <div className="min-h-dvh w-full overflow-x-hidden bg-[#d9dce0] text-[#10283a]">
      <div className="grid min-h-dvh grid-cols-1 lg:grid-cols-[205px_minmax(0,1fr)]">
        <aside className="flex flex-col gap-2 bg-[#07173a] px-3 py-2 lg:min-h-dvh">
          <div className="mb-1 flex items-center gap-2 border-b border-slate-700 pb-3">
            <img src={cdrrmdLogo} alt="CDRRMD logo" className="h-8 w-8 rounded-full border border-[#f6d84c] bg-white object-cover" />
            <h1 className="text-[1.65rem] font-black tracking-tight text-white">CDRRMD</h1>
          </div>

          <nav className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4 lg:mt-2 lg:flex lg:flex-col lg:space-y-4 lg:text-base">
            <button onClick={onOpenDashboard} className="w-full rounded-md px-3 py-2.5 text-left font-semibold text-slate-200 hover:bg-[#0d2a52]">
              Dashboard
            </button>
            <button className="w-full rounded-md bg-[#0c3e69] px-3 py-2.5 text-left font-bold text-white">Admin</button>
            <button onClick={onOpenMonitoring} className="w-full rounded-md px-3 py-2.5 text-left font-semibold text-slate-200 hover:bg-[#0d2a52]">
              Monitoring
            </button>
            <button onClick={onOpenEvacuationAreas} className="w-full rounded-md px-3 py-2.5 text-left font-semibold text-slate-200 hover:bg-[#0d2a52]">
              Evacuation Areas
            </button>
          </nav>

          <button
            onClick={onLogout}
            className="mt-1 w-full rounded-md border border-slate-600 bg-[#1a2a46] px-3 py-2.5 text-sm font-bold text-white transition hover:bg-[#223355] lg:mb-2 lg:mt-auto"
          >
            Logout
          </button>
        </aside>

        <main className="w-full min-w-0 p-3 md:p-4 lg:min-h-dvh lg:overflow-y-auto">
          <div className="flex h-full flex-col rounded-lg border border-slate-300 bg-[#eceff1] p-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-black text-[#1a3650] sm:text-xl">Admin Accounts</h2>
              <button
                onClick={openAddForm}
                className="rounded-md border border-slate-400 bg-white px-3 py-1.5 text-sm font-bold text-[#1a3650] hover:bg-slate-50"
              >
                Add Admin
              </button>
            </div>

            {error ? <div className="mb-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div> : null}

            {isFormOpen ? (
              <form onSubmit={onSubmitForm} className="mb-2 grid gap-2 rounded-md border border-slate-300 bg-[#f7f8f9] p-2 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded border border-slate-300 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700">
                  ID: {isEdit ? form.adminId || form.id : 'Auto-generated after create'}
                </div>
                <input value={form.username} onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))} placeholder="Username" className="h-9 rounded border border-slate-300 px-2 text-xs" required />
                <input value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} placeholder="Email" className="h-9 rounded border border-slate-300 px-2 text-xs" required />
                <input value={form.password} onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))} placeholder={isEdit ? 'Password (optional)' : 'Password'} className="h-9 rounded border border-slate-300 px-2 text-xs" required={!isEdit} />
                <input value={form.firstName} onChange={(e) => setForm((prev) => ({ ...prev, firstName: e.target.value }))} placeholder="First Name" className="h-9 rounded border border-slate-300 px-2 text-xs" />
                <input value={form.lastName} onChange={(e) => setForm((prev) => ({ ...prev, lastName: e.target.value }))} placeholder="Last Name" className="h-9 rounded border border-slate-300 px-2 text-xs" />
                <input value={form.contactNumber} onChange={(e) => setForm((prev) => ({ ...prev, contactNumber: e.target.value }))} placeholder="Contact" className="h-9 rounded border border-slate-300 px-2 text-xs" />
                <input value={form.address} onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))} placeholder="Address" className="h-9 rounded border border-slate-300 px-2 text-xs" />
                <div className="flex flex-wrap gap-2 sm:col-span-2 xl:col-span-4">
                  <button disabled={saving} className="rounded bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-60">
                    {isEdit ? 'Save Changes' : 'Create Admin'}
                  </button>
                  <button type="button" onClick={() => setIsFormOpen(false)} className="rounded border border-slate-400 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100">
                    Cancel
                  </button>
                </div>
              </form>
            ) : null}

            <div className="flex-1 overflow-auto rounded-md border border-slate-300 bg-white">
              <table className="w-full table-fixed text-left text-xs">
                <thead className="sticky top-0 bg-[#eef2f5] text-[#1d3d57]">
                  <tr>
                    <th className="px-2 py-2 font-semibold">ID</th>
                    <th className="px-2 py-2 font-semibold">Name</th>
                    <th className="hidden px-2 py-2 font-semibold md:table-cell">Email</th>
                    <th className="hidden px-2 py-2 font-semibold lg:table-cell">Username</th>
                    <th className="hidden px-2 py-2 font-semibold lg:table-cell">Contact</th>
                    <th className="hidden px-2 py-2 font-semibold xl:table-cell">Address</th>
                    <th className="px-2 py-2 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((admin) => (
                    <tr key={admin.id} className="border-t border-slate-200 text-[#2b465b]">
                      <td className="px-2 py-2">{admin.admin_id || `ADM-${String(admin.id).padStart(5, '0')}`}</td>
                      <td className="truncate px-2 py-2">{`${admin.first_name || ''} ${admin.last_name || ''}`.trim() || 'N/A'}</td>
                      <td className="hidden truncate px-2 py-2 md:table-cell">{admin.email || 'N/A'}</td>
                      <td className="hidden px-2 py-2 lg:table-cell">{admin.username || 'N/A'}</td>
                      <td className="hidden px-2 py-2 lg:table-cell">{admin.contact_number || 'N/A'}</td>
                      <td className="hidden truncate px-2 py-2 xl:table-cell">{admin.address || 'N/A'}</td>
                      <td className="px-2 py-2">
                        <div className="flex gap-1">
                          <button onClick={() => openEditForm(admin)} className="rounded border border-blue-300 bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-700">
                            Edit
                          </button>
                          <button onClick={() => onDeleteAdmin(admin)} className="rounded border border-red-300 bg-red-50 px-2 py-1 text-[11px] font-semibold text-red-700">
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!loading && rows.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-2 py-8 text-center text-sm text-slate-500">No admin accounts found.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            {loading ? <p className="mt-2 text-xs text-slate-500">Loading admins...</p> : null}
          </div>
        </main>
      </div>
    </div>
  );
}
