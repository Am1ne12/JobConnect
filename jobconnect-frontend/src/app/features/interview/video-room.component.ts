import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { InterviewService } from '../../core/services/interview.service';
import { AuthService } from '../../core/services/auth.service';
import { Interview, InterviewJoinInfo } from '../../core/models';

@Component({
    selector: 'app-video-room',
    standalone: true,
    imports: [CommonModule, RouterModule],
    template: `
        <div class="video-room-container">
            @if (loading()) {
                <div class="center-content">
                    <div class="spinner"></div>
                    <p>Préparation de la salle...</p>
                </div>
            } @else if (error()) {
                <div class="center-content">
                    <div class="icon">❌</div>
                    <h2>Impossible de rejoindre</h2>
                    <p>{{ errorMessage() }}</p>
                    <a routerLink="/interviews" class="btn btn-primary">Retour aux entretiens</a>
                </div>
            } @else if (waitingForHost()) {
                <div class="center-content">
                    <div class="spinner-circle"></div>
                    <h1>En attente de l'entreprise</h1>
                    <p class="subtitle">{{ joinInfo()?.message }}</p>
                    
                    <div class="info-card">
                        <h3>{{ interview()?.jobTitle }}</h3>
                        <p>Avec {{ interview()?.companyName }}</p>
                    </div>
                    
                    <p class="hint">La page se rafraîchira automatiquement...</p>
                    <a routerLink="/interviews" class="btn btn-secondary">Retour aux entretiens</a>
                </div>
            } @else if (meetingOpened()) {
                <div class="center-content">
                    <div class="check-icon">✓</div>
                    <h1>Entretien en cours</h1>
                    <p class="subtitle">La réunion s'est ouverte dans un nouvel onglet</p>
                    
                    <div class="info-card">
                        <h3>{{ interview()?.jobTitle }}</h3>
                        <p>Avec {{ isCompany() ? interview()?.candidateName : interview()?.companyName }}</p>
                    </div>
                    
                    <div class="actions">
                        <button class="btn btn-secondary" (click)="openMeeting()">
                            Rouvrir la réunion
                        </button>
                        <button class="btn btn-primary" (click)="endInterview()">
                            Terminer l'entretien
                        </button>
                    </div>
                </div>
            }
        </div>
    `,
    styles: [`
        .video-room-container {
            min-height: 100vh;
            background: #f8fafc;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 2rem;
        }

        .center-content {
            text-align: center;
            color: #1e293b;
            max-width: 500px;
        }

        .spinner {
            width: 64px;
            height: 64px;
            border: 4px solid rgba(99, 102, 241, 0.2);
            border-top-color: #6366f1;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 1.5rem;
        }

        .spinner-circle {
            width: 80px;
            height: 80px;
            border: 4px solid #e2e8f0;
            border-top-color: #6366f1;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 2rem;
        }

        .check-icon {
            width: 80px;
            height: 80px;
            background: linear-gradient(135deg, #10b981, #059669);
            color: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 2.5rem;
            margin: 0 auto 2rem;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }

        .spinner {
            width: 64px;
            height: 64px;
            border: 4px solid rgba(255, 255, 255, 0.2);
            border-top-color: #6366f1;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 1.5rem;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }

        .icon {
            font-size: 5rem;
            margin-bottom: 1rem;
        }

        .icon.pulse {
            animation: pulse 2s ease-in-out infinite;
        }

        @keyframes pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.6; transform: scale(1.1); }
        }

        .hint {
            color: #64748b;
            font-size: 0.85rem;
            margin-bottom: 1.5rem;
        }

        h1 {
            font-size: 2rem;
            margin-bottom: 0.5rem;
            font-weight: 600;
        }

        h2 {
            font-size: 1.5rem;
            margin-bottom: 1rem;
        }

        .subtitle {
            color: #64748b;
            font-size: 1rem;
            margin-bottom: 2rem;
        }

        .info-card {
            background: white;
            border: 1px solid #e2e8f0;
            padding: 1.5rem 2rem;
            border-radius: 16px;
            margin-bottom: 2rem;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }

        .info-card h3 {
            color: #6366f1;
            font-size: 1.2rem;
            margin-bottom: 0.5rem;
        }

        .info-card p {
            color: #64748b;
            margin: 0;
        }

        .actions {
            display: flex;
            gap: 1rem;
            justify-content: center;
            flex-wrap: wrap;
        }

        .btn {
            padding: 1rem 2rem;
            border-radius: 12px;
            font-weight: 600;
            border: none;
            cursor: pointer;
            transition: all 0.2s ease;
            font-size: 1rem;
        }

        .btn-primary {
            background: linear-gradient(135deg, #6366f1, #8b5cf6);
            color: white;
        }

        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(99, 102, 241, 0.4);
        }

        .btn-secondary {
            background: white;
            color: #1e293b;
            border: 1px solid #e2e8f0;
        }

        .btn-secondary:hover {
            background: #f1f5f9;
        }
    `]
})
export class VideoRoomComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private interviewService = inject(InterviewService);
    private authService = inject(AuthService);

    loading = signal(true);
    error = signal(false);
    errorMessage = signal('');
    interview = signal<Interview | null>(null);
    joinInfo = signal<InterviewJoinInfo | null>(null);
    meetingOpened = signal(false);
    meetingUrl = signal('');

    isCompany = computed(() => this.authService.isCompany());
    waitingForHost = computed(() => !this.loading() && !this.error() && !this.meetingOpened() && this.joinInfo()?.canJoin === false);

    ngOnInit() {
        const id = Number(this.route.snapshot.paramMap.get('id'));
        if (!id) {
            this.error.set(true);
            this.errorMessage.set('ID d\'entretien invalide');
            this.loading.set(false);
            return;
        }

        this.loadInterview(id);
    }

    loadInterview(id: number) {
        this.interviewService.getInterview(id).subscribe({
            next: (interview) => {
                this.interview.set(interview);
                this.getJoinInfo(id);
            },
            error: (err) => {
                this.error.set(true);
                this.errorMessage.set('Entretien non trouvé');
                this.loading.set(false);
            }
        });
    }

    getJoinInfo(id: number) {
        this.interviewService.getJoinInfo(id).subscribe({
            next: (info) => {
                console.log('Join info received:', info);
                this.joinInfo.set(info);
                this.loading.set(false);

                if (info.canJoin) {
                    // Build meeting URL and open
                    const url = `https://am1ne12-videoconf-2311.app.100ms.live/meeting/${info.roomId}`;
                    this.meetingUrl.set(url);
                    this.openMeeting();
                } else {
                    // Start polling for candidates waiting
                    setTimeout(() => this.getJoinInfo(id), 5000);
                }
            },
            error: (err) => {
                console.error('Error getting join info:', err);
                this.error.set(true);
                this.errorMessage.set(err.error || 'Impossible de rejoindre');
                this.loading.set(false);
            }
        });
    }

    openMeeting() {
        const url = this.meetingUrl();
        if (url) {
            window.open(url, '_blank');

            // For candidates: redirect back to interviews list after opening meeting
            // For companies: stay on this page to be able to end the interview
            if (!this.isCompany()) {
                // Small delay to ensure the new tab opens before redirecting
                setTimeout(() => {
                    this.router.navigate(['/interviews']);
                }, 500);
            } else {
                this.meetingOpened.set(true);
            }
        }
    }

    endInterview() {
        const interviewId = this.interview()?.id;
        if (interviewId) {
            this.interviewService.completeInterview(interviewId).subscribe({
                next: () => {
                    console.log('Interview marked as completed');
                    this.router.navigate(['/interviews']);
                },
                error: (err) => {
                    console.error('Error completing interview:', err);
                    this.router.navigate(['/interviews']);
                }
            });
        } else {
            this.router.navigate(['/interviews']);
        }
    }
}
