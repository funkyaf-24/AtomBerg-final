'use client'

import { useState } from 'react'
import { deleteGoal } from '@/actions/goals'
import { calculateProgress, getProgressColor, formatDate } from '@/lib/utils'
import { UOM_LABELS, QUARTERS, PROGRESS_LABELS } from '@/types'
import type { Goal, QuarterlyUpdate, GoalSheetStatus, Quarter } from '@/types'
import {
  ChevronDown, ChevronUp, Edit2, Trash2, Plus, AlertCircle, CheckCircle
} from 'lucide-react'

interface GoalCardProps {
  goal: Goal & { quarterly_updates?: QuarterlyUpdate[] }
  index: number
  sheetStatus: GoalSheetStatus
  isEditable: boolean
  onEdit?: (goal: Goal) => void
  onUpdateQuarter?: (goalId: string, quarter: Quarter) => void
  onGoalUpdated?: () => void
}

export function GoalCard({ goal, index, sheetStatus, isEditable, onEdit, onUpdateQuarter, onGoalUpdated }: GoalCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const showQuarterlyUpdates = ['approved', 'locked'].includes(sheetStatus)

  async function handleDelete() {
    if (!confirm('Delete this goal? This cannot be undone.')) return
    setDeleting(true)
    await deleteGoal(goal.id)
    onGoalUpdated?.()
  }

  const latestUpdate = goal.quarterly_updates?.slice(-1)[0]
  const overallProgress = latestUpdate
    ? calculateProgress(goal.uom, goal.target_value, latestUpdate.actual_value)
    : 0

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:border-gray-200 transition">
      {/* Card header */}
      <div className="p-4">
        <div className="flex items-start gap-4">
          {/* Index badge */}
          <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center text-sm font-semibold flex-shrink-0">
            {index + 1}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs text-indigo-600 font-medium bg-indigo-50 px-2 py-0.5 rounded">
                    {goal.thrust_area}
                  </span>
                  {goal.is_shared && (
                    <span className="text-xs text-purple-600 font-medium bg-purple-50 px-2 py-0.5 rounded">
                      Shared
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-semibold text-gray-900 mt-1">{goal.title}</h3>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Weightage badge */}
                <span className="text-xs font-semibold text-gray-700 bg-gray-100 px-2.5 py-1 rounded-full">
                  {goal.weightage}%
                </span>

                {/* Progress (if available) */}
                {showQuarterlyUpdates && latestUpdate && (
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                    overallProgress >= 80 ? 'bg-green-50 text-green-700' :
                    overallProgress >= 50 ? 'bg-amber-50 text-amber-700' :
                    'bg-red-50 text-red-700'
                  }`}>
                    {Math.round(overallProgress)}%
                  </span>
                )}

                {/* Actions */}
                {isEditable && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onEdit?.(goal)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                <button
                  onClick={() => setExpanded(!expanded)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition"
                >
                  {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Inline details */}
            <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
              <span>{UOM_LABELS[goal.uom]}</span>
              {goal.target_value !== null && (
                <>
                  <span>·</span>
                  <span>Target: {goal.target_value}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-gray-50 px-4 pb-4">
          {goal.description && (
            <p className="text-sm text-gray-600 mt-3 mb-4">{goal.description}</p>
          )}

          {/* Quarterly progress */}
          {showQuarterlyUpdates && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Quarterly Progress
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {QUARTERS.map(quarter => {
                  const update = goal.quarterly_updates?.find(u => u.quarter === quarter)
                  const progress = update
                    ? calculateProgress(goal.uom, goal.target_value, update.actual_value)
                    : 0

                  return (
                    <div key={quarter} className="border border-gray-100 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-gray-600">{quarter}</span>
                        {update ? (
                          <CheckCircle className={`w-3.5 h-3.5 ${getProgressColor(progress)}`} />
                        ) : (
                          <span className="w-3.5 h-3.5 rounded-full border-2 border-gray-200" />
                        )}
                      </div>

                      {update ? (
                        <div>
                          <div className={`text-lg font-bold ${getProgressColor(progress)}`}>
                            {Math.round(progress)}%
                          </div>
                          <div className="text-xs text-gray-400">
                            {update.actual_value !== null ? `Actual: ${update.actual_value}` : 'Submitted'}
                          </div>
                          <div className="mt-1 text-xs text-gray-400">
                            {PROGRESS_LABELS[update.status]}
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => onUpdateQuarter?.(goal.id, quarter)}
                          className="w-full mt-1 flex items-center justify-center gap-1 text-xs text-indigo-600 hover:text-indigo-800"
                        >
                          <Plus className="w-3 h-3" />
                          Update
                        </button>
                      )}

                      {update && (
                        <button
                          onClick={() => onUpdateQuarter?.(goal.id, quarter)}
                          className="mt-2 text-xs text-gray-400 hover:text-indigo-600 flex items-center gap-0.5"
                        >
                          <Edit2 className="w-3 h-3" />
                          Edit
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
