'use client'

import { useState } from 'react'
import { GoalForm } from './GoalForm'
import { GoalCard } from './GoalCard'
import { QuarterlyUpdateForm } from './QuarterlyUpdateForm'
import { submitGoalSheet, getOrCreateGoalSheet } from '@/actions/goals'
import { calculateProgress, getSheetStatusColor, formatDate, validateTotalWeightage } from '@/lib/utils'
import { STATUS_LABELS, QUARTERS, UOM_LABELS } from '@/types'
import type { Profile, GoalSheet, Goal, QuarterlyUpdate, ManagerComment, Quarter } from '@/types'
import {
  Plus, Send, AlertCircle, CheckCircle2, Clock, Lock, MessageSquare,
  ChevronDown, ChevronUp, RotateCcw, Target, TrendingUp
} from 'lucide-react'

interface GoalSheetWithDetails extends GoalSheet {
  goals?: (Goal & { quarterly_updates?: QuarterlyUpdate[] })[]
  manager_comments?: (ManagerComment & { author?: { full_name: string; role: string } })[]
}

interface Props {
  profile: Profile
  sheet: GoalSheetWithDetails | null
  year: string
}

export function EmployeeDashboardContent({ profile, sheet: initialSheet, year }: Props) {
  const [sheet, setSheet] = useState(initialSheet)
  const [showGoalForm, setShowGoalForm] = useState(false)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
  const [activeQuarterUpdate, setActiveQuarterUpdate] = useState<{ goalId: string; quarter: Quarter } | null>(null)
  const [expandedComments, setExpandedComments] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const goals = sheet?.goals ?? []
  const comments = sheet?.manager_comments ?? []
  const totalWeightage = goals.reduce((sum, g) => sum + g.weightage, 0)
  const isEditable = !sheet || ['draft', 'rework'].includes(sheet.status)
  const canSubmit = isEditable && goals.length > 0 && Math.abs(totalWeightage - 100) < 0.01

  async function handleCreateSheet() {
    const result = await getOrCreateGoalSheet(year)
    if (result.success) {
      window.location.reload()
    }
  }

  async function handleSubmit() {
    if (!sheet || !canSubmit) return
    setSubmitting(true)

    const result = await submitGoalSheet(sheet.id)
    if (result.success) {
      setMessage({ type: 'success', text: 'Goal sheet submitted for manager review!' })
      window.location.reload()
    } else {
      setMessage({ type: 'error', text: result.error })
    }
    setSubmitting(false)
  }

  function handleGoalFormSuccess() {
    setShowGoalForm(false)
    setEditingGoal(null)
    window.location.reload()
  }

  const statusConfig = {
    draft: { icon: <Clock className="w-4 h-4" />, color: 'text-gray-600' },
    submitted: { icon: <Send className="w-4 h-4" />, color: 'text-blue-600' },
    approved: { icon: <CheckCircle2 className="w-4 h-4" />, color: 'text-green-600' },
    locked: { icon: <Lock className="w-4 h-4" />, color: 'text-purple-600' },
    rework: { icon: <RotateCcw className="w-4 h-4" />, color: 'text-amber-600' },
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {profile.full_name.split(' ')[0]}
        </h1>
        <p className="text-gray-500 text-sm mt-1">Financial Year: {year}</p>
      </div>

      {/* Toast message */}
      {message && (
        <div className={`mb-4 px-4 py-3 rounded-lg text-sm flex items-center gap-2 ${
          message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
          {message.text}
          <button onClick={() => setMessage(null)} className="ml-auto text-current/60 hover:text-current">✕</button>
        </div>
      )}

      {/* No sheet yet */}
      {!sheet ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <Target className="w-12 h-12 text-indigo-300 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">No goal sheet yet</h2>
          <p className="text-gray-500 text-sm mb-6">Create your goal sheet for {year} to get started</p>
          <button
            onClick={handleCreateSheet}
            className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 transition"
          >
            Create Goal Sheet
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Sheet status bar */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Sheet Status</p>
                  <div className={`flex items-center gap-2 text-sm font-medium ${statusConfig[sheet.status]?.color}`}>
                    {statusConfig[sheet.status]?.icon}
                    <span>{STATUS_LABELS[sheet.status]}</span>
                  </div>
                </div>

                <div className="w-px h-10 bg-gray-100" />

                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Total Weightage</p>
                  <div className={`text-sm font-semibold ${Math.abs(totalWeightage - 100) < 0.01 ? 'text-green-600' : totalWeightage > 100 ? 'text-red-600' : 'text-amber-600'}`}>
                    {totalWeightage}% / 100%
                  </div>
                </div>

                <div className="w-px h-10 bg-gray-100" />

                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Goals</p>
                  <div className="text-sm font-semibold text-gray-700">{goals.length} / 8</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {isEditable && goals.length < 8 && (
                  <button
                    onClick={() => setShowGoalForm(true)}
                    className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-100 transition"
                  >
                    <Plus className="w-4 h-4" />
                    Add Goal
                  </button>
                )}

                {canSubmit && (
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-60"
                  >
                    <Send className="w-4 h-4" />
                    {submitting ? 'Submitting...' : 'Submit for Review'}
                  </button>
                )}
              </div>
            </div>

            {/* Weightage progress bar */}
            {goals.length > 0 && (
              <div className="mt-4">
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      Math.abs(totalWeightage - 100) < 0.01 ? 'bg-green-500' :
                      totalWeightage > 100 ? 'bg-red-500' : 'bg-indigo-500'
                    }`}
                    style={{ width: `${Math.min(totalWeightage, 100)}%` }}
                  />
                </div>
                {!canSubmit && isEditable && goals.length > 0 && (
                  <p className="text-xs text-amber-600 mt-1.5 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Total weightage must equal 100% before submitting (currently {totalWeightage}%)
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Manager comments (rework) */}
          {sheet.status === 'rework' && comments.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
              <button
                onClick={() => setExpandedComments(!expandedComments)}
                className="w-full flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-2 text-amber-800 font-medium text-sm">
                  <MessageSquare className="w-4 h-4" />
                  Manager Feedback ({comments.length} comment{comments.length !== 1 ? 's' : ''})
                </div>
                {expandedComments ? <ChevronUp className="w-4 h-4 text-amber-600" /> : <ChevronDown className="w-4 h-4 text-amber-600" />}
              </button>

              {expandedComments && (
                <div className="mt-4 space-y-3">
                  {comments.map(comment => (
                    <div key={comment.id} className="bg-white rounded-lg p-3 border border-amber-100">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-xs font-medium text-gray-700">
                          {comment.author?.full_name ?? 'Manager'}
                        </span>
                        <span className="text-xs text-gray-400">{formatDate(comment.created_at)}</span>
                      </div>
                      <p className="text-sm text-gray-700">{comment.comment}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Add goal form */}
          {showGoalForm && !editingGoal && (
            <div className="bg-white rounded-2xl border border-indigo-100 p-6 shadow-sm">
              <h3 className="text-base font-semibold text-gray-900 mb-5">Add New Goal</h3>
              <GoalForm
                sheetId={sheet.id}
                usedWeightage={totalWeightage}
                onSuccess={handleGoalFormSuccess}
                onCancel={() => setShowGoalForm(false)}
              />
            </div>
          )}

          {/* Goals list */}
          {goals.length === 0 && !showGoalForm ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
              <TrendingUp className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No goals added yet. Click "Add Goal" to get started.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {goals.map((goal, idx) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  index={idx}
                  sheetStatus={sheet.status}
                  isEditable={isEditable}
                  onEdit={isEditable ? (g) => { setEditingGoal(g); setShowGoalForm(false) } : undefined}
                  onUpdateQuarter={(goalId, quarter) => setActiveQuarterUpdate({ goalId, quarter })}
                  onGoalUpdated={handleGoalFormSuccess}
                />
              ))}
            </div>
          )}

          {/* Edit form */}
          {editingGoal && (
            <div className="bg-white rounded-2xl border border-indigo-100 p-6 shadow-sm">
              <h3 className="text-base font-semibold text-gray-900 mb-5">Edit Goal</h3>
              <GoalForm
                sheetId={sheet.id}
                goal={editingGoal}
                usedWeightage={totalWeightage}
                onSuccess={handleGoalFormSuccess}
                onCancel={() => setEditingGoal(null)}
              />
            </div>
          )}

          {/* Quarterly update modal */}
          {activeQuarterUpdate && (
            <QuarterlyUpdateForm
              goalId={activeQuarterUpdate.goalId}
              quarter={activeQuarterUpdate.quarter}
              existingUpdate={
                goals
                  .find(g => g.id === activeQuarterUpdate.goalId)
                  ?.quarterly_updates?.find(u => u.quarter === activeQuarterUpdate.quarter)
              }
              onSuccess={() => { setActiveQuarterUpdate(null); window.location.reload() }}
              onCancel={() => setActiveQuarterUpdate(null)}
            />
          )}
        </div>
      )}
    </div>
  )
}
