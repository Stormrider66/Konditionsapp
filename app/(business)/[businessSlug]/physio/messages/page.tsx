'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
    MessageSquare,
    Search,
    Filter,
    Plus,
    Clock,
    ChevronRight,
    AlertTriangle,
    User,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'

interface CareTeamThread {
    id: string
    subject: string
    description: string | null
    status: string
    priority: string
    lastMessageAt: string | null
    createdAt: string
    client: {
        id: string
        name: string
        email: string
    }
    createdBy: {
        id: string
        name: string
        role: string
    }
    participants: {
        user: {
            id: string
            name: string
            role: string
        }
    }[]
    lastMessage: {
        id: string
        content: string
        createdAt: string
        sender: {
            id: string
            name: string
        }
    } | null
    unreadCount: number
    _count: {
        messages: number
    }
}

export default function BusinessPhysioMessagesPage() {
    const params = useParams()
    const businessSlug = params.businessSlug as string
    const basePath = `/${businessSlug}/physio`

    const [threads, setThreads] = useState<CareTeamThread[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState<string>('all')
    const [priorityFilter, setPriorityFilter] = useState<string>('all')

    useEffect(() => {
        const fetchThreads = async () => {
            setLoading(true)
            try {
                const params = new URLSearchParams()
                if (statusFilter && statusFilter !== 'all') {
                    params.set('status', statusFilter)
                }
                if (priorityFilter && priorityFilter !== 'all') {
                    params.set('priority', priorityFilter)
                }

                const res = await fetch(`/api/care-team/threads?${params.toString()}`)
                if (res.ok) {
                    const data = await res.json()
                    // Filter by search client-side
                    let filtered = data.threads
                    if (search) {
                        const searchLower = search.toLowerCase()
                        filtered = filtered.filter((t: CareTeamThread) =>
                            t.subject.toLowerCase().includes(searchLower) ||
                            t.client.name.toLowerCase().includes(searchLower)
                        )
                    }
                    setThreads(filtered)
                }
            } catch (error) {
                console.error('Error fetching threads:', error)
            } finally {
                setLoading(false)
            }
        }

        const debounce = setTimeout(fetchThreads, 300)
        return () => clearTimeout(debounce)
    }, [search, statusFilter, priorityFilter])

    const priorityColors: Record<string, string> = {
        URGENT: 'bg-red-500/20 text-red-400 border-red-500/30',
        HIGH: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
        NORMAL: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        LOW: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    }

    const statusColors: Record<string, string> = {
        OPEN: 'bg-green-500/20 text-green-400',
        IN_PROGRESS: 'bg-blue-500/20 text-blue-400',
        WAITING_ON_ATHLETE: 'bg-yellow-500/20 text-yellow-400',
        WAITING_ON_COACH: 'bg-purple-500/20 text-purple-400',
        RESOLVED: 'bg-slate-500/20 text-slate-400',
        CLOSED: 'bg-slate-600/20 text-slate-500',
    }

    return (
        <div className="container mx-auto px-4 py-8">
            {/* Page Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Care Team Messages</h1>
                    <p className="text-slate-400">Communicate with coaches and athletes about injuries and rehab</p>
                </div>
                <Button asChild className="bg-purple-500 hover:bg-purple-600">
                    <Link href={`${basePath}/messages/new`}>
                        <Plus className="w-4 h-4 mr-2" />
                        New Thread
                    </Link>
                </Button>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        placeholder="Search threads..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10 bg-slate-900/50 border-white/10 text-white placeholder:text-slate-500"
                    />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px] bg-slate-900/50 border-white/10 text-white">
                        <Filter className="w-4 h-4 mr-2 text-slate-400" />
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-white/10">
                        <SelectItem value="all" className="text-slate-200">All Status</SelectItem>
                        <SelectItem value="OPEN" className="text-slate-200">Open</SelectItem>
                        <SelectItem value="IN_PROGRESS" className="text-slate-200">In Progress</SelectItem>
                        <SelectItem value="WAITING_ON_ATHLETE" className="text-slate-200">Waiting on Athlete</SelectItem>
                        <SelectItem value="RESOLVED" className="text-slate-200">Resolved</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                    <SelectTrigger className="w-[180px] bg-slate-900/50 border-white/10 text-white">
                        <AlertTriangle className="w-4 h-4 mr-2 text-slate-400" />
                        <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-white/10">
                        <SelectItem value="all" className="text-slate-200">All Priorities</SelectItem>
                        <SelectItem value="URGENT" className="text-slate-200">Urgent</SelectItem>
                        <SelectItem value="HIGH" className="text-slate-200">High</SelectItem>
                        <SelectItem value="NORMAL" className="text-slate-200">Normal</SelectItem>
                        <SelectItem value="LOW" className="text-slate-200">Low</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Threads List */}
            {loading ? (
                <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} className="h-28 bg-slate-800/50" />
                    ))}
                </div>
            ) : threads.length === 0 ? (
                <Card className="bg-slate-900/50 border-white/10">
                    <CardContent className="p-12 text-center">
                        <MessageSquare className="w-16 h-16 mx-auto mb-4 text-slate-600" />
                        <p className="text-slate-400 text-lg">No threads found</p>
                        <p className="text-slate-500 text-sm mt-2 mb-4">
                            Start a care team conversation about an athlete
                        </p>
                        <Button asChild className="bg-purple-500 hover:bg-purple-600">
                            <Link href={`${basePath}/messages/new`}>
                                <Plus className="w-4 h-4 mr-2" />
                                New Thread
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {threads.map((thread) => (
                        <Link
                            key={thread.id}
                            href={`${basePath}/messages/${thread.id}`}
                            className="block"
                        >
                            <Card className={`bg-slate-900/50 border-white/10 hover:border-purple-500/30 transition-all ${thread.unreadCount > 0 ? 'border-purple-500/20' : ''}`}>
                                <CardContent className="p-5">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-start gap-4 flex-1">
                                            <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0 relative">
                                                <MessageSquare className="w-6 h-6 text-purple-500" />
                                                {thread.unreadCount > 0 && (
                                                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-purple-500 text-white text-xs rounded-full flex items-center justify-center">
                                                        {thread.unreadCount}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-3 mb-1">
                                                    <h3 className={`font-semibold ${thread.unreadCount > 0 ? 'text-white' : 'text-slate-200'}`}>
                                                        {thread.subject}
                                                    </h3>
                                                    <Badge className={priorityColors[thread.priority]}>
                                                        {thread.priority}
                                                    </Badge>
                                                    <Badge className={statusColors[thread.status]}>
                                                        {thread.status.replace(/_/g, ' ')}
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
                                                    <User className="w-4 h-4" />
                                                    <span>{thread.client.name}</span>
                                                    <span className="text-slate-600">•</span>
                                                    <span className="text-slate-500">{thread._count.messages} messages</span>
                                                </div>
                                                {thread.lastMessage && (
                                                    <p className="text-slate-500 text-sm truncate">
                                                        <span className="text-slate-400">{thread.lastMessage.sender.name}:</span>{' '}
                                                        {thread.lastMessage.content}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4 ml-4">
                                            <div className="text-right text-xs text-slate-500">
                                                <Clock className="w-3 h-3 inline mr-1" />
                                                {thread.lastMessageAt
                                                    ? new Date(thread.lastMessageAt).toLocaleDateString()
                                                    : new Date(thread.createdAt).toLocaleDateString()
                                                }
                                            </div>
                                            <ChevronRight className="w-5 h-5 text-slate-600" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    )
}
