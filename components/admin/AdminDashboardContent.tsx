'use client'

import { useState } from 'react'
import Link from 'next/link'
import { lockGoalSheet, unlockGoalSheet } from '@/actions/admin'
import { getSheetStatusColor, formatDate, exportToCSV } from '@/lib/utils'
import { STATUS_LABELS } from '@/types'
import type { Profile } from '@/types'
import {
  Users, FileText, CheckCircle2, Lock, Unlock, Download,
  ClipboardList, Share2, Search, AlertCircle, BarChart3,
  TrendingUp, Clock, ChevronRight, Loader2
} from 'lucide-react'

interface AdminStats {
  totalEmployees: number
  pendingCount: number
  approvedCount: number
  lockedCount: number
}

interface SheetRow {
  id: string
  status: string
  financial_year: string
  submitted_at: string | null
  updated_at: string
  employee: { full_name: string; email: string; department: string | null; manager: { full_name: string } | null } | null
  goals: { id: string }[]
}

interface Props {
  profile: Profile
  year: string
  stats: AdminStats
  recentSheets: SheetRow[]
}

export function AdminDashboardContent({ profile, year, stats, recentSheets }: Props) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [processing, setProcessing] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const filtered = recentSheets.filter(s => {
    const emp = s.employee
    const matchSearch = !search ||
      emp?.full_name.toLowerCase().includes(search.toLowerCase()) ||
      emp?.email.toLowerCase().includes(search.toLowerCase()) ||
      emp?.department?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || s.status === statusFilter
    return matchSearch && matchStatus
  })

  async function handleLock(sheetId: string) {
    setProcessing(sheetId)
    const result = await lockGoalSheet(sheetId)
    setMessage({ type: result.success ? 'success' : 'error', text: result.success ? (result.message ?? 'Locked') : result.error })
    setProcessing(null)
    if (result.success) window.location.reload()
  }

  async function handleUnlock(sheetId: string) {
    setProcessing(sheetId)
    const result = await unlockGoalSheet(sheetId)
    setMessage({ type: result.success ? 'success' : 'error', text: result.success ? (result.message ?? 'Unlocked') : result.error })
    setProcessing(null)
    if (result.success) window.location.reload()
  }

  function handleExportCSV() {
    const rows = filtered.map(s => ({
      employee_name: s.employee?.full_name ?? '',
      email: s.employee?.email ?? '',
      department: s.employee?.department ?? '',
      manager: s.employee?.manager?.full_name ?? '',
      financial_year: s.financial_year,
      status: s.status,
      goal_count: s.goals.length,
      submitted_at: s.submitted_at ? formatDate(s.submitted_at) : '',
      last_updated: formatDate(s.updated_at),
    }))
    exportToCSV(rows, `goal-sheets-${year}`)
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Financial Year: {year}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/audit-logs"
            className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition">
            <ClipboardList className="w-4 h-4" />
            Audit Logs
          </Link>
          <Link href="/admin/reports"
            className="flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition">
            <BarChart3 className="w-4 h-4" />
            Reports
          </Link>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`mb-4 px-4 py-3 rounded-lg text-sm flex items-center gap-2 ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {message.text}
          <button onClick={() => setMessage(null)} className="ml-auto">✕</button>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Employees', value: stats.totalEmployees, icon: <Users className="w-5 h-5 text-indigo-600" />, bg: 'bg-indigo-50' },
          { label: 'Pending Review', value: stats.pendingCount, icon: <Clock className="w-5 h-5 text-blue-600" />, bg: 'bg-blue-50' },
          { label: 'Approved', value: stats.approvedCount, icon: <CheckCircle2 className="w-5 h-5 text-green-600" />, bg: 'bg-green-50' },
          { label: 'Locked', value: stats.lockedCount, icon: <Lock className="w-5 h-5 text-purple-600" />, bg: 'bg-purple-50' },
        ].map(stat => (
          <div key={stat.label} className={`${stat.bg} rounded-xl p-4`}>
            <div className="mb-2">{stat.icon}</div>
            <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { href: '/admin/users', label: 'Manage Users', icon: <Users className="w-5 h-5 text-indigo-600" /> },
          { href: '/admin/shared-goals', label: 'Shared Goals', icon: <Share2 className="w-5 h-5 text-purple-600" /> },
          { href: '/admin/reports', label: 'Export Reports', icon: <Download className="w-5 h-5 text-green-600" /> },
          { href: '/admin/audit-logs', label: 'Audit Logs', icon: <ClipboardList className="w-5 h-5 text-gray-600" /> },
        ].map(link => (
          <Link key={link.href} href={link.href}
            className="bg-white border border-gray-100 rounded-xl p-4 flex items-center gap-3 hover:border-indigo-100 hover:bg-indigo-50/30 transition">
            {link.icon}
            <span className="text-sm font-medium text-gray-700">{link.label}</span>
            <ChevronRight className="w-4 h-4 text-gray-300 ml-auto" />
          </Link>
        ))}
      </div>

      {/* All Goal Sheets table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-sm font-semibold text-gray-700">Goal Sheets — {year}</h2>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search..."
                className="pl-9 pr-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-48"
              />
            </div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="approved">Approved</option>
              <option value="locked">Locked</option>
              <option value="rework">Rework</option>
            </select>
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-50">
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Employee</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Manager</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Goals</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Submitted</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-gray-400">No goal sheets found</td></tr>
              ) : filtered.map(sheet => (
                <tr key={sheet.id} className="hover:bg-gray-50/50 transition">
                  <td className="px-5 py-3.5">
                    <div className="font-medium text-gray-900">{sheet.employee?.full_name ?? '—'}</div>
                    <div className="text-xs text-gray-400">{sheet.employee?.department ?? sheet.employee?.email}</div>
                  </td>
                  <td className="px-4 py-3.5 text-gray-600 text-xs">{sheet.employee?.manager?.full_name ?? '—'}</td>
                  <td className="px-4 py-3.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getSheetStatusColor(sheet.status)}`}>
                      {STATUS_LABELS[sheet.status as keyof typeof STATUS_LABELS] ?? sheet.status}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-gray-600">{sheet.goals.length}</td>
                  <td className="px-4 py-3.5 text-gray-400 text-xs">{sheet.submitted_at ? formatDate(sheet.submitted_at) : '—'}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center justify-end gap-2">
                      {sheet.status === 'approved' && (
                        <button onClick={() => handleLock(sheet.id)} disabled={processing === sheet.id}
                          className="flex items-center gap-1 text-xs text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg hover:bg-purple-100 transition disabled:opacity-60">
                          {processing === sheet.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Lock className="w-3 h-3" />}
                          Lock
                        </button>
                      )}
                      {sheet.status === 'locked' && (
                        <button onClick={() => handleUnlock(sheet.id)} disabled={processing === sheet.id}
                          className="flex items-center gap-1 text-xs text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg hover:bg-amber-100 transition disabled:opacity-60">
                          {processing === sheet.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Unlock className="w-3 h-3" />}
                          Unlock
                        </button>
                      )}
                      <Link href={`/admin/sheet/${sheet.id}`}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition">
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
