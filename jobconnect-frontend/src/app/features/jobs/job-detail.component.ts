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
    $dark-bg: #0f0f1a;
    $card-bg: rgba(255, 255, 255, 0.05);
    $text-primary: #ffffff;
    $text-secondary: rgba(255, 255, 255, 0.7);
    $border-color: rgba(255, 255, 255, 0.1);

    .job-detail-page {
      min-height: 100vh;
      background: $dark-bg;
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
      background: $card-bg;
      border-radius: 20px;
      border: 1px solid $border-color;
      margin-bottom: 2rem;

      .company-logo {
        width: 80px;
        height: 80px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 2rem;
        font-weight: 700;
        color: white;
      }

      h1 {
        font-size: 1.75rem;
        font-weight: 700;
        color: $text-primary;
        margin-bottom: 0.25rem;
      }

      .company {
        color: $text-secondary;
        margin-bottom: 0.75rem;
      }
    }

    .meta-tags {
      display: flex;
      gap: 0.5rem;

      .tag {
        background: rgba(255, 255, 255, 0.1);
        padding: 0.375rem 0.75rem;
        border-radius: 8px;
        font-size: 0.85rem;
        color: $text-secondary;

        &.salary {
          color: #fcd34d;
        }
      }
    }

    .job-content {
      display: grid;
      grid-template-columns: 1fr 320px;
      gap: 2rem;
    }

    .main-content {
      section {
        background: $card-bg;
        border-radius: 16px;
        padding: 1.5rem;
        border: 1px solid $border-color;
        margin-bottom: 1rem;

        h2 {
          font-size: 1.1rem;
          font-weight: 600;
          color: $text-primary;
          margin-bottom: 1rem;
        }

        p {
          color: $text-secondary;
          line-height: 1.7;
          white-space: pre-wrap;
        }
      }
    }

    .apply-card, .skills-card {
      background: $card-bg;
      border-radius: 16px;
      padding: 1.5rem;
      border: 1px solid $border-color;
      margin-bottom: 1rem;

      h3 {
        font-size: 1rem;
        font-weight: 600;
        color: $text-primary;
        margin-bottom: 1rem;
      }

      p {
        color: $text-secondary;
        font-size: 0.9rem;
        margin-bottom: 1rem;
      }

      textarea {
        width: 100%;
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid $border-color;
        border-radius: 10px;
        padding: 0.75rem;
        color: $text-primary;
        resize: vertical;
        margin-bottom: 1rem;

        &:focus {
          outline: none;
          border-color: #667eea;
        }
      }
    }

    .btn-apply {
      width: 100%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border: none;
      border-radius: 12px;
      padding: 0.875rem;
      color: white;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;

      &:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 10px 30px rgba(102, 126, 234, 0.3);
      }

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    }

    .applied-badge {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      padding: 0.75rem;
      border-radius: 10px;
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
      background: rgba(102, 126, 234, 0.2);
      color: #a5b4fc;
      padding: 0.375rem 0.75rem;
      border-radius: 8px;
      font-size: 0.85rem;

      .required-badge {
        font-size: 0.65rem;
        background: rgba(245, 158, 11, 0.3);
        color: #fcd34d;
        padding: 0.125rem 0.375rem;
        border-radius: 4px;
        margin-left: 0.375rem;
      }
    }

    .loading-state {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 60vh;

      .spinner {
        width: 48px;
        height: 48px;
        border: 3px solid rgba(255, 255, 255, 0.1);
        border-top-color: #667eea;
        border-radius: 50%;
        animation: spin 1s linear infinite;
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
