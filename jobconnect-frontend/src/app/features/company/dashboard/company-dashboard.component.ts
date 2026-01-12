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

      <!-- Cal.com Integration Section -->
      <div class="availability-section">
        <div class="availability-card">
          <div class="availability-icon">📅</div>
          <div class="availability-info">
            <h3>Mon Agenda</h3>
            <p>Gérez vos disponibilités et entretiens</p>
          </div>
          <a routerLink="/company/calendar" class="btn-setup">
            📅 Voir l'agenda
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
  styleUrl: './company-dashboard.component.scss'
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
