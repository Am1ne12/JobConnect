import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { UserRole } from '../../core/models';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="auth-container">
      <div class="auth-card register-card">
        <div class="auth-header">
          <h1>Create Account</h1>
          <p>Join JobConnect today</p>
        </div>

        <!-- Role Selection -->
        <div class="role-selection">
          <button type="button" 
                  class="role-btn"
                  [class.active]="selectedRole() === 'Candidate'"
                  (click)="selectRole('Candidate')">
            <span class="role-icon">👤</span>
            <span class="role-label">I'm a Candidate</span>
            <span class="role-desc">Looking for jobs</span>
          </button>
          <button type="button" 
                  class="role-btn"
                  [class.active]="selectedRole() === 'Company'"
                  (click)="selectRole('Company')">
            <span class="role-icon">🏢</span>
            <span class="role-label">I'm a Company</span>
            <span class="role-desc">Hiring talent</span>
          </button>
        </div>

        <form [formGroup]="form" (ngSubmit)="submit()">
          <div class="form-group">
            <label>Email</label>
            <input type="email" formControlName="email" placeholder="your@email.com">
          </div>

          <div class="form-group">
            <label>Password</label>
            <input type="password" formControlName="password" placeholder="Min. 6 characters">
          </div>

          @if (selectedRole() === 'Candidate') {
            <div class="form-row">
              <div class="form-group">
                <label>First Name</label>
                <input type="text" formControlName="firstName" placeholder="John">
              </div>
              <div class="form-group">
                <label>Last Name</label>
                <input type="text" formControlName="lastName" placeholder="Doe">
              </div>
            </div>
          }

          @if (selectedRole() === 'Company') {
            <div class="form-group">
              <label>Company Name</label>
              <input type="text" formControlName="companyName" placeholder="Acme Inc.">
            </div>
          }

          @if (error()) {
            <div class="error-message">{{ error() }}</div>
          }

          <button type="submit" class="btn-primary" [disabled]="loading() || form.invalid">
            {{ loading() ? 'Creating account...' : 'Create Account' }}
          </button>
        </form>

        <div class="auth-footer">
          <p>Already have an account? <a routerLink="/login">Sign in</a></p>
        </div>
      </div>
    </div>
  `,
  styleUrl: './auth.component.scss'
})
export class RegisterComponent {
  form: FormGroup;
  loading = signal(false);
  error = signal<string | null>(null);
  selectedRole = signal<'Candidate' | 'Company'>('Candidate');

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      firstName: [''],
      lastName: [''],
      companyName: ['']
    });
  }

  selectRole(role: 'Candidate' | 'Company') {
    this.selectedRole.set(role);
  }

  submit() {
    if (this.form.invalid) return;

    this.loading.set(true);
    this.error.set(null);

    const formValue = this.form.value;
    const request = {
      email: formValue.email,
      password: formValue.password,
      role: this.selectedRole() === 'Candidate' ? UserRole.Candidate : UserRole.Company,
      firstName: formValue.firstName,
      lastName: formValue.lastName,
      companyName: formValue.companyName
    };

    this.authService.register(request).subscribe({
      next: (response) => {
        this.loading.set(false);
        if (response.role === 'Candidate') {
          this.router.navigate(['/candidate/cv-builder']);
        } else {
          this.router.navigate(['/company/dashboard']);
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.message || 'Registration failed. Please try again.');
      }
    });
  }
}
