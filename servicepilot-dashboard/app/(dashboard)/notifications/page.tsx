'use client';
// app/(dashboard)/notifications/page.tsx
// Notification centre — list all notifications, mark read, mark all read.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api/client';

interface NotificationItem {
  id: string;
  title: string;
  message?: string;
  type?: string;
  isRead: boolean;
  createdAt: string;
}

const TYPE_CFG: Record<string, { cls: string; icon: string }> = {
  job:         { cls: 'bg-blue-100 text-blue-700',   icon: '🔧' },
  leave:       { cls: 'bg-purple-100 text-purple-700', icon: '📋' },
  attendance:  { cls: 'bg-teal-100 text-teal-700',   icon: '🕐' },
  alert:       { cls: 'bg-red-100 text-red-700',     icon: '⚠️' },
  system:      { cls: 'bg-gray-100 text-gray-600',   icon: '⚙️' },
};

function useNotifications(page = 1) {
  return useQuery({
    queryKey: ['notifications', page],
    queryFn: async () => {
      const r = await apiClient.get('/notifications', { params: { page, pageSize: 20 } });
      return r.data.data as { items: NotificationItem[]; totalCount: number; page: number };
    },
    staleTime: 15_000,
  });
}

function useUnreadCount() {
  return useQuery({
    queryKey: ['notifications-unread'],
    queryFn: async () => {
      const r = await apiClient.get('/notifications/unread-count');
      return r.data.data as number;
    },
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}

export default function NotificationsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useNotifications();
  const { data: unreadCount = 0 } = useUnreadCount();

  const markRead = useMutation({
    mutationFn: (id: string) => apiClient.put(`/notifications/${id}/read`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['notifications-unread'] });
    },
  });

  const markAllRead = useMutation({
    mutationFn: () => apiClient.put('/notifications/read-all'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['notifications-unread'] });
    },
  });

  const notifications = data?.items ?? [];

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-[22px] font-bold tracking-tight text-gray-900">Notifications</h1>
            {unreadCount > 0 && (
              <span className="rounded-full bg-red-600 px-2 py-px text-[11px] font-bold text-white">
                {unreadCount} unread
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[13px] text-gray-500">All alerts and system messages for your company</p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
            className="flex h-9 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 text-[13px] font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-60">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
            Mark all as read
          </button>
        )}
      </div>

      {/* Notification list */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {isLoading && (
          <div className="divide-y divide-gray-100">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="flex items-start gap-4 px-5 py-4">
                <div className="h-9 w-9 rounded-xl bg-gray-100 animate-pulse flex-shrink-0"/>
                <div className="flex-1 space-y-2 pt-0.5">
                  <div className="h-4 w-48 rounded bg-gray-100 animate-pulse"/>
                  <div className="h-3 w-72 rounded bg-gray-100 animate-pulse"/>
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && notifications.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="mb-3 text-[40px]">🔔</div>
            <div className="text-[14px] font-medium text-gray-600">You're all caught up!</div>
            <div className="mt-1 text-[13px] text-gray-400">No notifications yet</div>
          </div>
        )}

        {!isLoading && notifications.length > 0 && (
          <div className="divide-y divide-gray-50">
            {notifications.map(n => {
              const type = (n.type ?? 'system').toLowerCase();
              const cfg = TYPE_CFG[type] ?? TYPE_CFG.system;

              return (
                <div
                  key={n.id}
                  className={`flex items-start gap-4 px-5 py-4 transition-colors ${n.isRead ? 'bg-white' : 'bg-blue-50/30'}`}>
                  {/* Icon */}
                  <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-[16px] ${cfg.cls}`}>
                    {cfg.icon}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className={`text-[13px] font-medium ${n.isRead ? 'text-gray-700' : 'text-gray-900'}`}>
                        {n.title}
                        {!n.isRead && (
                          <span className="ml-2 inline-block h-2 w-2 rounded-full bg-btn"/>
                        )}
                      </div>
                      <div className="flex-shrink-0 text-[11px] text-gray-400">
                        {new Date(n.createdAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
                      </div>
                    </div>
                    {n.message && (
                      <p className="mt-0.5 text-[12px] text-gray-500 line-clamp-2">{n.message}</p>
                    )}
                    {n.type && (
                      <span className={`mt-1.5 inline-block rounded-full px-2 py-px text-[10px] font-medium ${cfg.cls}`}>
                        {n.type}
                      </span>
                    )}
                  </div>

                  {/* Mark read button */}
                  {!n.isRead && (
                    <button
                      onClick={() => markRead.mutate(n.id)}
                      disabled={markRead.isPending}
                      className="flex-shrink-0 rounded-md px-2.5 py-1 text-[11px] font-medium text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-50"
                      title="Mark as read">
                      Mark read
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination footer */}
        {(data?.totalCount ?? 0) > 20 && (
          <div className="border-t border-gray-100 px-5 py-3 text-center text-[12px] text-gray-400">
            Showing {notifications.length} of {data?.totalCount} notifications
          </div>
        )}
      </div>
    </div>
  );
}
