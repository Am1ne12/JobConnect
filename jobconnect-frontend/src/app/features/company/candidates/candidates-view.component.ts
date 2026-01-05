import { Component, OnInit, Input, signal } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { KanbanBoardComponent } from '../kanban-board/kanban-board.component';
import { CompanyService } from '../../../core/services/company.service';
import { JobService } from '../../../core/services/job.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Application, JobPosting } from '../../../core/models';

@Component({
  selector: 'app-candidates-view',
  standalone: true,
  imports: [CommonModule, RouterLink, KanbanBoardComponent],
  template: `
    <div class="candidates-page">
      @if (loading()) {
        <div class="loading-state">
          <div class="spinner"></div>
          <p>Loading candidates...</p>
        </div>
      } @else if (job()) {
        <!-- Dashboard Header Bar -->
        <div class="header-bar">
          <div class="header-inner">
            <div class="header-left">
              <button type="button" class="back-btn" (click)="goBack()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
                  <path d="M19 12H5M12 19l-7-7 7-7"/>
                </svg>
              </button>
              <div class="header-info">
                <h1>{{ job()?.title }}</h1>
                <div class="job-meta">
                  <span class="meta-tag location">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                      <circle cx="12" cy="10" r="3"/>
                    </svg>
                    {{ job()?.location || 'Remote' }}
                  </span>
                  <span class="meta-tag applicants">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                      <circle cx="9" cy="7" r="4"/>
                    </svg>
                    {{ job()?.applicationCount || 0 }} applicants
                  </span>
                </div>
              </div>
            </div>
            
            <div class="header-actions">
              <a [routerLink]="['/company/jobs', jobIdNum, 'edit']" class="edit-btn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
                Edit
              </a>
              <button class="delete-btn" (click)="confirmDelete()" [disabled]="deleting()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
                @if (deleting()) { Deleting... } @else { Delete }
              </button>
              <div class="sort-group">
                <span class="sort-label">Sort by</span>
                <button class="sort-btn" [class.active]="sortBy() === 'score'" (click)="sortByScore()">
                  Score
                </button>
                <button class="sort-btn" [class.active]="sortBy() === 'date'" (click)="sortByDate()">
                  Date
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="kanban-container">
          <app-kanban-board [jobId]="jobIdNum"></app-kanban-board>
        </div>
      }
    </div>
  `,
  styles: [`
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .candidates-page {
      min-height: 100vh;
      background: var(--bg-secondary);
    }

    /* Header Bar - Glassmorphism style matching navbar */
    .header-bar {
      padding: 1rem 2rem;
      background: var(--bg-secondary);
    }

    .header-inner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1.5rem;
      max-width: 1100px;
      margin: 0 auto;
      padding: 0.75rem 1rem;
      background: var(--bg-glass-strong);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid var(--border-light);
      border-radius: var(--radius-full);
      box-shadow: var(--shadow-md);
      animation: fadeIn 0.4s ease;

      @media (max-width: 768px) {
        flex-direction: column;
        border-radius: var(--radius-xl);
        padding: 1rem;
        gap: 1rem;
      }
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .back-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      background: transparent;
      color: var(--text-secondary);
      border-radius: 50%;
      text-decoration: none;
      transition: all var(--transition-fast);

      &:hover {
        background: rgba(0, 0, 0, 0.04);
        color: var(--text-primary);
      }
    }

    .header-info {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .header-info h1 {
      font-size: 1rem;
      font-weight: 700;
      color: var(--text-primary);
      letter-spacing: -0.02em;
      margin: 0;
      line-height: 1.3;
    }

    .job-meta {
      display: flex;
      align-items: center;
      gap: 0.625rem;
    }

    .meta-tag {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.75rem;
      color: var(--text-muted);

      svg {
        opacity: 0.6;
      }

      &.applicants {
        color: var(--accent);
        font-weight: 500;
      }
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .edit-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      background: transparent;
      color: var(--text-secondary);
      padding: 0.5rem 0.875rem;
      border-radius: var(--radius-full);
      text-decoration: none;
      font-size: 0.8125rem;
      font-weight: 500;
      transition: all var(--transition-fast);

      &:hover {
        color: var(--text-primary);
        background: rgba(0, 0, 0, 0.04);
      }
    }

    .delete-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      background: transparent;
      color: var(--text-secondary);
      padding: 0.5rem 0.875rem;
      border-radius: var(--radius-full);
      border: none;
      font-size: 0.8125rem;
      font-weight: 500;
      cursor: pointer;
      transition: all var(--transition-fast);

      &:hover:not(:disabled) {
        color: #ef4444;
        background: rgba(239, 68, 68, 0.08);
      }

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    }

    .sort-group {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      background: rgba(0, 0, 0, 0.03);
      padding: 0.25rem;
      border-radius: var(--radius-full);
    }

    .sort-label {
      font-size: 0.75rem;
      color: var(--text-muted);
      padding: 0 0.5rem;
    }

    .sort-btn {
      background: transparent;
      border: none;
      border-radius: var(--radius-full);
      padding: 0.375rem 0.875rem;
      color: var(--text-secondary);
      font-size: 0.8125rem;
      font-weight: 500;
      cursor: pointer;
      transition: all var(--transition-fast);

      &:hover {
        color: var(--text-primary);
      }

      &.active {
        background: var(--bg-primary);
        color: var(--text-primary);
        box-shadow: var(--shadow-sm);
      }
    }

    /* Kanban Container */
    .kanban-container {
      padding: 0 2rem 2rem;
      animation: fadeIn 0.4s ease 0.1s backwards;
    }

    /* Loading State */
    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 60vh;
      color: var(--text-secondary);
      animation: fadeIn 0.4s ease;

      .spinner {
        width: 36px;
        height: 36px;
        border: 2px solid var(--border-default);
        border-top-color: var(--accent);
        border-radius: 50%;
        animation: spin 0.7s linear infinite;
        margin-bottom: 0.75rem;
      }

      p {
        font-size: 0.875rem;
      }
    }
  `]
})
export class CandidatesViewComponent implements OnInit {
  @Input() id!: string;

  job = signal<JobPosting | null>(null);
  loading = signal(true);
  deleting = signal(false);
  sortBy = signal<'score' | 'date'>('score');

  get jobIdNum(): number {
    return parseInt(this.id);
  }

  constructor(
    private jobService: JobService,
    private notificationService: NotificationService,
    private router: Router,
    private location: Location
  ) { }

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

  confirmDelete() {
    const confirmed = confirm(`Are you sure you want to delete "${this.job()?.title}"? This action cannot be undone.`);
    if (confirmed) {
      this.deleteJob();
    }
  }

  deleteJob() {
    this.deleting.set(true);
    this.jobService.deleteJob(this.jobIdNum).subscribe({
      next: () => {
        this.deleting.set(false);
        this.notificationService.success('Job deleted successfully!');
        this.router.navigate(['/company/dashboard']);
      },
      error: () => {
        this.deleting.set(false);
        this.notificationService.error('Failed to delete job. Please try again.');
      }
    });
  }

  goBack() {
    this.location.back();
  }
}
