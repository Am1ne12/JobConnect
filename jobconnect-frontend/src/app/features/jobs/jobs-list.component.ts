import { Component, OnInit, OnDestroy, signal, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { JobService } from '../../core/services/job.service';
import { SkillService } from '../../core/services/skill.service';
import { JobPosting, Skill } from '../../core/models';

interface JobTypeOption {
  value: string;
  label: string;
  icon: string;
}

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
                 (input)="onSearchInput()"
                 placeholder="Search jobs by title, company, skills...">
          
          <!-- Custom Type Dropdown -->
          <div class="custom-dropdown" [class.open]="typeDropdownOpen">
            <button type="button" class="dropdown-trigger" (click)="toggleTypeDropdown($event)">
              <span class="dropdown-icon">{{ getSelectedTypeIcon() }}</span>
              <span class="dropdown-label">{{ getSelectedTypeLabel() }}</span>
              <svg class="dropdown-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M6 9l6 6 6-6"/>
              </svg>
            </button>
            <div class="dropdown-menu">
              @for (type of jobTypes; track type.value) {
                <button 
                  type="button"
                  class="dropdown-option" 
                  [class.selected]="selectedType === type.value"
                  (click)="selectType(type.value)">
                  <span class="option-icon">{{ type.icon }}</span>
                  <span class="option-label">{{ type.label }}</span>
                  @if (selectedType === type.value) {
                    <svg class="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                      <path d="M20 6L9 17l-5-5"/>
                    </svg>
                  }
                </button>
              }
            </div>
          </div>
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
export class JobsListComponent implements OnInit, OnDestroy {
  jobs = signal<JobPosting[]>([]);
  skills = signal<Skill[]>([]);
  loading = signal(true);

  searchQuery = '';
  selectedType = '';
  typeDropdownOpen = false;

  jobTypes: JobTypeOption[] = [
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
    private skillService: SkillService,
    private elementRef: ElementRef
  ) { }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.typeDropdownOpen = false;
    }
  }

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

  toggleTypeDropdown(event: Event) {
    event.stopPropagation();
    this.typeDropdownOpen = !this.typeDropdownOpen;
  }

  selectType(value: string) {
    this.selectedType = value;
    this.typeDropdownOpen = false;
    this.search();
  }

  getSelectedTypeLabel(): string {
    const selected = this.jobTypes.find(t => t.value === this.selectedType);
    return selected ? selected.label : 'All Types';
  }

  getSelectedTypeIcon(): string {
    const selected = this.jobTypes.find(t => t.value === this.selectedType);
    return selected ? selected.icon : '📋';
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
