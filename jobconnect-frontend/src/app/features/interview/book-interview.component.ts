import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { InterviewService } from '../../core/services/interview.service';
import { AuthService } from '../../core/services/auth.service';
import { AvailableSlot } from '../../core/models';

@Component({
    selector: 'app-book-interview',
    standalone: true,
    imports: [CommonModule, RouterModule],
    template: `
        <div class="booking-container">
            <!-- Hero Header -->
            <div class="booking-header">
                <div class="header-orb header-orb-1"></div>
                <div class="header-orb header-orb-2"></div>
                
                <a routerLink="/candidate/applications" class="back-link">
                    <span class="back-icon">←</span> Retour aux candidatures
                </a>
                
                <h1>Planifier un <span class="gradient-text">entretien</span></h1>
                <p class="subtitle">Sélectionnez un créneau d'1h30 pour votre entretien vidéo</p>
            </div>

            <div class="booking-content">
                @if (loading()) {
                    <div class="loading-state">
                        <div class="spinner"></div>
                        <p>Chargement des créneaux disponibles...</p>
                    </div>
                } @else if (error()) {
                    <div class="error-state">
                        <div class="error-icon">⚠️</div>
                        <h3>Une erreur est survenue</h3>
                        <p>{{ errorMessage() }}</p>
                        <a routerLink="/candidate/applications" class="btn-primary">Retour</a>
                    </div>
                } @else if (confirmed()) {
                    <div class="success-state">
                        <div class="success-icon">🎉</div>
                        <h2>Entretien confirmé !</h2>
                        <p class="success-text">Votre entretien a été planifié avec succès</p>
                        <div class="confirmed-card">
                            <div class="confirmed-date">
                                <span class="date-icon">📅</span>
                                {{ formatDate(selectedSlot()!) }}
                            </div>
                            <div class="confirmed-time">
                                <span class="time-icon">🕐</span>
                                {{ formatTime(selectedSlot()?.startTime!) }} - {{ formatTime(selectedSlot()?.endTime!) }}
                            </div>
                        </div>
                        <div class="success-actions">
                            <a routerLink="/interviews" class="btn-primary">
                                📹 Voir mes entretiens
                            </a>
                            <a routerLink="/candidate/applications" class="btn-secondary">
                                Retour aux candidatures
                            </a>
                        </div>
                    </div>
                } @else {
                    <!-- Week Navigation -->
                    <div class="week-nav">
                        <button 
                            (click)="previousWeek()" 
                            [disabled]="weekOffset() === 0" 
                            class="nav-btn nav-prev"
                        >
                            ← Semaine précédente
                        </button>
                        <div class="week-label">{{ getWeekLabel() }}</div>
                        <button (click)="nextWeek()" class="nav-btn nav-next">
                            Semaine suivante →
                        </button>
                    </div>

                    <!-- Calendar Grid -->
                    <div class="calendar-grid">
                        @for (day of weekDays(); track day.date; let i = $index) {
                            <div class="day-column" [style.animation-delay]="(i * 0.08) + 's'">
                                <div class="day-header">
                                    <span class="day-name">{{ day.name }}</span>
                                    <span class="day-date">{{ day.dateLabel }}</span>
                                </div>
                                <div class="slots-list">
                                    @for (slot of day.slots; track slot.startTime) {
                                        <button 
                                            class="slot-btn"
                                            [class.selected]="isSelected(slot)"
                                            (click)="selectSlot(slot)"
                                        >
                                            <span class="slot-time">{{ formatTime(slot.startTime) }}</span>
                                            <span class="slot-check">✓</span>
                                        </button>
                                    } @empty {
                                        <div class="no-slots">
                                            <span class="no-slots-icon">📭</span>
                                            <span>Aucun créneau</span>
                                        </div>
                                    }
                                </div>
                            </div>
                        }
                    </div>

                    <!-- Confirmation Bar -->
                    @if (selectedSlot()) {
                        <div class="confirmation-bar">
                            <div class="selected-info">
                                <span class="selected-label">Créneau sélectionné</span>
                                <span class="selected-datetime">
                                    {{ formatDate(selectedSlot()!) }} à {{ formatTime(selectedSlot()?.startTime!) }}
                                </span>
                            </div>
                            <button 
                                (click)="confirmBooking()" 
                                class="btn-confirm" 
                                [disabled]="booking()"
                            >
                                @if (booking()) {
                                    <span class="btn-spinner"></span> Confirmation...
                                } @else {
                                    ✅ Confirmer l'entretien
                                }
                            </button>
                        </div>
                    }
                }
            </div>
        </div>
    `,
    styles: [`
        /* Container & Layout */
        .booking-container {
            min-height: 100vh;
            background: var(--bg-secondary);
        }

        /* Header */
        .booking-header {
            text-align: center;
            padding: 3rem 2rem 2rem;
            position: relative;
            overflow: hidden;
            background: var(--bg-secondary);
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

        .back-link {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            color: var(--text-secondary);
            text-decoration: none;
            font-size: 0.875rem;
            margin-bottom: 1.5rem;
            transition: color 0.2s;
        }

        .back-link:hover {
            color: var(--accent);
        }

        .back-icon {
            font-size: 1.25rem;
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
            max-width: 450px;
            margin: 0 auto;
        }

        /* Content */
        .booking-content {
            max-width: 1100px;
            margin: 0 auto;
            padding: 0 2rem 3rem;
        }

        /* Loading State */
        .loading-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 400px;
            color: var(--text-secondary);
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

        /* Error & Success States */
        .error-state, .success-state {
            text-align: center;
            padding: 4rem 2rem;
            background: var(--bg-primary);
            border-radius: var(--radius-xl);
            border: 1px solid var(--border-light);
            max-width: 500px;
            margin: 0 auto;
        }

        .error-icon, .success-icon {
            font-size: 4rem;
            margin-bottom: 1rem;
        }

        .error-state h3, .success-state h2 {
            font-size: 1.5rem;
            font-weight: 700;
            color: var(--text-primary);
            margin: 0 0 0.5rem;
        }

        .success-text {
            color: var(--text-secondary);
            margin-bottom: 2rem;
        }

        .confirmed-card {
            background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(168, 85, 247, 0.1));
            border: 1px solid var(--border-light);
            border-radius: var(--radius-lg);
            padding: 1.5rem;
            margin-bottom: 2rem;
        }

        .confirmed-date, .confirmed-time {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.75rem;
            font-size: 1rem;
            color: var(--text-primary);
            font-weight: 500;
        }

        .confirmed-date {
            margin-bottom: 0.75rem;
            font-size: 1.125rem;
        }

        .date-icon, .time-icon {
            font-size: 1.25rem;
        }

        .success-actions {
            display: flex;
            gap: 1rem;
            justify-content: center;
            flex-wrap: wrap;
        }

        /* Week Navigation */
        .week-nav {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1.5rem;
            padding: 1rem 1.25rem;
            background: var(--bg-primary);
            border-radius: var(--radius-xl);
            border: 1px solid var(--border-light);
            gap: 1rem;
        }

        .nav-btn {
            padding: 0.625rem 1rem;
            border-radius: var(--radius-lg);
            border: 1px solid var(--border-light);
            background: var(--bg-secondary);
            color: var(--text-secondary);
            cursor: pointer;
            transition: all 0.2s;
            font-weight: 500;
            font-size: 0.875rem;
        }

        .nav-btn:hover:not(:disabled) {
            background: linear-gradient(135deg, #6366f1, #a855f7);
            color: white;
            border-color: transparent;
        }

        .nav-btn:disabled {
            opacity: 0.4;
            cursor: not-allowed;
        }

        .week-label {
            font-weight: 600;
            font-size: 1rem;
            color: var(--text-primary);
        }

        /* Calendar Grid */
        .calendar-grid {
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 1rem;
            margin-bottom: 1.5rem;
        }

        .day-column {
            background: var(--bg-primary);
            border-radius: var(--radius-xl);
            border: 1px solid var(--border-light);
            overflow: hidden;
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

        .day-header {
            padding: 1rem;
            text-align: center;
            background: linear-gradient(135deg, #6366f1, #a855f7);
            color: white;
        }

        .day-name {
            display: block;
            font-weight: 600;
            font-size: 0.9375rem;
        }

        .day-date {
            font-size: 0.8125rem;
            opacity: 0.9;
        }

        .slots-list {
            padding: 0.75rem;
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
            max-height: 320px;
            overflow-y: auto;
            min-height: 150px;
        }

        .slot-btn {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0.75rem 1rem;
            border-radius: var(--radius-md);
            border: 1px solid var(--border-light);
            background: var(--bg-secondary);
            cursor: pointer;
            transition: all 0.2s;
            font-weight: 500;
            color: var(--text-primary);
        }

        .slot-check {
            opacity: 0;
            color: white;
            transition: opacity 0.2s;
        }

        .slot-btn:hover {
            border-color: var(--accent);
            background: rgba(99, 102, 241, 0.08);
        }

        .slot-btn.selected {
            background: linear-gradient(135deg, #10b981, #34d399);
            color: white;
            border-color: transparent;
        }

        .slot-btn.selected .slot-check {
            opacity: 1;
        }

        .no-slots {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
            padding: 2rem 1rem;
            color: var(--text-muted);
            font-size: 0.8125rem;
        }

        .no-slots-icon {
            font-size: 1.5rem;
        }

        /* Confirmation Bar */
        .confirmation-bar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 1.25rem 1.5rem;
            background: var(--bg-primary);
            border-radius: var(--radius-xl);
            border: 2px solid #10b981;
            box-shadow: 0 4px 20px rgba(16, 185, 129, 0.15);
            animation: fadeInUp 0.3s ease;
        }

        .selected-info {
            display: flex;
            flex-direction: column;
            gap: 0.25rem;
        }

        .selected-label {
            font-size: 0.75rem;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .selected-datetime {
            font-weight: 600;
            color: var(--text-primary);
            font-size: 1rem;
        }

        .btn-confirm {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            background: linear-gradient(135deg, #10b981, #059669);
            color: white;
            border: none;
            padding: 0.875rem 1.75rem;
            border-radius: var(--radius-full);
            font-weight: 600;
            font-size: 0.9375rem;
            cursor: pointer;
            transition: all 0.2s;
            box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
        }

        .btn-confirm:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 6px 25px rgba(16, 185, 129, 0.4);
        }

        .btn-confirm:disabled {
            opacity: 0.7;
            cursor: not-allowed;
        }

        .btn-spinner {
            width: 16px;
            height: 16px;
            border: 2px solid rgba(255,255,255,0.3);
            border-top-color: white;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
        }

        /* Buttons */
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

        .btn-secondary {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            background: var(--bg-secondary);
            color: var(--text-primary);
            padding: 0.875rem 1.75rem;
            border-radius: var(--radius-full);
            font-weight: 600;
            text-decoration: none;
            border: 1px solid var(--border-light);
            transition: all 0.2s;
        }

        .btn-secondary:hover {
            border-color: var(--accent);
            background: rgba(99, 102, 241, 0.08);
        }

        /* Responsive */
        @media (max-width: 900px) {
            .calendar-grid {
                grid-template-columns: repeat(3, 1fr);
            }
        }

        @media (max-width: 600px) {
            .booking-header h1 {
                font-size: 1.75rem;
            }

            .booking-content {
                padding: 0 1rem 2rem;
            }

            .calendar-grid {
                grid-template-columns: 1fr 1fr;
                gap: 0.75rem;
            }

            .week-nav {
                flex-direction: column;
                text-align: center;
            }

            .nav-btn {
                width: 100%;
            }

            .confirmation-bar {
                flex-direction: column;
                gap: 1rem;
                text-align: center;
            }

            .selected-info {
                align-items: center;
            }

            .success-actions {
                flex-direction: column;
            }

            .btn-primary, .btn-secondary {
                width: 100%;
                justify-content: center;
            }
        }
    `]
})
export class BookInterviewComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private interviewService = inject(InterviewService);
    private authService = inject(AuthService);

    loading = signal(true);
    error = signal(false);
    errorMessage = signal('');
    booking = signal(false);
    confirmed = signal(false);

    applicationId = signal(0);
    companyId = signal(0);
    rescheduleId = signal<number | null>(null);
    slots = signal<AvailableSlot[]>([]);
    selectedSlot = signal<AvailableSlot | null>(null);
    weekOffset = signal(0);

    weekDays = signal<{ name: string, date: Date, dateLabel: string, slots: AvailableSlot[] }[]>([]);

    ngOnInit() {
        this.applicationId.set(Number(this.route.snapshot.paramMap.get('applicationId')));
        this.companyId.set(Number(this.route.snapshot.queryParamMap.get('companyId')));

        // Check for reschedule mode
        const rescheduleIdParam = this.route.snapshot.queryParamMap.get('rescheduleId');
        if (rescheduleIdParam) {
            this.rescheduleId.set(Number(rescheduleIdParam));
        }

        if (!this.applicationId() || !this.companyId()) {
            this.error.set(true);
            this.errorMessage.set('Paramètres manquants');
            this.loading.set(false);
            return;
        }

        this.loadSlots();
    }

    loadSlots() {
        this.loading.set(true);
        const startDate = this.getWeekStartDate();

        this.interviewService.getAvailableSlots(this.companyId(), startDate, 5).subscribe({
            next: (slots) => {
                this.slots.set(slots);
                this.buildWeekDays(startDate, slots);
                this.loading.set(false);
            },
            error: () => {
                this.error.set(true);
                this.errorMessage.set('Impossible de charger les créneaux');
                this.loading.set(false);
            }
        });
    }

    getWeekStartDate(): Date {
        const now = new Date();
        const dayOfWeek = now.getDay();
        const daysToMonday = dayOfWeek === 0 ? 1 : (dayOfWeek === 1 ? 0 : 8 - dayOfWeek);
        const monday = new Date(now);
        monday.setDate(now.getDate() + daysToMonday + (this.weekOffset() * 7));
        monday.setHours(0, 0, 0, 0);
        return monday;
    }

    buildWeekDays(startDate: Date, slots: AvailableSlot[]) {
        const dayNames = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];
        const days = [];

        for (let i = 0; i < 5; i++) {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + i);

            const daySlots = slots.filter(slot => {
                const slotDate = new Date(slot.startTime);
                return slotDate.toDateString() === date.toDateString();
            });

            days.push({
                name: dayNames[i],
                date: date,
                dateLabel: date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
                slots: daySlots
            });
        }

        this.weekDays.set(days);
    }

    getWeekLabel(): string {
        const start = this.getWeekStartDate();
        const end = new Date(start);
        end.setDate(start.getDate() + 4);

        return `${start.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} - ${end.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    }

    previousWeek() {
        if (this.weekOffset() > 0) {
            this.weekOffset.update(v => v - 1);
            this.loadSlots();
        }
    }

    nextWeek() {
        this.weekOffset.update(v => v + 1);
        this.loadSlots();
    }

    selectSlot(slot: AvailableSlot) {
        this.selectedSlot.set(slot);
    }

    isSelected(slot: AvailableSlot): boolean {
        return this.selectedSlot()?.startTime === slot.startTime;
    }

    confirmBooking() {
        const slot = this.selectedSlot();
        if (!slot) return;

        this.booking.set(true);

        // Check if this is a reschedule or new booking
        if (this.rescheduleId()) {
            this.interviewService.rescheduleInterview(this.rescheduleId()!, {
                newScheduledAt: new Date(slot.startTime),
                reason: 'Replaniﬁé par l\'utilisateur'
            }).subscribe({
                next: () => {
                    this.confirmed.set(true);
                    this.booking.set(false);
                },
                error: (err) => {
                    this.error.set(true);
                    this.errorMessage.set(err.error?.message || 'Erreur lors de la replanification');
                    this.booking.set(false);
                }
            });
        } else {
            this.interviewService.scheduleInterview({
                applicationId: this.applicationId(),
                scheduledAt: new Date(slot.startTime)
            }).subscribe({
                next: () => {
                    this.confirmed.set(true);
                    this.booking.set(false);
                },
                error: (err) => {
                    this.error.set(true);
                    this.errorMessage.set(err.error?.message || 'Erreur lors de la confirmation');
                    this.booking.set(false);
                }
            });
        }
    }

    formatDate(slot: AvailableSlot): string {
        return new Date(slot.startTime).toLocaleDateString('fr-FR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            timeZone: 'UTC'
        });
    }

    formatTime(date: Date | string): string {
        return new Date(date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
    }
}
