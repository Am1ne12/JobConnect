import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CompanyService } from '../../../core/services/company.service';
import { JobService } from '../../../core/services/job.service';
import { InterviewService } from '../../../core/services/interview.service';
import { Company, JobPosting } from '../../../core/models';

@Component({
  selector: 'app-company-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="dashboard">
      <div class="dashboard-header">
        <div class="header-content">
          <h1>Company Dashboard</h1>
          @if (company()) {
            <p>Welcome back, {{ company()?.name }}</p>
          }
        </div>
        <button class="btn-create" routerLink="/company/jobs/new">+ Create Job</button>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <span class="stat-icon">💼</span>
          <div class="stat-info">
            <span class="stat-value">{{ jobs().length }}</span>
            <span class="stat-label">Active Jobs</span>
          </div>
        </div>
        <div class="stat-card">
          <span class="stat-icon">👥</span>
          <div class="stat-info">
            <span class="stat-value">{{ totalApplications() }}</span>
            <span class="stat-label">Total Applications</span>
          </div>
        </div>
      </div>

      <!-- Availability Setup Section -->
      <div class="availability-section">
        <div class="availability-card">
          <div class="availability-icon">📅</div>
          <div class="availability-info">
            <h3>Disponibilités pour les entretiens</h3>
            <p>{{ hasAvailability() ? 'Vos créneaux sont configurés' : 'Configurez vos créneaux pour recevoir des candidats' }}</p>
          </div>
          @if (hasAvailability()) {
            <span class="availability-status">✓ Configuré</span>
          }
          <a routerLink="/company/availability" class="btn-setup">
            ⚙️ {{ hasAvailability() ? 'Modifier' : 'Configurer' }}
          </a>
        </div>
      </div>

      <div class="jobs-section">
        <h2>Your Job Postings</h2>
        
        @if (loading()) {
          <div class="loading">Loading...</div>
        } @else if (jobs().length === 0) {
          <div class="empty-state">
            <p>No job postings yet</p>
            <button class="btn-primary" routerLink="/company/jobs/new">Create your first job</button>
          </div>
        } @else {
          <div class="jobs-list">
            @for (job of jobs(); track job.id) {
              <div class="job-item">
                <div class="job-info">
                  <a [routerLink]="['/company/jobs', job.id, 'edit']" class="job-title-link">
                    <h3>{{ job.title }}</h3>
                  </a>
                  <div class="job-meta">
                    <span class="status" [class]="job.status.toLowerCase()">{{ job.status }}</span>
                    <span class="type">{{ job.jobType }}</span>
                    @if (job.location) {
                      <span class="location">📍 {{ job.location }}</span>
                    }
                  </div>
                </div>
                <div class="job-stats">
                  <span class="applicants">{{ job.applicationCount }} applicants</span>
                </div>
                <div class="job-actions">
                  @if (job.status === 'Draft') {
                    <button (click)="publishJob(job.id)" class="btn-publish">
                      ✓ Publish
                    </button>
                  } @else if (job.status === 'Published') {
                    <button (click)="unpublishJob(job.id)" class="btn-unpublish">
                      ✗ Unpublish
                    </button>
                  }
                  <a [routerLink]="['/company/jobs', job.id, 'edit']" class="btn-edit">
                    ✎ Edit
                  </a>
                  <a [routerLink]="['/company/jobs', job.id, 'candidates']" class="btn-view">
                    View Candidates
                  </a>
                </div>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
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

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.05); }
    }

    .dashboard {
      min-height: 100vh;
      background: var(--bg-secondary);
      padding: 2rem;
      max-width: 1200px;
      margin: 0 auto;
    }

    .dashboard-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 2rem;
      animation: fadeInUp 0.5s ease backwards;

      h1 {
        font-size: 1.75rem;
        font-weight: 700;
        color: var(--text-primary);
        letter-spacing: -0.02em;
      }

      p {
        color: var(--text-secondary);
        margin-top: 0.25rem;
      }
    }

    .btn-create {
      background: linear-gradient(135deg, #6366f1, #a855f7);
      border: none;
      border-radius: var(--radius-full);
      padding: 0.75rem 1.5rem;
      color: white;
      font-weight: 600;
      cursor: pointer;
      transition: all var(--transition-base);
      box-shadow: 0 4px 15px rgba(99, 102, 241, 0.3);
      animation: fadeInUp 0.5s ease backwards;
      animation-delay: 0.1s;

      &:hover {
        transform: translateY(-3px);
        box-shadow: 0 8px 25px rgba(99, 102, 241, 0.4);
      }
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }

    .stat-card {
      display: flex;
      align-items: center;
      gap: 1rem;
      background: var(--bg-primary);
      border-radius: var(--radius-xl);
      padding: 1.25rem 1.5rem;
      border: 1px solid var(--border-light);
      box-shadow: var(--shadow-sm);
      animation: fadeInUp 0.5s ease backwards;
      transition: all var(--transition-base);

      &:hover {
        transform: translateY(-4px);
        box-shadow: var(--shadow-lg);
        border-color: var(--border-default);
      }

      &:nth-child(1) { animation-delay: 0.15s; }
      &:nth-child(2) { animation-delay: 0.25s; }

      .stat-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 48px;
        height: 48px;
        font-size: 1.5rem;
        background: linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(168, 85, 247, 0.12));
        border-radius: var(--radius-lg);
        flex-shrink: 0;
      }

      .stat-info {
        display: flex;
        flex-direction: column;
        gap: 0.125rem;
      }

      .stat-value {
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--text-primary);
        line-height: 1.2;
      }

      .stat-label {
        font-size: 0.8125rem;
        color: var(--text-secondary);
      }
    }

    /* Availability Section */
    .availability-section {
      animation: fadeInUp 0.5s ease backwards;
      animation-delay: 0.25s;
      margin-bottom: 2rem;
    }

    .availability-card {
      display: flex;
      align-items: center;
      gap: 1rem;
      background: var(--bg-primary);
      border: 1px solid var(--border-light);
      border-radius: var(--radius-xl);
      padding: 1.25rem 1.5rem;
      box-shadow: var(--shadow-sm);
    }

    .availability-icon {
      font-size: 2rem;
      flex-shrink: 0;
    }

    .availability-info {
      flex: 1;

      h3 {
        font-size: 1rem;
        font-weight: 600;
        color: var(--text-primary);
        margin: 0 0 0.25rem 0;
      }

      p {
        font-size: 0.875rem;
        color: var(--text-secondary);
        margin: 0;
      }
    }

    .btn-setup {
      background: linear-gradient(135deg, #10b981, #34d399);
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: var(--radius-full);
      font-weight: 600;
      font-size: 0.875rem;
      cursor: pointer;
      transition: all var(--transition-base);
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
      white-space: nowrap;

      &:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
      }

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    }

    .availability-status {
      color: #10b981;
      font-weight: 600;
      font-size: 0.875rem;
      white-space: nowrap;
    }

    .jobs-section {
      animation: fadeInUp 0.5s ease backwards;
      animation-delay: 0.3s;

      h2 {
        font-size: 1.125rem;
        font-weight: 600;
        color: var(--text-primary);
        margin-bottom: 1.25rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;

        &::before {
          content: '';
          width: 4px;
          height: 1.25rem;
          background: linear-gradient(180deg, #6366f1, #a855f7);
          border-radius: 2px;
        }
      }
    }

    .jobs-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .job-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: var(--bg-primary);
      border-radius: var(--radius-lg);
      padding: 1.25rem 1.5rem;
      border: 1px solid var(--border-light);
      box-shadow: var(--shadow-xs);
      transition: all var(--transition-base);
      animation: fadeInUp 0.4s ease backwards;

      @for $i from 1 through 10 {
        &:nth-child(#{$i}) {
          animation-delay: calc(0.35s + #{$i} * 0.05s);
        }
      }

      &:hover {
        border-color: var(--border-default);
        box-shadow: var(--shadow-md);
        transform: translateX(4px);
      }

      h3 {
        font-size: 1rem;
        font-weight: 600;
        color: var(--text-primary);
        margin-bottom: 0.5rem;
      }
    }

    .job-meta {
      display: flex;
      gap: 0.75rem;
      font-size: 0.8125rem;

      .status {
        padding: 0.25rem 0.625rem;
        border-radius: var(--radius-full);
        font-weight: 500;
        font-size: 0.75rem;

        &.published {
          background: var(--success-bg);
          color: var(--success);
        }

        &.draft {
          background: var(--warning-bg);
          color: var(--warning);
        }

        &.closed {
          background: var(--error-bg);
          color: var(--error);
        }
      }

      .type, .location {
        color: var(--text-secondary);
      }
    }

    .job-stats {
      .applicants {
        background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(168, 85, 247, 0.1));
        color: var(--accent-soft);
        padding: 0.5rem 1rem;
        border-radius: var(--radius-full);
        font-size: 0.8125rem;
        font-weight: 500;
      }
    }

    .btn-view {
      background: transparent;
      border: 1px solid var(--border-default);
      border-radius: var(--radius-full);
      padding: 0.5rem 1rem;
      color: var(--text-secondary);
      text-decoration: none;
      font-size: 0.8125rem;
      font-weight: 500;
      transition: all var(--transition-fast);

      &:hover {
        border-color: var(--accent-soft);
        color: var(--accent-soft);
        background: linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(168, 85, 247, 0.08));
        transform: translateY(-2px);
      }
    }

    .job-title-link {
      text-decoration: none;
      color: inherit;
      
      &:hover h3 {
        color: var(--accent-soft);
      }
    }

    .btn-edit {
      background: transparent;
      border: 1px solid var(--border-default);
      border-radius: var(--radius-full);
      padding: 0.5rem 1rem;
      color: var(--text-secondary);
      text-decoration: none;
      font-size: 0.8125rem;
      font-weight: 500;
      transition: all var(--transition-fast);

      &:hover {
        border-color: #6366f1;
        color: #6366f1;
        background: rgba(99, 102, 241, 0.08);
      }
    }

    .btn-publish {
      background: linear-gradient(135deg, #10b981, #34d399);
      border: none;
      border-radius: var(--radius-full);
      padding: 0.5rem 1rem;
      color: white;
      font-size: 0.8125rem;
      font-weight: 600;
      cursor: pointer;
      transition: all var(--transition-fast);

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4);
      }
    }

    .btn-unpublish {
      background: transparent;
      border: 1px solid #f59e0b;
      border-radius: var(--radius-full);
      padding: 0.5rem 1rem;
      color: #f59e0b;
      font-size: 0.8125rem;
      font-weight: 500;
      cursor: pointer;
      transition: all var(--transition-fast);

      &:hover {
        background: rgba(245, 158, 11, 0.1);
      }
    }

    .job-actions {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .loading {
      text-align: center;
      padding: 3rem;
      color: var(--text-secondary);
      animation: fadeInUp 0.4s ease;

      &::before {
        content: '';
        display: block;
        width: 36px;
        height: 36px;
        border: 2px solid var(--border-default);
        border-top-color: var(--accent);
        border-radius: 50%;
        animation: spin 0.7s linear infinite;
        margin: 0 auto 1rem;
      }
    }

    .empty-state {
      text-align: center;
      padding: 3rem;
      background: var(--bg-primary);
      border-radius: var(--radius-xl);
      border: 1px solid var(--border-light);
      color: var(--text-secondary);
      animation: fadeInUp 0.5s ease backwards;
      animation-delay: 0.3s;

      .btn-primary {
        margin-top: 1rem;
        background: linear-gradient(135deg, #6366f1, #a855f7);
        border: none;
        border-radius: var(--radius-full);
        padding: 0.75rem 1.5rem;
        color: white;
        font-weight: 600;
        cursor: pointer;
        transition: all var(--transition-base);
        box-shadow: 0 4px 15px rgba(99, 102, 241, 0.3);

        &:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 25px rgba(99, 102, 241, 0.4);
        }
      }
    }

    /* ============================================
       Mobile-Native App Styles
       ============================================ */

    @media (max-width: 768px) {
      .dashboard {
        padding: 1rem;
        overflow-x: hidden;
      }

      .dashboard-header {
        flex-direction: column;
        align-items: stretch;
        gap: 1rem;
        margin-bottom: 1.5rem;

        h1 {
          font-size: 1.5rem;
        }

        p {
          font-size: 0.875rem;
          margin-top: 0.125rem;
        }
      }

      .btn-create {
        width: 100%;
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 1rem 1.5rem;
        font-size: 1rem;
      }

      .stats-grid {
        grid-template-columns: 1fr 1fr;
        gap: 0.75rem;
        margin-bottom: 1.5rem;
      }

      .stat-card {
        flex-direction: row;
        align-items: center;
        padding: 1rem;
        border-radius: var(--radius-lg);
        gap: 0.75rem;

        &:hover {
          transform: none;
        }

        .stat-icon {
          width: 40px;
          height: 40px;
          font-size: 1.25rem;
          border-radius: var(--radius-md);
        }

        .stat-info {
          gap: 0;
        }

        .stat-value {
          font-size: 1.25rem;
        }

        .stat-label {
          font-size: 0.6875rem;
          color: var(--text-muted);
        }
      }

      .jobs-section {
        h2 {
          font-size: 1rem;
          margin-bottom: 1rem;
        }
      }

      .jobs-list {
        gap: 0.75rem;
      }

      .job-item {
        flex-direction: column;
        align-items: stretch;
        gap: 1rem;
        padding: 1.25rem;
        border-radius: var(--radius-lg);

        &:hover {
          transform: none;
        }

        &:active {
          transform: scale(0.99);
          background: var(--bg-tertiary);
        }

        h3 {
          font-size: 1rem;
          margin-bottom: 0.5rem;
        }
      }

      .job-info {
        width: 100%;
      }

      .job-meta {
        flex-wrap: wrap;
        gap: 0.5rem;

        .status {
          font-size: 0.75rem;
          padding: 0.25rem 0.625rem;
        }

        .type,
        .location {
          font-size: 0.8125rem;
        }
      }

      .job-stats {
        .applicants {
          display: inline-flex;
          padding: 0.5rem 0.875rem;
          font-size: 0.8125rem;
        }
      }

      .job-actions {
        width: 100%;
      }

      .btn-view {
        display: flex;
        justify-content: center;
        align-items: center;
        width: 100%;
        padding: 0.75rem 1rem;
        font-size: 0.875rem;
      }

      .loading,
      .empty-state {
        padding: 2.5rem 1.5rem;
        border-radius: var(--radius-lg);
      }

      .empty-state .btn-primary {
        width: 100%;
        padding: 1rem 1.5rem;
        font-size: 1rem;
      }
    }

    @media (max-width: 375px) {
      .dashboard {
        padding: 0.75rem;
      }

      .dashboard-header h1 {
        font-size: 1.375rem;
      }

      .stats-grid {
        gap: 0.5rem;
      }

      .stat-card {
        padding: 0.875rem;

        .stat-icon {
          font-size: 1.25rem;
          padding: 0.375rem;
        }

        .stat-value {
          font-size: 1.25rem;
        }
      }

      .job-item {
        padding: 1rem;
        
        h3 {
          font-size: 0.9375rem;
        }
      }
    }
  `]
})
export class CompanyDashboardComponent implements OnInit {
  company = signal<Company | null>(null);
  jobs = signal<JobPosting[]>([]);
  loading = signal(true);
  hasAvailability = signal(false);
  settingUpAvailability = signal(false);

  totalApplications = signal(0);

  constructor(
    private companyService: CompanyService,
    private jobService: JobService,
    private interviewService: InterviewService
  ) { }

  ngOnInit() {
    this.loadData();
    this.loadAvailability();
  }

  private loadData() {
    this.companyService.getProfile().subscribe(company => {
      this.company.set(company);
    });

    this.companyService.getJobs().subscribe({
      next: (jobs) => {
        this.jobs.set(jobs);
        this.totalApplications.set(jobs.reduce((sum, job) => sum + job.applicationCount, 0));
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  private loadAvailability() {
    this.interviewService.getAvailability().subscribe({
      next: (availability) => {
        this.hasAvailability.set(availability && availability.length > 0);
      },
      error: () => this.hasAvailability.set(false)
    });
  }

  initializeAvailability() {
    this.settingUpAvailability.set(true);
    this.interviewService.initializeDefaultAvailability().subscribe({
      next: () => {
        this.hasAvailability.set(true);
        this.settingUpAvailability.set(false);
      },
      error: () => {
        this.settingUpAvailability.set(false);
      }
    });
  }

  publishJob(jobId: number) {
    this.jobService.publishJob(jobId).subscribe({
      next: () => this.loadData(),
      error: (err) => console.error('Failed to publish job:', err)
    });
  }

  unpublishJob(jobId: number) {
    this.jobService.unpublishJob(jobId).subscribe({
      next: () => this.loadData(),
      error: (err) => console.error('Failed to unpublish job:', err)
    });
  }
}



