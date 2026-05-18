'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'
import {
  Target, LayoutDashboard, Users, FileText, CheckSquare,
  BarChart3, LogOut, Menu, X, Settings, Bell, Shield,
  ClipboardList, Share2
} from 'lucide-react'

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
}

const employeeNav: NavItem[] = [
  { href: '/employee/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
  { href: '/employee/goals', label: 'My Goals', icon: <Target className="w-4 h-4" /> },
  { href: '/employee/quarterly', label: 'Quarterly Updates', icon: <CheckSquare className="w-4 h-4" /> },
]

const managerNav: NavItem[] = [
  { href: '/manager/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
  { href: '/manager/team', label: 'My Team', icon: <Users className="w-4 h-4" /> },
  { href: '/manager/reviews', label: 'Pending Reviews', icon: <FileText className="w-4 h-4" /> },
  { href: '/manager/checkins', label: 'Check-ins', icon: <CheckSquare className="w-4 h-4" /> },
]

const adminNav: NavItem[] = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
  { href: '/admin/users', label: 'Users', icon: <Users className="w-4 h-4" /> },
  { href: '/admin/goal-sheets', label: 'All Goal Sheets', icon: <FileText className="w-4 h-4" /> },
  { href: '/admin/shared-goals', label: 'Shared Goals', icon: <Share2 className="w-4 h-4" /> },
  { href: '/admin/reports', label: 'Reports & Export', icon: <BarChart3 className="w-4 h-4" /> },
  { href: '/admin/audit-logs', label: 'Audit Logs', icon: <ClipboardList className="w-4 h-4" /> },
]

interface SidebarProps {
  profile: Profile
}

export function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)

  const navItems =
    profile.role === 'admin' ? adminNav :
    profile.role === 'manager' ? managerNav :
    employeeNav

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const roleColors: Record<string, string> = {
    employee: 'bg-blue-100 text-blue-700',
    manager: 'bg-purple-100 text-purple-700',
    admin: 'bg-red-100 text-red-700',
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-100">
        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <Target className="w-4 h-4 text-white" />
        </div>
        <div>
          <div className="text-sm font-semibold text-gray-900">Goal Portal</div>
          <div className="text-xs text-gray-400">Performance Management</div>
        </div>
      </div>

      {/* User info */}
      <div className="px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-medium text-sm flex-shrink-0">
            {profile.full_name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium text-gray-900 truncate">{profile.full_name}</div>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${roleColors[profile.role]}`}>
              {profile.role}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map(item => {
          const isActive = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-indigo-50 text-indigo-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <span className={isActive ? 'text-indigo-600' : 'text-gray-400'}>{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Bottom actions */}
      <div className="px-3 py-4 border-t border-gray-100 space-y-0.5">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-red-50 hover:text-red-700 transition-colors"
        >
          <LogOut className="w-4 h-4 text-gray-400" />
          Sign out
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-60 bg-white border-r border-gray-100 fixed inset-y-0 left-0 z-40">
        <SidebarContent />
      </aside>

      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Target className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-semibold text-gray-900">Goal Portal</span>
        </div>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2 rounded-lg hover:bg-gray-100">
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 inset-y-0 w-64 bg-white shadow-xl">
            <SidebarContent />
          </aside>
        </div>
      )}
    </>
  )
}
