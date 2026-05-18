'use client'

import { useState } from 'react'
import { QuarterlyUpdateForm } from './QuarterlyUpdateForm'
import { calculateProgress, getProgressColor, getProgressBarColor } from '@/lib/utils'
import { UOM_LABELS, QUARTERS, PROGRESS_LABELS } from '@/types'
import type { Profile, GoalSheet, Goal, QuarterlyUpdate, Quarter } from '@/types'
import { CheckCircle2, Clock, AlertTriangle, Plus, Edit2, BarChart3, TrendingUp } from 'lucide-react'

interface SheetWithGoals extends GoalSheet {
  goals?: (Goal & { quarterly_updates?: QuarterlyUpdate[] })[]
}

interface Props {
  profile: Profile
  sheet: SheetWithGoals | null
  year: string
}

const QUARTER_LABELS = { Q1: 'Apr–Jun', Q2: 'Jul–Sep', Q3: 'Oct–Dec', Q4: 'Jan–Mar' }

export function QuarterlyPage({ profile, sheet, year }: Props) {
  const [activeQ, setActiveQ] = useState<Quarter>('Q1')
  const [updateTarget, setUpdateTarget] = useState<{ goalId: string; quarter: Quarter } | null>(null)

  const goals = sheet?.goals ?? []
  const canUpdate = sheet?.status === 'approved' || sheet?.status === 'locked'

  // Compute per-quarter summary
  function quarterSummary(q: Quarter) {
    const filled = goals.filter(g => g.quarterly_updates?.some(u => u.quarter === q)).length
    const avgProgress = goals.length === 0 ? 0 :
      goals.reduce((sum, g) => {
        const u = g.quarterly_updates?.find(u => u.quarter === q)
        if (!u) return sum
        return sum + calculateProgress(g.uom, g.target_value, u.actual_value)
      }, 0) / goals.length
    return { filled, avgProgress: Math.round(avgProgress) }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Quarterly Progress</h1>
        <p className="text-gray-500 text-sm mt-1">Financial Year: {year}</p>
      </div>

      {!sheet || !canUpdate ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-14 text-center">
          <BarChart3 className="w-12 h-12 text-gray-200 mx-auto mb-4" />
          <h2 className="text-base font-semibold text-gray-700 mb-2">
            {!sheet ? 'No goal sheet found' : 'Goal sheet not yet approved'}
          </h2>
          <p className="text-sm text-gray-400">
            {!sheet
              ? 'Create and submit your goal sheet first.'
              : `Current status: ${sheet.status}. Quarterly updates unlock once your manager approves your goals.`}
          </p>
        </div>
      ) : (
        <>
          {/* Quarter tab bar with summary */}
          <div className="grid grid-cols-4 gap-3 mb-6">
            {QUARTERS.map(q => {
              const { filled, avgProgress } = quarterSummary(q)
              const isActive = activeQ === q
              return (
                <button key={q} onClick={() => setActiveQ(q)}
                  className={`rounded-xl p-4 text-left border-2 transition ${
                    isActive ? 'border-indigo-400 bg-indigo-50' : 'border-transparent bg-white hover:border-gray-200'
                  }`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-sm font-bold ${isActive ? 'text-indigo-700' : 'text-gray-700'}`}>{q}</span>
                    {filled === goals.length && goals.length > 0
                      ? <CheckCircle2 className="w-4 h-4 text-green-500" />
                      : <Clock className="w-4 h-4 text-gray-300" />}
                  </div>
                  <div className="text-xs text-gray-400 mb-2">{QUARTER_LABELS[q]}</div>
                  <div className={`text-lg font-bold ${avgProgress >= 80 ? 'text-green-600' : avgProgress >= 50 ? 'text-amber-600' : 'text-gray-400'}`}>
                    {filled > 0 ? `${avgProgress}%` : '—'}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">{filled}/{goals.length} updated</div>
                </button>
              )
            })}
          </div>

          {/* Goals for active quarter */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
              {activeQ} — {QUARTER_LABELS[activeQ]} Goals
            </h2>

            {goals.map((goal, idx) => {
              const update = goal.quarterly_updates?.find(u => u.quarter === activeQ)
              const progress = update
                ? calculateProgress(goal.uom, goal.target_value, update.actual_value)
                : null

              return (
                <div key={goal.id} className="bg-white rounded-xl border border-gray-100 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <span className="w-7 h-7 rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-indigo-600 font-medium mb-0.5">{goal.thrust_area}</div>
                        <h3 className="text-sm font-semibold text-gray-900 leading-snug">{goal.title}</h3>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                          <span>{UOM_LABELS[goal.uom]}</span>
                          {goal.target_value != null && <span>Target: <b className="text-gray-600">{goal.target_value}</b></span>}
                          <span className="font-medium text-gray-500">Wt: {goal.weightage}%</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      {update ? (
                        <div className="text-right">
                          <div className={`text-xl font-bold ${getProgressColor(progress!)}`}>
                            {Math.round(progress!)}%
                          </div>
                          <div className="text-xs text-gray-400">{PROGRESS_LABELS[update.status]}</div>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-300 font-medium">Not updated</div>
                      )}

                      <button
                        onClick={() => setUpdateTarget({ goalId: goal.id, quarter: activeQ })}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                          update
                            ? 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                            : 'bg-indigo-600 text-white hover:bg-indigo-700'
                        }`}>
                        {update ? <Edit2 className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                        {update ? 'Edit' : 'Update'}
                      </button>
                    </div>
                  </div>

                  {/* Progress bar */}
                  {update && progress !== null && (
                    <div className="mt-3">
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-700 ${getProgressBarColor(progress)}`}
                          style={{ width: `${Math.min(progress, 100)}%` }} />
                      </div>
                      {update.notes && (
                        <p className="text-xs text-gray-400 mt-1.5 italic">"{update.notes}"</p>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Overall summary card */}
          {goals.length > 0 && (
            <div className="mt-6 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-2xl p-5 border border-indigo-100">
              <h3 className="text-sm font-semibold text-indigo-800 flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4" /> Overall Progress Summary
              </h3>
              <div className="grid grid-cols-4 gap-3">
                {QUARTERS.map(q => {
                  const { avgProgress, filled } = quarterSummary(q)
                  return (
                    <div key={q} className="bg-white rounded-xl p-3 text-center border border-indigo-100">
                      <div className="text-xs font-semibold text-gray-500 mb-1">{q}</div>
                      <div className={`text-2xl font-bold ${filled > 0 ? getProgressColor(avgProgress) : 'text-gray-300'}`}>
                        {filled > 0 ? `${avgProgress}%` : '—'}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Quarterly update modal */}
      {updateTarget && (
        <QuarterlyUpdateForm
          goalId={updateTarget.goalId}
          quarter={updateTarget.quarter}
          existingUpdate={goals.find(g => g.id === updateTarget.goalId)
            ?.quarterly_updates?.find(u => u.quarter === updateTarget.quarter)}
          onSuccess={() => { setUpdateTarget(null); window.location.reload() }}
          onCancel={() => setUpdateTarget(null)} />
      )}
    </div>
  )
}
