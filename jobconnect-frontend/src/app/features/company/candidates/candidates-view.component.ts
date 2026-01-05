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
      background: var(--bg-secondary);
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 2rem 2rem 0;

      h1 {
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--text-primary);
        margin-bottom: 0.25rem;
      }

      p {
        color: var(--text-secondary);
      }
    }

    .filter-controls {
      display: flex;
      gap: 0.5rem;
    }

    .filter-btn {
      background: var(--bg-primary);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-full);
      padding: 0.5rem 1rem;
      color: var(--text-secondary);
      font-size: 0.8125rem;
      cursor: pointer;
      transition: all var(--transition-fast);

      &:hover {
        border-color: var(--border-strong);
      }

      &.active {
        background: var(--accent-soft-bg);
        border-color: var(--accent-soft);
        color: var(--accent-soft);
      }
    }

    .loading-state {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 60vh;

      .spinner {
        width: 40px;
        height: 40px;
        border: 2px solid var(--border-default);
        border-top-color: var(--accent);
        border-radius: 50%;
        animation: spin 0.7s linear infinite;
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
