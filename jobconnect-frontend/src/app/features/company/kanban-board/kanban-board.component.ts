import { Component, OnInit, signal, Input, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkDragDrop, DragDropModule, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { CompanyService } from '../../../core/services/company.service';
import { Application, ApplicationStatus, KanbanUpdate } from '../../../core/models';
import { CandidateProfileModalComponent } from '../candidate-profile-modal/candidate-profile-modal.component';

interface MoveOption {
    value: string;
    label: string;
}

interface KanbanColumn {
    status: ApplicationStatus;
    title: string;
    color: string;
    applications: Application[];
}

@Component({
    selector: 'app-kanban-board',
    standalone: true,
    imports: [CommonModule, DragDropModule, CandidateProfileModalComponent],
    templateUrl: './kanban-board.component.html',
    styleUrl: './kanban-board.component.scss'
})
export class KanbanBoardComponent implements OnInit {
    @Input() jobId!: number;

    columns = signal<KanbanColumn[]>([]);
    loading = signal(true);
    updating = signal(false);
    saved = signal(false);
    selectedApplication = signal<Application | null>(null);
    isMobile = signal(false);

    private readonly MOBILE_BREAKPOINT = 768;
    private readonly SAVED_DISPLAY_TIME = 2000; // Show "Saved" badge for 2 seconds

    private readonly columnDefs: Omit<KanbanColumn, 'applications'>[] = [
        { status: ApplicationStatus.Submitted, title: 'Submitted', color: '#667eea' },
        { status: ApplicationStatus.Screening, title: 'Screening', color: '#f59e0b' },
        { status: ApplicationStatus.Interview, title: 'Interview', color: '#8b5cf6' },
        { status: ApplicationStatus.Offer, title: 'Offer', color: '#10b981' },
        { status: ApplicationStatus.Hired, title: 'Hired', color: '#06d6a0' },
        { status: ApplicationStatus.Rejected, title: 'Rejected', color: '#ef4444' }
    ];

    constructor(private companyService: CompanyService) {
        this.checkMobile();
    }

    @HostListener('window:resize')
    onResize() {
        this.checkMobile();
    }

    private checkMobile() {
        this.isMobile.set(window.innerWidth < this.MOBILE_BREAKPOINT);
    }

    ngOnInit() {
        this.loadApplications();
    }

    private loadApplications() {
        this.loading.set(true);

        this.companyService.getJobApplications(this.jobId).subscribe({
            next: (applications) => {
                this.initializeColumns(applications);
                this.loading.set(false);
            },
            error: () => this.loading.set(false)
        });
    }

    private initializeColumns(applications: Application[]) {
        const columns: KanbanColumn[] = this.columnDefs.map(def => ({
            ...def,
            applications: applications
                .filter(app => app.status === def.status)
                .sort((a, b) => a.kanbanOrder - b.kanbanOrder)
        }));
        this.columns.set(columns);
    }

    getConnectedLists(): string[] {
        return this.columnDefs.map((_, i) => `column-${i}`);
    }

    drop(event: CdkDragDrop<Application[]>, targetColumn: KanbanColumn) {
        if (event.previousContainer === event.container) {
            // Same column - reorder
            moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
        } else {
            // Different column - transfer
            transferArrayItem(
                event.previousContainer.data,
                event.container.data,
                event.previousIndex,
                event.currentIndex
            );
        }

        // Update all affected applications
        this.saveChanges(targetColumn);
    }

    private saveChanges(affectedColumn: KanbanColumn) {
        this.updating.set(true);
        const updateStartTime = Date.now();
        const MIN_DISPLAY_TIME = 800; // Minimum time to show "Saving changes..." badge

        const updates: KanbanUpdate[] = [];

        // Collect updates for the affected column
        affectedColumn.applications.forEach((app, index) => {
            updates.push({
                applicationId: app.id,
                newStatus: affectedColumn.status,
                newOrder: index
            });
        });

        if (updates.length > 0) {
            this.companyService.reorderKanban(this.jobId, updates).subscribe({
                next: () => {
                    // Ensure minimum display time for the badge
                    const elapsed = Date.now() - updateStartTime;
                    const remainingTime = Math.max(0, MIN_DISPLAY_TIME - elapsed);

                    setTimeout(() => {
                        this.updating.set(false);
                        this.saved.set(true);

                        // Hide saved badge after delay
                        setTimeout(() => {
                            this.saved.set(false);
                        }, this.SAVED_DISPLAY_TIME);
                    }, remainingTime);

                    // Update local state immediately
                    affectedColumn.applications.forEach((app, index) => {
                        app.status = affectedColumn.status;
                        app.kanbanOrder = index;
                    });
                },
                error: () => {
                    const elapsed = Date.now() - updateStartTime;
                    const remainingTime = Math.max(0, MIN_DISPLAY_TIME - elapsed);

                    setTimeout(() => {
                        this.updating.set(false);
                        // Reload on error to ensure consistency
                        this.loadApplications();
                    }, remainingTime);
                }
            });
        }
    }

    getScoreClass(score: number): string {
        if (score >= 70) return 'score-high';
        if (score >= 40) return 'score-medium';
        return 'score-low';
    }

    viewCandidate(application: Application) {
        this.selectedApplication.set(application);
    }

    closeProfileModal() {
        this.selectedApplication.set(null);
    }

    getMoveOptions(): MoveOption[] {
        return this.columns().map(col => ({
            value: col.status,
            label: col.title
        }));
    }

    private getStatusIcon(status: ApplicationStatus): string {
        const icons: Record<ApplicationStatus, string> = {
            [ApplicationStatus.Submitted]: '📥',
            [ApplicationStatus.Screening]: '🔍',
            [ApplicationStatus.Interview]: '💬',
            [ApplicationStatus.Offer]: '📋',
            [ApplicationStatus.Hired]: '✅',
            [ApplicationStatus.Rejected]: '❌'
        };
        return icons[status] || '📁';
    }

    moveToStatus(application: Application, newStatus: string) {
        const currentColumns = this.columns();
        const sourceColumn = currentColumns.find(col =>
            col.applications.some(app => app.id === application.id)
        );
        const targetColumn = currentColumns.find(col => col.status === newStatus);

        if (!sourceColumn || !targetColumn || sourceColumn === targetColumn) {
            return;
        }

        // Remove from source column
        const appIndex = sourceColumn.applications.findIndex(app => app.id === application.id);
        if (appIndex > -1) {
            sourceColumn.applications.splice(appIndex, 1);
        }

        // Add to target column at the end
        targetColumn.applications.push(application);

        // Update the columns signal
        this.columns.set([...currentColumns]);

        // Save changes to backend
        this.saveChanges(targetColumn);
    }
}
