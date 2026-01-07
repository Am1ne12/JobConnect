import { Component, OnInit, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { InterviewService } from '../../core/services/interview.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { Interview } from '../../core/models';
import { ConfirmModalComponent } from '../../shared/components/confirm-modal.component';

@Component({
    selector: 'app-interview-list',
    standalone: true,
    imports: [CommonModule, RouterModule, ConfirmModalComponent],
    template: `
        <div class="interviews-container">
            <!-- Hero Header -->
            <div class="interviews-header">
                <div class="header-orb header-orb-1"></div>
                <div class="header-orb header-orb-2"></div>

                <div class="header-badge">
                    <span class="badge-dot"></span>
                    <span>Entretiens en temps réel</span>
                </div>

                <h1>Mes <span class="gradient-text">Entretiens</span></h1>
                <p class="subtitle">Gérez vos entretiens vidéo planifiés</p>

                @if (!loading && interviews.length > 0) {
                    <div class="stats-bar">
                        <div class="stat-item">
                            <span class="stat-number">{{ interviews.length }}</span>
                            <span class="stat-label">Total</span>
                        </div>
                        <div class="stat-divider"></div>
                        <div class="stat-item">
                            <span class="stat-number upcoming">{{ getUpcomingCount() }}</span>
                            <span class="stat-label">À venir</span>
                        </div>
                        <div class="stat-divider"></div>
                        <div class="stat-item">
                            <span class="stat-number completed">{{ getCompletedCount() }}</span>
                            <span class="stat-label">Terminés</span>
                        </div>
                    </div>
                }
            </div>

            <div class="interviews-content">
                @if (loading) {
                    <div class="loading-state">
                        <div class="spinner"></div>
                        <p>Chargement des entretiens...</p>
                    </div>
                } @else if (interviews.length === 0) {
                    <div class="empty-state">
                        <div class="empty-icon">📅</div>
                        <h3>Aucun entretien planifié</h3>
                        <p>Vos entretiens apparaîtront ici une fois programmés.</p>
                        <a [routerLink]="isCompany ? '/company/dashboard' : '/candidate/applications'" class="btn-primary">
                            {{ isCompany ? 'Voir les candidatures' : 'Voir mes candidatures' }}
                        </a>
                    </div>
                } @else {
                    <div class="interviews-grid">
                        @for (interview of interviews; track interview.id; let i = $index) {
                            <div class="interview-card" [style.animation-delay]="(i * 0.08) + 's'">
                                <div class="card-accent" [class]="getStatusAccentClass(interview.status)"></div>
                                
                                <div class="card-header">
                                    <span class="status-badge" [class]="'badge-' + getDisplayStatus(interview).toLowerCase()">
                                        {{ getStatusLabel(getDisplayStatus(interview)) }}
                                    </span>
                                    @if (interview.unreadMessageCount > 0) {
                                        <span class="unread-badge">{{ interview.unreadMessageCount }}</span>
                                    }
                                </div>
                                
                                <div class="card-body">
                                    <h3 class="job-title">{{ interview.jobTitle }}</h3>
                                    <p class="party-name">
                                        <span class="party-icon">{{ isCompany ? '👤' : '🏢' }}</span>
                                        {{ isCompany ? interview.candidateName : interview.companyName }}
                                    </p>
                                    
                                    <div class="schedule-info">
                                        <div class="info-row">
                                            <span class="info-icon">📅</span>
                                            <span>{{ formatDate(interview.scheduledAt) }}</span>
                                        </div>
                                        <div class="info-row">
                                            <span class="info-icon">🕐</span>
                                            <span>{{ formatTime(interview.scheduledAt) }} - {{ formatTime(interview.endsAt) }}</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="card-actions">
                                    @if (canJoin(interview) && isCompany) {
                                        <a [routerLink]="['/interview', interview.id, 'room']" class="btn-join">
                                            Lancer la réunion
                                        </a>
                                    } @else if (canJoin(interview) && !isCompany) {
                                        <a [routerLink]="['/interview', interview.id, 'room']" class="btn-join">
                                            Rejoindre
                                        </a>
                                    } @else if (getDisplayStatus(interview) === 'InProgress' && !isCompany) {
                                        <div class="waiting-host">
                                            <span class="waiting-icon">⏳</span>
                                            <span>En attente de l'entreprise...</span>
                                        </div>
                                    } @else if (interview.status === 'Scheduled') {
                                        <div class="countdown">
                                            <span class="countdown-label">Commence dans</span>
                                            <span class="countdown-time">{{ getTimeUntil(interview.scheduledAt) }}</span>
                                        </div>
                                        <div class="actions-row">
                                            @if (!isCompany) {
                                                <button class="btn-modify" (click)="modifyInterview(interview)">
                                                    ✏️ Modifier
                                                </button>
                                            }
                                            <button class="btn-cancel" (click)="cancelInterview(interview)">
                                                ❌ Annuler
                                            </button>
                                        </div>
                                    } @else if (interview.status === 'Completed') {
                                        <span class="completed-label">✓ Entretien terminé</span>
                                    }
                                </div>
                            </div>
                        }
                    </div>
                }
            </div>
        </div>

        <!-- Cancel Interview Modal -->
        <app-confirm-modal
            #cancelModal
            [title]="'Annuler l\\'entretien'"
            [message]="getCancelMessage()"
            [confirmText]="'Annuler l\\'entretien'"
            [showInput]="true"
            [inputLabel]="'Motif d\\'annulation'"
            [inputPlaceholder]="'Expliquez pourquoi vous annulez cet entretien...'"
            [danger]="true"
            (confirmed)="onCancelConfirmed($event)">
        </app-confirm-modal>
    `,
    styles: [`
        /* Container */
        .interviews-container {
            min-height: 100vh;
            background: var(--bg-secondary);
        }

        /* Header */
        .interviews-header {
            text-align: center;
            padding: 3rem 2rem 2rem;
            position: relative;
            overflow: hidden;
        }

        .header-orb {
            position: absolute;
            border-radius: 50%;
            pointer-events: none;
            animation: float 8s ease-in-out infinite;
        }

        .header-orb-1 {
            top: -60px;
            left: 8%;
            width: 280px;
            height: 280px;
            background: radial-gradient(circle, rgba(99, 102, 241, 0.08) 0%, transparent 60%);
        }

        .header-orb-2 {
            top: -20px;
            right: 8%;
            width: 220px;
            height: 220px;
            background: radial-gradient(circle, rgba(168, 85, 247, 0.06) 0%, transparent 60%);
            animation-delay: 2s;
        }

        @keyframes float {
            0%, 100% { transform: translate(0, 0); }
            50% { transform: translate(12px, -12px); }
        }

        .header-badge {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            background: var(--bg-glass-strong);
            border: 1px solid var(--border-light);
            border-radius: var(--radius-full);
            padding: 0.5rem 1rem;
            font-size: 0.8125rem;
            color: var(--text-secondary);
            margin-bottom: 1.25rem;
        }

        .badge-dot {
            width: 8px;
            height: 8px;
            background: #22c55e;
            border-radius: 50%;
            animation: pulse 2s ease-in-out infinite;
        }

        @keyframes pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.6; transform: scale(1.15); }
        }

        h1 {
            font-size: 2.5rem;
            font-weight: 800;
            color: var(--text-primary);
            margin: 0 0 0.75rem;
            letter-spacing: -0.03em;
        }

        .gradient-text {
            background: linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #ec4899 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        .subtitle {
            color: var(--text-secondary);
            font-size: 1rem;
            margin: 0;
        }

        /* Stats Bar */
        .stats-bar {
            display: inline-flex;
            align-items: center;
            gap: 1.5rem;
            background: var(--bg-glass-strong);
            backdrop-filter: blur(12px);
            border: 1px solid var(--border-light);
            border-radius: var(--radius-full);
            padding: 0.875rem 1.75rem;
            margin-top: 1.5rem;
        }

        .stat-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 0.25rem;
        }

        .stat-number {
            font-size: 1.25rem;
            font-weight: 700;
            color: var(--text-primary);
        }

        .stat-number.upcoming { color: #6366f1; }
        .stat-number.completed { color: #22c55e; }

        .stat-label {
            font-size: 0.75rem;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .stat-divider {
            width: 1px;
            height: 36px;
            background: var(--border-default);
        }

        /* Content */
        .interviews-content {
            max-width: 1100px;
            margin: 0 auto;
            padding: 0 2rem 3rem;
        }

        /* Loading & Empty States */
        .loading-state, .empty-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 400px;
            text-align: center;
            background: var(--bg-primary);
            border-radius: var(--radius-xl);
            border: 1px solid var(--border-light);
        }

        .spinner {
            width: 48px;
            height: 48px;
            border: 3px solid var(--border-default);
            border-top-color: var(--accent);
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
            margin-bottom: 1rem;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }

        .empty-icon {
            font-size: 4rem;
            margin-bottom: 1rem;
        }

        .empty-state h3 {
            font-size: 1.25rem;
            font-weight: 600;
            color: var(--text-primary);
            margin: 0 0 0.5rem;
        }

        .empty-state p {
            color: var(--text-secondary);
            margin: 0 0 2rem;
        }

        /* Grid */
        .interviews-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
            gap: 1.25rem;
        }

        /* Interview Card */
        .interview-card {
            background: var(--bg-primary);
            border-radius: var(--radius-xl);
            border: 1px solid var(--border-light);
            padding: 1.5rem;
            position: relative;
            overflow: hidden;
            transition: all 0.2s;
            animation: fadeInUp 0.5s ease backwards;
        }

        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .interview-card:hover {
            transform: translateY(-4px);
            box-shadow: var(--shadow-xl);
        }

        .card-accent {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
        }

        .card-accent.accent-scheduled { background: linear-gradient(90deg, #6366f1, #a855f7); }
        .card-accent.accent-completed { background: linear-gradient(90deg, #22c55e, #10b981); }
        .card-accent.accent-cancelled { background: linear-gradient(90deg, #ef4444, #dc2626); }
        .card-accent.accent-inprogress { background: linear-gradient(90deg, #f59e0b, #eab308); }

        .card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1rem;
        }

        .status-badge {
            padding: 0.375rem 0.875rem;
            border-radius: var(--radius-full);
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .badge-scheduled {
            background: rgba(99, 102, 241, 0.15);
            color: #6366f1;
        }

        .badge-inwaitingroom, .badge-inprogress {
            background: rgba(245, 158, 11, 0.15);
            color: #f59e0b;
        }

        .badge-completed {
            background: rgba(34, 197, 94, 0.15);
            color: #22c55e;
        }

        .badge-cancelled {
            background: rgba(239, 68, 68, 0.15);
            color: #ef4444;
        }

        .unread-badge {
            background: linear-gradient(135deg, #6366f1, #a855f7);
            color: white;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 0.75rem;
            font-weight: 600;
        }

        .job-title {
            font-size: 1.125rem;
            font-weight: 600;
            color: var(--text-primary);
            margin: 0 0 0.5rem;
        }

        .party-name {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            color: var(--text-secondary);
            font-size: 0.9375rem;
            margin: 0 0 1rem;
        }

        .party-icon {
            font-size: 1rem;
        }

        .schedule-info {
            background: var(--bg-secondary);
            border-radius: var(--radius-lg);
            padding: 1rem;
        }

        .info-row {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            color: var(--text-primary);
            font-size: 0.9375rem;
        }

        .info-row + .info-row {
            margin-top: 0.5rem;
        }

        .info-icon {
            font-size: 1rem;
        }

        .card-actions {
            margin-top: 1.25rem;
            padding-top: 1rem;
            border-top: 1px solid var(--border-light);
        }

        .btn-join {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
            width: 100%;
            background: linear-gradient(135deg, #6366f1, #a855f7);
            color: white;
            padding: 0.875rem 1.5rem;
            border-radius: var(--radius-full);
            font-weight: 600;
            text-decoration: none;
            transition: all 0.2s;
            box-shadow: 0 4px 15px rgba(99, 102, 241, 0.3);
        }

        .btn-join:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 25px rgba(99, 102, 241, 0.4);
        }

        .waiting-host {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.75rem 1.25rem;
            background: rgba(251, 191, 36, 0.15);
            color: #fbbf24;
            border-radius: 10px;
            font-size: 0.9rem;
        }

        .waiting-host .waiting-icon {
            font-size: 1.2rem;
            animation: pulse 2s infinite;
        }

        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }

        .countdown {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 0.25rem;
        }

        .countdown-label {
            font-size: 0.75rem;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .countdown-time {
            font-size: 1rem;
            font-weight: 600;
            color: #6366f1;
        }

        .completed-label {
            color: #22c55e;
            font-weight: 500;
            display: flex;
            justify-content: center;
        }

        .cancelled-label {
            color: #ef4444;
            font-weight: 500;
            display: flex;
            justify-content: center;
        }

        .btn-cancel {
            display: inline-flex;
            align-items: center;
            gap: 0.375rem;
            padding: 0.625rem 1.25rem;
            border-radius: var(--radius-lg);
            border: none;
            background: linear-gradient(135deg, #ef4444, #dc2626);
            color: white;
            font-size: 0.8125rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3);
        }

        .btn-cancel:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
        }

        .actions-row {
            display: flex;
            gap: 0.75rem;
            margin-top: 1rem;
            justify-content: center;
        }

        .btn-modify {
            display: inline-flex;
            align-items: center;
            gap: 0.375rem;
            padding: 0.625rem 1.25rem;
            border-radius: var(--radius-lg);
            border: none;
            background: linear-gradient(135deg, #6366f1, #a855f7);
            color: white;
            font-size: 0.8125rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
        }

        .btn-modify:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
        }

        .btn-primary {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            background: linear-gradient(135deg, #6366f1, #a855f7);
            color: white;
            padding: 0.875rem 1.75rem;
            border-radius: var(--radius-full);
            font-weight: 600;
            text-decoration: none;
            transition: all 0.2s;
            box-shadow: 0 4px 15px rgba(99, 102, 241, 0.3);
        }

        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 25px rgba(99, 102, 241, 0.4);
        }

        /* Responsive */
        @media (max-width: 768px) {
            .interviews-header h1 {
                font-size: 1.75rem;
            }

            .interviews-content {
                padding: 0 1rem 2rem;
            }

            .interviews-grid {
                grid-template-columns: 1fr;
            }

            .stats-bar {
                gap: 1rem;
                padding: 0.75rem 1.25rem;
            }
        }
    `]
})
export class InterviewListComponent implements OnInit {
    private interviewService = inject(InterviewService);
    private authService = inject(AuthService);
    private router = inject(Router);

    interviews: Interview[] = [];
    loading = true;
    isCompany = false;

    ngOnInit() {
        this.isCompany = this.authService.isCompany();
        this.loadInterviews();
    }

    loadInterviews() {
        this.loading = true;
        this.interviewService.getInterviews().subscribe({
            next: (interviews) => {
                // Filter out rescheduled interviews (they are just historical records)
                this.interviews = interviews.filter(i => i.status !== 'Rescheduled');
                this.loading = false;
            },
            error: (err) => {
                console.error('Failed to load interviews:', err);
                this.loading = false;
            }
        });
    }

    getUpcomingCount(): number {
        return this.interviews.filter(i =>
            i.status === 'Scheduled' || i.status === 'InWaitingRoom' || i.status === 'InProgress'
        ).length;
    }

    getCompletedCount(): number {
        return this.interviews.filter(i => i.status === 'Completed').length;
    }

    canJoin(interview: Interview): boolean {
        const now = new Date();
        const scheduledAt = new Date(interview.scheduledAt);
        const fiveMinutesBefore = new Date(scheduledAt.getTime() - 5 * 60 * 1000);
        const endsAt = new Date(interview.endsAt);

        const timeValid = now >= fiveMinutesBefore && now <= endsAt;
        const statusValid = interview.status === 'Scheduled' ||
            interview.status === 'InWaitingRoom' ||
            interview.status === 'InProgress';

        // Company can always join during valid time
        if (this.isCompany) {
            return timeValid && statusValid;
        }

        // Candidate can only join if company has already joined
        return timeValid && statusValid && !!interview.companyJoinedAt;
    }

    getDisplayStatus(interview: Interview): string {
        // If scheduled and current time is past scheduled time, show as InProgress
        if (interview.status === 'Scheduled') {
            const now = new Date();
            const scheduledAt = new Date(interview.scheduledAt);
            if (now >= scheduledAt) {
                return 'InProgress';
            }
        }
        return interview.status;
    }

    getStatusLabel(status: string): string {
        return this.interviewService.getStatusLabel(status);
    }

    getStatusAccentClass(status: string): string {
        const map: Record<string, string> = {
            'Scheduled': 'accent-scheduled',
            'InWaitingRoom': 'accent-inprogress',
            'InProgress': 'accent-inprogress',
            'Completed': 'accent-completed',
            'Cancelled': 'accent-cancelled'
        };
        return map[status] || 'accent-scheduled';
    }

    getTimeUntil(date: Date | string): string {
        const now = new Date();
        const target = new Date(date);
        const diff = target.getTime() - now.getTime();

        if (diff < 0) return 'Maintenant';

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        if (days > 0) return `${days}j ${hours}h`;
        if (hours > 0) return `${hours}h ${minutes}min`;
        return `${minutes} min`;
    }

    @ViewChild('cancelModal') cancelModal!: ConfirmModalComponent;
    selectedInterview: Interview | null = null;
    private notificationService = inject(NotificationService);

    getCancelMessage(): string {
        const jobTitle = this.selectedInterview?.jobTitle || 'cet entretien';
        return `Vous êtes sur le point d'annuler l'entretien pour "${jobTitle}". Cette action est irréversible.`;
    }

    cancelInterview(interview: Interview) {
        this.selectedInterview = interview;
        this.cancelModal.open();
    }

    onCancelConfirmed(reason: string) {
        if (!this.selectedInterview) return;

        const interview = this.selectedInterview;
        this.interviewService.cancelInterview(interview.id, { reason: reason.trim() }).subscribe({
            next: () => {
                // Remove the interview from the list since it's deleted from DB
                this.interviews = this.interviews.filter(i => i.id !== interview.id);
                this.notificationService.success(`Entretien annulé avec succès`);
            },
            error: (err) => {
                console.error('Error cancelling interview:', err);
                this.notificationService.error('Erreur lors de l\'annulation de l\'entretien');
            }
        });
        this.selectedInterview = null;
    }

    modifyInterview(interview: Interview) {
        // Navigate to booking page with reschedule parameter
        this.router.navigate(['/candidate/book-interview', interview.applicationId], {
            queryParams: {
                companyId: interview.companyId,
                rescheduleId: interview.id
            }
        });
    }

    formatDate(date: Date | string): string {
        const d = new Date(date);
        return d.toLocaleDateString('fr-FR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            timeZone: 'UTC'
        });
    }

    formatTime(date: Date | string): string {
        const d = new Date(date);
        return d.toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'UTC'
        });
    }
}
