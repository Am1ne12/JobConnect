import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { JobService } from '../../core/services/job.service';
import { SkillService } from '../../core/services/skill.service';
import { JobPosting, Skill } from '../../core/models';
import { CustomDropdownComponent, DropdownOption } from '../../shared/components/custom-dropdown/custom-dropdown.component';

@Component({
  selector: 'app-jobs-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, CustomDropdownComponent],
  template: `
    <div class="jobs-page">
      <!-- Hero Header -->
      <div class="page-header">
        <div class="header-orb header-orb-1"></div>
        <div class="header-orb header-orb-2"></div>
        
        <div class="header-badge">
          <span class="badge-dot"></span>
          <span>{{ totalCount() }} jobs available</span>
        </div>
        
        <h1>Find Your <span class="gradient-text">Dream Job</span></h1>
        <p>Discover opportunities that match your skills and take the next step in your career</p>
        
        <div class="search-box">
          <div class="search-input-wrapper">
            <div class="search-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"/>
                <path d="M21 21l-4.35-4.35"/>
              </svg>
            </div>
            <input type="text" 
                   [(ngModel)]="searchQuery" 
                   (input)="onSearchInput()"
                   placeholder="Search jobs by title, company, skills...">
          </div>
          
          <app-custom-dropdown
            [options]="jobTypeOptions"
            [(ngModel)]="selectedType"
            (selectionChange)="search()"
            placeholder="All Types">
          </app-custom-dropdown>
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

          <div class="pagination-info">
            Showing {{ jobs().length }} of {{ totalCount() }} jobs
          </div>

          @if (hasMore()) {
            <div class="load-more-container">
              <button class="load-more-btn" (click)="loadMore()" [disabled]="loadingMore()">
                @if (loadingMore()) {
                  <span class="btn-spinner"></span>
                  Loading...
                } @else {
                  Load More Jobs
                }
              </button>
            </div>
          }
        }
      </div>
    </div>
  `,
  styleUrl: './jobs-list.component.scss'
})
export class JobsListComponent implements OnInit, OnDestroy {
  jobs = signal<JobPosting[]>([]);
  skills = signal<Skill[]>([]);
  loading = signal(true);
  loadingMore = signal(false);
  hasMore = signal(false);
  totalCount = signal(0);
  currentPage = 1;
  readonly pageSize = 20;

  searchQuery = '';
  selectedType = '';

  jobTypeOptions: DropdownOption[] = [
    { value: '', label: 'All Types', icon: '📋' },
    { value: 'FullTime', label: 'Full Time', icon: '💼' },
    { value: 'PartTime', label: 'Part Time', icon: '⏰' },
    { value: 'Contract', label: 'Contract', icon: '📝' },
    { value: 'Internship', label: 'Internship', icon: '🎓' },
    { value: 'Remote', label: 'Remote', icon: '🏠' }
  ];

  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(
    private jobService: JobService,
    private skillService: SkillService
  ) { }

  ngOnInit() {
    this.loadJobs();
    this.skillService.getSkills().subscribe(skills => this.skills.set(skills));

    // Subscribe to debounced search
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.loadJobs();
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadJobs() {
    this.currentPage = 1;
    this.loading.set(true);
    this.jobService.getJobs({
      search: this.searchQuery || undefined,
      type: this.selectedType || undefined,
      page: this.currentPage,
      pageSize: this.pageSize
    }).subscribe({
      next: (result) => {
        this.jobs.set(result.items);
        this.totalCount.set(result.totalCount);
        this.hasMore.set(result.hasMore);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  loadMore() {
    this.currentPage++;
    this.loadingMore.set(true);
    this.jobService.getJobs({
      search: this.searchQuery || undefined,
      type: this.selectedType || undefined,
      page: this.currentPage,
      pageSize: this.pageSize
    }).subscribe({
      next: (result) => {
        this.jobs.update(current => [...current, ...result.items]);
        this.hasMore.set(result.hasMore);
        this.loadingMore.set(false);
      },
      error: () => this.loadingMore.set(false)
    });
  }

  onSearchInput() {
    // Only search if query is empty (to reset) or has 2+ characters
    if (this.searchQuery.length === 0 || this.searchQuery.length >= 2) {
      this.searchSubject.next(this.searchQuery);
    }
  }

  search() {
    this.loadJobs();
  }
}
