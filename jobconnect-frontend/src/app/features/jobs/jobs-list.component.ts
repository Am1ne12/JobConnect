import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { JobService } from '../../core/services/job.service';
import { SkillService } from '../../core/services/skill.service';
import { JobPosting, Skill } from '../../core/models';

@Component({
  selector: 'app-jobs-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="jobs-page">
      <!-- Hero Header -->
      <div class="page-header">
        <div class="header-orb header-orb-1"></div>
        <div class="header-orb header-orb-2"></div>
        
        <div class="header-badge">
          <span class="badge-dot"></span>
          <span>Over 10,000+ jobs available</span>
        </div>
        
        <h1>Find Your <span class="gradient-text">Dream Job</span></h1>
        <p>Discover opportunities that match your skills and take the next step in your career</p>
        
        <div class="search-box">
          <div class="search-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/>
              <path d="M21 21l-4.35-4.35"/>
            </svg>
          </div>
          <input type="text" 
                 [(ngModel)]="searchQuery" 
                 (input)="search()"
                 placeholder="Search jobs by title, company, skills...">
          <select [(ngModel)]="selectedType" (change)="search()">
            <option value="">All Types</option>
            <option value="FullTime">Full Time</option>
            <option value="PartTime">Part Time</option>
            <option value="Contract">Contract</option>
            <option value="Internship">Internship</option>
            <option value="Remote">Remote</option>
          </select>
        </div>
      </div>

      <div class="jobs-container">
        @if (loading()) {
          <div class="loading-state">
            <div class="spinner"></div>
            <p>Loading jobs...</p>
          </div>
        } @else if (jobs().length === 0) {
          <div class="empty-state">
            <h3>No jobs found</h3>
            <p>Try adjusting your search criteria</p>
          </div>
        } @else {
          <div class="jobs-list">
            @for (job of jobs(); track job.id; let i = $index) {
              <a [routerLink]="['/jobs', job.id]" class="job-item" [style.animation-delay]="(i * 0.04) + 's'">
                <div class="job-logo">{{ job.companyName.charAt(0) }}</div>
                
                <div class="job-info">
                  <h3>{{ job.title }}</h3>
                  <span class="company-name">{{ job.companyName }}</span>
                </div>
                
                <div class="job-meta">
                  <span class="tag type">{{ job.jobType }}</span>
                  @if (job.location) {
                    <span class="tag location">📍 {{ job.location }}</span>
                  }
                </div>
                
                <div class="job-salary">
                  @if (job.salaryMin && job.salaryMax) {
                    <span class="salary">{{ job.salaryCurrency || 'EUR' }} {{ job.salaryMin | number:'1.0-0' }} - {{ job.salaryMax | number:'1.0-0' }}</span>
                  }
                </div>

                <div class="job-stats">
                  <span class="applicants">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                      <circle cx="9" cy="7" r="4"/>
                    </svg>
                    {{ job.applicationCount }}
                  </span>
                  <span class="posted">{{ job.publishedAt | date:'shortDate' }}</span>
                </div>

                <div class="job-arrow">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
                    <path d="M9 18l6-6-6-6"/>
                  </svg>
                </div>
              </a>
            }
          </div>
        }
      </div>
    </div>
  `,
  styleUrl: './jobs-list.component.scss'
})
export class JobsListComponent implements OnInit {
  jobs = signal<JobPosting[]>([]);
  skills = signal<Skill[]>([]);
  loading = signal(true);

  searchQuery = '';
  selectedType = '';

  constructor(
    private jobService: JobService,
    private skillService: SkillService
  ) { }

  ngOnInit() {
    this.loadJobs();
    this.skillService.getSkills().subscribe(skills => this.skills.set(skills));
  }

  private loadJobs() {
    this.loading.set(true);
    this.jobService.getJobs({
      search: this.searchQuery || undefined,
      type: this.selectedType || undefined
    }).subscribe({
      next: (jobs) => {
        this.jobs.set(jobs);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  search() {
    this.loadJobs();
  }
}
