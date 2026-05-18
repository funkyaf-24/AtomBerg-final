'use client'

import { useState } from 'react'
import Link from 'next/link'
import { approveGoalSheet, sendForRework } from '@/actions/manager'
import { getSheetStatusColor, formatDate, getCurrentFinancialYear } from '@/lib/utils'
import { STATUS_LABELS } from '@/types'
import type { Profile } from '@/types'
import {
  Users, FileCheck, AlertCircle, CheckCircle2, Clock, ChevronRight,
  Search, Send, RotateCcw, Loader2
} from 'lucide-react'

interface TeamMember extends Profile {
  goal_sheets: {
    id: string
    status: string
    financial_year: string
    submitted_at: string | null
    goals: { id: string; weightage: number; quarterly_updates: { progress_pct: number | null }[] }[]
  }[]
}

interface Props {
  profile: Profile
  team: TeamMember[]
  currentYear: string
}

export function ManagerDashboardContent({ profile, team, currentYear }: Props) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [reworkModal, setReworkModal] = useState<{ sheetId: string; employeeName: string } | null>(null)
  const [reworkReason, setReworkReason] = useState('')
  const [processing, setProcessing] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Get the current year's sheet for a team member (fall back to latest)
  function getActiveSheet(member: TeamMember) {
    return member.goal_sheets.find(s => s.financial_year === currentYear) ?? member.goal_sheets[0] ?? null
  }

  // Stats — scoped to current financial year sheets
  const pending = team.filter(m => getActiveSheet(m)?.status === 'submitted').length
  const approved = team.filter(m => ['approved', 'locked'].includes(getActiveSheet(m)?.status ?? '')).length
  const draft = team.filter(m => ['draft', 'rework'].includes(getActiveSheet(m)?.status ?? '')).length
  const noSheet = team.filter(m => !getActiveSheet(m)).length

  // Filter team
  const filtered = team.filter(member => {
    const matchSearch = member.full_name.toLowerCase().includes(search.toLowerCase()) ||
      member.email.toLowerCase().includes(search.toLowerCase())
    const activeSheet = getActiveSheet(member)
    const matchStatus = statusFilter === 'all' || (activeSheet?.status === statusFilter) ||
      (statusFilter === 'none' && !activeSheet)
    return matchSearch && matchStatus
  })

  async function handleApprove(sheetId: string) {
    setProcessing(sheetId)
    const result = await approveGoalSheet(sheetId)
    if (result.success) {
      setMessage({ type: 'success', text: result.message ?? 'Approved!' })
      window.location.reload()
    } else {
      setMessage({ type: 'error', text: result.error })
    }
    setProcessing(null)
  }

  async function handleRework() {
    if (!reworkModal || !reworkReason.trim()) return
    setProcessing(reworkModal.sheetId)
    const result = await sendForRework(reworkModal.sheetId, reworkReason)
    if (result.success) {
      setMessage({ type: 'success', text: result.message ?? 'Sent for rework' })
      setReworkModal(null)
      setReworkReason('')
      window.location.reload()
    } else {
      setMessage({ type: 'error', text: result.error })
    }
    setProcessing(null)
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Team Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">
          {profile.full_name} · {team.length} direct report{team.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Message */}
      {message && (
        <div className={`mb-4 px-4 py-3 rounded-lg text-sm flex items-center gap-2 ${
          message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {message.text}
          <button onClick={() => setMessage(null)} className="ml-auto">✕</button>
        </div>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Pending Review', value: pending, icon: <Clock className="w-5 h-5 text-blue-600" />, bg: 'bg-blue-50', status: 'submitted' },
          { label: 'Approved', value: approved, icon: <CheckCircle2 className="w-5 h-5 text-green-600" />, bg: 'bg-green-50', status: 'approved' },
          { label: 'In Progress', value: draft, icon: <FileCheck className="w-5 h-5 text-amber-600" />, bg: 'bg-amber-50', status: 'draft' },
          { label: 'Not Started', value: noSheet, icon: <Users className="w-5 h-5 text-gray-500" />, bg: 'bg-gray-50', status: 'none' },
        ].map(stat => (
          <button
            key={stat.label}
            onClick={() => setStatusFilter(statusFilter === stat.status ? 'all' : stat.status)}
            className={`${stat.bg} rounded-xl p-4 text-left hover:opacity-80 transition border-2 ${
              statusFilter === stat.status ? 'border-indigo-300' : 'border-transparent'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">{stat.icon}</div>
            <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{stat.label}</div>
          </button>
        ))}
      </div>

      {/* Search bar */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4 flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search team members..."
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Team table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-50 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">
            Team Members ({filtered.length})
          </h2>
        </div>

        <div className="divide-y divide-gray-50">
          {filtered.length === 0 ? (
            <div className="px-5 py-10 text-center text-gray-400 text-sm">No team members found</div>
          ) : (
            filtered.map(member => {
              const latestSheet = getActiveSheet(member)
              const goalCount = latestSheet?.goals?.length ?? 0
              const avgProgress = latestSheet?.goals?.length
                ? Math.round(latestSheet.goals.reduce((sum, g) => {
                    const p = g.quarterly_updates[0]?.progress_pct ?? 0
                    return sum + p
                  }, 0) / latestSheet.goals.length)
                : 0

              return (
                <div key={member.id} className="px-5 py-4 flex items-center gap-4">
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-semibold flex-shrink-0">
                    {member.full_name.charAt(0)}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{member.full_name}</span>
                      {member.designation && (
                        <span className="text-xs text-gray-400">· {member.designation}</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">{member.email}</div>
                  </div>

                  {/* Sheet status */}
                  <div className="flex-shrink-0 text-center w-24">
                    {latestSheet ? (
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getSheetStatusColor(latestSheet.status)}`}>
                        {STATUS_LABELS[latestSheet.status as keyof typeof STATUS_LABELS]}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">No sheet</span>
                    )}
                  </div>

                  {/* Goal count + progress */}
                  <div className="flex-shrink-0 text-center w-20 hidden sm:block">
                    <div className="text-sm font-medium text-gray-700">{goalCount} goals</div>
                    {latestSheet?.status === 'approved' && (
                      <div className="text-xs text-gray-400">{avgProgress}% avg</div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {latestSheet?.status === 'submitted' && (
                      <>
                        <button
                          onClick={() => handleApprove(latestSheet.id)}
                          disabled={processing === latestSheet.id}
                          className="flex items-center gap-1.5 bg-green-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-green-700 transition disabled:opacity-60"
                        >
                          {processing === latestSheet.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                          Approve
                        </button>
                        <button
                          onClick={() => setReworkModal({ sheetId: latestSheet.id, employeeName: member.full_name })}
                          className="flex items-center gap-1.5 bg-amber-100 text-amber-700 text-xs px-3 py-1.5 rounded-lg hover:bg-amber-200 transition"
                        >
                          <RotateCcw className="w-3 h-3" />
                          Rework
                        </button>
                      </>
                    )}

                    {latestSheet && (
                      <Link
                        href={`/manager/review/${latestSheet.id}`}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Rework modal */}
      {reworkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-2">Send for Rework</h3>
            <p className="text-sm text-gray-500 mb-4">
              Explain what changes {reworkModal.employeeName} needs to make:
            </p>
            <textarea
              value={reworkReason}
              onChange={e => setReworkReason(e.target.value)}
              rows={4}
              placeholder="e.g., Adjust weightage for Revenue goal, target seems unrealistic..."
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={handleRework}
                disabled={!reworkReason.trim() || !!processing}
                className="flex-1 bg-amber-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Send for Rework
              </button>
              <button
                onClick={() => { setReworkModal(null); setReworkReason('') }}
                className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
