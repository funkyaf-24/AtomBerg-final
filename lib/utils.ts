import type { UomType, Goal, QuarterlyUpdate } from '@/types'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ============================================================
// Progress Calculation (mirrors PostgreSQL function)
// ============================================================
export function calculateProgress(
  uom: UomType,
  target: number | null | undefined,
  actual: number | null | undefined,
  deadline?: string | null,
  completion?: string | null
): number {
  if (actual === null || actual === undefined) return 0

  switch (uom) {
    case 'numeric_higher_better':
    case 'percentage_higher_better':
      if (!target || target === 0) return 0
      return Math.min((actual / target) * 100, 100)

    case 'numeric_lower_better':
    case 'percentage_lower_better':
      if (actual === 0) return 100
      if (!target) return 0
      return Math.min((target / actual) * 100, 100)

    case 'zero_based':
      return actual === 0 ? 100 : 0

    case 'timeline':
      if (!deadline || !completion) return 0
      return new Date(completion) <= new Date(deadline) ? 100 : 0

    default:
      return 0
  }
}

// ============================================================
// Weightage Validation
// ============================================================
export function validateTotalWeightage(weightages: number[]): boolean {
  const total = weightages.reduce((sum, w) => sum + w, 0)
  return Math.abs(total - 100) < 0.01
}

export function getRemainingWeightage(currentWeightages: number[], excludeIndex?: number): number {
  const total = currentWeightages.reduce((sum, w, i) => {
    if (i === excludeIndex) return sum
    return sum + w
  }, 0)
  return Math.max(0, 100 - total)
}

// ============================================================
// Overall Goal Sheet Progress
// ============================================================
export function calculateSheetProgress(goals: (Goal & { quarterly_updates?: QuarterlyUpdate[] })[]): number {
  if (!goals.length) return 0

  let weightedTotal = 0
  let totalWeight = 0

  for (const goal of goals) {
    const latestUpdate = goal.quarterly_updates?.slice(-1)[0]
    if (!latestUpdate) continue

    const progress = calculateProgress(
      goal.uom,
      goal.target_value,
      latestUpdate.actual_value,
      undefined,
      latestUpdate.completion_date
    )

    weightedTotal += progress * (goal.weightage / 100)
    totalWeight += goal.weightage
  }

  return totalWeight > 0 ? (weightedTotal / totalWeight) * 100 : 0
}

// ============================================================
// Status Color Helpers
// ============================================================
export function getSheetStatusColor(status: string): string {
  const colors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    submitted: 'bg-blue-100 text-blue-700',
    approved: 'bg-green-100 text-green-700',
    locked: 'bg-purple-100 text-purple-700',
    rework: 'bg-amber-100 text-amber-700',
  }
  return colors[status] ?? 'bg-gray-100 text-gray-700'
}

export function getProgressColor(pct: number): string {
  if (pct >= 80) return 'text-green-600'
  if (pct >= 50) return 'text-amber-600'
  return 'text-red-600'
}

export function getProgressBarColor(pct: number): string {
  if (pct >= 80) return 'bg-green-500'
  if (pct >= 50) return 'bg-amber-500'
  return 'bg-red-500'
}

// ============================================================
// CSV Export
// ============================================================
export function exportToCSV(data: Record<string, unknown>[], filename: string): void {
  if (!data.length) return

  const headers = Object.keys(data[0])
  const rows = data.map(row =>
    headers.map(h => {
      const val = row[h]
      const str = val === null || val === undefined ? '' : String(val)
      return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str
    }).join(',')
  )

  const csv = [headers.join(','), ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

// ============================================================
// Date Utilities
// ============================================================
export function formatDate(date: string | null | undefined): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function getCurrentFinancialYear(): string {
  const now = new Date()
  const year = now.getFullYear()
  return now.getMonth() >= 3 ? `${year}-${year + 1}` : `${year - 1}-${year}`
}
