import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ConfigService } from './config.service';

export interface Notification {
    id: number;
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
    duration?: number;
}

export interface AppNotification {
    id: number;
    type: string;
    title: string;
    message: string;
    link?: string;
    isRead: boolean;
    createdAt: Date;
}

@Injectable({
    providedIn: 'root'
})
export class NotificationService {
    private http = inject(HttpClient);
    private configService = inject(ConfigService);

    private get API_URL() { return `${this.configService.apiUrl}/notifications`; }

    private idCounter = 0;

    // Toast notifications (temporary)
    notifications = signal<Notification[]>([]);

    // App notifications (persistent, from backend)
    appNotifications = signal<AppNotification[]>([]);

    unreadCount = computed(() =>
        this.appNotifications().filter(n => !n.isRead).length
    );

    // Load notifications from backend
    loadNotifications() {
        this.http.get<AppNotification[]>(this.API_URL).subscribe({
            next: (notifications) => {
                this.appNotifications.set(notifications);
            },
            error: (err) => {
                console.error('Failed to load notifications:', err);
            }
        });
    }

    // Toast methods
    show(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info', duration = 4000) {
        const notification: Notification = {
            id: ++this.idCounter,
            type,
            message,
            duration
        };

        this.notifications.update(n => [...n, notification]);

        if (duration > 0) {
            setTimeout(() => this.dismiss(notification.id), duration);
        }
    }

    success(message: string, duration = 4000) {
        this.show(message, 'success', duration);
    }

    error(message: string, duration = 5000) {
        this.show(message, 'error', duration);
    }

    warning(message: string, duration = 4000) {
        this.show(message, 'warning', duration);
    }

    info(message: string, duration = 4000) {
        this.show(message, 'info', duration);
    }

    dismiss(id: number) {
        this.notifications.update(n => n.filter(notification => notification.id !== id));
    }

    dismissAll() {
        this.notifications.set([]);
    }

    // App notification methods (backend persistence)
    markAsRead(id: number) {
        this.http.put(`${this.API_URL}/${id}/read`, {}).subscribe({
            next: () => {
                this.appNotifications.update(n =>
                    n.map(notif => notif.id === id ? { ...notif, isRead: true } : notif)
                );
            }
        });
    }

    markAllAsRead() {
        this.http.put(`${this.API_URL}/read-all`, {}).subscribe({
            next: () => {
                this.appNotifications.update(n =>
                    n.map(notif => ({ ...notif, isRead: true }))
                );
            }
        });
    }

    deleteNotification(id: number) {
        this.http.delete(`${this.API_URL}/${id}`).subscribe({
            next: () => {
                this.appNotifications.update(n => n.filter(notif => notif.id !== id));
            }
        });
    }

    deleteAllNotifications() {
        this.http.delete(this.API_URL).subscribe({
            next: () => {
                this.appNotifications.set([]);
            }
        });
    }

    clearAppNotifications() {
        this.appNotifications.set([]);
    }
}
