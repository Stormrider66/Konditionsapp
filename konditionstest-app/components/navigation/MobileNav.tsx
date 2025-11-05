'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { User } from '@supabase/supabase-js'
import { Menu, X, Home, Users, Plus, User as UserIcon, Users2, MessageSquare, Calendar, Dumbbell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { UserNav } from './UserNav'

interface MobileNavProps {
  user: User | null
  userRole?: 'COACH' | 'ATHLETE' | 'ADMIN' | null
}

export function MobileNav({ user, userRole }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const pathname = usePathname()

  const toggleMenu = () => setIsOpen(!isOpen)
  const closeMenu = () => setIsOpen(false)

  useEffect(() => {
    if (user && (userRole === 'COACH' || userRole === 'ATHLETE')) {
      fetchUnreadCount()
      // Poll every 30 seconds
      const interval = setInterval(fetchUnreadCount, 30000)
      return () => clearInterval(interval)
    }
  }, [user, userRole])

  async function fetchUnreadCount() {
    try {
      const response = await fetch('/api/messages?filter=unread')
      const result = await response.json()
      if (response.ok && result.success) {
        setUnreadCount(result.data.length)
      }
    } catch (error) {
      console.error('Error fetching unread count:', error)
    }
  }

  // Base navigation links (always visible for coaches/admins)
  const baseNavLinks = [
    { href: '/', label: 'Hem', icon: Home },
    { href: '/clients', label: 'Klienter', icon: Users },
    { href: '/teams', label: 'Lag', icon: Users2 },
    { href: '/test', label: 'Nytt Test', icon: Plus },
  ]

  // Coach-specific links
  const coachNavLinks = [
    { href: '/coach/programs', label: 'Program', icon: Calendar },
    { href: '/coach/messages', label: 'Meddelanden', icon: MessageSquare, badge: unreadCount },
  ]

  // Athlete-specific links
  const athleteNavLinks = [
    { href: '/', label: 'Hem', icon: Home },
    { href: '/athlete/dashboard', label: 'Min träning', icon: Dumbbell },
    { href: '/athlete/messages', label: 'Meddelanden', icon: MessageSquare, badge: unreadCount },
  ]

  // Determine which links to show
  let navLinks = baseNavLinks
  if (userRole === 'COACH' || userRole === 'ADMIN') {
    navLinks = [...baseNavLinks, ...coachNavLinks]
  } else if (userRole === 'ATHLETE') {
    navLinks = athleteNavLinks
  }

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <>
      {/* Mobile Header */}
      <header className="lg:hidden gradient-primary text-white shadow-lg sticky top-0 z-50">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={toggleMenu}
                className="p-2 hover:bg-white/10 rounded-lg transition"
                aria-label="Toggle menu"
              >
                {isOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>
              <div>
                <h1 className="text-xl font-bold">Star by Thomson</h1>
              </div>
            </div>
            <UserNav user={user} />
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {isOpen && (
          <div className="bg-white border-t border-gray-200 shadow-lg">
            <nav className="py-2">
              {navLinks.map((link) => {
                const Icon = link.icon
                const active = isActive(link.href)
                const badge = (link as any).badge
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={closeMenu}
                    className={`flex items-center gap-3 px-6 py-3 transition ${
                      active
                        ? 'bg-blue-50 text-blue-600 border-l-4 border-blue-600'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <div className="relative">
                      <Icon className="w-5 h-5" />
                      {badge > 0 && (
                        <Badge
                          variant="destructive"
                          className="absolute -top-2 -right-2 h-4 w-4 flex items-center justify-center p-0 text-[10px]"
                        >
                          {badge > 9 ? '9+' : badge}
                        </Badge>
                      )}
                    </div>
                    <span className="font-medium">{link.label}</span>
                  </Link>
                )
              })}
            </nav>
          </div>
        )}
      </header>

      {/* Desktop Header */}
      <header className="hidden lg:block gradient-primary text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">Star by Thomson</h1>
              <p className="text-white/90 mt-1">Konditionstest Rapportgenerator</p>
            </div>
            <div className="flex items-center gap-6">
              {navLinks.map((link) => {
                const Icon = link.icon
                const active = isActive(link.href)
                const badge = (link as any).badge
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition relative ${
                      active
                        ? 'bg-white/20'
                        : 'hover:bg-white/10'
                    }`}
                  >
                    <div className="relative">
                      <Icon className="w-5 h-5" />
                      {badge > 0 && (
                        <Badge
                          variant="destructive"
                          className="absolute -top-2 -right-2 h-4 w-4 flex items-center justify-center p-0 text-[10px]"
                        >
                          {badge > 9 ? '9+' : badge}
                        </Badge>
                      )}
                    </div>
                    <span className="font-medium">{link.label}</span>
                  </Link>
                )
              })}
              <div className="border-l border-white/20 pl-4">
                <UserNav user={user} />
              </div>
            </div>
          </div>
        </div>
      </header>
    </>
  )
}
