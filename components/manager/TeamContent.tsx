'use client'

import Link from 'next/link'
import { useState } from 'react'
import { calculateProgress, getSheetStatusColor, formatDate } from '@/lib/utils'
import { STATUS_LABELS, QUARTERS } from '@/types'
import { Users, ChevronRight, Search, TrendingUp, Award } from 'lucide-react'

export function TeamContent({ team, year, managerName }: { team: any[]; year: string; managerName: string }) {
  const [search, setSearch] = useState('')

  const filtered = team.filter(m =>
    !search ||
    m.full_name.toLowerCase().includes(search.toLowerCase()) ||
    m.email.toLowerCase().includes(search.toLowerCase())
  )

  function getSheetForYear(member: any) {
    return member.goal_sheets?.find((s: any) => s.financial_year === year) ?? member.goal_sheets?.[0]
  }

  function getMemberProgress(member: any) {
    const sheet = getSheetForYear(member)
    if (!sheet || !sheet.goals?.length) return 0
    const latestQ = QUARTERS.slice().reverse().find(q =>
      sheet.goals.some((g: any) => g.quarterly_updates?.some((u: any) => u.quarter === q))
    )
    if (!latestQ) return 0
    const withUpdates = sheet.goals.filter((g: any) =>
      g.quarterly_updates?.some((u: any) => u.quarter === latestQ)
    )
    if (!withUpdates.length) return 0
    return Math.round(withUpdates.reduce((sum: number, g: any) => {
      const u = g.quarterly_updates?.find((u: any) => u.quarter === latestQ)
      return sum + (u?.progress_pct ?? 0)
    }, 0) / withUpdates.length)
  }

  const statusGroups = {
    approved: filtered.filter(m => ['approved', 'locked'].includes(getSheetForYear(m)?.status)),
    submitted: filtered.filter(m => getSheetForYear(m)?.status === 'submitted'),
    draft: filtered.filter(m => ['draft', 'rework'].includes(getSheetForYear(m)?.status)),
    none: filtered.filter(m => !getSheetForYear(m)),
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Users className="w-6 h-6 text-indigo-600" />
          My Team
        </h1>
        <p className="text-gray-500 text-sm mt-1">{managerName} · {team.length} direct reports · FY {year}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Approved', count: statusGroups.approved.length, color: 'bg-green-50 text-green-700', bar: 'bg-green-500' },
          { label: 'Pending', count: statusGroups.submitted.length, color: 'bg-blue-50 text-blue-700', bar: 'bg-blue-500' },
          { label: 'In Draft', count: statusGroups.draft.length, color: 'bg-amber-50 text-amber-700', bar: 'bg-amber-500' },
          { label: 'Not Started', count: statusGroups.none.length, color: 'bg-gray-50 text-gray-500', bar: 'bg-gray-300' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="text-2xl font-bold text-gray-900 mb-1">{s.count}</div>
            <div className="text-xs text-gray-500">{s.label}</div>
            <div className="mt-2 h-1 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full ${s.bar} rounded-full`}
                style={{ width: `${team.length ? (s.count / team.length) * 100 : 0}%` }} />
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border border-gray-100 p-3 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search team members…"
            className="w-full pl-9 pr-3 py-2 border border-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
      </div>

      {/* Team cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(member => {
          const sheet = getSheetForYear(member)
          const progress = getMemberProgress(member)
          const goalCount = sheet?.goals?.length ?? 0

          return (
            <div key={member.id} className="bg-white rounded-2xl border border-gray-100 p-5 hover:border-indigo-100 hover:shadow-sm transition">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-indigo-100 text-indigo-700 font-bold text-base flex items-center justify-center flex-shrink-0">
                    {member.full_name.charAt(0)}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{member.full_name}</div>
                    <div className="text-xs text-gray-400">{member.designation ?? 'Employee'}</div>
                  </div>
                </div>
                {sheet && (
                  <Link href={`/manager/review/${sheet.id}`}
                    className="p-1.5 rounded-lg text-gray-300 hover:text-indigo-600 hover:bg-indigo-50 transition">
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                )}
              </div>

              {/* Sheet status */}
              <div className="mb-3">
                {sheet ? (
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${getSheetStatusColor(sheet.status)}`}>
                    {STATUS_LABELS[sheet.status as keyof typeof STATUS_LABELS]}
                  </span>
                ) : (
                  <span className="text-xs text-gray-300">No goal sheet</span>
                )}
              </div>

              {/* Progress */}
              {sheet && goalCount > 0 && (
                <>
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                    <span>{goalCount} goals</span>
                    {progress > 0 && (
                      <span className={`font-semibold ${progress >= 80 ? 'text-green-600' : progress >= 50 ? 'text-amber-600' : 'text-gray-500'}`}>
                        {progress}% avg
                      </span>
                    )}
                  </div>
                  {progress > 0 && (
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${
                        progress >= 80 ? 'bg-green-500' : progress >= 50 ? 'bg-amber-500' : 'bg-red-400'
                      }`} style={{ width: `${progress}%` }} />
                    </div>
                  )}
                </>
              )}

              {/* Department */}
              {member.department && (
                <div className="mt-3 text-xs text-gray-400">{member.department}</div>
              )}
            </div>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 py-14 text-center">
          <p className="text-gray-400 text-sm">No team members found</p>
        </div>
      )}
    </div>
  )
}
