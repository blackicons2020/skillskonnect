
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { User, View, AppNotification } from '../types';
import { SparklesIcon, BellIcon } from './icons';
import { apiService } from '../services/apiService';

interface HeaderProps {
  user: User | null;
  onNavigate: (view: View) => void;
  onNavigateToAuth: (tab: 'login' | 'signup') => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({ user, onNavigate, onLogout, onNavigateToAuth }) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);
  const unreadCount = notifications.filter(n => !n.isRead).length;

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const data = await apiService.getNotifications();
      setNotifications(data);
    } catch {
      // Silently fail — notifications aren't critical
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();
    // Poll every 30 seconds for new notifications
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await apiService.markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch { /* ignore */ }
  };

  const handleNotificationClick = async (notification: AppNotification) => {
    if (!notification.isRead) {
      try {
        await apiService.markNotificationRead(notification.id);
        setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, isRead: true } : n));
      } catch { /* ignore */ }
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'subscription': return '💎';
      case 'booking': return '📅';
      case 'verification': return '✅';
      case 'review': return '⭐';
      case 'job': return '💼';
      default: return '🔔';
    }
  };

  return (
    <header className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div 
            className="flex items-center gap-2 text-2xl font-bold text-primary cursor-pointer"
            onClick={() => onNavigate('landing')}
          >
            <SparklesIcon className="w-8 h-8" />
            <span>Skills Konnect</span>
          </div>
          <div className="flex items-center space-x-3 sm:space-x-4">
            {user ? (
              <>
                {user.isAdmin && (
                   <button
                    onClick={() => onNavigate('adminDashboard')}
                    className="hidden sm:block text-red-600 hover:text-red-800 font-bold transition-colors"
                  >
                    Admin Dashboard
                  </button>
                )}
                {!user.isAdmin && (
                  <button
                    onClick={() => onNavigate(user.role === 'client' ? 'clientDashboard' : 'cleanerDashboard')}
                    className="hidden sm:block text-gray-700 hover:text-primary font-medium transition-colors"
                  >
                    Dashboard
                  </button>
                )}
                {/* Notification Bell */}
                <div className="relative" ref={bellRef}>
                  <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="relative p-2 text-gray-600 hover:text-primary transition-colors"
                    aria-label="Notifications"
                  >
                    <BellIcon className="w-6 h-6" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>
                  {showNotifications && (
                    <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 max-h-[28rem] flex flex-col">
                      <div className="flex items-center justify-between px-4 py-3 border-b">
                        <h3 className="font-bold text-gray-900">Notifications</h3>
                        {unreadCount > 0 && (
                          <button onClick={handleMarkAllRead} className="text-xs text-primary hover:text-secondary font-medium">
                            Mark all as read
                          </button>
                        )}
                      </div>
                      <div className="overflow-y-auto flex-1">
                        {notifications.length === 0 ? (
                          <div className="p-6 text-center text-gray-400 text-sm">No notifications yet</div>
                        ) : (
                          notifications.map(n => (
                            <div
                              key={n.id}
                              onClick={() => handleNotificationClick(n)}
                              className={`px-4 py-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${!n.isRead ? 'bg-blue-50/50' : ''}`}
                            >
                              <div className="flex items-start gap-3">
                                <span className="text-lg mt-0.5">{getNotificationIcon(n.type)}</span>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between">
                                    <p className={`text-sm font-semibold truncate ${!n.isRead ? 'text-gray-900' : 'text-gray-600'}`}>{n.title}</p>
                                    {!n.isRead && <span className="w-2 h-2 bg-primary rounded-full flex-shrink-0 ml-2"></span>}
                                  </div>
                                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                                  <p className="text-[10px] text-gray-400 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <button
                  onClick={onLogout}
                  className="bg-primary text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-sm font-semibold hover:bg-secondary transition-colors"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                 <button
                    onClick={() => onNavigateToAuth('login')}
                    className="text-gray-700 hover:text-primary font-medium transition-colors"
                  >
                    Login
                  </button>
                  <button
                    onClick={() => onNavigateToAuth('signup')}
                    className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-secondary transition-colors"
                  >
                    Sign Up
                  </button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
