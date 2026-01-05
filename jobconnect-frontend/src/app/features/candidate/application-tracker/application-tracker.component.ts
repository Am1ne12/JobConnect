import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CandidateService } from '../../../core/services/candidate.service';
import { Application, ApplicationStatus } from '../../../core/models';

interface StatusStep {
    status: ApplicationStatus;
    label: string;
    icon: string;
}

@Component({
    selector: 'app-application-tracker',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './application-tracker.component.html',
    styleUrl: './application-tracker.component.scss'
})
export class ApplicationTrackerComponent implements OnInit {
    applications = signal<Application[]>([]);
    loading = signal(true);

    readonly statusSteps: StatusStep[] = [
        { status: ApplicationStatus.Submitted, label: 'Submitted', icon: '📤' },
        { status: ApplicationStatus.Screening, label: 'Screening', icon: '🔍' },
        { status: ApplicationStatus.Interview, label: 'Interview', icon: '💬' },
        { status: ApplicationStatus.Offer, label: 'Offer', icon: '🎉' },
        { status: ApplicationStatus.Hired, label: 'Hired', icon: '✅' }
    ];

    constructor(private candidateService: CandidateService) { }

    ngOnInit() {
        this.loadApplications();
    }

    private loadApplications() {
        this.candidateService.getApplications().subscribe({
            next: (apps) => {
                this.applications.set(apps);
                this.loading.set(false);
            },
            error: () => this.loading.set(false)
        });
    }

    getStatusIndex(status: string): number {
        return this.statusSteps.findIndex(s => s.status === status);
    }

    isStepComplete(appStatus: string, stepStatus: ApplicationStatus): boolean {
        const appIndex = this.getStatusIndex(appStatus);
        const stepIndex = this.statusSteps.findIndex(s => s.status === stepStatus);
        return appIndex >= stepIndex;
    }

    isStepCurrent(appStatus: string, stepStatus: ApplicationStatus): boolean {
        return appStatus === stepStatus;
    }

    isRejected(status: string): boolean {
        return status === ApplicationStatus.Rejected;
    }

    getScoreClass(score: number): string {
        if (score >= 70) return 'score-high';
        if (score >= 40) return 'score-medium';
        return 'score-low';
    }
}
