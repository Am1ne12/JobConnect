import { Component, OnInit, Input, signal } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { JobService } from '../../core/services/job.service';
import { ApplicationService } from '../../core/services/application.service';
import { CandidateService } from '../../core/services/candidate.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { JobPosting } from '../../core/models';

@Component({
  selector: 'app-job-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="job-detail-page">
      @if (loading()) {
        <div class="loading-state">
          <div class="spinner"></div>
          <p>Loading job details...</p>
        </div>
      } @else if (job()) {
        <!-- Header Bar - Glassmorphism style -->
        <div class="header-bar">
          <div class="header-inner">
            <div class="header-left">
              <button type="button" class="back-btn" (click)="goBack()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
                  <path d="M19 12H5M12 19l-7-7 7-7"/>
                </svg>
              </button>
              <div class="company-logo">{{ job()?.companyName?.charAt(0) }}</div>
              <div class="header-info">
                <h1>{{ job()?.title }}</h1>
                <div class="job-meta">
                  <span class="meta-tag company">{{ job()?.companyName }}</span>
                  <span class="meta-tag type">{{ job()?.jobType }}</span>
                  @if (job()?.location) {
                    <span class="meta-tag location">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                        <circle cx="12" cy="10" r="3"/>
                      </svg>
                      {{ job()?.location }}
                    </span>
                  }
                </div>
              </div>
            </div>
            
            <div class="header-actions">
              @if (job()?.salaryMin && job()?.salaryMax) {
                <span class="salary-badge">
                  {{ job()?.salaryCurrency }} {{ job()?.salaryMin | number:'1.0-0' }} - {{ job()?.salaryMax | number:'1.0-0' }}
                </span>
              }
              <span class="applicants-badge">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                </svg>
                {{ job()?.applicationCount }} applicants
              </span>
            </div>
          </div>
        </div>

        <!-- Content -->
        <div class="content-wrapper">
          <div class="main-column">
            <!-- Description Card -->
            <div class="card">
              <h2>About this role</h2>
              <p>{{ job()?.description }}</p>
            </div>

            <!-- Requirements Card -->
            @if (job()?.requirements) {
              <div class="card">
                <h2>Requirements</h2>
                <p>{{ job()?.requirements }}</p>
              </div>
            }

            <!-- Benefits Card -->
            @if (job()?.benefits) {
              <div class="card">
                <h2>Benefits & Perks</h2>
                <p>{{ job()?.benefits }}</p>
              </div>
            }
          </div>

          <!-- Sidebar -->
          <div class="sidebar-column">
            <!-- Apply Card -->
            <div class="card apply-card">
              @if (authService.isCandidate()) {
                @if (applied()) {
                  <div class="applied-state">
                    <div class="success-icon">✓</div>
                    <h3>Application Submitted!</h3>
                    <p>You've already applied to this position</p>
                    <a routerLink="/candidate/applications" class="btn-secondary">View Applications</a>
                  </div>
                } @else {
                  <h3>Ready to apply?</h3>
                  <p>Take the next step in your career</p>
                  <button class="btn-apply" (click)="apply()" [disabled]="applying()">
                    @if (applying()) {
                      <span class="spinner-small"></span>
                      Submitting...
                    } @else {
                      Apply Now
                    }
                  </button>
                }
              } @else if (authService.isCompany()) {
                <div class="info-state">
                  <p>You're logged in as a company</p>
                </div>
              } @else {
                <h3>Interested in this job?</h3>
                <p>Create an account to apply</p>
                <button class="btn-apply" (click)="goToLogin()">Login to Apply</button>
                <a routerLink="/register" class="btn-secondary">Create Account</a>
              }
            </div>

            <!-- Skills Card -->
            @if (job()?.requiredSkills?.length) {
              <div class="card">
                <h2>Required Skills</h2>
                <div class="skills-list">
                  @for (skill of job()?.requiredSkills; track skill.skillId) {
                    <span class="skill-chip" [class.required]="skill.isRequired">
                      {{ skill.skillName }}
                    </span>
                  }
                </div>
              </div>
            }

            <!-- Experience Card -->
            @if (job()?.experienceYearsMin || job()?.experienceYearsMax) {
              <div class="card">
                <h2>Experience Required</h2>
                <p class="experience-value">
                  {{ job()?.experienceYearsMin || 0 }} - {{ job()?.experienceYearsMax || 'Any' }} years
                </p>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .job-detail-page {
      min-height: 100vh;
      background: var(--bg-secondary);
      overflow-x: hidden;
      width: 100%;
      max-width: 100vw;
    }

    /* Header Bar - Glassmorphism style matching app */
    .header-bar {
      padding: 1rem 2rem;
      background: var(--bg-secondary);
      width: 100%;
      box-sizing: border-box;

      @media (max-width: 768px) {
        padding: 0.75rem 1rem;
      }
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
      box-sizing: border-box;

      @media (max-width: 768px) {
        flex-direction: column;
        border-radius: var(--radius-xl);
        padding: 1rem;
        gap: 1rem;
        align-items: flex-start;
      }
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      min-width: 0;
      flex: 1;

      @media (max-width: 768px) {
        width: 100%;
      }
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

    .company-logo {
      width: 40px;
      height: 40px;
      background: linear-gradient(135deg, #6366f1, #a855f7);
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1rem;
      font-weight: 700;
      color: white;
      flex-shrink: 0;
    }

    .header-info {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      min-width: 0;
      flex: 1;
      overflow: hidden;
    }

    .header-info h1 {
      font-size: 1rem;
      font-weight: 700;
      color: var(--text-primary);
      letter-spacing: -0.02em;
      margin: 0;
      line-height: 1.3;
      word-break: break-word;
      overflow-wrap: break-word;
    }

    .job-meta {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .meta-tag {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.75rem;
      color: var(--text-secondary);

      &.company {
        color: var(--accent-soft);
        font-weight: 500;
      }

      &.type {
        background: var(--info-bg);
        color: var(--info);
        padding: 0.125rem 0.5rem;
        border-radius: var(--radius-full);
      }

      &.location {
        color: var(--text-muted);
      }
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;

      @media (max-width: 768px) {
        width: 100%;
        justify-content: flex-start;
      }
    }

    .salary-badge {
      background: var(--warning-bg);
      color: var(--warning);
      padding: 0.5rem 0.875rem;
      border-radius: var(--radius-full);
      font-size: 0.8125rem;
      font-weight: 600;
    }

    .applicants-badge {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(168, 85, 247, 0.1));
      color: var(--accent-soft);
      padding: 0.5rem 0.875rem;
      border-radius: var(--radius-full);
      font-size: 0.8125rem;
      font-weight: 500;
    }

    /* Content Layout */
    .content-wrapper {
      display: grid;
      grid-template-columns: 1fr 340px;
      gap: 1.5rem;
      max-width: 1100px;
      margin: 0 auto;
      padding: 1.5rem 2rem 3rem;
      box-sizing: border-box;
      width: 100%;

      @media (max-width: 900px) {
        grid-template-columns: 1fr;
      }

      @media (max-width: 768px) {
        padding: 1rem;
        gap: 1rem;
      }
    }

    .main-column {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .sidebar-column {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    /* Cards */
    .card {
      background: var(--bg-primary);
      border-radius: var(--radius-xl);
      padding: 1.5rem;
      border: 1px solid var(--border-light);
      box-shadow: var(--shadow-sm);
      animation: fadeInUp 0.4s ease backwards;
      transition: all var(--transition-base);
      overflow: hidden;
      box-sizing: border-box;

      @media (max-width: 768px) {
        padding: 1.25rem;
        border-radius: var(--radius-lg);
      }

      &:nth-child(1) { animation-delay: 0.1s; }
      &:nth-child(2) { animation-delay: 0.15s; }
      &:nth-child(3) { animation-delay: 0.2s; }

      &:hover {
        box-shadow: var(--shadow-lg);
        border-color: var(--border-default);
      }

      h2 {
        font-size: 1rem;
        font-weight: 600;
        color: var(--text-primary);
        margin-bottom: 1rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        word-break: break-word;

        &::before {
          content: '';
          width: 4px;
          height: 1rem;
          background: linear-gradient(180deg, #6366f1, #a855f7);
          border-radius: 2px;
          flex-shrink: 0;
        }
      }

      p {
        color: var(--text-secondary);
        line-height: 1.7;
        font-size: 0.9375rem;
        white-space: pre-wrap;
        word-break: break-word;
        overflow-wrap: break-word;
      }
    }

    /* Apply Card */
    .apply-card {
      h3 {
        font-size: 1rem;
        font-weight: 600;
        color: var(--text-primary);
        margin-bottom: 0.5rem;
      }

      > p {
        color: var(--text-secondary);
        font-size: 0.875rem;
        margin-bottom: 1rem;
      }

      textarea {
        width: 100%;
        background: var(--bg-tertiary);
        border: 1px solid var(--border-default);
        border-radius: var(--radius-md);
        padding: 0.875rem;
        color: var(--text-primary);
        resize: vertical;
        font-size: 0.875rem;
        line-height: 1.6;
        margin-bottom: 1rem;
        transition: all var(--transition-base);

        &::placeholder { color: var(--text-muted); }

        &:focus {
          outline: none;
          border-color: var(--accent-soft);
          box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
        }
      }
    }

    .btn-apply {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      background: linear-gradient(135deg, #6366f1, #a855f7);
      border: none;
      border-radius: var(--radius-full);
      padding: 0.875rem 1.5rem;
      color: white;
      font-size: 0.9375rem;
      font-weight: 600;
      cursor: pointer;
      transition: all var(--transition-base);
      box-shadow: 0 4px 15px rgba(99, 102, 241, 0.3);

      &:hover:not(:disabled) {
        transform: translateY(-3px);
        box-shadow: 0 8px 25px rgba(99, 102, 241, 0.4);
      }

      &:disabled {
        opacity: 0.7;
        cursor: not-allowed;
      }

      .spinner-small {
        width: 16px;
        height: 16px;
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-top-color: white;
        border-radius: 50%;
        animation: spin 0.7s linear infinite;
      }
    }

    .btn-secondary {
      display: block;
      text-align: center;
      margin-top: 0.75rem;
      padding: 0.75rem;
      background: transparent;
      border: 1px solid var(--border-default);
      border-radius: var(--radius-full);
      color: var(--text-secondary);
      text-decoration: none;
      font-size: 0.875rem;
      font-weight: 500;
      transition: all var(--transition-fast);

      &:hover {
        border-color: var(--accent-soft);
        color: var(--accent-soft);
      }
    }

    .applied-state, .info-state {
      text-align: center;
      padding: 1rem 0;

      .success-icon {
        width: 56px;
        height: 56px;
        background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(52, 211, 153, 0.1));
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #10b981;
        font-size: 1.5rem;
        font-weight: 700;
        margin: 0 auto 1rem;
      }

      h3 {
        color: #10b981;
        margin-bottom: 0.5rem;
      }

      p { margin-bottom: 1rem; }
    }

    .info-state {
      color: var(--text-muted);
    }

    /* Skills */
    .skills-list {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .skill-chip {
      background: linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(168, 85, 247, 0.08));
      color: var(--accent-soft);
      padding: 0.375rem 0.75rem;
      border-radius: var(--radius-full);
      font-size: 0.8125rem;
      font-weight: 500;
      transition: all var(--transition-fast);

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(99, 102, 241, 0.15);
      }
    }

    .experience-value {
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--text-primary);
    }

    /* Loading State */
    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 60vh;
      animation: fadeIn 0.4s ease;

      .spinner {
        width: 36px;
        height: 36px;
        border: 2px solid var(--border-default);
        border-top-color: var(--accent);
        border-radius: 50%;
        animation: spin 0.7s linear infinite;
        margin-bottom: 1rem;
      }

      p {
        color: var(--text-secondary);
        font-size: 0.875rem;
      }
    }
  `]
})
export class JobDetailComponent implements OnInit {
  @Input() id!: string;

  job = signal<JobPosting | null>(null);
  loading = signal(true);
  applying = signal(false);
  applied = signal(false);
  coverLetter = '';

  constructor(
    private jobService: JobService,
    private applicationService: ApplicationService,
    private candidateService: CandidateService,
    public authService: AuthService,
    private notificationService: NotificationService,
    private router: Router,
    private location: Location
  ) { }

  ngOnInit() {
    this.loadJob();
  }

  private loadJob() {
    this.jobService.getJob(parseInt(this.id)).subscribe({
      next: (job) => {
        this.job.set(job);
        this.loading.set(false);

        // Check if candidate has already applied
        if (this.authService.isCandidate()) {
          this.candidateService.hasApplied(job.id).subscribe({
            next: (hasApplied) => this.applied.set(hasApplied),
            error: () => { } // Ignore errors, just don't show applied state
          });
        }
      },
      error: () => {
        this.loading.set(false);
        this.router.navigate(['/jobs']);
      }
    });
  }

  apply() {
    if (!this.job()) return;

    this.applying.set(true);
    this.applicationService.apply(this.job()!.id, this.coverLetter || undefined).subscribe({
      next: () => {
        this.applying.set(false);
        this.applied.set(true);
        this.notificationService.success('Application submitted successfully!');
      },
      error: () => {
        this.applying.set(false);
        this.notificationService.error('Failed to submit application. Please try again.');
      }
    });
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }

  goBack() {
    this.location.back();
  }
}
