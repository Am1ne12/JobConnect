import { Component, OnInit, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KanbanBoardComponent } from '../kanban-board/kanban-board.component';
import { CompanyService } from '../../../core/services/company.service';
import { JobService } from '../../../core/services/job.service';
import { Application, JobPosting } from '../../../core/models';

@Component({
    selector: 'app-candidates-view',
    standalone: true,
    imports: [CommonModule, KanbanBoardComponent],
    template: `
    <div class="candidates-page">
      @if (loading()) {
        <div class="loading-state">
          <div class="spinner"></div>
        </div>
      } @else if (job()) {
        <div class="page-header">
          <div>
            <h1>{{ job()?.title }}</h1>
            <p>Manage candidates for this position</p>
          </div>
          <div class="filter-controls">
            <button class="filter-btn" [class.active]="sortBy() === 'score'" (click)="sortByScore()">
              Sort by Match Score
            </button>
            <button class="filter-btn" [class.active]="sortBy() === 'date'" (click)="sortByDate()">
              Sort by Date
            </button>
          </div>
        </div>

        <app-kanban-board [jobId]="jobIdNum"></app-kanban-board>
      }
    </div>
  `,
    styles: [`
    .candidates-page {
      min-height: 100vh;
      background: #0f0f1a;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 2rem 2rem 0;

      h1 {
        font-size: 1.75rem;
        font-weight: 700;
        color: white;
        margin-bottom: 0.25rem;
      }

      p {
        color: rgba(255, 255, 255, 0.7);
      }
    }

    .filter-controls {
      display: flex;
      gap: 0.75rem;
    }

    .filter-btn {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 10px;
      padding: 0.625rem 1rem;
      color: rgba(255, 255, 255, 0.7);
      font-size: 0.875rem;
      cursor: pointer;
      transition: all 0.2s ease;

      &:hover {
        background: rgba(255, 255, 255, 0.1);
      }

      &.active {
        background: rgba(102, 126, 234, 0.2);
        border-color: #667eea;
        color: #667eea;
      }
    }

    .loading-state {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 60vh;

      .spinner {
        width: 48px;
        height: 48px;
        border: 3px solid rgba(255, 255, 255, 0.1);
        border-top-color: #667eea;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `]
})
export class CandidatesViewComponent implements OnInit {
    @Input() id!: string;

    job = signal<JobPosting | null>(null);
    loading = signal(true);
    sortBy = signal<'score' | 'date'>('score');

    get jobIdNum(): number {
        return parseInt(this.id);
    }

    constructor(private jobService: JobService) { }

    ngOnInit() {
        this.jobService.getJob(this.jobIdNum).subscribe({
            next: (job) => {
                this.job.set(job);
                this.loading.set(false);
            },
            error: () => this.loading.set(false)
        });
    }

    sortByScore() {
        this.sortBy.set('score');
    }

    sortByDate() {
        this.sortBy.set('date');
    }
}
