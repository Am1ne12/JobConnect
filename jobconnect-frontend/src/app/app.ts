import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from './core/services/auth.service';
import { NotificationService } from './core/services/notification.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="app-wrapper">
      <nav class="navbar">
        <div class="nav-inner">
          <a routerLink="/" class="logo">
            <div class="logo-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
              </svg>
            </div>
            <span class="logo-text">JobConnect</span>
          </a>
          
          <div class="nav-center">
            <a routerLink="/jobs" routerLinkActive="active" class="nav-link">Find Jobs</a>
            
            @if (authService.isAuthenticated()) {
              @if (authService.isCandidate()) {
                <a routerLink="/candidate/cv-builder" routerLinkActive="active" class="nav-link">My CV</a>
                <a routerLink="/candidate/applications" routerLinkActive="active" class="nav-link">Applications</a>
              }
              @if (authService.isCompany()) {
                <a routerLink="/company/dashboard" routerLinkActive="active" class="nav-link">Dashboard</a>
              }
            }
          </div>

          <div class="nav-actions">
            @if (authService.isAuthenticated()) {
              <button class="btn-ghost" (click)="authService.logout()">
                Log out
              </button>
            } @else {
              <a routerLink="/login" class="btn-ghost">Log in</a>
              <a routerLink="/register" class="btn-primary">Get Started</a>
            }
          </div>
        </div>
      </nav>

      <main>
        <router-outlet></router-outlet>
      </main>

      <footer class="copyright-bar">
        <p>© 2026 JobConnect. All rights reserved.</p>
      </footer>

      <!-- Notifications -->
      <div class="notifications-container">
        @for (notification of notificationService.notifications(); track notification.id) {
          <div class="notification" [class]="notification.type">
            <span class="notification-message">{{ notification.message }}</span>
            <button class="notification-close" (click)="notificationService.dismiss(notification.id)">×</button>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
      background: var(--bg-secondary);
    }

    .app-wrapper {
      min-height: 100vh;
    }

    /* Floating Navbar */
    .navbar {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 100;
      padding: 1rem 1.5rem;
      pointer-events: none;
    }

    .nav-inner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      max-width: 1200px;
      margin: 0 auto;
      padding: 0.625rem 1rem 0.625rem 0.875rem;
      background: var(--bg-glass-strong);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid var(--border-light);
      border-radius: var(--radius-full);
      box-shadow: var(--shadow-lg);
      pointer-events: auto;
      animation: slideDown 0.5s ease;
    }

    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .logo {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      text-decoration: none;
      transition: opacity var(--transition-fast);

      &:hover {
        opacity: 0.7;
      }
    }

    .logo-icon {
      width: 32px;
      height: 32px;
      background: var(--accent);
      border-radius: var(--radius-sm);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;

      svg {
        width: 18px;
        height: 18px;
      }
    }

    .logo-text {
      font-size: 1rem;
      font-weight: 700;
      color: var(--text-primary);
      letter-spacing: -0.02em;
    }

    .nav-center {
      display: flex;
      align-items: center;
      gap: 0.125rem;
    }

    .nav-link {
      color: var(--text-secondary);
      text-decoration: none;
      font-size: 0.875rem;
      font-weight: 500;
      padding: 0.5rem 0.875rem;
      border-radius: var(--radius-full);
      transition: all var(--transition-fast);

      &:hover {
        color: var(--text-primary);
        background: rgba(0, 0, 0, 0.04);
      }

      &.active {
        color: var(--text-primary);
        background: rgba(0, 0, 0, 0.06);
      }
    }

    .nav-actions {
      display: flex;
      align-items: center;
      gap: 0.375rem;
    }

    .btn-ghost {
      display: inline-flex;
      align-items: center;
      background: transparent;
      color: var(--text-secondary);
      padding: 0.5rem 1rem;
      border-radius: var(--radius-full);
      text-decoration: none;
      font-size: 0.875rem;
      font-weight: 500;
      border: none;
      cursor: pointer;
      transition: all var(--transition-fast);

      &:hover {
        color: var(--text-primary);
        background: rgba(0, 0, 0, 0.04);
      }
    }

    .btn-primary {
      display: inline-flex;
      align-items: center;
      background: var(--accent);
      color: var(--text-inverse);
      padding: 0.5rem 1.125rem;
      border-radius: var(--radius-full);
      text-decoration: none;
      font-size: 0.875rem;
      font-weight: 600;
      transition: all var(--transition-base);

      &:hover {
        background: var(--accent-hover);
        transform: translateY(-1px);
        box-shadow: var(--shadow-md);
      }
    }

    main {
      min-height: calc(100vh - 100px);
      padding-top: 80px;
    }

    .copyright-bar {
      padding: 1rem 2rem;
      text-align: center;
      background: var(--bg-primary);
      border-top: 1px solid var(--border-light);

      p {
        font-size: 0.8125rem;
        color: var(--text-muted);
        margin: 0;
      }
    }

    @media (max-width: 768px) {
      .nav-center {
        display: none;
      }

      .navbar {
        padding: 0.75rem 1rem;
      }

      .nav-inner {
        padding: 0.5rem 0.75rem;
      }
    }

    /* Notifications */
    .notifications-container {
      position: fixed;
      bottom: 1.5rem;
      right: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      z-index: 1000;
      max-width: 400px;
    }

    .notification {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem 1.25rem;
      border-radius: var(--radius-lg);
      background: var(--bg-primary);
      border: 1px solid var(--border-light);
      box-shadow: var(--shadow-xl);
      animation: slideIn 0.3s ease;

      &.success {
        border-left: 4px solid #10b981;
        .notification-message::before {
          content: '✓ ';
          color: #10b981;
        }
      }

      &.error {
        border-left: 4px solid #ef4444;
        .notification-message::before {
          content: '✕ ';
          color: #ef4444;
        }
      }

      &.warning {
        border-left: 4px solid #f59e0b;
        .notification-message::before {
          content: '⚠ ';
          color: #f59e0b;
        }
      }

      &.info {
        border-left: 4px solid #6366f1;
        .notification-message::before {
          content: 'ℹ ';
          color: #6366f1;
        }
      }
    }

    .notification-message {
      flex: 1;
      font-size: 0.875rem;
      color: var(--text-primary);
    }

    .notification-close {
      background: transparent;
      border: none;
      color: var(--text-muted);
      font-size: 1.25rem;
      cursor: pointer;
      padding: 0;
      line-height: 1;
      transition: color var(--transition-fast);

      &:hover {
        color: var(--text-primary);
      }
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateX(100%);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }
  `]
})
export class App {
  constructor(
    public authService: AuthService,
    public notificationService: NotificationService
  ) { }
}
