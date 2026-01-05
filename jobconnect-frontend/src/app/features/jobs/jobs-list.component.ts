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
      <div class="hero-section">
        <h1>Find Your Dream Job</h1>
        <p>Discover opportunities that match your skills</p>
        
        <div class="search-box">
          <input type="text" 
                 [(ngModel)]="searchQuery" 
                 (input)="search()"
                 placeholder="Search jobs by title, description...">
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
          <div class="jobs-grid">
            @for (job of jobs(); track job.id) {
              <a [routerLink]="['/jobs', job.id]" class="job-card">
                <div class="card-header">
                  <div class="company-logo">{{ job.companyName.charAt(0) }}</div>
                  <div class="job-meta">
                    <h3>{{ job.title }}</h3>
                    <span class="company-name">{{ job.companyName }}</span>
                  </div>
                </div>
                
                <p class="job-description">{{ job.description | slice:0:150 }}...</p>
                
                <div class="job-tags">
                  <span class="tag type">{{ job.jobType }}</span>
                  @if (job.location) {
                    <span class="tag location">📍 {{ job.location }}</span>
                  }
                  @if (job.salaryMin && job.salaryMax) {
                    <span class="tag salary">
                      {{ job.salaryCurrency || 'EUR' }} {{ job.salaryMin | number:'1.0-0' }} - {{ job.salaryMax | number:'1.0-0' }}
                    </span>
                  }
                </div>

                @if (job.requiredSkills?.length) {
                  <div class="skill-tags">
                    @for (skill of job.requiredSkills?.slice(0, 4); track skill.skillId) {
                      <span class="skill-tag">{{ skill.skillName }}</span>
                    }
                  </div>
                }

                <div class="card-footer">
                  <span class="applicants">{{ job.applicationCount }} applicants</span>
                  <span class="posted">Posted {{ job.publishedAt | date:'shortDate' }}</span>
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
