import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { CandidateService } from '../../core/services/candidate.service';
import { CompanyService } from '../../core/services/company.service';
import { HttpClient } from '@angular/common/http';
import { ConfigService } from '../../core/services/config.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="settings-container">
      <div class="settings-content">
        <div class="settings-header">
          <h1>Account Settings</h1>
          <p>Manage your account details and preferences</p>
        </div>

        <!-- Change Name Section -->
        <div class="settings-card">
          <div class="card-header">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            <h2>Change Name</h2>
          </div>
          
          <p class="current-value">Current name: <strong>{{ currentName() || 'Not set' }}</strong></p>
          
          <form [formGroup]="nameForm" (ngSubmit)="changeName()">
            <div class="form-row">
              <div class="form-group">
                <label>{{ authService.isCompany() ? 'Company Name' : 'First Name' }}</label>
                <input type="text" formControlName="firstName" [placeholder]="authService.isCompany() ? 'Enter company name' : 'Enter first name'">
              </div>
              @if (!authService.isCompany()) {
              <div class="form-group">
                <label>Last Name</label>
                <input type="text" formControlName="lastName" placeholder="Enter last name">
              </div>
              }
            </div>

            @if (nameError()) {
              <div class="error-message">{{ nameError() }}</div>
            }

            <button type="submit" class="btn-primary" [disabled]="nameLoading() || nameForm.invalid">
              {{ nameLoading() ? 'Updating...' : 'Update Name' }}
            </button>
          </form>
        </div>

        <!-- Change Email Section -->
        <div class="settings-card">
          <div class="card-header">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
            <h2>Change Email</h2>
          </div>
          
          <p class="current-value">Current email: <strong>{{ authService.currentUser()?.email }}</strong></p>
          
          <form [formGroup]="emailForm" (ngSubmit)="changeEmail()">
            <div class="form-group">
              <label>New Email</label>
              <input type="email" formControlName="newEmail" placeholder="newaddress@email.com">
            </div>

            <div class="form-group">
              <label>Current Password</label>
              <input type="password" formControlName="currentPassword" placeholder="Enter your password to confirm">
            </div>

            @if (emailError()) {
              <div class="error-message">{{ emailError() }}</div>
            }

            <button type="submit" class="btn-primary" [disabled]="emailLoading() || emailForm.invalid">
              {{ emailLoading() ? 'Updating...' : 'Update Email' }}
            </button>
          </form>
        </div>

        <!-- Change Password Section -->
        <div class="settings-card">
          <div class="card-header">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            <h2>Change Password</h2>
          </div>
          
          <form [formGroup]="passwordForm" (ngSubmit)="changePassword()">
            <div class="form-group">
              <label>Current Password</label>
              <input type="password" formControlName="currentPassword" placeholder="Enter current password">
            </div>

            <div class="form-group">
              <label>New Password</label>
              <input type="password" formControlName="newPassword" placeholder="Enter new password (min 6 characters)">
            </div>

            <div class="form-group">
              <label>Confirm New Password</label>
              <input type="password" formControlName="confirmPassword" placeholder="Confirm new password">
            </div>

            @if (passwordError()) {
              <div class="error-message">{{ passwordError() }}</div>
            }

            @if (passwordMismatch()) {
              <div class="error-message">Passwords do not match</div>
            }

            <button type="submit" class="btn-primary" [disabled]="passwordLoading() || passwordForm.invalid || passwordMismatch()">
              {{ passwordLoading() ? 'Updating...' : 'Update Password' }}
            </button>
          </form>
        </div>
    </div>
  `,
  styleUrl: './settings.component.scss'
})
export class SettingsComponent implements OnInit {
  nameForm: FormGroup;
  emailForm: FormGroup;
  passwordForm: FormGroup;

  currentName = signal<string>('');

  nameLoading = signal(false);
  nameError = signal<string | null>(null);

  emailLoading = signal(false);
  emailError = signal<string | null>(null);

  passwordLoading = signal(false);
  passwordError = signal<string | null>(null);

  constructor(
    private fb: FormBuilder,
    public authService: AuthService,
    private notificationService: NotificationService,
    private candidateService: CandidateService,
    private companyService: CompanyService,
    private http: HttpClient,
    private configService: ConfigService
  ) {
    this.nameForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(1)]],
      lastName: ['']
    });

    this.emailForm = this.fb.group({
      newEmail: ['', [Validators.required, Validators.email]],
      currentPassword: ['', Validators.required]
    });

    this.passwordForm = this.fb.group({
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    });
  }

  ngOnInit() {
    this.loadCurrentName();
  }

  private loadCurrentName() {
    if (this.authService.isCandidate()) {
      this.candidateService.getProfile().subscribe({
        next: (profile) => {
          const fullName = `${profile.firstName} ${profile.lastName}`.trim();
          this.currentName.set(fullName);
          this.nameForm.patchValue({
            firstName: profile.firstName,
            lastName: profile.lastName
          });
        },
        error: () => {
          // Profile might not exist yet
        }
      });
    } else if (this.authService.isCompany()) {
      this.companyService.getProfile().subscribe({
        next: (company) => {
          this.currentName.set(company.name);
          this.nameForm.patchValue({
            firstName: company.name,
            lastName: ''
          });
        },
        error: () => {
          // Profile might not exist yet
        }
      });
    } else if (this.authService.isAdmin()) {
      // For admin, fetch from admin endpoint
      const userId = this.authService.currentUser()?.userId;
      if (userId) {
        this.http.get<{ firstName: string, lastName: string }>(`${this.configService.apiUrl}/admin/users/${userId}`).subscribe({
          next: (user: any) => {
            const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
            this.currentName.set(fullName || 'Admin');
            this.nameForm.patchValue({
              firstName: user.firstName || '',
              lastName: user.lastName || ''
            });
          },
          error: () => {
            this.currentName.set('Admin');
          }
        });
      }
    }
  }

  passwordMismatch(): boolean {
    const newPass = this.passwordForm.get('newPassword')?.value;
    const confirmPass = this.passwordForm.get('confirmPassword')?.value;
    return confirmPass && newPass !== confirmPass;
  }

  changeName() {
    if (this.nameForm.invalid) return;

    this.nameLoading.set(true);
    this.nameError.set(null);

    this.authService.changeName({
      firstName: this.nameForm.value.firstName,
      lastName: this.nameForm.value.lastName || ''
    }).subscribe({
      next: () => {
        this.nameLoading.set(false);
        // Update the displayed current name
        if (this.authService.isCompany()) {
          this.currentName.set(this.nameForm.value.firstName);
        } else {
          const fullName = `${this.nameForm.value.firstName} ${this.nameForm.value.lastName || ''}`.trim();
          this.currentName.set(fullName);
        }
        this.notificationService.success('Name updated successfully');
      },
      error: (err) => {
        this.nameLoading.set(false);
        this.nameError.set(err.error?.message || 'Failed to update name');
      }
    });
  }

  changeEmail() {
    if (this.emailForm.invalid) return;

    this.emailLoading.set(true);
    this.emailError.set(null);

    this.authService.changeEmail({
      newEmail: this.emailForm.value.newEmail,
      currentPassword: this.emailForm.value.currentPassword
    }).subscribe({
      next: () => {
        this.emailLoading.set(false);
        this.emailForm.reset();
        this.notificationService.success('Email updated successfully');
      },
      error: (err) => {
        this.emailLoading.set(false);
        this.emailError.set(err.error?.message || 'Failed to update email');
      }
    });
  }

  changePassword() {
    if (this.passwordForm.invalid || this.passwordMismatch()) return;

    this.passwordLoading.set(true);
    this.passwordError.set(null);

    this.authService.changePassword({
      currentPassword: this.passwordForm.value.currentPassword,
      newPassword: this.passwordForm.value.newPassword
    }).subscribe({
      next: () => {
        this.passwordLoading.set(false);
        this.passwordForm.reset();
        this.notificationService.success('Password updated successfully');
      },
      error: (err) => {
        this.passwordLoading.set(false);
        this.passwordError.set(err.error?.message || 'Failed to update password');
      }
    });
  }
}
