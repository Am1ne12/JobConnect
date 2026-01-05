import { Injectable, signal } from '@angular/core';

export interface Notification {
    id: number;
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
    duration?: number;
}

@Injectable({
    providedIn: 'root'
})
export class NotificationService {
    private idCounter = 0;
    notifications = signal<Notification[]>([]);

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
}
