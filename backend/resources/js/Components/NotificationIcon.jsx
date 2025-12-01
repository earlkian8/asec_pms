import { useState, useEffect } from 'react';
import { Bell, Check, CheckCheck, Trash2, BarChart3, Target, AlertTriangle, CheckCircle2, RefreshCw, FileText } from 'lucide-react';
import { usePage, router } from '@inertiajs/react';
import axios from 'axios';
import { route } from '@/utils/route';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/Components/ui/dropdown-menu';
import { Button } from '@/Components/ui/button';
import { cn } from '@/lib/utils';

export default function NotificationIcon() {
    const { auth } = usePage().props;
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(false);
    const [unreadCount, setUnreadCount] = useState(auth.unread_notifications_count || 0);
    const [open, setOpen] = useState(false);

    // Fetch notifications when dropdown opens
    useEffect(() => {
        if (open) {
            fetchNotifications();
            // Refresh unread count when opening
            axios.get(route('notifications.unread-count'))
                .then(response => {
                    if (response.data.success) {
                        setUnreadCount(response.data.count);
                    }
                })
                .catch(error => {
                    console.error('Error fetching unread count:', error);
                });
        }
    }, [open]);

    // Refresh unread count periodically
    useEffect(() => {
        const interval = setInterval(() => {
            axios.get(route('notifications.unread-count'))
                .then(response => {
                    if (response.data.success) {
                        setUnreadCount(response.data.count);
                    }
                })
                .catch(error => {
                    console.error('Error fetching unread count:', error);
                });
        }, 30000); // Refresh every 30 seconds

        return () => clearInterval(interval);
    }, []);

    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const response = await axios.get(route('notifications.index'), {
                params: { page: 1, per_page: 10 }
            });

            if (response.data.success) {
                setNotifications(response.data.data.data || []);
            }
        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleMarkAsRead = async (notification, e) => {
        e.stopPropagation();
        if (notification.read) return;

        try {
            const response = await axios.put(route('notifications.mark-as-read', notification.id));
            if (response.data.success) {
                setNotifications(prev =>
                    prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
                );
                setUnreadCount(prev => Math.max(0, prev - 1));
            }
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    const handleMarkAllAsRead = async (e) => {
        e.stopPropagation();
        try {
            const response = await axios.put(route('notifications.mark-all-read'));
            if (response.data.success) {
                setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                setUnreadCount(0);
            }
        } catch (error) {
            console.error('Error marking all as read:', error);
        }
    };

    const handleDelete = async (notification, e) => {
        e.stopPropagation();
        try {
            const response = await axios.delete(route('notifications.destroy', notification.id));
            if (response.data.success) {
                setNotifications(prev => prev.filter(n => n.id !== notification.id));
                if (!notification.read) {
                    setUnreadCount(prev => Math.max(0, prev - 1));
                }
            }
        } catch (error) {
            console.error('Error deleting notification:', error);
        }
    };

    const handleNotificationClick = (notification) => {
        if (!notification.read) {
            handleMarkAsRead(notification, { stopPropagation: () => {} });
        }
        if (notification.link) {
            setOpen(false);
            router.visit(notification.link);
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);

        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;

        return date.toLocaleDateString();
    };

    const getNotificationIcon = (type) => {
        const iconClass = "h-4 w-4 flex-shrink-0";
        switch (type) {
            case 'update':
                return <BarChart3 className={iconClass} />;
            case 'milestone':
                return <Target className={iconClass} />;
            case 'issue':
                return <AlertTriangle className={iconClass} />;
            case 'task':
                return <CheckCircle2 className={iconClass} />;
            case 'status_change':
                return <RefreshCw className={iconClass} />;
            default:
                return <Bell className={iconClass} />;
        }
    };

    return (
        <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild>
                <button
                    className="relative p-2 text-gray-700 hover:text-gray-900 focus:outline-none transition-colors"
                    aria-label="Notifications"
                >
                    <Bell className="h-6 w-6" />
                    {unreadCount > 0 && (
                        <span className="absolute top-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                    )}
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-96 max-h-[600px] overflow-y-auto">
                <DropdownMenuLabel className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                        <Bell className="h-4 w-4" />
                        Notifications
                        {unreadCount > 0 && (
                            <span className="px-2 py-0.5 text-xs font-bold bg-red-500 text-white rounded-full">
                                {unreadCount}
                            </span>
                        )}
                    </span>
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleMarkAllAsRead}
                            className="h-6 px-2 text-xs"
                        >
                            <CheckCheck className="h-3 w-3 mr-1" />
                            Mark all read
                        </Button>
                    )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                {loading && notifications.length === 0 ? (
                    <div className="px-2 py-8 text-center text-sm text-gray-500">
                        Loading notifications...
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="px-2 py-8 text-center">
                        <Bell className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">No notifications yet</p>
                    </div>
                ) : (
                    <div className="max-h-[500px] overflow-y-auto">
                        {notifications.map((notification) => (
                            <div
                                key={notification.id}
                                className={cn(
                                    "group px-2 py-2 border-b last:border-b-0 cursor-pointer hover:bg-gray-50 transition-colors",
                                    !notification.read && "bg-blue-50/50"
                                )}
                                onClick={() => handleNotificationClick(notification)}
                            >
                                <div className="flex items-start gap-2">
                                    <div className="flex-shrink-0 mt-0.5 text-gray-600">
                                        {getNotificationIcon(notification.type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1 min-w-0">
                                                <h4 className={cn(
                                                    "font-semibold text-sm mb-0.5 truncate",
                                                    notification.read ? "text-gray-700" : "text-gray-900"
                                                )}>
                                                    {notification.title}
                                                </h4>
                                                <p className={cn(
                                                    "text-xs mb-1 line-clamp-2",
                                                    notification.read ? "text-gray-600" : "text-gray-700"
                                                )}>
                                                    {notification.message}
                                                </p>
                                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                                    <span>{formatDate(notification.created_at)}</span>
                                                    {notification.project && (
                                                        <span className="text-blue-600 truncate">
                                                            {notification.project.project_name}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1 flex-shrink-0">
                                                {!notification.read && (
                                                    <button
                                                        onClick={(e) => handleMarkAsRead(notification, e)}
                                                        className="p-1 rounded hover:bg-gray-200 transition-colors"
                                                        title="Mark as read"
                                                    >
                                                        <Check className="h-3 w-3 text-gray-600" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={(e) => handleDelete(notification, e)}
                                                    className="p-1 rounded hover:bg-red-100 transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="h-3 w-3 text-red-600" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
