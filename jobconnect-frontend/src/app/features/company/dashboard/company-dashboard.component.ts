import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CompanyService } from '../../../core/services/company.service';
import { JobService } from '../../../core/services/job.service';
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
                  <h3>{{ job.title }}</h3>
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
      background: var(--accent);
      border: none;
      border-radius: var(--radius-full);
      padding: 0.75rem 1.5rem;
      color: white;
      font-weight: 600;
      cursor: pointer;
      transition: all var(--transition-base);

      &:hover {
        background: var(--accent-hover);
        transform: translateY(-2px);
        box-shadow: var(--shadow-lg);
      }
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1.25rem;
      margin-bottom: 2rem;
    }

    .stat-card {
      display: flex;
      align-items: center;
      gap: 1rem;
      background: var(--bg-primary);
      border-radius: var(--radius-xl);
      padding: 1.5rem;
      border: 1px solid var(--border-light);
      box-shadow: var(--shadow-sm);

      .stat-icon {
        font-size: 1.75rem;
      }

      .stat-info {
        display: flex;
        flex-direction: column;
      }

      .stat-value {
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--text-primary);
      }

      .stat-label {
        font-size: 0.8125rem;
        color: var(--text-secondary);
      }
    }

    .jobs-section {
      h2 {
        font-size: 1.125rem;
        font-weight: 600;
        color: var(--text-primary);
        margin-bottom: 1.25rem;
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

      &:hover {
        border-color: var(--border-default);
        box-shadow: var(--shadow-md);
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
        background: var(--accent-soft-bg);
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
        background: var(--accent-soft-bg);
      }
    }

    .loading {
      text-align: center;
      padding: 2rem;
      color: var(--text-secondary);
    }

    .empty-state {
      text-align: center;
      padding: 3rem;
      background: var(--bg-primary);
      border-radius: var(--radius-xl);
      border: 1px solid var(--border-light);
      color: var(--text-secondary);

      .btn-primary {
        margin-top: 1rem;
        background: var(--accent);
        border: none;
        border-radius: var(--radius-full);
        padding: 0.75rem 1.5rem;
        color: white;
        font-weight: 600;
        cursor: pointer;
        transition: all var(--transition-base);

        &:hover {
          background: var(--accent-hover);
        }
      }
    }
  `]
})
export class CompanyDashboardComponent implements OnInit {
  company = signal<Company | null>(null);
  jobs = signal<JobPosting[]>([]);
  loading = signal(true);

  totalApplications = signal(0);

  constructor(
    private companyService: CompanyService,
    private jobService: JobService
  ) { }

  ngOnInit() {
    this.loadData();
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
}
