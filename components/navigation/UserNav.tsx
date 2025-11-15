'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { User } from '@supabase/supabase-js'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { LogOut, User as UserIcon } from 'lucide-react'
import { signOut } from '@/app/actions/auth'

interface UserNavProps {
  user: User | null
}

export function UserNav({ user }: UserNavProps) {
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleSignOut = async () => {
    setIsLoggingOut(true)
    try {
      await signOut()
    } catch (error) {
      console.error('Error signing out:', error)
      setIsLoggingOut(false)
    }
  }

  if (!user) {
    return (
      <div className="flex flex-col sm:flex-row gap-2">
        <Link href="/login" className="w-full sm:w-auto">
          <Button variant="outline" className="w-full sm:w-auto min-h-[44px]">Logga in</Button>
        </Link>
        <Link href="/register" className="w-full sm:w-auto">
          <Button className="gradient-primary w-full sm:w-auto min-h-[44px]">Skapa konto</Button>
        </Link>
      </div>
    )
  }

  const initials = user.user_metadata?.name
    ?.split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase() || user.email?.[0].toUpperCase() || 'U'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-11 w-11 rounded-full min-h-[44px] min-w-[44px] p-0">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="gradient-primary text-white">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64 sm:w-56" align="end">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none truncate">
              {user.user_metadata?.name || 'User'}
            </p>
            <p className="text-xs leading-none text-muted-foreground truncate">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} disabled={isLoggingOut} className="min-h-[44px]">
          <LogOut className="mr-2 h-4 w-4 flex-shrink-0" />
          <span>{isLoggingOut ? 'Loggar ut...' : 'Logga ut'}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
