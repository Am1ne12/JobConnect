import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ScheduleService, WeekCalendar, CalendarSlot, Unavailability } from '../../../core/services/schedule.service';

@Component({
    selector: 'app-company-calendar',
    standalone: true,
    imports: [CommonModule, RouterModule, FormsModule],
    template: `
        <div class="calendar-container">
            <div class="calendar-header">
                <a routerLink="/company/dashboard" class="back-link">
                    ← Retour au dashboard
                </a>
                <h1>📅 Mon Agenda</h1>
                <p>Gérez vos disponibilités et entretiens</p>
            </div>

            <div class="calendar-content">
                <!-- Week Navigation -->
                <div class="week-nav">
                    <button (click)="previousWeek()" class="nav-btn">← Semaine précédente</button>
                    <h2>{{ weekTitle() }}</h2>
                    <button (click)="nextWeek()" class="nav-btn">Semaine suivante →</button>
                </div>

                @if (loading()) {
                    <div class="loading">
                        <div class="spinner"></div>
                        <p>Chargement...</p>
                    </div>
                } @else {
                    <!-- Calendar Grid -->
                    <div class="week-grid">
                        <!-- Header Row -->
                        <div class="grid-header">
                            <div class="time-column"></div>
                            @for (day of calendar()?.days || []; track day.date) {
                                <div class="day-header">
                                    <span class="day-name">{{ translateDay(day.dayName) }}</span>
                                    <span class="day-date">{{ formatDayDate(day.date) }}</span>
                                </div>
                            }
                        </div>

                        <!-- Time Slots -->
                        @for (time of timeSlots; track time) {
                            <div class="time-row">
                                <div class="time-label">{{ time }}</div>
                                @for (day of calendar()?.days || []; track day.date) {
                                    @let slot = getSlotForTime(day, time);
                                    <div 
                                        class="slot-cell"
                                        [class.booked]="slot?.status === 'booked'"
                                        [class.blocked]="slot?.status === 'blocked'"
                                        [class.past]="slot?.status === 'past'"
                                        [class.available]="slot?.status === 'available'"
                                        (click)="onSlotClick(day.date, time, slot)">
                                        
                                        @if (slot?.status === 'booked' && slot) {
                                            <div class="slot-content booked">
                                                <span class="slot-candidate">{{ slot.candidateName }}</span>
                                                <span class="slot-job">{{ slot.jobTitle }}</span>
                                            </div>
                                        } @else if (slot?.status === 'blocked' && slot) {
                                            <div class="slot-content blocked">
                                                <span>🚫 Bloqué</span>
                                                @if (slot.blockReason) {
                                                    <span class="block-reason">{{ slot.blockReason }}</span>
                                                }
                                            </div>
                                        } @else if (slot?.status === 'available') {
                                            <div class="slot-content available">
                                                <span>+ Bloquer</span>
                                            </div>
                                        }
                                    </div>
                                }
                            </div>
                        }
                    </div>
                }

                <!-- Legend -->
                <div class="legend">
                    <div class="legend-item">
                        <span class="legend-color booked"></span>
                        <span>Entretien réservé</span>
                    </div>
                    <div class="legend-item">
                        <span class="legend-color blocked"></span>
                        <span>Bloqué</span>
                    </div>
                    <div class="legend-item">
                        <span class="legend-color available"></span>
                        <span>Disponible</span>
                    </div>
                    <div class="legend-item">
                        <span class="legend-color past"></span>
                        <span>Passé</span>
                    </div>
                </div>

                <!-- Upcoming Unavailabilities -->
                @if (unavailabilities().length > 0) {
                    <div class="unavailabilities-section">
                        <h3>⏰ Périodes bloquées à venir</h3>
                        <div class="unavail-list">
                            @for (u of unavailabilities(); track u.id) {
                                <div class="unavail-item">
                                    <div class="unavail-info">
                                        <span class="unavail-date">{{ formatDateTime(u.startTime) }} - {{ formatTime(u.endTime) }}</span>
                                        @if (u.reason) {
                                            <span class="unavail-reason">{{ u.reason }}</span>
                                        }
                                    </div>
                                    <button (click)="deleteUnavailability(u.id)" class="btn-delete">✕</button>
                                </div>
                            }
                        </div>
                    </div>
                }
            </div>

            <!-- Block Modal -->
            @if (showBlockModal()) {
                <div class="modal-overlay" (click)="closeBlockModal()">
                    <div class="modal-content" (click)="$event.stopPropagation()">
                        <h3>🚫 Bloquer ce créneau</h3>
                        <p>{{ blockModalDate() }} à {{ blockModalTime() }}</p>
                        <div class="form-group">
                            <label>Raison (optionnel)</label>
                            <input 
                                type="text" 
                                [(ngModel)]="blockReason"
                                placeholder="Ex: Réunion, Congé, etc.">
                        </div>
                        <div class="modal-actions">
                            <button (click)="closeBlockModal()" class="btn-cancel">Annuler</button>
                            <button (click)="confirmBlock()" class="btn-confirm" [disabled]="blocking()">
                                {{ blocking() ? 'En cours...' : 'Bloquer' }}
                            </button>
                        </div>
                    </div>
                </div>
            }

            <!-- Interview Action Modal -->
            @if (showInterviewModal()) {
                <div class="modal-overlay" (click)="closeInterviewModal()">
                    <div class="modal-content interview-modal" (click)="$event.stopPropagation()">
                        <h3>📅 Entretien programmé</h3>
                        <div class="interview-details">
                            <p><strong>Candidat:</strong> {{ selectedInterview()?.candidateName }}</p>
                            <p><strong>Poste:</strong> {{ selectedInterview()?.jobTitle }}</p>
                            <p><strong>Date:</strong> {{ formatInterviewDate() }}</p>
                            <p><strong>Heure:</strong> {{ selectedInterview()?.startTime }} - {{ selectedInterview()?.endTime }}</p>
                        </div>
                        <div class="modal-actions-vertical">
                            <button (click)="closeInterviewModal()" class="btn-secondary">Fermer</button>
                            <button (click)="openCancelModal()" class="btn-danger">❌ Annuler l'entretien</button>
                        </div>
                    </div>
                </div>
            }

            <!-- Cancel Confirmation Modal -->
            @if (showCancelModal()) {
                <div class="modal-overlay" (click)="closeCancelModal()">
                    <div class="modal-content" (click)="$event.stopPropagation()">
                        <h3>❌ Annuler l'entretien ?</h3>
                        <p class="warning-text">Cette action est irréversible. Le candidat sera notifié.</p>
                        <div class="form-group">
                            <label>Raison (optionnel)</label>
                            <input 
                                type="text" 
                                [(ngModel)]="cancelReason"
                                placeholder="Ex: Indisponibilité, reporter...">
                        </div>
                        <div class="modal-actions">
                            <button (click)="closeCancelModal()" class="btn-cancel">Retour</button>
                            <button (click)="confirmCancel()" class="btn-danger" [disabled]="cancelling()">
                                @if (cancelling()) {
                                    En cours...
                                } @else {
                                    Confirmer
                                }
                            </button>
                        </div>
                    </div>
                </div>
            }
        </div>
    `,
    styles: [`
        .calendar-container {
            min-height: 100vh;
            background: var(--bg-secondary);
            padding-bottom: 2rem;
        }

        .calendar-header {
            padding: 2rem;
            text-align: center;
        }

        .back-link {
            display: inline-block;
            color: var(--text-secondary);
            text-decoration: none;
            margin-bottom: 1rem;
        }
        .back-link:hover { color: var(--accent); }

        h1 { font-size: 1.75rem; margin: 0 0 0.5rem; color: var(--text-primary); }
        p { color: var(--text-secondary); margin: 0; }

        .calendar-content {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 1.5rem;
        }

        .week-nav {
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: var(--bg-glass);
            padding: 1rem 1.5rem;
            border-radius: 12px;
            margin-bottom: 1.5rem;
        }

        .week-nav h2 { margin: 0; font-size: 1.125rem; }

        .nav-btn {
            padding: 0.5rem 1rem;
            background: var(--bg-tertiary);
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 0.875rem;
        }
        .nav-btn:hover { background: var(--border-default); }

        .loading {
            text-align: center;
            padding: 3rem;
        }

        .spinner {
            width: 40px;
            height: 40px;
            border: 3px solid var(--border-default);
            border-top-color: var(--accent);
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
            margin: 0 auto 1rem;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .week-grid {
            background: var(--bg-glass);
            border-radius: 16px;
            overflow: hidden;
            box-shadow: var(--shadow-lg);
        }

        .grid-header {
            display: grid;
            grid-template-columns: 80px repeat(5, 1fr);
            background: var(--bg-tertiary);
            border-bottom: 1px solid var(--border-default);
        }

        .time-column { padding: 1rem; }

        .day-header {
            padding: 1rem;
            text-align: center;
            border-left: 1px solid var(--border-light);
        }

        .day-name { display: block; font-weight: 600; color: var(--text-primary); }
        .day-date { display: block; font-size: 0.8rem; color: var(--text-secondary); }

        .time-row {
            display: grid;
            grid-template-columns: 80px repeat(5, 1fr);
            border-bottom: 1px solid var(--border-light);
        }
        .time-row:last-child { border-bottom: none; }

        .time-label {
            padding: 1rem;
            font-size: 0.8rem;
            font-weight: 600;
            color: var(--text-secondary);
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .slot-cell {
            min-height: 80px;
            padding: 0.5rem;
            border-left: 1px solid var(--border-light);
            cursor: pointer;
            transition: background 0.2s;
        }

        .slot-cell.available:hover { background: rgba(124, 58, 237, 0.1); }
        .slot-cell.booked { background: rgba(16, 185, 129, 0.15); }
        .slot-cell.blocked { background: rgba(107, 114, 128, 0.15); }
        .slot-cell.past { background: var(--bg-tertiary); cursor: default; }

        .slot-content {
            height: 100%;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            font-size: 0.8rem;
            text-align: center;
        }

        .slot-content.booked { color: #059669; }
        .slot-content.blocked { color: #6b7280; }
        .slot-content.available { color: var(--accent); opacity: 0; }
        .slot-cell.available:hover .slot-content.available { opacity: 1; }

        .slot-candidate { font-weight: 600; }
        .slot-job { font-size: 0.75rem; opacity: 0.8; }
        .block-reason { font-size: 0.7rem; opacity: 0.7; }

        .legend {
            display: flex;
            justify-content: center;
            gap: 2rem;
            margin-top: 1.5rem;
            flex-wrap: wrap;
        }

        .legend-item {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 0.875rem;
            color: var(--text-secondary);
        }

        .legend-color {
            width: 16px;
            height: 16px;
            border-radius: 4px;
        }
        .legend-color.booked { background: rgba(16, 185, 129, 0.5); }
        .legend-color.blocked { background: rgba(107, 114, 128, 0.5); }
        .legend-color.available { background: rgba(124, 58, 237, 0.3); border: 1px dashed var(--accent); }
        .legend-color.past { background: var(--bg-tertiary); }

        .unavailabilities-section {
            margin-top: 2rem;
            background: var(--bg-glass);
            padding: 1.5rem;
            border-radius: 12px;
        }

        .unavailabilities-section h3 { margin: 0 0 1rem; font-size: 1rem; }

        .unavail-list { display: flex; flex-direction: column; gap: 0.75rem; }

        .unavail-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0.75rem 1rem;
            background: var(--bg-tertiary);
            border-radius: 8px;
        }

        .unavail-date { font-weight: 500; }
        .unavail-reason { font-size: 0.875rem; color: var(--text-secondary); margin-left: 1rem; }

        .btn-delete {
            width: 28px;
            height: 28px;
            border: none;
            background: rgba(220, 38, 38, 0.1);
            color: #dc2626;
            border-radius: 6px;
            cursor: pointer;
        }
        .btn-delete:hover { background: rgba(220, 38, 38, 0.2); }

        .modal-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
        }

        .modal-content {
            background: var(--bg-primary);
            padding: 2rem;
            border-radius: 16px;
            width: 100%;
            max-width: 400px;
        }

        .modal-content h3 { margin: 0 0 0.5rem; }
        .modal-content p { color: var(--text-secondary); margin: 0 0 1.5rem; }

        .form-group { margin-bottom: 1.5rem; }
        .form-group label { display: block; margin-bottom: 0.5rem; font-size: 0.875rem; }
        .form-group input {
            width: 100%;
            padding: 0.75rem;
            border: 1px solid var(--border-default);
            border-radius: 8px;
            font-size: 1rem;
        }

        .modal-actions { display: flex; gap: 1rem; }
        .btn-cancel, .btn-confirm {
            flex: 1;
            padding: 0.75rem;
            border: none;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
        }
        .btn-cancel { background: var(--bg-tertiary); }
        .btn-confirm { background: var(--accent); color: white; }
        .btn-confirm:disabled { opacity: 0.7; }

        .interview-details { margin: 1rem 0; }
        .interview-details p { margin: 0.5rem 0; }
        .modal-actions-vertical { display: flex; flex-direction: column; gap: 0.75rem; }
        .btn-secondary {
            padding: 0.75rem;
            border: 1px solid var(--border-default);
            background: var(--bg-primary);
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
        }
        .btn-danger {
            padding: 0.75rem;
            background: #dc2626;
            color: white;
            border: none;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
        }
        .btn-danger:disabled { opacity: 0.7; }
        .warning-text { color: #dc2626; font-size: 0.875rem; margin: 0.5rem 0 1rem; }

        @media (max-width: 768px) {
            .calendar-header { padding: 1rem; }
            h1 { font-size: 1.25rem; }
            .week-nav { 
                flex-direction: column; 
                gap: 0.75rem; 
                text-align: center;
            }
            .week-nav h2 { font-size: 1rem; order: -1; }
            .nav-btn { width: 100%; }
            .week-grid { 
                overflow-x: auto; 
                -webkit-overflow-scrolling: touch;
            }
            .grid-header, .time-row { min-width: 600px; }
            .slot-cell { min-height: 60px; }
            .slot-content { font-size: 0.7rem; }
            .slot-candidate { font-size: 0.7rem; }
            .slot-job { font-size: 0.6rem; }
            .legend { 
                flex-direction: column; 
                gap: 0.5rem; 
                align-items: flex-start;
                padding: 0 1rem;
            }
            .unavailabilities-section { margin-top: 1rem; padding: 1rem; }
            .unavail-item { flex-direction: column; align-items: flex-start; gap: 0.5rem; }
            .unavail-reason { margin-left: 0; }
            .modal-content { margin: 1rem; padding: 1.5rem; }
        }
    `]
})
export class CompanyCalendarComponent implements OnInit {
    private scheduleService = inject(ScheduleService);

    loading = signal(true);
    calendar = signal<WeekCalendar | null>(null);
    unavailabilities = signal<Unavailability[]>([]);
    currentWeekStart = signal<Date>(this.getMonday(new Date()));

    timeSlots = ['09:00', '10:30', '12:00', '13:30', '15:00', '16:30'];

    // Block modal
    showBlockModal = signal(false);
    blockModalDate = signal('');
    blockModalTime = signal('');
    blockReason = '';
    blocking = signal(false);
    private blockDate: string = '';
    private blockTime: string = '';

    // Interview modal
    showInterviewModal = signal(false);
    selectedInterview = signal<{ id: number; candidateName: string; jobTitle: string; startTime: string; endTime: string; date: string } | null>(null);

    // Cancel modal
    showCancelModal = signal(false);
    cancelReason = '';
    cancelling = signal(false);

    ngOnInit() {
        this.loadCalendar();
        this.loadUnavailabilities();
    }

    private getMonday(date: Date): Date {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        return new Date(d.setDate(diff));
    }

    loadCalendar() {
        this.loading.set(true);
        const weekStart = this.formatDate(this.currentWeekStart());
        this.scheduleService.getWeekCalendar(weekStart).subscribe({
            next: (cal) => {
                this.calendar.set(cal);
                this.loading.set(false);
            },
            error: () => this.loading.set(false)
        });
    }

    loadUnavailabilities() {
        this.scheduleService.getUnavailabilities().subscribe({
            next: (list) => this.unavailabilities.set(list),
            error: () => { }
        });
    }

    private formatDate(date: Date): string {
        return date.toISOString().split('T')[0];
    }

    weekTitle(): string {
        const start = this.currentWeekStart();
        const end = new Date(start);
        end.setDate(end.getDate() + 4);
        return `${start.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} - ${end.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    }

    previousWeek() {
        const current = this.currentWeekStart();
        current.setDate(current.getDate() - 7);
        this.currentWeekStart.set(new Date(current));
        this.loadCalendar();
    }

    nextWeek() {
        const current = this.currentWeekStart();
        current.setDate(current.getDate() + 7);
        this.currentWeekStart.set(new Date(current));
        this.loadCalendar();
    }

    translateDay(day: string): string {
        const map: Record<string, string> = {
            'Monday': 'Lundi',
            'Tuesday': 'Mardi',
            'Wednesday': 'Mercredi',
            'Thursday': 'Jeudi',
            'Friday': 'Vendredi'
        };
        return map[day] || day;
    }

    formatDayDate(dateStr: string): string {
        const date = new Date(dateStr);
        return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    }

    getSlotForTime(day: any, time: string): CalendarSlot | undefined {
        return day.slots?.find((s: CalendarSlot) => s.startTime === time);
    }

    onSlotClick(date: string, time: string, slot: CalendarSlot | undefined) {
        if (!slot) return;

        // Handle booked slots - show interview details
        if (slot.status === 'booked' && slot.interviewId) {
            this.selectedInterview.set({
                id: slot.interviewId,
                candidateName: slot.candidateName || 'Candidat',
                jobTitle: slot.jobTitle || 'Poste',
                startTime: slot.startTime,
                endTime: slot.endTime,
                date: date
            });
            this.showInterviewModal.set(true);
            return;
        }

        // Handle available slots - show block modal
        if (slot.status === 'available') {
            this.blockDate = date;
            this.blockTime = time;
            this.blockModalDate.set(new Date(date).toLocaleDateString('fr-FR', {
                weekday: 'long', day: 'numeric', month: 'long'
            }));
            this.blockModalTime.set(time);
            this.blockReason = '';
            this.showBlockModal.set(true);
        }
    }

    closeBlockModal() {
        this.showBlockModal.set(false);
    }

    confirmBlock() {
        this.blocking.set(true);

        const startTime = new Date(`${this.blockDate}T${this.blockTime}:00`);
        const endTime = new Date(startTime.getTime() + 90 * 60 * 1000); // +1h30

        this.scheduleService.blockPeriod(startTime, endTime, this.blockReason || undefined).subscribe({
            next: () => {
                this.blocking.set(false);
                this.closeBlockModal();
                this.loadCalendar();
                this.loadUnavailabilities();
            },
            error: () => {
                this.blocking.set(false);
                alert('Erreur lors du blocage');
            }
        });
    }

    deleteUnavailability(id: number) {
        if (!confirm('Supprimer cette période bloquée ?')) return;

        this.scheduleService.deleteUnavailability(id).subscribe({
            next: () => {
                this.loadCalendar();
                this.loadUnavailabilities();
            },
            error: () => alert('Erreur lors de la suppression')
        });
    }

    formatDateTime(dateStr: string): string {
        return new Date(dateStr).toLocaleString('fr-FR', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    formatTime(dateStr: string): string {
        return new Date(dateStr).toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // Interview modal methods
    closeInterviewModal() {
        this.showInterviewModal.set(false);
        this.selectedInterview.set(null);
    }

    formatInterviewDate(): string {
        const interview = this.selectedInterview();
        if (!interview) return '';
        return new Date(interview.date).toLocaleDateString('fr-FR', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
        });
    }

    openCancelModal() {
        this.showInterviewModal.set(false);
        this.cancelReason = '';
        this.showCancelModal.set(true);
    }

    closeCancelModal() {
        this.showCancelModal.set(false);
    }

    confirmCancel() {
        const interview = this.selectedInterview();
        if (!interview) return;

        this.cancelling.set(true);
        this.scheduleService.cancelInterview(interview.id, this.cancelReason || undefined).subscribe({
            next: () => {
                this.cancelling.set(false);
                this.closeCancelModal();
                this.selectedInterview.set(null);
                this.loadCalendar();
                alert('Entretien annulé avec succès');
            },
            error: (err) => {
                this.cancelling.set(false);
                alert(err.error?.message || 'Erreur lors de l\'annulation');
            }
        });
    }
}
