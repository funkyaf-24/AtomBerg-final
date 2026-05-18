'use client'

import { useState } from 'react'
import { assignSharedGoal } from '@/actions/admin'
import { formatDate } from '@/lib/utils'
import { Share2, Plus, Check, AlertCircle, Loader2, X, Users } from 'lucide-react'

interface Props {
  approvedGoals: any[]
  assignments: any[]
  employees: any[]
}

export function SharedGoalsContent({ approvedGoals, assignments, employees }: Props) {
  const [selectedGoal, setSelectedGoal] = useState('')
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([])
  const [weightage, setWeightage] = useState(20)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  function toggleEmployee(id: string) {
    setSelectedEmployees(prev =>
      prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]
    )
  }

  async function handleAssign() {
    if (!selectedGoal || selectedEmployees.length === 0) return
    setSaving(true)
    const result = await assignSharedGoal(selectedGoal, selectedEmployees, weightage)
    setMessage({ type: result.success ? 'success' : 'error', text: result.success ? (result.message ?? 'Assigned!') : result.error })
    if (result.success) {
      setSelectedGoal('')
      setSelectedEmployees([])
      setWeightage(20)
      window.location.reload()
    }
    setSaving(false)
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Share2 className="w-6 h-6 text-indigo-600" />
          Shared Goals
        </h1>
        <p className="text-gray-500 text-sm mt-1">Assign goals from one employee to others</p>
      </div>

      {message && (
        <div className={`mb-4 px-4 py-3 rounded-lg text-sm flex items-center gap-2 ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {message.text}
          <button onClick={() => setMessage(null)} className="ml-auto"><X className="w-3 h-3" /></button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assignment form */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">New Assignment</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Source Goal</label>
            <select value={selectedGoal} onChange={e => setSelectedGoal(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
              <option value="">Select a goal to share...</option>
              {approvedGoals.map((g: any) => {
                const sheet = Array.isArray(g.goal_sheets) ? g.goal_sheets[0] : g.goal_sheets
                const emp = sheet?.employee
                return (
                  <option key={g.id} value={g.id}>
                    [{g.thrust_area}] {g.title} — {emp?.full_name}
                  </option>
                )
              })}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Weightage for assignees (%)
            </label>
            <input type="number" min="10" max="100" value={weightage}
              onChange={e => setWeightage(Number(e.target.value))}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Target Employees ({selectedEmployees.length} selected)
            </label>
            <div className="border border-gray-200 rounded-lg max-h-64 overflow-y-auto divide-y divide-gray-50">
              {employees.map(emp => (
                <label key={emp.id} className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-50">
                  <input type="checkbox" checked={selectedEmployees.includes(emp.id)}
                    onChange={() => toggleEmployee(emp.id)}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900">{emp.full_name}</div>
                    <div className="text-xs text-gray-400">{emp.department ?? emp.email}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <button onClick={handleAssign} disabled={!selectedGoal || selectedEmployees.length === 0 || saving}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-60">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {saving ? 'Assigning...' : `Assign to ${selectedEmployees.length} employee${selectedEmployees.length !== 1 ? 's' : ''}`}
          </button>
        </div>

        {/* Existing assignments */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-500" />
            Existing Assignments ({assignments.length})
          </h2>

          {assignments.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm">
              No shared goal assignments yet
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {assignments.map((a: any) => (
                <div key={a.id} className="border border-gray-100 rounded-lg p-3">
                  <div className="text-xs font-semibold text-indigo-600 mb-1">
                    {a.source_goal?.thrust_area} — {a.source_goal?.title}
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{a.employee?.full_name}</div>
                      <div className="text-xs text-gray-400">{a.employee?.email}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-gray-700">{a.weightage}%</div>
                      <div className="text-xs text-gray-400">{formatDate(a.assigned_at)}</div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">Assigned by {a.assigner?.full_name}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
