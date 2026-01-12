import { Component, OnInit, inject, signal, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ApplicationService } from '../../core/services/application.service';
import { ScheduleService, Slot } from '../../core/services/schedule.service';

@Component({
    selector: 'app-book-interview',
    standalone: true,
    imports: [CommonModule, RouterModule],
    template: `
        <div class="booking-container">
            <!-- Header -->
            <div class="booking-header">
                <a routerLink="/candidate/applications" class="back-link">
                    <span class="back-icon">←</span> Retour aux candidatures
                </a>
                
                <h1>Planifier un <span class="gradient-text">entretien</span></h1>
                <p class="subtitle">Sélectionnez une date et un créneau disponible</p>
            </div>

            <div class="booking-content">
                @if (loading()) {
                    <div class="loading-state">
                        <div class="spinner"></div>
                        <p>Chargement...</p>
                    </div>
                } @else if (error()) {
                    <div class="error-state">
                        <div class="error-icon">⚠️</div>
                        <h3>{{ errorTitle() }}</h3>
                        <p>{{ errorMessage() }}</p>
                        <a routerLink="/candidate/applications" class="btn-primary">Retour</a>
                    </div>
                } @else {
                    <!-- Application Info -->
                    <div class="application-info">
                        <div class="info-badge">
                            <span class="badge-icon">💼</span>
                            <span>{{ jobTitle() }}</span>
                        </div>
                        <div class="info-badge">
                            <span class="badge-icon">🏢</span>
                            <span>{{ companyName() }}</span>
                        </div>
                    </div>

                    <div class="calendar-wrapper">
                        <!-- Calendar Navigation -->
                        <div class="calendar-nav">
                            <button (click)="previousMonth()" class="nav-btn">←</button>
                            <h3>{{ currentMonthYear() }}</h3>
                            <button (click)="nextMonth()" class="nav-btn">→</button>
                        </div>

                        <!-- Calendar Grid -->
                        <div class="calendar-grid">
                            <div class="weekday-header">
                                @for (day of weekDays; track day) {
                                    <div class="weekday">{{ day }}</div>
                                }
                            </div>
                            <div class="days-grid">
                                @for (day of calendarDays(); track day.date) {
                                    <button 
                                        class="day-cell"
                                        [class.other-month]="!day.currentMonth"
                                        [class.today]="day.isToday"
                                        [class.selected]="day.date === selectedDate()"
                                        [class.past]="day.isPast && day.currentMonth"
                                        [class.weekend]="day.isWeekend && !day.isPast && day.currentMonth"
                                        [disabled]="day.isPast || day.isWeekend || !day.currentMonth"
                                        (click)="selectDate(day.date)">
                                        {{ day.dayNumber }}
                                    </button>
                                }
                            </div>
                        </div>
                    </div>

                    <!-- Slots Section -->
                    @if (selectedDate()) {
                        <div class="slots-section">
                            <h3>Créneaux disponibles le {{ formatSelectedDate() }}</h3>
                            
                            @if (loadingSlots()) {
                                <div class="slots-loading">
                                    <div class="spinner small"></div>
                                    <span>Chargement des créneaux...</span>
                                </div>
                            } @else if (availableSlots().length === 0) {
                                <div class="no-slots">
                                    <span class="no-slots-icon">😔</span>
                                    <p>Aucun créneau disponible pour cette date</p>
                                    <small>Essayez une autre date</small>
                                </div>
                            } @else {
                                <div class="slots-grid">
                                    @for (slot of availableSlots(); track slot.startTime) {
                                        <button 
                                            class="slot-pill"
                                            [class.selected]="selectedSlot() === slot.startTime"
                                            (click)="selectSlot(slot.startTime)">
                                            {{ slot.startTime }} - {{ slot.endTime }}
                                        </button>
                                    }
                                </div>
                            }
                        </div>
                    }

                    <!-- Confirm Button -->
                    @if (selectedDate() && selectedSlot()) {
                        <div class="confirm-section">
                            <div class="confirm-summary">
                                <p>📅 <strong>{{ formatSelectedDate() }}</strong> à <strong>{{ selectedSlot() }}</strong></p>
                                <p>Durée : 1h30</p>
                            </div>
                            <button 
                                class="btn-confirm" 
                                [disabled]="booking()"
                                (click)="confirmBooking()">
                                @if (booking()) {
                                    <span class="spinner small"></span> Réservation en cours...
                                } @else {
                                    ✓ Confirmer le rendez-vous
                                }
                            </button>
                        </div>
                    }
                }
            </div>

            <!-- Success Modal -->
            @if (showSuccessModal()) {
                <div class="modal-overlay" (click)="closeSuccessModal()">
                    <div class="modal-content" (click)="$event.stopPropagation()">
                        <div class="success-icon">🎉</div>
                        <h2>Entretien confirmé !</h2>
                        <p>Votre entretien est programmé pour le</p>
                        <p class="booking-details">
                            <strong>{{ formatSelectedDate() }}</strong> à <strong>{{ selectedSlot() }}</strong>
                        </p>
                        <p class="company-info">avec <strong>{{ companyName() }}</strong></p>
                        <small>Vous recevrez un email de confirmation avec le lien de visioconférence.</small>
                        <button class="btn-primary" (click)="goToApplications()">
                            Voir mes candidatures
                        </button>
                    </div>
                </div>
            }
        </div>
    `,
    styles: [`
        .booking-container {
            min-height: 100vh;
            background: var(--bg-secondary);
            padding-bottom: 3rem;
        }

        .booking-header {
            padding: 2rem 2rem 1.5rem;
            text-align: center;
        }

        .back-link {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            color: #6b7280;
            text-decoration: none;
            font-size: 0.875rem;
            margin-bottom: 1rem;
            transition: color 0.2s;
        }

        .back-link:hover { color: #7c3aed; }

        h1 {
            font-size: 2rem;
            font-weight: 700;
            color: #1f2937;
            margin: 0 0 0.5rem;
        }

        .gradient-text { color: #7c3aed; }

        .subtitle { color: #6b7280; margin: 0; }

        .booking-content {
            max-width: 600px;
            margin: 0 auto;
            padding: 0 1.5rem;
        }

        .loading-state, .error-state {
            text-align: center;
            padding: 4rem 2rem;
            background: white;
            border-radius: 16px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.08);
        }

        .spinner {
            width: 40px;
            height: 40px;
            border: 3px solid #e5e7eb;
            border-top-color: #7c3aed;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
            margin: 0 auto 1rem;
        }
        .spinner.small { width: 20px; height: 20px; border-width: 2px; margin: 0; }

        @keyframes spin { to { transform: rotate(360deg); } }

        .error-icon { font-size: 3rem; margin-bottom: 1rem; }
        .error-state h3 { color: #1f2937; margin: 0 0 0.5rem; }
        .error-state p { color: #6b7280; }

        .btn-primary {
            display: inline-block;
            padding: 0.875rem 1.5rem;
            background: #7c3aed;
            color: white;
            border-radius: 12px;
            font-weight: 600;
            text-decoration: none;
            border: none;
            cursor: pointer;
            margin-top: 1.5rem;
        }
        .btn-primary:hover { background: #6d28d9; }

        .application-info {
            display: flex;
            gap: 1rem;
            justify-content: center;
            flex-wrap: wrap;
            margin-bottom: 1.5rem;
        }

        .info-badge {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            background: white;
            padding: 0.75rem 1rem;
            border-radius: 12px;
            font-weight: 500;
            color: #374151;
            box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        }

        .badge-icon { font-size: 1.25rem; }

        .calendar-wrapper {
            background: white;
            border-radius: 16px;
            padding: 1.5rem;
            box-shadow: 0 4px 20px rgba(0,0,0,0.08);
            margin-bottom: 1.5rem;
        }

        .calendar-nav {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 1rem;
        }

        .calendar-nav h3 {
            margin: 0;
            font-size: 1.125rem;
            color: #1f2937;
        }

        .nav-btn {
            width: 36px;
            height: 36px;
            border: none;
            background: #f3f4f6;
            border-radius: 8px;
            cursor: pointer;
            font-size: 1.25rem;
            transition: background 0.2s;
        }
        .nav-btn:hover { background: #e5e7eb; }

        .weekday-header {
            display: grid;
            grid-template-columns: repeat(7, 1fr);
            gap: 4px;
            margin-bottom: 8px;
        }

        .weekday {
            text-align: center;
            font-size: 0.75rem;
            font-weight: 600;
            color: #6b7280;
            padding: 8px 0;
        }

        .days-grid {
            display: grid;
            grid-template-columns: repeat(7, 1fr);
            gap: 4px;
        }

        .day-cell {
            aspect-ratio: 1;
            border: none;
            background: transparent;
            border-radius: 8px;
            cursor: pointer;
            font-size: 0.875rem;
            font-weight: 500;
            color: #374151;
            transition: all 0.2s;
        }

        .day-cell:hover:not(:disabled):not(.selected) { background: #f3e8ff; }
        .day-cell.other-month { color: #d1d5db; }
        .day-cell.today { border: 2px solid #7c3aed; }
        .day-cell.selected { background: #7c3aed !important; color: white !important; }
        .day-cell.past { 
            color: #9ca3af; 
            text-decoration: line-through; 
            cursor: not-allowed; 
            background: #f9fafb;
        }
        .day-cell.weekend { 
            color: #ef4444; 
            background: #fef2f2; 
            cursor: not-allowed;
        }
        .day-cell:disabled:not(.past):not(.weekend) { cursor: not-allowed; opacity: 0.5; }

        .slots-section {
            background: white;
            border-radius: 16px;
            padding: 1.5rem;
            box-shadow: 0 4px 20px rgba(0,0,0,0.08);
            margin-bottom: 1.5rem;
        }

        .slots-section h3 {
            margin: 0 0 1rem;
            font-size: 1rem;
            color: #1f2937;
        }

        .slots-loading {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.75rem;
            padding: 2rem;
            color: #6b7280;
        }

        .no-slots {
            text-align: center;
            padding: 2rem;
            color: #6b7280;
        }
        .no-slots-icon { font-size: 2rem; display: block; margin-bottom: 0.5rem; }
        .no-slots p { margin: 0; }
        .no-slots small { color: #9ca3af; }

        .slots-grid {
            display: flex;
            flex-wrap: wrap;
            gap: 0.75rem;
        }

        .slot-pill {
            padding: 0.75rem 1.25rem;
            background: #f3f4f6;
            border: 2px solid transparent;
            border-radius: 50px;
            font-size: 0.9rem;
            font-weight: 600;
            color: #374151;
            cursor: pointer;
            transition: all 0.2s;
        }
        .slot-pill:hover:not(.selected) { background: #e5e7eb; border-color: #7c3aed; }
        .slot-pill.selected { 
            background: #7c3aed !important; 
            color: white !important; 
            border-color: #7c3aed !important; 
            box-shadow: 0 4px 12px rgba(124, 58, 237, 0.4);
        }

        .confirm-section {
            background: white;
            border-radius: 16px;
            padding: 1.5rem;
            box-shadow: 0 4px 20px rgba(0,0,0,0.08);
            text-align: center;
        }

        .confirm-summary {
            margin-bottom: 1rem;
        }
        .confirm-summary p { margin: 0.25rem 0; color: #374151; }

        .btn-confirm {
            width: 100%;
            padding: 1rem;
            background: linear-gradient(135deg, #7c3aed, #a855f7);
            color: white;
            border: none;
            border-radius: 12px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        .btn-confirm:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 4px 15px rgba(124, 58, 237, 0.4); }
        .btn-confirm:disabled { opacity: 0.7; cursor: not-allowed; }

        .modal-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            padding: 1rem;
        }

        .modal-content {
            background: white;
            border-radius: 20px;
            padding: 2.5rem;
            text-align: center;
            max-width: 400px;
            width: 100%;
            animation: modalIn 0.3s ease;
        }

        @keyframes modalIn {
            from { opacity: 0; transform: scale(0.9); }
            to { opacity: 1; transform: scale(1); }
        }

        .success-icon { font-size: 4rem; margin-bottom: 1rem; }
        .modal-content h2 { color: #1f2937; margin: 0 0 0.5rem; }
        .modal-content p { color: #6b7280; margin: 0.5rem 0; }
        .booking-details { font-size: 1.125rem; color: #1f2937; }
        .company-info { color: #7c3aed; }
        .modal-content small { display: block; color: #9ca3af; margin-top: 1rem; }

        @media (max-width: 600px) {
            .booking-header { padding: 1rem; }
            h1 { font-size: 1.5rem; }
            .booking-content { padding: 0 1rem; }
            .calendar-wrapper, .slots-section, .confirm-section { padding: 1rem; }
            .application-info { flex-direction: column; align-items: center; }
        }
    `]
})
export class BookInterviewComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private applicationService = inject(ApplicationService);
    private scheduleService = inject(ScheduleService);

    loading = signal(true);
    error = signal(false);
    errorTitle = signal('Une erreur est survenue');
    errorMessage = signal('');

    applicationId = signal(0);
    companyId = signal(0);
    jobTitle = signal('');
    companyName = signal('');

    // Calendar state
    currentMonth = signal(new Date());
    calendarDays = signal<CalendarDay[]>([]);
    selectedDate = signal<string | null>(null);
    weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

    // Slots state
    loadingSlots = signal(false);
    availableSlots = signal<Slot[]>([]);
    selectedSlot = signal<string | null>(null);

    // Booking state
    booking = signal(false);
    showSuccessModal = signal(false);

    private isBrowser: boolean;

    constructor(@Inject(PLATFORM_ID) platformId: Object) {
        this.isBrowser = isPlatformBrowser(platformId);
    }

    ngOnInit() {
        this.route.params.subscribe(params => {
            this.applicationId.set(+params['applicationId']);
            this.loadApplication();
        });
    }

    loadApplication() {
        this.applicationService.getApplication(this.applicationId()).subscribe({
            next: (app) => {
                this.jobTitle.set(app.jobTitle);
                this.companyName.set(app.companyName || 'Entreprise');
                this.companyId.set(app.companyId);
                this.loading.set(false);
                this.generateCalendar();
            },
            error: () => {
                this.error.set(true);
                this.errorTitle.set('Candidature introuvable');
                this.errorMessage.set('Impossible de charger les détails de la candidature.');
                this.loading.set(false);
            }
        });
    }

    generateCalendar() {
        const year = this.currentMonth().getFullYear();
        const month = this.currentMonth().getMonth();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);

        // Adjust for Monday start (0 = Sunday in JS, we want Monday = 0)
        let startOffset = firstDay.getDay() - 1;
        if (startOffset < 0) startOffset = 6;

        const days: CalendarDay[] = [];

        // Previous month days
        const prevMonth = new Date(year, month, 0);
        for (let i = startOffset - 1; i >= 0; i--) {
            const date = new Date(year, month - 1, prevMonth.getDate() - i);
            days.push(this.createCalendarDay(date, false, today));
        }

        // Current month days
        for (let d = 1; d <= lastDay.getDate(); d++) {
            const date = new Date(year, month, d);
            days.push(this.createCalendarDay(date, true, today));
        }

        // Only add enough next month days to complete the week (max 7 days, not full row)
        const remainder = days.length % 7;
        if (remainder > 0) {
            const needed = 7 - remainder;
            for (let d = 1; d <= needed; d++) {
                const date = new Date(year, month + 1, d);
                days.push(this.createCalendarDay(date, false, today));
            }
        }

        this.calendarDays.set(days);
    }

    private createCalendarDay(date: Date, currentMonth: boolean, today: Date): CalendarDay {
        const dayOfWeek = date.getDay();
        return {
            date: this.formatDate(date),
            dayNumber: date.getDate(),
            currentMonth,
            isToday: date.getTime() === today.getTime(),
            isPast: date < today,
            isWeekend: dayOfWeek === 0 || dayOfWeek === 6
        };
    }

    private formatDate(date: Date): string {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    currentMonthYear(): string {
        const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
            'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
        const m = this.currentMonth();
        return `${months[m.getMonth()]} ${m.getFullYear()}`;
    }

    previousMonth() {
        const m = this.currentMonth();
        this.currentMonth.set(new Date(m.getFullYear(), m.getMonth() - 1, 1));
        this.generateCalendar();
    }

    nextMonth() {
        const m = this.currentMonth();
        this.currentMonth.set(new Date(m.getFullYear(), m.getMonth() + 1, 1));
        this.generateCalendar();
    }

    selectDate(date: string) {
        this.selectedDate.set(date);
        this.selectedSlot.set(null);
        this.loadSlots(date);
    }

    loadSlots(date: string) {
        this.loadingSlots.set(true);
        this.scheduleService.getAvailableSlots(this.companyId(), date).subscribe({
            next: (slots) => {
                this.availableSlots.set(slots);
                this.loadingSlots.set(false);
            },
            error: () => {
                this.availableSlots.set([]);
                this.loadingSlots.set(false);
            }
        });
    }

    selectSlot(startTime: string) {
        this.selectedSlot.set(startTime);
    }

    formatSelectedDate(): string {
        if (!this.selectedDate()) return '';
        const date = new Date(this.selectedDate()!);
        return date.toLocaleDateString('fr-FR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long'
        });
    }

    confirmBooking() {
        if (!this.selectedDate() || !this.selectedSlot()) return;

        this.booking.set(true);
        this.scheduleService.bookSlot(
            this.applicationId(),
            this.selectedDate()!,
            this.selectedSlot()!
        ).subscribe({
            next: (result) => {
                this.booking.set(false);
                this.showSuccessModal.set(true);
            },
            error: (err) => {
                this.booking.set(false);
                alert(err.error?.message || 'Erreur lors de la réservation');
                // Reload slots in case of conflict
                this.loadSlots(this.selectedDate()!);
            }
        });
    }

    closeSuccessModal() {
        this.showSuccessModal.set(false);
    }

    goToApplications() {
        this.router.navigate(['/candidate/applications']);
    }
}

interface CalendarDay {
    date: string;
    dayNumber: number;
    currentMonth: boolean;
    isToday: boolean;
    isPast: boolean;
    isWeekend: boolean;
}
