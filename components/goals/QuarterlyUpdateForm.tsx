'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { quarterlyUpdateSchema, type QuarterlyUpdateSchema } from '@/lib/validations'
import { saveQuarterlyUpdate } from '@/actions/admin'
import type { QuarterlyUpdate, Quarter } from '@/types'
import { X, Loader2, Save } from 'lucide-react'
import { useState } from 'react'

interface Props {
  goalId: string
  quarter: Quarter
  existingUpdate?: QuarterlyUpdate
  onSuccess: () => void
  onCancel: () => void
}

export function QuarterlyUpdateForm({ goalId, quarter, existingUpdate, onSuccess, onCancel }: Props) {
  const [serverError, setServerError] = useState('')

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<QuarterlyUpdateSchema>({
    resolver: zodResolver(quarterlyUpdateSchema),
    defaultValues: existingUpdate
      ? {
          actual_value: existingUpdate.actual_value ?? undefined,
          completion_date: existingUpdate.completion_date ?? undefined,
          status: existingUpdate.status,
          notes: existingUpdate.notes ?? '',
        }
      : { status: 'not_started' },
  })

  async function onSubmit(data: QuarterlyUpdateSchema) {
    setServerError('')
    const result = await saveQuarterlyUpdate(goalId, quarter, data)
    if (!result.success) {
      setServerError(result.error)
      return
    }
    onSuccess()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-900">{quarter} Progress Update</h3>
          <button onClick={onCancel} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          {/* Actual value */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Actual Achievement
            </label>
            <input
              {...register('actual_value', { valueAsNumber: true })}
              type="number"
              step="any"
              placeholder="Enter actual value achieved"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Completion date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Completion Date
            </label>
            <input
              {...register('completion_date')}
              type="date"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Status <span className="text-red-500">*</span>
            </label>
            <select
              {...register('status')}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="not_started">Not Started</option>
              <option value="on_track">On Track</option>
              <option value="completed">Completed</option>
            </select>
            {errors.status && <p className="text-xs text-red-600 mt-1">{errors.status.message}</p>}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes</label>
            <textarea
              {...register('notes')}
              rows={3}
              placeholder="Add context or challenges faced..."
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          {serverError && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
              {serverError}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-indigo-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isSubmitting ? 'Saving...' : 'Save Update'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
