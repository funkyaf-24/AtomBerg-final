'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { approveGoalSheet, sendForRework, addManagerComment } from '@/actions/manager'
import { calculateProgress, getSheetStatusColor, formatDate } from '@/lib/utils'
import { UOM_LABELS, QUARTERS, STATUS_LABELS, PROGRESS_LABELS } from '@/types'
import type { Profile } from '@/types'
import {
  ArrowLeft, CheckCircle2, RotateCcw, MessageSquare, Send,
  User, Calendar, Building, ChevronDown, ChevronUp, AlertCircle, Loader2
} from 'lucide-react'

export function SheetReviewContent({ sheet, reviewer }: { sheet: any; reviewer: Profile }) {
  const router = useRouter()
  const [reworkReason, setReworkReason] = useState('')
  const [newComment, setNewComment] = useState('')
  const [showRework, setShowRework] = useState(false)
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set())
  const [processing, setProcessing] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const isReviewable = sheet.status === 'submitted'
  const employee = sheet.employee
  const goals = sheet.goals ?? []
  const comments = sheet.manager_comments ?? []
  const totalWeightage = goals.reduce((s: number, g: any) => s + g.weightage, 0)

  function toggleGoal(id: string) {
    setExpandedGoals(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleApprove() {
    setProcessing(true)
    const result = await approveGoalSheet(sheet.id)
    if (result.success) {
      setMessage({ type: 'success', text: 'Goal sheet approved!' })
      setTimeout(() => router.push('/manager/dashboard'), 1500)
    } else {
      setMessage({ type: 'error', text: result.error })
    }
    setProcessing(false)
  }

  async function handleRework() {
    if (!reworkReason.trim()) return
    setProcessing(true)
    const result = await sendForRework(sheet.id, reworkReason)
    if (result.success) {
      setMessage({ type: 'success', text: 'Sent for rework!' })
      setTimeout(() => router.push('/manager/dashboard'), 1500)
    } else {
      setMessage({ type: 'error', text: result.error })
    }
    setProcessing(false)
  }

  async function handleComment() {
    if (!newComment.trim()) return
    setProcessing(true)
    const result = await addManagerComment(sheet.id, { comment: newComment })
    if (result.success) {
      setNewComment('')
      setMessage({ type: 'success', text: 'Comment added' })
      window.location.reload()
    } else {
      setMessage({ type: 'error', text: result.error })
    }
    setProcessing(false)
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Back */}
      <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-5 transition">
        <ArrowLeft className="w-4 h-4" />
        Back to dashboard
      </button>

      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-5">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-lg font-bold">
              {employee?.full_name?.charAt(0)}
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{employee?.full_name}</h1>
              <div className="flex flex-wrap gap-3 mt-1 text-sm text-gray-500">
                <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" />{employee?.designation ?? 'Employee'}</span>
                <span className="flex items-center gap-1"><Building className="w-3.5 h-3.5" />{employee?.department ?? '—'}</span>
                <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />FY {sheet.financial_year}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getSheetStatusColor(sheet.status)}`}>
              {STATUS_LABELS[sheet.status as keyof typeof STATUS_LABELS]}
            </span>
            <span className="text-sm text-gray-500 font-medium">{totalWeightage}% total</span>
          </div>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`mb-4 px-4 py-3 rounded-lg text-sm flex items-center gap-2 ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Goals (left / main) */}
        <div className="lg:col-span-2 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Goals ({goals.length})
          </h2>

          {goals.map((goal: any, idx: number) => {
            const isOpen = expandedGoals.has(goal.id)
            const latestUpdate = goal.quarterly_updates?.slice(-1)[0]
            const progress = latestUpdate
              ? calculateProgress(goal.uom, goal.target_value, latestUpdate.actual_value)
              : null

            return (
              <div key={goal.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="p-4 cursor-pointer" onClick={() => toggleGoal(goal.id)}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 text-xs font-semibold flex items-center justify-center flex-shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <div>
                        <div className="text-xs text-indigo-600 font-medium mb-0.5">{goal.thrust_area}</div>
                        <div className="text-sm font-semibold text-gray-900">{goal.title}</div>
                        <div className="text-xs text-gray-400 mt-1">
                          {UOM_LABELS[goal.uom as keyof typeof UOM_LABELS]}
                          {goal.target_value != null && ` · Target: ${goal.target_value}`}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs font-bold text-gray-600 bg-gray-100 px-2.5 py-1 rounded-full">{goal.weightage}%</span>
                      {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    </div>
                  </div>
                </div>

                {isOpen && (
                  <div className="border-t border-gray-50 p-4 space-y-3">
                    {goal.description && <p className="text-sm text-gray-600">{goal.description}</p>}

                    {/* Quarterly updates */}
                    {goal.quarterly_updates?.length > 0 && (
                      <div>
                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Progress</div>
                        <div className="grid grid-cols-4 gap-2">
                          {QUARTERS.map(q => {
                            const u = goal.quarterly_updates.find((x: any) => x.quarter === q)
                            const p = u ? calculateProgress(goal.uom, goal.target_value, u.actual_value) : null
                            return (
                              <div key={q} className="border border-gray-100 rounded-lg p-2.5 text-center">
                                <div className="text-xs font-semibold text-gray-500 mb-1">{q}</div>
                                {u ? (
                                  <>
                                    <div className={`text-sm font-bold ${p! >= 80 ? 'text-green-600' : p! >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
                                      {Math.round(p!)}%
                                    </div>
                                    <div className="text-xs text-gray-400">{PROGRESS_LABELS[u.status as keyof typeof PROGRESS_LABELS]}</div>
                                  </>
                                ) : (
                                  <div className="text-xs text-gray-300">—</div>
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
          })}
        </div>

        {/* Right panel: Actions + Comments */}
        <div className="space-y-4">
          {/* Actions */}
          {isReviewable && (
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Review Decision</h3>
              <div className="space-y-2">
                <button onClick={handleApprove} disabled={processing}
                  className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-green-700 transition disabled:opacity-60">
                  {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Approve Goal Sheet
                </button>
                <button onClick={() => setShowRework(!showRework)}
                  className="w-full flex items-center justify-center gap-2 bg-amber-50 text-amber-700 py-2.5 rounded-lg text-sm font-medium hover:bg-amber-100 transition">
                  <RotateCcw className="w-4 h-4" />
                  Send for Rework
                </button>
              </div>

              {showRework && (
                <div className="mt-3 space-y-2">
                  <textarea
                    value={reworkReason}
                    onChange={e => setReworkReason(e.target.value)}
                    rows={3}
                    placeholder="Explain what needs to be changed..."
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                  />
                  <button onClick={handleRework} disabled={!reworkReason.trim() || processing}
                    className="w-full bg-amber-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-amber-700 transition disabled:opacity-60 flex items-center justify-center gap-2">
                    {processing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Confirm Rework
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Comments */}
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-indigo-500" />
              Comments ({comments.length})
            </h3>

            <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
              {comments.length === 0 ? (
                <p className="text-xs text-gray-400">No comments yet.</p>
              ) : (
                comments.map((c: any) => (
                  <div key={c.id} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-gray-700">{c.author?.full_name}</span>
                      <span className="text-xs text-gray-400">{formatDate(c.created_at)}</span>
                    </div>
                    <p className="text-sm text-gray-700">{c.comment}</p>
                  </div>
                ))
              )}
            </div>

            <div className="flex gap-2">
              <textarea
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                rows={2}
                placeholder="Add a comment..."
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
              <button onClick={handleComment} disabled={!newComment.trim() || processing}
                className="px-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-60 flex items-center justify-center">
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
