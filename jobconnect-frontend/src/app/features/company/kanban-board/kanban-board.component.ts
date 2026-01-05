import { Component, OnInit, signal, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkDragDrop, DragDropModule, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { CompanyService } from '../../../core/services/company.service';
import { Application, ApplicationStatus, KanbanUpdate } from '../../../core/models';

interface KanbanColumn {
    status: ApplicationStatus;
    title: string;
    color: string;
    applications: Application[];
}

@Component({
    selector: 'app-kanban-board',
    standalone: true,
    imports: [CommonModule, DragDropModule],
    templateUrl: './kanban-board.component.html',
    styleUrl: './kanban-board.component.scss'
})
export class KanbanBoardComponent implements OnInit {
    @Input() jobId!: number;

    columns = signal<KanbanColumn[]>([]);
    loading = signal(true);
    updating = signal(false);

    private readonly columnDefs: Omit<KanbanColumn, 'applications'>[] = [
        { status: ApplicationStatus.Submitted, title: 'Submitted', color: '#667eea' },
        { status: ApplicationStatus.Screening, title: 'Screening', color: '#f59e0b' },
        { status: ApplicationStatus.Interview, title: 'Interview', color: '#8b5cf6' },
        { status: ApplicationStatus.Offer, title: 'Offer', color: '#10b981' },
        { status: ApplicationStatus.Hired, title: 'Hired', color: '#06d6a0' },
        { status: ApplicationStatus.Rejected, title: 'Rejected', color: '#ef4444' }
    ];

    constructor(private companyService: CompanyService) { }

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
                    this.updating.set(false);
                    // Update local state
                    affectedColumn.applications.forEach((app, index) => {
                        app.status = affectedColumn.status;
                        app.kanbanOrder = index;
                    });
                },
                error: () => {
                    this.updating.set(false);
                    // Reload on error to ensure consistency
                    this.loadApplications();
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
        // TODO: Open candidate detail modal
        console.log('View candidate:', application);
    }
}
