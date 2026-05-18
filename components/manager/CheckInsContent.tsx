'use client'

import { useState } from 'react'
import { addQuarterlyComment } from '@/actions/manager'
import { calculateProgress, getProgressColor, getProgressBarColor, formatDate } from '@/lib/utils'
import { UOM_LABELS, QUARTERS, PROGRESS_LABELS } from '@/types'
import type { Quarter } from '@/types'
import {
  CheckSquare, ChevronDown, ChevronUp, MessageSquare,
  Send, Loader2, TrendingUp, AlertCircle
} from 'lucide-react'

const QUARTER_LABELS = { Q1: 'Apr–Jun', Q2: 'Jul–Sep', Q3: 'Oct–Dec', Q4: 'Jan–Mar' }

export function CheckInsContent({ managerId, team, year }: { managerId: string; team: any[]; year: string }) {
  const [activeQ, setActiveQ] = useState<Quarter>('Q1')
  const [expandedMember, setExpandedMember] = useState<string | null>(null)
  const [commentTarget, setCommentTarget] = useState<{ sheetId: string; goalId: string } | null>(null)
  const [commentText, setCommentText] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedComments, setSavedComments] = useState<Record<string, boolean>>({})

  async function handleAddComment() {
    if (!commentTarget || !commentText.trim()) return
    setSaving(true)
    const result = await addQuarterlyComment(commentTarget.sheetId, commentTarget.goalId, activeQ, commentText)
    if (result.success) {
      setSavedComments(p => ({ ...p, [`${commentTarget.goalId}-${activeQ}`]: true }))
      setCommentText('')
      setCommentTarget(null)
      window.location.reload()
    }
    setSaving(false)
  }

  function getGoalProgress(goal: any, q: Quarter) {
    const update = goal.quarterly_updates?.find((u: any) => u.quarter === q)
    if (!update) return null
    return {
      update,
      pct: calculateProgress(goal.uom, goal.target_value, update.actual_value),
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <CheckSquare className="w-6 h-6 text-indigo-600" />
          Quarterly Check-ins
        </h1>
        <p className="text-gray-500 text-sm mt-1">Review team progress · FY {year}</p>
      </div>

      {/* Quarter selector */}
      <div className="flex gap-2 mb-6">
        {QUARTERS.map(q => (
          <button key={q} onClick={() => setActiveQ(q)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition ${
              activeQ === q
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white text-gray-600 border border-gray-100 hover:border-indigo-200 hover:text-indigo-600'
            }`}>
            <div>{q}</div>
            <div className={`text-xs font-normal mt-0.5 ${activeQ === q ? 'text-indigo-200' : 'text-gray-400'}`}>
              {QUARTER_LABELS[q]}
            </div>
          </button>
        ))}
      </div>

      {team.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center">
          <AlertCircle className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No approved goal sheets found for your team in {year}.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {team.map(member => {
            const sheet = Array.isArray(member.goal_sheets) ? member.goal_sheets[0] : member.goal_sheets
            if (!sheet) return null
            const goals = sheet.goals ?? []
            const isExpanded = expandedMember === member.id

            // Quarter summary for this member
            const updatedGoals = goals.filter((g: any) => g.quarterly_updates?.some((u: any) => u.quarter === activeQ))
            const avgProgress = updatedGoals.length > 0
              ? Math.round(updatedGoals.reduce((sum: number, g: any) => {
                  const u = g.quarterly_updates.find((u: any) => u.quarter === activeQ)
                  return sum + calculateProgress(g.uom, g.target_value, u?.actual_value)
                }, 0) / updatedGoals.length)
              : null

            return (
              <div key={member.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                {/* Member header */}
                <button className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50/50 transition"
                  onClick={() => setExpandedMember(isExpanded ? null : member.id)}>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 font-semibold text-sm flex items-center justify-center flex-shrink-0">
                      {member.full_name.charAt(0)}
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-semibold text-gray-900">{member.full_name}</div>
                      <div className="text-xs text-gray-400">{member.designation ?? member.email} · {goals.length} goals</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {avgProgress !== null ? (
                      <div className="text-right">
                        <div className={`text-lg font-bold ${getProgressColor(avgProgress)}`}>{avgProgress}%</div>
                        <div className="text-xs text-gray-400">{updatedGoals.length}/{goals.length} reported</div>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-300">No {activeQ} updates</div>
                    )}
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </div>
                </button>

                {/* Expanded goals */}
                {isExpanded && (
                  <div className="border-t border-gray-50 divide-y divide-gray-50">
                    {goals.map((goal: any) => {
                      const prog = getGoalProgress(goal, activeQ)
                      const existingComments = goal.manager_comments?.filter((c: any) => c.quarter === activeQ) ?? []
                      const isCommenting = commentTarget?.goalId === goal.id

                      return (
                        <div key={goal.id} className="px-5 py-4">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div>
                              <div className="text-xs text-indigo-600 font-medium">{goal.thrust_area}</div>
                              <div className="text-sm font-semibold text-gray-900 mt-0.5">{goal.title}</div>
                              <div className="text-xs text-gray-400 mt-0.5">
                                {UOM_LABELS[goal.uom]} · Wt: {goal.weightage}%
                                {goal.target_value != null && ` · Target: ${goal.target_value}`}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {prog ? (
                                <div className="text-right">
                                  <div className={`text-base font-bold ${getProgressColor(prog.pct)}`}>
                                    {Math.round(prog.pct)}%
                                  </div>
                                  <div className="text-xs text-gray-400">{PROGRESS_LABELS[prog.update.status]}</div>
                                </div>
                              ) : (
                                <span className="text-xs text-gray-300">Not reported</span>
                              )}
                              <button onClick={() => {
                                setCommentTarget(isCommenting ? null : { sheetId: sheet.id, goalId: goal.id })
                                setCommentText('')
                              }}
                                className="flex items-center gap-1.5 text-xs bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition">
                                <MessageSquare className="w-3 h-3" />
                                Comment
                              </button>
                            </div>
                          </div>

                          {/* Progress bar */}
                          {prog && (
                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-2">
                              <div className={`h-full rounded-full ${getProgressBarColor(prog.pct)}`}
                                style={{ width: `${Math.min(prog.pct, 100)}%` }} />
                            </div>
                          )}

                          {/* Employee notes */}
                          {prog?.update.notes && (
                            <p className="text-xs text-gray-500 italic mb-2">Employee: "{prog.update.notes}"</p>
                          )}

                          {/* Existing comments */}
                          {existingComments.length > 0 && (
                            <div className="space-y-1.5 mb-2">
                              {existingComments.map((c: any) => (
                                <div key={c.id} className="bg-indigo-50 rounded-lg px-3 py-2 text-xs">
                                  <span className="font-semibold text-indigo-700">{c.author?.full_name}: </span>
                                  <span className="text-indigo-800">{c.comment}</span>
                                  <span className="text-indigo-400 ml-2">{formatDate(c.created_at)}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Comment box */}
                          {isCommenting && (
                            <div className="flex gap-2 mt-2">
                              <input value={commentText} onChange={e => setCommentText(e.target.value)}
                                placeholder={`Add ${activeQ} check-in comment…`}
                                className="flex-1 px-3 py-2 border border-indigo-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                onKeyDown={e => e.key === 'Enter' && handleAddComment()} />
                              <button onClick={handleAddComment} disabled={!commentText.trim() || saving}
                                className="px-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-60 flex items-center">
                                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
