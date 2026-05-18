'use client'

import { useState, useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { exportToCSV, formatDate } from '@/lib/utils'
import { Download, BarChart3, PieChart as PieIcon, FileText, TrendingUp } from 'lucide-react'

interface Props {
  reportData: any[]
  deptStats: any[]
}

const STATUS_COLORS: Record<string, string> = {
  draft: '#94a3b8',
  submitted: '#60a5fa',
  approved: '#34d399',
  locked: '#a78bfa',
  rework: '#fbbf24',
}

export function ReportsContent({ reportData, deptStats }: Props) {
  const [selectedYear, setSelectedYear] = useState('all')
  const [activeTab, setActiveTab] = useState<'overview' | 'details'>('overview')

  const years = [...new Set(reportData.map(s => s.financial_year))].sort().reverse()

  const filtered = selectedYear === 'all' ? reportData : reportData.filter(s => s.financial_year === selectedYear)

  // Status distribution for pie chart
  const statusDist = useMemo(() => {
    const counts: Record<string, number> = {}
    filtered.forEach(s => { counts[s.status] = (counts[s.status] || 0) + 1 })
    return Object.entries(counts).map(([name, value]) => ({ name, value }))
  }, [filtered])

  // Department breakdown
  const deptBreakdown = useMemo(() => {
    const map: Record<string, Record<string, number>> = {}
    filtered.forEach(s => {
      const dept = (s.employee as any)?.department ?? 'Other'
      if (!map[dept]) map[dept] = { approved: 0, submitted: 0, draft: 0, rework: 0, locked: 0 }
      map[dept][s.status] = (map[dept][s.status] || 0) + 1
    })
    return Object.entries(map).map(([dept, statuses]) => ({ dept, ...statuses }))
  }, [filtered])

  // Flat rows for CSV
  function buildCSVRows() {
    return filtered.flatMap(sheet => {
      const emp = sheet.employee as any
      return (sheet.goals as any[]).flatMap((goal: any) => {
        const baseRow = {
          financial_year: sheet.financial_year,
          employee_name: emp?.full_name ?? '',
          email: emp?.email ?? '',
          department: emp?.department ?? '',
          designation: emp?.designation ?? '',
          manager: emp?.manager?.full_name ?? '',
          sheet_status: sheet.status,
          thrust_area: goal.thrust_area,
          goal_title: goal.title,
          uom: goal.uom,
          target: goal.target_value ?? '',
          weightage: goal.weightage,
          is_shared: goal.is_shared ? 'Yes' : 'No',
        }
        const quarters = ['Q1', 'Q2', 'Q3', 'Q4']
        const updates: Record<string, unknown> = {}
        quarters.forEach(q => {
          const u = (goal.quarterly_updates as any[])?.find((x: any) => x.quarter === q)
          updates[`${q}_actual`] = u?.actual_value ?? ''
          updates[`${q}_progress`] = u?.progress_pct ?? ''
          updates[`${q}_status`] = u?.status ?? ''
        })
        return { ...baseRow, ...updates }
      })
    })
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-indigo-600" />
            Reports & Analytics
          </h1>
          <p className="text-gray-500 text-sm mt-1">{filtered.length} goal sheets</p>
        </div>
        <div className="flex gap-2">
          <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="all">All Years</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button onClick={() => exportToCSV(buildCSVRows(), `goal-report-${selectedYear}`)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition">
            <Download className="w-4 h-4" />
            Export Full CSV
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        {[
          { key: 'overview', label: 'Overview', icon: <BarChart3 className="w-4 h-4" /> },
          { key: 'details', label: 'Detailed View', icon: <FileText className="w-4 h-4" /> },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition ${
              activeTab === tab.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}>
            {tab.icon}{tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Summary stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Total Sheets', value: filtered.length },
              { label: 'Total Goals', value: filtered.reduce((s, sh) => s + sh.goals.length, 0) },
              { label: 'Approved', value: filtered.filter(s => ['approved', 'locked'].includes(s.status)).length },
              { label: 'Avg Goals/Sheet', value: filtered.length ? (filtered.reduce((s, sh) => s + sh.goals.length, 0) / filtered.length).toFixed(1) : '0' },
            ].map(stat => (
              <div key={stat.label} className="bg-white rounded-xl border border-gray-100 p-4">
                <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Status distribution pie */}
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-indigo-500" />
                Status Distribution
              </h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={statusDist} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {statusDist.map((entry, i) => (
                      <Cell key={i} fill={STATUS_COLORS[entry.name] ?? '#cbd5e1'} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Department breakdown bar */}
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-500" />
                By Department
              </h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={deptBreakdown} margin={{ left: -20 }}>
                  <XAxis dataKey="dept" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="approved" fill="#34d399" stackId="a" name="Approved" />
                  <Bar dataKey="submitted" fill="#60a5fa" stackId="a" name="Submitted" />
                  <Bar dataKey="draft" fill="#94a3b8" stackId="a" name="Draft" />
                  <Bar dataKey="rework" fill="#fbbf24" stackId="a" name="Rework" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'details' && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {['Employee', 'Dept', 'Manager', 'Status', 'Goals', 'Q1', 'Q2', 'Q3', 'Q4', 'Submitted'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(sheet => {
                  const emp = sheet.employee as any
                  const avgProgress = (q: string) => {
                    const updates = (sheet.goals as any[]).flatMap((g: any) =>
                      (g.quarterly_updates as any[]).filter((u: any) => u.quarter === q)
                    )
                    if (!updates.length) return '—'
                    const avg = updates.reduce((s: number, u: any) => s + (u.progress_pct ?? 0), 0) / updates.length
                    return `${Math.round(avg)}%`
                  }
                  return (
                    <tr key={sheet.id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900 whitespace-nowrap">{emp?.full_name}</div>
                        <div className="text-xs text-gray-400">{emp?.email}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{emp?.department ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{emp?.manager?.full_name ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          sheet.status === 'approved' || sheet.status === 'locked' ? 'bg-green-50 text-green-700' :
                          sheet.status === 'submitted' ? 'bg-blue-50 text-blue-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>{sheet.status}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{sheet.goals.length}</td>
                      {['Q1','Q2','Q3','Q4'].map(q => (
                        <td key={q} className="px-4 py-3 text-gray-500 text-xs">{avgProgress(q)}</td>
                      ))}
                      <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                        {sheet.submitted_at ? formatDate(sheet.submitted_at) : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
