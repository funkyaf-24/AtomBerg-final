'use client'

import { useState } from 'react'
import { formatDate, exportToCSV } from '@/lib/utils'
import { ClipboardList, Search, Download, ChevronDown, ChevronUp } from 'lucide-react'

interface AuditLog {
  id: string
  table_name: string
  record_id: string
  action: 'INSERT' | 'UPDATE' | 'DELETE'
  actor_id: string | null
  old_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
  created_at: string
  actor: { full_name: string; email: string } | null
}

const ACTION_COLORS = {
  INSERT: 'bg-green-50 text-green-700',
  UPDATE: 'bg-blue-50 text-blue-700',
  DELETE: 'bg-red-50 text-red-700',
}

export function AuditLogsContent({ logs }: { logs: AuditLog[] }) {
  const [search, setSearch] = useState('')
  const [tableFilter, setTableFilter] = useState('all')
  const [actionFilter, setActionFilter] = useState('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const tables = [...new Set(logs.map(l => l.table_name))]

  const filtered = logs.filter(log => {
    const matchSearch = !search ||
      log.actor?.full_name.toLowerCase().includes(search.toLowerCase()) ||
      log.record_id.includes(search) ||
      log.table_name.includes(search)
    const matchTable = tableFilter === 'all' || log.table_name === tableFilter
    const matchAction = actionFilter === 'all' || log.action === actionFilter
    return matchSearch && matchTable && matchAction
  })

  function handleExport() {
    exportToCSV(filtered.map(l => ({
      timestamp: l.created_at,
      actor: l.actor?.full_name ?? l.actor_id ?? 'system',
      email: l.actor?.email ?? '',
      action: l.action,
      table: l.table_name,
      record_id: l.record_id,
    })), 'audit-logs')
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-indigo-600" />
            Audit Logs
          </h1>
          <p className="text-gray-500 text-sm mt-1">{filtered.length} of {logs.length} entries</p>
        </div>
        <button onClick={handleExport}
          className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition">
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-40">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by user or record..."
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <select value={tableFilter} onChange={e => setTableFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="all">All Tables</option>
          {tables.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={actionFilter} onChange={e => setActionFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="all">All Actions</option>
          <option value="INSERT">INSERT</option>
          <option value="UPDATE">UPDATE</option>
          <option value="DELETE">DELETE</option>
        </select>
      </div>

      {/* Logs table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-50">
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Timestamp</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Actor</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Action</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Table</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Record ID</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-gray-400">No audit logs found</td></tr>
              ) : filtered.map(log => (
                <>
                  <tr key={log.id} className="hover:bg-gray-50/50 transition">
                    <td className="px-5 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{log.actor?.full_name ?? 'System'}</div>
                      <div className="text-xs text-gray-400">{log.actor?.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${ACTION_COLORS[log.action]}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 font-mono text-xs">{log.table_name}</td>
                    <td className="px-4 py-3 text-gray-400 font-mono text-xs truncate max-w-[120px]">{log.record_id.slice(0, 8)}…</td>
                    <td className="px-4 py-3">
                      {(log.old_values || log.new_values) && (
                        <button
                          onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                          className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800"
                        >
                          {expandedId === log.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          {expandedId === log.id ? 'Hide' : 'View diff'}
                        </button>
                      )}
                    </td>
                  </tr>
                  {expandedId === log.id && (
                    <tr key={`${log.id}-expanded`} className="bg-gray-50">
                      <td colSpan={6} className="px-5 py-4">
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          {log.old_values && (
                            <div>
                              <div className="font-semibold text-red-700 mb-2">Before</div>
                              <pre className="bg-red-50 border border-red-100 rounded-lg p-3 overflow-auto max-h-48 text-red-800 text-xs">
                                {JSON.stringify(log.old_values, null, 2)}
                              </pre>
                            </div>
                          )}
                          {log.new_values && (
                            <div>
                              <div className="font-semibold text-green-700 mb-2">After</div>
                              <pre className="bg-green-50 border border-green-100 rounded-lg p-3 overflow-auto max-h-48 text-green-800 text-xs">
                                {JSON.stringify(log.new_values, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
