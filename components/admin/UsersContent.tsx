'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Users, Search, Edit2, Check, X, Shield, UserCheck, User, Loader2 } from 'lucide-react'

interface UserRow {
  id: string
  email: string
  full_name: string
  role: string
  department: string | null
  designation: string | null
  is_active: boolean
  manager: { id: string; full_name: string; email: string } | null
}

interface Props {
  users: UserRow[]
  managers: UserRow[]
}

const ROLE_ICONS: Record<string, React.ReactNode> = {
  admin: <Shield className="w-3.5 h-3.5" />,
  manager: <UserCheck className="w-3.5 h-3.5" />,
  employee: <User className="w-3.5 h-3.5" />,
}

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-red-50 text-red-700',
  manager: 'bg-purple-50 text-purple-700',
  employee: 'bg-blue-50 text-blue-700',
}

export function UsersContent({ users, managers }: Props) {
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<Partial<UserRow>>({})
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const filtered = users.filter(u => {
    const matchSearch = !search ||
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.department?.toLowerCase().includes(search.toLowerCase())
    const matchRole = roleFilter === 'all' || u.role === roleFilter
    return matchSearch && matchRole
  })

  function startEdit(user: UserRow) {
    setEditingId(user.id)
    setEditData({
      full_name: user.full_name,
      role: user.role,
      department: user.department ?? '',
      designation: user.designation ?? '',
      manager_id: (user.manager as any)?.id ?? null,
      is_active: user.is_active,
    } as any)
  }

  async function saveEdit(userId: string) {
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: editData.full_name,
        role: editData.role,
        department: editData.department || null,
        designation: editData.designation || null,
        manager_id: (editData as any).manager_id || null,
        is_active: editData.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)

    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setMessage({ type: 'success', text: 'User updated successfully' })
      setEditingId(null)
      window.location.reload()
    }
    setSaving(false)
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Users className="w-6 h-6 text-indigo-600" />
          User Management
        </h1>
        <p className="text-gray-500 text-sm mt-1">{users.length} total users</p>
      </div>

      {message && (
        <div className={`mb-4 px-4 py-3 rounded-lg text-sm flex items-center gap-2 ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message.type === 'success' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
          {message.text}
          <button onClick={() => setMessage(null)} className="ml-auto">✕</button>
        </div>
      )}

      {/* Role summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { role: 'employee', label: 'Employees', count: users.filter(u => u.role === 'employee').length },
          { role: 'manager', label: 'Managers', count: users.filter(u => u.role === 'manager').length },
          { role: 'admin', label: 'Admins', count: users.filter(u => u.role === 'admin').length },
        ].map(r => (
          <button key={r.role} onClick={() => setRoleFilter(roleFilter === r.role ? 'all' : r.role)}
            className={`bg-white rounded-xl border p-4 text-left hover:border-indigo-200 transition ${roleFilter === r.role ? 'border-indigo-300 bg-indigo-50/30' : 'border-gray-100'}`}>
            <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium mb-2 ${ROLE_COLORS[r.role]}`}>
              {ROLE_ICONS[r.role]}
              {r.role}
            </div>
            <div className="text-2xl font-bold text-gray-900">{r.count}</div>
            <div className="text-xs text-gray-400">{r.label}</div>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4 flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search users..."
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
      </div>

      {/* Users table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['Name', 'Role', 'Department', 'Manager', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(user => {
                const isEditing = editingId === user.id
                return (
                  <tr key={user.id} className={`hover:bg-gray-50/50 transition ${!user.is_active ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <input value={editData.full_name ?? ''} onChange={e => setEditData(p => ({ ...p, full_name: e.target.value }))}
                          className="px-2 py-1 border border-indigo-300 rounded text-sm w-full focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                      ) : (
                        <div>
                          <div className="font-medium text-gray-900">{user.full_name}</div>
                          <div className="text-xs text-gray-400">{user.email}</div>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <select value={editData.role ?? user.role} onChange={e => setEditData(p => ({ ...p, role: e.target.value }))}
                          className="px-2 py-1 border border-indigo-300 rounded text-sm bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500">
                          <option value="employee">Employee</option>
                          <option value="manager">Manager</option>
                          <option value="admin">Admin</option>
                        </select>
                      ) : (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[user.role]}`}>
                          {ROLE_ICONS[user.role]}{user.role}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <input value={(editData as any).department ?? ''} onChange={e => setEditData(p => ({ ...p, department: e.target.value }))}
                          placeholder="Department"
                          className="px-2 py-1 border border-indigo-300 rounded text-sm w-32 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                      ) : (
                        <span className="text-gray-600 text-xs">{user.department ?? '—'}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <select value={(editData as any).manager_id ?? ''} onChange={e => setEditData(p => ({ ...p, manager_id: e.target.value || null }))}
                          className="px-2 py-1 border border-indigo-300 rounded text-sm bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500">
                          <option value="">No manager</option>
                          {managers.filter(m => m.id !== user.id).map(m => (
                            <option key={m.id} value={m.id}>{m.full_name}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-gray-500 text-xs">{user.manager?.full_name ?? '—'}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={editData.is_active ?? user.is_active}
                            onChange={e => setEditData(p => ({ ...p, is_active: e.target.checked }))}
                            className="rounded" />
                          <span className="text-xs text-gray-600">Active</span>
                        </label>
                      ) : (
                        <span className={`text-xs font-medium ${user.is_active ? 'text-green-600' : 'text-gray-400'}`}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <button onClick={() => saveEdit(user.id)} disabled={saving}
                            className="flex items-center gap-1 text-xs bg-green-600 text-white px-2.5 py-1.5 rounded-lg hover:bg-green-700 disabled:opacity-60">
                            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                            Save
                          </button>
                          <button onClick={() => setEditingId(null)}
                            className="flex items-center gap-1 text-xs text-gray-600 bg-gray-100 px-2.5 py-1.5 rounded-lg hover:bg-gray-200">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => startEdit(user)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
