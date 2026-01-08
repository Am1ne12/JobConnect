import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { InterviewService } from '../../../core/services/interview.service';
import { CompanyAvailability } from '../../../core/models';

interface TimeSlot {
    time: string;
    hour: number;
    minute: number;
}

interface DayColumn {
    dayOfWeek: number;
    name: string;
    slots: { time: string; hour: number; minute: number; selected: boolean }[];
}

@Component({
    selector: 'app-availability-config',
    standalone: true,
    imports: [CommonModule, RouterLink],
    template: `
        <div class="config-container">
            <!-- Header -->
            <div class="config-header">
                <div class="header-orb header-orb-1"></div>
                <div class="header-orb header-orb-2"></div>
                
                <a routerLink="/company/dashboard" class="back-link">
                    <span class="back-icon">←</span> Retour au dashboard
                </a>
                
                <h1>Configurer mes <span class="gradient-text">disponibilités</span></h1>
                <p class="subtitle">Cliquez sur les créneaux où vous êtes disponible pour des entretiens (1h30)</p>
            </div>

            <div class="config-content">
                @if (loading()) {
                    <div class="loading-state">
                        <div class="spinner"></div>
                        <p>Chargement de vos disponibilités...</p>
                    </div>
                } @else {
                    @if (saved()) {
                        <div class="success-banner">
                            <span class="success-icon">✅</span>
                            <span>Disponibilités sauvegardées avec succès !</span>
                        </div>
                    }

                    <!-- Calendar Grid -->
                    <div class="calendar-grid">
                        @for (day of daysConfig(); track day.dayOfWeek; let i = $index) {
                            <div class="day-column" [style.animation-delay]="(i * 0.08) + 's'">
                                <div class="day-header">
                                    <span class="day-name">{{ day.name }}</span>
                                    <span class="day-count">{{ getSelectedCount(day) }} créneaux</span>
                                </div>
                                <div class="slots-list">
                                    @for (slot of day.slots; track slot.time) {
                                        <button 
                                            class="slot-btn"
                                            [class.selected]="slot.selected"
                                            (click)="toggleSlot(day.dayOfWeek, slot.hour, slot.minute)"
                                        >
                                            <span class="slot-time">{{ slot.time }}</span>
                                            <span class="slot-check">✓</span>
                                        </button>
                                    }
                                </div>
                            </div>
                        }
                    </div>

                    <!-- Summary -->
                    <div class="summary-bar">
                        <div class="summary-info">
                            <span class="summary-label">Total sélectionné :</span>
                            <span class="summary-count">{{ getTotalSelected() }} créneaux / semaine</span>
                        </div>
                        <button 
                            class="btn-save" 
                            (click)="saveAvailability()" 
                            [disabled]="saving()"
                        >
                            @if (saving()) {
                                <span class="btn-spinner"></span> Sauvegarde...
                            } @else {
                                💾 Sauvegarder
                            }
                        </button>
                    </div>
                }
            </div>
        </div>
    `,
    styles: [`
        /* Container */
        .config-container {
            min-height: 100vh;
            background: var(--bg-secondary);
        }

        /* Header */
        .config-header {
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

        /* Content */
        .config-content {
            max-width: 1100px;
            margin: 0 auto;
            padding: 0 2rem 3rem;
        }

        .loading-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 4rem 2rem;
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

        /* Success Banner */
        .success-banner {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.75rem;
            padding: 1rem 1.5rem;
            background: linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(168, 85, 247, 0.15));
            border: 1px solid #6366f1;
            border-radius: var(--radius-xl);
            color: #6366f1;
            font-weight: 600;
            margin-bottom: 1.5rem;
            animation: fadeInUp 0.3s ease;
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

        .day-count {
            font-size: 0.75rem;
            opacity: 0.9;
        }

        .slots-list {
            padding: 0.75rem;
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
            max-height: 400px;
            overflow-y: auto;
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
            background: linear-gradient(135deg, #6366f1, #a855f7);
            color: white;
            border-color: transparent;
        }

        .slot-btn.selected .slot-check {
            opacity: 1;
        }

        /* Summary Bar */
        .summary-bar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 1.25rem 1.5rem;
            background: var(--bg-primary);
            border-radius: var(--radius-xl);
            border: 1px solid var(--border-light);
        }

        .summary-info {
            display: flex;
            flex-direction: column;
            gap: 0.25rem;
        }

        .summary-label {
            font-size: 0.75rem;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .summary-count {
            font-weight: 600;
            color: var(--text-primary);
            font-size: 1rem;
        }

        .btn-save {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            background: linear-gradient(135deg, #6366f1, #a855f7);
            color: white;
            border: none;
            padding: 0.875rem 1.75rem;
            border-radius: var(--radius-full);
            font-weight: 600;
            font-size: 0.9375rem;
            cursor: pointer;
            transition: all 0.2s;
            box-shadow: 0 4px 15px rgba(99, 102, 241, 0.3);
        }

        .btn-save:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 6px 25px rgba(99, 102, 241, 0.4);
        }

        .btn-save:disabled {
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

        /* Responsive */
        @media (max-width: 900px) {
            .calendar-grid {
                grid-template-columns: repeat(3, 1fr);
            }
        }

        @media (max-width: 600px) {
            .config-header h1 {
                font-size: 1.75rem;
            }

            .config-content {
                padding: 0 1rem 2rem;
            }

            .calendar-grid {
                grid-template-columns: 1fr 1fr;
                gap: 0.75rem;
            }

            .summary-bar {
                flex-direction: column;
                gap: 1rem;
                text-align: center;
            }

            .summary-info {
                align-items: center;
            }
        }
    `]
})
export class AvailabilityConfigComponent implements OnInit {
    loading = signal(true);
    saving = signal(false);
    saved = signal(false);

    // Time slots matching backend: 09:00, 10:30, 12:00, 13:30, 15:00, 16:30
    timeSlots: TimeSlot[] = [
        { time: '09:00', hour: 9, minute: 0 },
        { time: '10:30', hour: 10, minute: 30 },
        { time: '12:00', hour: 12, minute: 0 },
        { time: '13:30', hour: 13, minute: 30 },
        { time: '15:00', hour: 15, minute: 0 },
        { time: '16:30', hour: 16, minute: 30 }
    ];

    daysConfig = signal<DayColumn[]>([]);

    constructor(private interviewService: InterviewService) { }

    ngOnInit() {
        this.initializeDays();
        this.loadAvailability();
    }

    initializeDays() {
        const dayNames = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];
        const days: DayColumn[] = [];

        for (let i = 1; i <= 5; i++) {
            days.push({
                dayOfWeek: i,
                name: dayNames[i - 1],
                slots: this.timeSlots.map(ts => ({
                    time: ts.time,
                    hour: ts.hour,
                    minute: ts.minute,
                    selected: false
                }))
            });
        }

        this.daysConfig.set(days);
    }

    loadAvailability() {
        this.interviewService.getAvailability().subscribe({
            next: (availability) => {
                if (availability && availability.length > 0) {
                    this.applyFromServer(availability);
                }
                this.loading.set(false);
            },
            error: () => {
                this.loading.set(false);
            }
        });
    }

    applyFromServer(availability: CompanyAvailability[]) {
        const config = this.daysConfig();
        console.log('Loading availability from server:', availability);

        for (const avail of availability) {
            // Convert dayOfWeek - API might return string ("Monday") or number
            const dayNum = this.convertDayOfWeek(avail.dayOfWeek);
            console.log(`Day ${avail.dayOfWeek} -> ${dayNum}, StartTime: ${avail.startTime}, EndTime: ${avail.endTime}`);

            const day = config.find(d => d.dayOfWeek === dayNum);
            if (day && avail.isActive) {
                const startMinutes = this.parseTimeToMinutes(avail.startTime);
                const endMinutes = this.parseTimeToMinutes(avail.endTime);
                console.log(`Day ${day.name}: startMinutes=${startMinutes}, endMinutes=${endMinutes}`);

                for (const slot of day.slots) {
                    const slotMinutes = slot.hour * 60 + slot.minute;
                    if (slotMinutes >= startMinutes && slotMinutes < endMinutes) {
                        slot.selected = true;
                        console.log(`  Selecting slot ${slot.time} (${slotMinutes} minutes)`);
                    }
                }
            }
        }

        this.daysConfig.set([...config]);
    }

    // Convert DayOfWeek from various formats to our 1-5 (Mon-Fri) format
    convertDayOfWeek(dayOfWeek: any): number {
        if (typeof dayOfWeek === 'number') {
            return dayOfWeek;
        }
        // C# DayOfWeek enum serializes as string
        const dayMap: Record<string, number> = {
            'Sunday': 0,
            'Monday': 1,
            'Tuesday': 2,
            'Wednesday': 3,
            'Thursday': 4,
            'Friday': 5,
            'Saturday': 6
        };
        return dayMap[dayOfWeek] ?? 0;
    }

    parseTimeToMinutes(time: string): number {
        const parts = time.split(':');
        return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
    }

    toggleSlot(dayOfWeek: number, hour: number, minute: number) {
        const config = this.daysConfig();
        const day = config.find(d => d.dayOfWeek === dayOfWeek);
        if (day) {
            const slot = day.slots.find(s => s.hour === hour && s.minute === minute);
            if (slot) {
                slot.selected = !slot.selected;
                this.daysConfig.set([...config]);
            }
        }
    }

    getSelectedCount(day: DayColumn): number {
        return day.slots.filter(s => s.selected).length;
    }

    getTotalSelected(): number {
        return this.daysConfig().reduce((total, day) =>
            total + day.slots.filter(s => s.selected).length, 0
        );
    }

    saveAvailability() {
        this.saving.set(true);
        this.saved.set(false);

        // Convert selected slots to individual availability entries
        const slots: any[] = [];

        for (const day of this.daysConfig()) {
            const selectedSlots = day.slots.filter(s => s.selected);
            // Create a separate availability entry for each selected slot
            for (const slot of selectedSlots) {
                const startHour = slot.hour;
                const startMin = slot.minute;
                // End time is start + 1h30 (90 minutes)
                const endMinutes = startHour * 60 + startMin + 90;
                const endHour = Math.floor(endMinutes / 60);
                const endMin = endMinutes % 60;

                slots.push({
                    dayOfWeek: day.dayOfWeek,
                    startTime: `${startHour.toString().padStart(2, '0')}:${startMin.toString().padStart(2, '0')}:00`,
                    endTime: `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}:00`,
                    isActive: true
                });
            }
        }

        this.interviewService.updateAvailability({ slots }).subscribe({
            next: () => {
                this.saving.set(false);
                this.saved.set(true);
                setTimeout(() => this.saved.set(false), 3000);
            },
            error: () => {
                this.saving.set(false);
            }
        });
    }
}
