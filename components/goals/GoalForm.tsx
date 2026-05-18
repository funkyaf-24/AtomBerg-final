'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { goalSchema, type GoalSchema } from '@/lib/validations'
import { createGoal, updateGoal } from '@/actions/goals'
import { UOM_LABELS } from '@/types'
import type { Goal, UomType } from '@/types'
import { Loader2, Save, X } from 'lucide-react'

interface GoalFormProps {
  sheetId: string
  goal?: Goal
  usedWeightage: number
  onSuccess: () => void
  onCancel: () => void
}

const THRUST_AREAS = [
  'Revenue Growth',
  'Customer Success',
  'Product Development',
  'Process Excellence',
  'Team Development',
  'Cost Optimization',
  'Innovation',
  'Compliance & Risk',
]

export function GoalForm({ sheetId, goal, usedWeightage, onSuccess, onCancel }: GoalFormProps) {
  const [serverError, setServerError] = useState('')
  const isEdit = !!goal

  const maxWeightage = isEdit
    ? 100 - usedWeightage + (goal?.weightage ?? 0)
    : 100 - usedWeightage

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<GoalSchema>({
    resolver: zodResolver(goalSchema),
    defaultValues: goal
      ? {
          thrust_area: goal.thrust_area,
          title: goal.title,
          description: goal.description ?? '',
          uom: goal.uom,
          target_value: goal.target_value ?? undefined,
          weightage: goal.weightage,
        }
      : {
          uom: 'numeric_higher_better',
          weightage: Math.min(maxWeightage, 20),
        },
  })

  const selectedUom = watch('uom') as UomType
  const showTarget = !['zero_based'].includes(selectedUom)
  const showCompletionDate = selectedUom === 'timeline'

  async function onSubmit(data: GoalSchema) {
    setServerError('')

    const result = isEdit
      ? await updateGoal(goal!.id, data)
      : await createGoal(sheetId, data)

    if (!result.success) {
      setServerError(result.error)
      return
    }

    onSuccess()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Thrust Area */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Thrust Area <span className="text-red-500">*</span>
        </label>
        <select
          {...register('thrust_area')}
          className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
        >
          <option value="">Select thrust area</option>
          {THRUST_AREAS.map(area => (
            <option key={area} value={area}>{area}</option>
          ))}
        </select>
        {errors.thrust_area && (
          <p className="text-xs text-red-600 mt-1">{errors.thrust_area.message}</p>
        )}
      </div>

      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Goal Title <span className="text-red-500">*</span>
        </label>
        <input
          {...register('title')}
          type="text"
          placeholder="e.g., Achieve 95% customer satisfaction score"
          className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        {errors.title && (
          <p className="text-xs text-red-600 mt-1">{errors.title.message}</p>
        )}
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Description
        </label>
        <textarea
          {...register('description')}
          rows={3}
          placeholder="Describe the goal in detail..."
          className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
        />
      </div>

      {/* UoM and Target - 2 columns */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Unit of Measurement <span className="text-red-500">*</span>
          </label>
          <select
            {...register('uom')}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            {Object.entries(UOM_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        {showTarget && !showCompletionDate && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Target Value
            </label>
            <input
              {...register('target_value', { valueAsNumber: true })}
              type="number"
              step="any"
              placeholder="0"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        )}

        {showCompletionDate && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Target Deadline
            </label>
            <input
              {...register('target_value')}
              type="date"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        )}
      </div>

      {/* Weightage */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Weightage (%) <span className="text-red-500">*</span>
          <span className="text-gray-400 font-normal ml-2">
            Max available: {maxWeightage}%
          </span>
        </label>
        <input
          {...register('weightage', { valueAsNumber: true })}
          type="number"
          min="10"
          max={maxWeightage}
          step="5"
          className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        {errors.weightage && (
          <p className="text-xs text-red-600 mt-1">{errors.weightage.message}</p>
        )}
        <p className="text-xs text-gray-400 mt-1">Minimum: 10%, all goals must total exactly 100%</p>
      </div>

      {/* Server error */}
      {serverError && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          {serverError}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 bg-indigo-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {isSubmitting ? 'Saving...' : isEdit ? 'Update Goal' : 'Add Goal'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition flex items-center gap-2"
        >
          <X className="w-4 h-4" />
          Cancel
        </button>
      </div>
    </form>
  )
}
