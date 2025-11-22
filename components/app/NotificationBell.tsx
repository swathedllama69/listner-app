"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Bell, Check } from "lucide-react"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
}
    from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"

type Notification = {
    id: string
    title: string
    message: string
    is_read: boolean
    created_at: string
    type: string
    link_path: string
}

export function NotificationBell({ userId, onNavigate }: { userId: string, onNavigate: (path: string) => void }) {
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [isOpen, setIsOpen] = useState(false)

    const fetchNotifications = async () => {
        const { data } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(20)

        if (data) {
            setNotifications(data)
            setUnreadCount(data.filter(n => !n.is_read).length)
        }
    }

    useEffect(() => {
        fetchNotifications()

        // Real-time Listener
        const channel = supabase
            .channel('notifications_realtime')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'notifications',
                filter: `user_id=eq.${userId}`
            }, (payload) => {
                const newNotif = payload.new as Notification
                setNotifications(prev => [newNotif, ...prev])
                setUnreadCount(prev => prev + 1)
                // Optional: Play a sound here
            })
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [userId])

    const markAsRead = async (id: string) => {
        // Optimistic update
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
        setUnreadCount(prev => Math.max(0, prev - 1))

        await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    }

    const markAllRead = async () => {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
        setUnreadCount(0)
        await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId)
    }

    const handleItemClick = async (n: Notification) => {
        if (!n.is_read) markAsRead(n.id)
        if (n.link_path) onNavigate(n.link_path)
        setIsOpen(false)
    }

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative text-slate-400 hover:text-slate-600">
                    <Bell className="w-6 h-6" />
                    {unreadCount > 0 && (
                        <span className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-rose-500 border-2 border-white animate-pulse" />
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0 rounded-xl shadow-xl border-slate-100 bg-white/95 backdrop-blur">
                <div className="flex items-center justify-between p-3 border-b border-slate-100">
                    <h4 className="font-bold text-sm text-slate-800">Notifications</h4>
                    {unreadCount > 0 && (
                        <button onClick={markAllRead} className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                            <Check className="w-3 h-3" /> Mark all read
                        </button>
                    )}
                </div>
                <ScrollArea className="h-[300px]">
                    {notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full p-8 text-slate-400">
                            <Bell className="w-8 h-8 mb-2 opacity-20" />
                            <p className="text-xs">No notifications yet.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-50">
                            {notifications.map(n => (
                                <div
                                    key={n.id}
                                    onClick={() => handleItemClick(n)}
                                    className={`p-3 hover:bg-slate-50 transition-colors cursor-pointer flex gap-3 ${!n.is_read ? 'bg-indigo-50/30' : ''}`}
                                >
                                    <div className={`w-2 h-2 mt-1.5 rounded-full flex-shrink-0 ${!n.is_read ? 'bg-rose-500' : 'bg-slate-200'}`} />
                                    <div>
                                        <p className={`text-xs ${!n.is_read ? 'font-bold text-slate-800' : 'font-medium text-slate-600'}`}>{n.title}</p>
                                        <p className="text-[11px] text-slate-500 leading-tight mt-0.5 line-clamp-2">{n.message}</p>
                                        <p className="text-[9px] text-slate-400 mt-1.5">{new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </PopoverContent>
        </Popover>
    )
}