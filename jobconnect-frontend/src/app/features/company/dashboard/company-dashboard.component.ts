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
