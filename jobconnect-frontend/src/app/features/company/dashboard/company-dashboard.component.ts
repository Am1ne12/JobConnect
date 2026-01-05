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
    $dark-bg: #0f0f1a;
    $card-bg: rgba(255, 255, 255, 0.05);
    $text-primary: #ffffff;
    $text-secondary: rgba(255, 255, 255, 0.7);
    $border-color: rgba(255, 255, 255, 0.1);

    .dashboard {
      min-height: 100vh;
      background: $dark-bg;
      padding: 2rem;
    }

    .dashboard-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 2rem;

      h1 {
        font-size: 2rem;
        font-weight: 700;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }

      p {
        color: $text-secondary;
        margin-top: 0.25rem;
      }
    }

    .btn-create {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border: none;
      border-radius: 12px;
      padding: 0.875rem 1.5rem;
      color: white;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 10px 30px rgba(102, 126, 234, 0.3);
      }
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }

    .stat-card {
      display: flex;
      align-items: center;
      gap: 1rem;
      background: $card-bg;
      border-radius: 16px;
      padding: 1.5rem;
      border: 1px solid $border-color;

      .stat-icon {
        font-size: 2rem;
      }

      .stat-info {
        display: flex;
        flex-direction: column;
      }

      .stat-value {
        font-size: 1.75rem;
        font-weight: 700;
        color: $text-primary;
      }

      .stat-label {
        font-size: 0.875rem;
        color: $text-secondary;
      }
    }

    .jobs-section {
      h2 {
        font-size: 1.25rem;
        font-weight: 600;
        color: $text-primary;
        margin-bottom: 1.5rem;
      }
    }

    .jobs-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .job-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: $card-bg;
      border-radius: 16px;
      padding: 1.25rem 1.5rem;
      border: 1px solid $border-color;
      transition: all 0.2s ease;

      &:hover {
        border-color: rgba(102, 126, 234, 0.3);
      }

      h3 {
        font-size: 1.1rem;
        font-weight: 600;
        color: $text-primary;
        margin-bottom: 0.5rem;
      }
    }

    .job-meta {
      display: flex;
      gap: 0.75rem;
      font-size: 0.85rem;

      .status {
        padding: 0.25rem 0.625rem;
        border-radius: 6px;
        font-weight: 500;

        &.published {
          background: rgba(16, 185, 129, 0.2);
          color: #10b981;
        }

        &.draft {
          background: rgba(245, 158, 11, 0.2);
          color: #f59e0b;
        }

        &.closed {
          background: rgba(239, 68, 68, 0.2);
          color: #ef4444;
        }
      }

      .type, .location {
        color: $text-secondary;
      }
    }

    .job-stats {
      .applicants {
        background: rgba(102, 126, 234, 0.15);
        color: #a5b4fc;
        padding: 0.5rem 1rem;
        border-radius: 20px;
        font-size: 0.875rem;
        font-weight: 500;
      }
    }

    .btn-view {
      background: transparent;
      border: 1px solid rgba(102, 126, 234, 0.5);
      border-radius: 10px;
      padding: 0.625rem 1.25rem;
      color: #667eea;
      text-decoration: none;
      font-weight: 500;
      transition: all 0.2s ease;

      &:hover {
        background: rgba(102, 126, 234, 0.1);
        border-color: #667eea;
      }
    }

    .empty-state {
      text-align: center;
      padding: 3rem;
      color: $text-secondary;

      .btn-primary {
        margin-top: 1rem;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border: none;
        border-radius: 12px;
        padding: 0.875rem 1.5rem;
        color: white;
        font-weight: 600;
        cursor: pointer;
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
