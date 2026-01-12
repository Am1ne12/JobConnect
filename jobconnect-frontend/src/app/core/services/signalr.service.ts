import { Injectable, inject, signal, effect, NgZone } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { ConfigService } from './config.service';
import { AuthService } from './auth.service';

export interface NotificationMessage {
    id: number;
    type: string;
    title: string;
    message: string;
    link: string | null;
    createdAt: Date;
}

export interface InterviewUpdateMessage {
    type: 'scheduled' | 'cancelled' | 'rescheduled' | 'started' | 'completed';
    interviewId: number;
    applicationId: number | null;
    jobTitle: string | null;
    scheduledAt: Date | null;
    message: string | null;
}

@Injectable({
    providedIn: 'root'
})
export class SignalRService {
    private hubConnection: signalR.HubConnection | null = null;
    private configService = inject(ConfigService);
    private authService = inject(AuthService);
    private ngZone = inject(NgZone);

    // Signals for real-time state
    isConnected = signal(false);
    lastNotification = signal<NotificationMessage | null>(null);
    lastInterviewUpdate = signal<InterviewUpdateMessage | null>(null);

    // Callbacks for components to subscribe to
    private notificationCallbacks: ((notification: NotificationMessage) => void)[] = [];
    private interviewUpdateCallbacks: ((update: InterviewUpdateMessage) => void)[] = [];

    constructor() {
        // Auto-connect/disconnect based on authentication state using effect
        effect(() => {
            const isAuth = this.authService.isAuthenticated();
            if (isAuth) {
                this.connect();
            } else {
                this.disconnect();
            }
        });
    }

    /**
     * Connect to the SignalR hub
     */
    async connect(): Promise<void> {
        console.log('SignalR: connect() called');

        if (this.hubConnection?.state === signalR.HubConnectionState.Connected) {
            console.log('SignalR already connected');
            return;
        }

        const token = this.authService.getToken();
        if (!token) {
            console.log('SignalR: No token available, skipping connection');
            return;
        }

        // Build hub URL with JWT token
        const hubUrl = `${this.configService.apiUrl.replace('/api', '')}/hubs/notifications`;
        console.log('SignalR: Connecting to', hubUrl);

        this.hubConnection = new signalR.HubConnectionBuilder()
            .withUrl(hubUrl, {
                accessTokenFactory: () => token
            })
            .withAutomaticReconnect([0, 2000, 5000, 10000, 30000]) // Retry intervals
            .configureLogging(signalR.LogLevel.Information)
            .build();

        // Set up event handlers
        this.setupEventHandlers();

        try {
            await this.hubConnection.start();
            console.log('SignalR connected successfully! State:', this.hubConnection.state);
            this.isConnected.set(true);
        } catch (error) {
            console.error('SignalR connection failed:', error);
            this.isConnected.set(false);
        }
    }

    /**
     * Disconnect from the SignalR hub
     */
    async disconnect(): Promise<void> {
        if (this.hubConnection) {
            await this.hubConnection.stop();
            this.hubConnection = null;
            this.isConnected.set(false);
            console.log('SignalR disconnected');
        }
    }

    /**
     * Set up event handlers for SignalR messages
     */
    private setupEventHandlers(): void {
        if (!this.hubConnection) return;

        // Handle notifications
        this.hubConnection.on('ReceiveNotification', (notification: NotificationMessage) => {
            console.log('SignalR: Received notification', notification);
            this.ngZone.run(() => {
                this.lastNotification.set(notification);
                this.notificationCallbacks.forEach(cb => cb(notification));
            });
        });

        // Handle interview updates
        this.hubConnection.on('InterviewUpdated', (update: InterviewUpdateMessage) => {
            console.log('SignalR: Interview updated', update);
            this.ngZone.run(() => {
                this.lastInterviewUpdate.set(update);
                this.interviewUpdateCallbacks.forEach(cb => cb(update));
            });
        });

        // Handle reconnection
        this.hubConnection.onreconnecting(error => {
            console.log('SignalR reconnecting...', error);
            this.ngZone.run(() => {
                this.isConnected.set(false);
            });
        });

        this.hubConnection.onreconnected(connectionId => {
            console.log('SignalR reconnected:', connectionId);
            this.ngZone.run(() => {
                this.isConnected.set(true);
            });
        });

        this.hubConnection.onclose(error => {
            console.log('SignalR connection closed', error);
            this.ngZone.run(() => {
                this.isConnected.set(false);
            });
        });
    }

    /**
     * Subscribe to real-time notifications
     */
    onNotification(callback: (notification: NotificationMessage) => void): () => void {
        this.notificationCallbacks.push(callback);
        return () => {
            const index = this.notificationCallbacks.indexOf(callback);
            if (index > -1) this.notificationCallbacks.splice(index, 1);
        };
    }

    /**
     * Subscribe to interview updates
     */
    onInterviewUpdate(callback: (update: InterviewUpdateMessage) => void): () => void {
        this.interviewUpdateCallbacks.push(callback);
        return () => {
            const index = this.interviewUpdateCallbacks.indexOf(callback);
            if (index > -1) this.interviewUpdateCallbacks.splice(index, 1);
        };
    }
}
