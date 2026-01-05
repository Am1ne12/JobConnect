import { Component, OnInit, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { JobService } from '../../core/services/job.service';
import { ApplicationService } from '../../core/services/application.service';
import { AuthService } from '../../core/services/auth.service';
import { JobPosting } from '../../core/models';

@Component({
  selector: 'app-job-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="job-detail-page">
      @if (loading()) {
        <div class="loading-state">
          <div class="spinner"></div>
        </div>
      } @else if (job()) {
        <div class="job-container">
          <div class="job-header">
            <div class="company-logo">{{ job()?.companyName?.charAt(0) }}</div>
            <div class="job-info">
              <h1>{{ job()?.title }}</h1>
              <p class="company">{{ job()?.companyName }}</p>
              <div class="meta-tags">
                <span class="tag">{{ job()?.jobType }}</span>
                @if (job()?.location) {
                  <span class="tag">📍 {{ job()?.location }}</span>
                }
                @if (job()?.salaryMin && job()?.salaryMax) {
                  <span class="tag salary">
                    {{ job()?.salaryCurrency }} {{ job()?.salaryMin | number:'1.0-0' }} - {{ job()?.salaryMax | number:'1.0-0' }}
                  </span>
                }
              </div>
            </div>
          </div>

          <div class="job-content">
            <div class="main-content">
              <section>
                <h2>Description</h2>
                <p>{{ job()?.description }}</p>
              </section>

              @if (job()?.requirements) {
                <section>
                  <h2>Requirements</h2>
                  <p>{{ job()?.requirements }}</p>
                </section>
              }

              @if (job()?.benefits) {
                <section>
                  <h2>Benefits</h2>
                  <p>{{ job()?.benefits }}</p>
                </section>
              }
            </div>

            <div class="sidebar">
              <div class="apply-card">
                @if (authService.isCandidate()) {
                  @if (applied()) {
                    <div class="applied-badge">✓ Applied</div>
                    <p>You have already applied to this job</p>
                  } @else {
                    <h3>Apply for this position</h3>
                    <textarea [(ngModel)]="coverLetter" 
                              placeholder="Write a cover letter (optional)..."
                              rows="4"></textarea>
                    <button class="btn-apply" (click)="apply()" [disabled]="applying()">
                      {{ applying() ? 'Applying...' : 'Apply Now' }}
                    </button>
                  }
                } @else if (authService.isCompany()) {
                  <p class="info-text">You're logged in as a company</p>
                } @else {
                  <h3>Interested in this job?</h3>
                  <p>Login or register to apply</p>
                  <button class="btn-apply" (click)="goToLogin()">Login to Apply</button>
                }
              </div>

              @if (job()?.requiredSkills?.length) {
                <div class="skills-card">
                  <h3>Required Skills</h3>
                  <div class="skills-list">
                    @for (skill of job()?.requiredSkills; track skill.skillId) {
                      <span class="skill-chip" [class.required]="skill.isRequired">
                        {{ skill.skillName }}
                        @if (skill.isRequired) {
                          <span class="required-badge">Required</span>
                        }
                      </span>
                    }
                  </div>
                </div>
              }
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .job-detail-page {
      min-height: 100vh;
      background: var(--bg-secondary);
      padding: 2rem;
    }

    .job-container {
      max-width: 1100px;
      margin: 0 auto;
    }

    .job-header {
      display: flex;
      gap: 1.5rem;
      padding: 2rem;
      background: var(--bg-primary);
      border-radius: var(--radius-xl);
      border: 1px solid var(--border-light);
      box-shadow: var(--shadow-sm);
      margin-bottom: 2rem;

      .company-logo {
        width: 72px;
        height: 72px;
        background: var(--accent);
        border-radius: var(--radius-lg);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.75rem;
        font-weight: 700;
        color: white;
        flex-shrink: 0;
      }

      h1 {
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--text-primary);
        margin-bottom: 0.25rem;
      }

      .company {
        color: var(--text-secondary);
        margin-bottom: 0.75rem;
      }
    }

    .meta-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;

      .tag {
        background: var(--bg-tertiary);
        padding: 0.375rem 0.75rem;
        border-radius: var(--radius-full);
        font-size: 0.8125rem;
        color: var(--text-secondary);

        &.salary {
          color: var(--warning);
          background: var(--warning-bg);
        }
      }
    }

    .job-content {
      display: grid;
      grid-template-columns: 1fr 300px;
      gap: 1.5rem;

      @media (max-width: 768px) {
        grid-template-columns: 1fr;
      }
    }

    .main-content {
      section {
        background: var(--bg-primary);
        border-radius: var(--radius-lg);
        padding: 1.5rem;
        border: 1px solid var(--border-light);
        box-shadow: var(--shadow-xs);
        margin-bottom: 1rem;

        h2 {
          font-size: 1rem;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 0.75rem;
        }

        p {
          color: var(--text-secondary);
          line-height: 1.7;
          white-space: pre-wrap;
          font-size: 0.9375rem;
        }
      }
    }

    .apply-card, .skills-card {
      background: var(--bg-primary);
      border-radius: var(--radius-lg);
      padding: 1.5rem;
      border: 1px solid var(--border-light);
      box-shadow: var(--shadow-sm);
      margin-bottom: 1rem;

      h3 {
        font-size: 0.9375rem;
        font-weight: 600;
        color: var(--text-primary);
        margin-bottom: 0.75rem;
      }

      p {
        color: var(--text-secondary);
        font-size: 0.875rem;
        margin-bottom: 1rem;
      }

      textarea {
        width: 100%;
        background: var(--bg-tertiary);
        border: 1px solid var(--border-default);
        border-radius: var(--radius-md);
        padding: 0.75rem;
        color: var(--text-primary);
        resize: vertical;
        margin-bottom: 1rem;
        font-size: 0.875rem;

        &::placeholder {
          color: var(--text-muted);
        }

        &:focus {
          outline: none;
          border-color: var(--accent-soft);
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }
      }
    }

    .btn-apply {
      width: 100%;
      background: var(--accent);
      border: none;
      border-radius: var(--radius-full);
      padding: 0.875rem;
      color: white;
      font-weight: 600;
      cursor: pointer;
      transition: all var(--transition-base);

      &:hover:not(:disabled) {
        background: var(--accent-hover);
        transform: translateY(-1px);
        box-shadow: var(--shadow-md);
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }

    .applied-badge {
      background: var(--success);
      padding: 0.75rem;
      border-radius: var(--radius-md);
      color: white;
      font-weight: 600;
      text-align: center;
      margin-bottom: 0.75rem;
    }

    .skills-list {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .skill-chip {
      background: var(--accent-soft-bg);
      color: var(--accent-soft);
      padding: 0.375rem 0.75rem;
      border-radius: var(--radius-full);
      font-size: 0.8125rem;

      .required-badge {
        font-size: 0.625rem;
        background: var(--warning-bg);
        color: var(--warning);
        padding: 0.125rem 0.375rem;
        border-radius: 4px;
        margin-left: 0.375rem;
      }
    }

    .info-text {
      color: var(--text-muted);
      font-size: 0.875rem;
    }

    .loading-state {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 60vh;

      .spinner {
        width: 40px;
        height: 40px;
        border: 2px solid var(--border-default);
        border-top-color: var(--accent);
        border-radius: 50%;
        animation: spin 0.7s linear infinite;
      }
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
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
    public authService: AuthService,
    private router: Router
  ) { }

  ngOnInit() {
    this.loadJob();
  }

  private loadJob() {
    this.jobService.getJob(parseInt(this.id)).subscribe({
      next: (job) => {
        this.job.set(job);
        this.loading.set(false);
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
      },
      error: () => this.applying.set(false)
    });
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }
}
