'use client'

import Link from 'next/link'
import { useState } from 'react'
import { approveGoalSheet, sendForRework } from '@/actions/manager'
import { formatDate } from '@/lib/utils'
import {
  FileText, CheckCircle2, RotateCcw, ChevronRight,
  Clock, AlertCircle, Loader2, Send
} from 'lucide-react'

interface Sheet {
  id: string
  status: string
  financial_year: string
  submitted_at: string | null
  employee: { full_name: string; email: string; department: string | null; designation: string | null } | null
  goals: { id: string; thrust_area: string; title: string; weightage: number }[]
}

export function PendingReviewsContent({ sheets }: { sheets: Sheet[] }) {
  const [processing, setProcessing] = useState<string | null>(null)
  const [reworkSheet, setReworkSheet] = useState<Sheet | null>(null)
  const [reworkReason, setReworkReason] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function handleApprove(sheetId: string) {
    setProcessing(sheetId)
    const result = await approveGoalSheet(sheetId)
    setMessage({ type: result.success ? 'success' : 'error', text: result.success ? 'Approved!' : result.error })
    if (result.success) setTimeout(() => window.location.reload(), 800)
    setProcessing(null)
  }

  async function handleRework() {
    if (!reworkSheet || !reworkReason.trim()) return
    setProcessing(reworkSheet.id)
    const result = await sendForRework(reworkSheet.id, reworkReason)
    setMessage({ type: result.success ? 'success' : 'error', text: result.success ? 'Sent for rework' : result.error })
    if (result.success) { setReworkSheet(null); setReworkReason(''); setTimeout(() => window.location.reload(), 800) }
    setProcessing(null)
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FileText className="w-6 h-6 text-indigo-600" />
          Pending Reviews
        </h1>
        <p className="text-gray-500 text-sm mt-1">{sheets.length} submission{sheets.length !== 1 ? 's' : ''} awaiting review</p>
      </div>

      {message && (
        <div className={`mb-4 px-4 py-3 rounded-xl text-sm flex items-center gap-2 ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {message.text}
          <button onClick={() => setMessage(null)} className="ml-auto">✕</button>
        </div>
      )}

      {sheets.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center">
          <CheckCircle2 className="w-12 h-12 text-green-200 mx-auto mb-4" />
          <h2 className="text-base font-semibold text-gray-700 mb-1">All caught up!</h2>
          <p className="text-sm text-gray-400">No pending submissions at the moment.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sheets.map(sheet => {
            const emp = sheet.employee
            const totalW = sheet.goals.reduce((s, g) => s + g.weightage, 0)

            return (
              <div key={sheet.id} className="bg-white rounded-2xl border border-gray-100 p-5 hover:border-indigo-100 transition">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 font-semibold text-sm flex items-center justify-center flex-shrink-0">
                      {emp?.full_name?.charAt(0) ?? '?'}
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-gray-900">{emp?.full_name}</h3>
                      <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                        <span>{emp?.designation ?? 'Employee'}</span>
                        {emp?.department && <><span>·</span><span>{emp.department}</span></>}
                        <span>·</span>
                        <span>FY {sheet.financial_year}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-400">
                        <Clock className="w-3 h-3" />
                        Submitted {formatDate(sheet.submitted_at)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button onClick={() => handleApprove(sheet.id)} disabled={!!processing}
                      className="flex items-center gap-1.5 bg-green-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-green-700 transition disabled:opacity-60">
                      {processing === sheet.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                      Approve
                    </button>
                    <button onClick={() => setReworkSheet(sheet)} disabled={!!processing}
                      className="flex items-center gap-1.5 bg-amber-50 text-amber-700 text-sm px-4 py-2 rounded-lg hover:bg-amber-100 transition disabled:opacity-60">
                      <RotateCcw className="w-3.5 h-3.5" /> Rework
                    </button>
                    <Link href={`/manager/review/${sheet.id}`}
                      className="flex items-center gap-1 text-sm text-gray-500 hover:text-indigo-600 px-3 py-2 rounded-lg hover:bg-indigo-50 transition">
                      Review <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>

                {/* Goals summary */}
                <div className="mt-4 flex flex-wrap gap-2">
                  {sheet.goals.map(g => (
                    <span key={g.id} className="text-xs bg-gray-50 border border-gray-100 text-gray-600 px-2.5 py-1 rounded-lg">
                      {g.thrust_area}: {g.title.length > 30 ? g.title.slice(0, 30) + '…' : g.title}
                      <span className="ml-1 font-semibold text-gray-400">({g.weightage}%)</span>
                    </span>
                  ))}
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${
                    totalW === 100 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
                  }`}>Total: {totalW}%</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Rework modal */}
      {reworkSheet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-1">Send for Rework</h3>
            <p className="text-sm text-gray-500 mb-4">What should <b>{reworkSheet.employee?.full_name}</b> change?</p>
            <textarea value={reworkReason} onChange={e => setReworkReason(e.target.value)}
              rows={4} placeholder="Describe the changes needed…"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none mb-4" />
            <div className="flex gap-3">
              <button onClick={handleRework} disabled={!reworkReason.trim() || !!processing}
                className="flex-1 flex items-center justify-center gap-2 bg-amber-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-amber-700 disabled:opacity-60">
                {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Send for Rework
              </button>
              <button onClick={() => { setReworkSheet(null); setReworkReason('') }}
                className="px-5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
