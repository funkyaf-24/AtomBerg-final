'use client'

import { useState } from 'react'
import { GoalForm } from './GoalForm'
import { GoalCard } from './GoalCard'
import { QuarterlyUpdateForm } from './QuarterlyUpdateForm'
import { submitGoalSheet, getOrCreateGoalSheet } from '@/actions/goals'
import { getSheetStatusColor, validateTotalWeightage } from '@/lib/utils'
import { STATUS_LABELS, QUARTERS } from '@/types'
import type { Profile, GoalSheet, Goal, QuarterlyUpdate, ManagerComment, Quarter } from '@/types'
import {
  Plus, Send, AlertCircle, CheckCircle2, Target, Info,
  Lock, RotateCcw, Clock, MessageSquare
} from 'lucide-react'

interface SheetWithDetails extends GoalSheet {
  goals?: (Goal & { quarterly_updates?: QuarterlyUpdate[] })[]
  manager_comments?: (ManagerComment & { author?: { full_name: string; role: string } })[]
}

interface Props {
  profile: Profile
  sheet: SheetWithDetails | null
  year: string
}

export function EmployeeGoalsPage({ profile, sheet: initialSheet, year }: Props) {
  const [sheet, setSheet] = useState(initialSheet)
  const [showForm, setShowForm] = useState(false)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
  const [quarterlyTarget, setQuarterlyTarget] = useState<{ goalId: string; quarter: Quarter } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const goals = sheet?.goals ?? []
  const comments = sheet?.manager_comments ?? []
  const totalWeightage = goals.reduce((s, g) => s + g.weightage, 0)
  const isEditable = !sheet || ['draft', 'rework'].includes(sheet.status)
  const canSubmit = isEditable && goals.length > 0 && Math.abs(totalWeightage - 100) < 0.01
  const showApproved = sheet?.status === 'approved' || sheet?.status === 'locked'

  function showToast(type: 'success' | 'error', text: string) {
    setToast({ type, text })
    setTimeout(() => setToast(null), 4000)
  }

  async function handleCreateSheet() {
    const result = await getOrCreateGoalSheet(year)
    if (result.success) window.location.reload()
    else showToast('error', result.error)
  }

  async function handleSubmit() {
    if (!sheet || !canSubmit) return
    setSubmitting(true)
    const result = await submitGoalSheet(sheet.id)
    if (result.success) {
      showToast('success', result.message ?? 'Submitted!')
      setTimeout(() => window.location.reload(), 1000)
    } else {
      showToast('error', result.error)
    }
    setSubmitting(false)
  }

  function afterGoalChange() {
    setShowForm(false)
    setEditingGoal(null)
    window.location.reload()
  }

  const statusIcon = {
    draft: <Clock className="w-4 h-4 text-gray-500" />,
    submitted: <Send className="w-4 h-4 text-blue-500" />,
    approved: <CheckCircle2 className="w-4 h-4 text-green-500" />,
    locked: <Lock className="w-4 h-4 text-purple-500" />,
    rework: <RotateCcw className="w-4 h-4 text-amber-500" />,
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all ${
          toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.text}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Goals</h1>
          <p className="text-gray-500 text-sm mt-1">Financial Year: {year}</p>
        </div>
        {sheet && (
          <div className="flex items-center gap-2">
            <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${getSheetStatusColor(sheet.status)}`}>
              {statusIcon[sheet.status]}
              {STATUS_LABELS[sheet.status]}
            </span>
          </div>
        )}
      </div>

      {/* No sheet */}
      {!sheet ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-16 text-center">
          <Target className="w-14 h-14 text-indigo-200 mx-auto mb-5" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Start Your Goal Sheet</h2>
          <p className="text-gray-500 text-sm max-w-sm mx-auto mb-6">
            Create your goal sheet for {year}. You can add up to 8 goals with a total weightage of 100%.
          </p>
          <button onClick={handleCreateSheet}
            className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 transition shadow-sm">
            Create Goal Sheet
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Weightage summary bar */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
              <div className="flex items-center gap-6">
                <div>
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Weightage</p>
                  <p className={`text-xl font-bold mt-0.5 ${
                    Math.abs(totalWeightage - 100) < 0.01 ? 'text-green-600' :
                    totalWeightage > 100 ? 'text-red-600' : 'text-gray-900'
                  }`}>{totalWeightage}%<span className="text-sm font-normal text-gray-400"> / 100%</span></p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Goals</p>
                  <p className="text-xl font-bold mt-0.5 text-gray-900">{goals.length}<span className="text-sm font-normal text-gray-400"> / 8</span></p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isEditable && goals.length < 8 && (
                  <button onClick={() => { setShowForm(true); setEditingGoal(null) }}
                    className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-100 transition">
                    <Plus className="w-4 h-4" /> Add Goal
                  </button>
                )}
                {canSubmit && (
                  <button onClick={handleSubmit} disabled={submitting}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-60">
                    <Send className="w-4 h-4" />
                    {submitting ? 'Submitting…' : 'Submit for Review'}
                  </button>
                )}
              </div>
            </div>

            {/* Progress bar */}
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-500 ${
                Math.abs(totalWeightage - 100) < 0.01 ? 'bg-green-500' :
                totalWeightage > 100 ? 'bg-red-500' : 'bg-indigo-500'
              }`} style={{ width: `${Math.min(totalWeightage, 100)}%` }} />
            </div>

            {isEditable && goals.length > 0 && !canSubmit && (
              <p className="text-xs text-amber-600 mt-2 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" />
                {totalWeightage < 100
                  ? `Add ${100 - totalWeightage}% more weightage before submitting`
                  : `Reduce weightage by ${totalWeightage - 100}% — total must equal exactly 100%`}
              </p>
            )}
          </div>

          {/* Rework comments */}
          {sheet.status === 'rework' && comments.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-amber-800 flex items-center gap-2 mb-3">
                <MessageSquare className="w-4 h-4" /> Manager Feedback
              </h3>
              <div className="space-y-2.5">
                {comments.map(c => (
                  <div key={c.id} className="bg-white border border-amber-100 rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-1 text-xs text-gray-500">
                      <span className="font-semibold text-gray-700">{c.author?.full_name}</span>
                      <span>·</span>
                      <span>{new Date(c.created_at).toLocaleDateString('en-IN')}</span>
                    </div>
                    <p className="text-sm text-gray-800">{c.comment}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Inline add/edit form */}
          {(showForm && !editingGoal) && (
            <div className="bg-white rounded-2xl border border-indigo-200 shadow-sm p-6">
              <h3 className="text-base font-semibold text-gray-900 mb-5">Add New Goal</h3>
              <GoalForm sheetId={sheet.id} usedWeightage={totalWeightage}
                onSuccess={afterGoalChange} onCancel={() => setShowForm(false)} />
            </div>
          )}

          {editingGoal && (
            <div className="bg-white rounded-2xl border border-indigo-200 shadow-sm p-6">
              <h3 className="text-base font-semibold text-gray-900 mb-5">Edit Goal</h3>
              <GoalForm sheetId={sheet.id} goal={editingGoal} usedWeightage={totalWeightage}
                onSuccess={afterGoalChange} onCancel={() => setEditingGoal(null)} />
            </div>
          )}

          {/* Goals list */}
          {goals.length === 0 && !showForm ? (
            <div className="bg-white rounded-2xl border border-dashed border-gray-200 py-14 text-center">
              <p className="text-gray-400 text-sm">No goals yet — click "Add Goal" to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {goals.map((g, i) => (
                <GoalCard key={g.id} goal={g} index={i} sheetStatus={sheet.status} isEditable={isEditable}
                  onEdit={isEditable ? setEditingGoal : undefined}
                  onUpdateQuarter={(gId, q) => setQuarterlyTarget({ goalId: gId, quarter: q })}
                  onGoalUpdated={afterGoalChange} />
              ))}
            </div>
          )}

          {/* Quarterly update modal */}
          {quarterlyTarget && (
            <QuarterlyUpdateForm
              goalId={quarterlyTarget.goalId}
              quarter={quarterlyTarget.quarter}
              existingUpdate={goals.find(g => g.id === quarterlyTarget.goalId)
                ?.quarterly_updates?.find(u => u.quarter === quarterlyTarget.quarter)}
              onSuccess={() => { setQuarterlyTarget(null); window.location.reload() }}
              onCancel={() => setQuarterlyTarget(null)} />
          )}
        </div>
      )}
    </div>
  )
}
