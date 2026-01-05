import { Component, signal } from '@angular/core';
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
          <a routerLink="/" class="logo" (click)="closeMobileMenu()">
            <img src="logo.png" alt="JobConnect" class="logo-icon">
            <span class="logo-text">JobConnect</span>
          </a>
          
          <div class="nav-center">
            <a routerLink="/jobs" routerLinkActive="active" class="nav-link">Jobs</a>
            
            @if (authService.isAuthenticated()) {
              @if (authService.isCandidate()) {
                <a routerLink="/candidate/cv-builder" routerLinkActive="active" class="nav-link">CV</a>
                <a routerLink="/candidate/applications" routerLinkActive="active" class="nav-link">Applications</a>
              }
              @if (authService.isCompany()) {
                <a routerLink="/company/dashboard" routerLinkActive="active" class="nav-link">Dashboard</a>
              }
            }
          </div>


          <div class="nav-actions">
            @if (authService.isAuthenticated()) {
              <a routerLink="/settings" class="btn-icon" title="Settings">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              </a>
              <button class="btn-ghost" (click)="authService.logout()">
                Log out
              </button>
            } @else {
              <a routerLink="/login" class="btn-ghost">Log in</a>
              <a routerLink="/register" class="btn-primary">Get Started</a>
            }
          </div>

          <!-- Mobile Menu Button -->
          <button class="mobile-menu-btn" (click)="toggleMobileMenu()" [class.active]="mobileMenuOpen()">
            <span class="hamburger-line"></span>
            <span class="hamburger-line"></span>
            <span class="hamburger-line"></span>
          </button>
        </div>
      </nav>

      <!-- Mobile Navigation Drawer -->
      @if (mobileMenuOpen() || mobileMenuClosing()) {
        <div class="mobile-overlay" [class.closing]="mobileMenuClosing()" (click)="closeMobileMenu()"></div>
        <div class="mobile-drawer" [class.closing]="mobileMenuClosing()">
          <div class="mobile-drawer-header">
            <span class="mobile-drawer-title">Menu</span>
            <button class="mobile-close-btn" (click)="closeMobileMenu()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
          
          <div class="mobile-nav-links">
            <a routerLink="/jobs" routerLinkActive="active" class="mobile-nav-link" (click)="closeMobileMenu()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
              </svg>
              <span>Browse Jobs</span>
            </a>
            
            @if (authService.isAuthenticated()) {
              @if (authService.isCandidate()) {
                <a routerLink="/candidate/cv-builder" routerLinkActive="active" class="mobile-nav-link" (click)="closeMobileMenu()">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                    <line x1="10" y1="9" x2="8" y2="9"/>
                  </svg>
                  <span>CV Builder</span>
                </a>
                <a routerLink="/candidate/applications" routerLinkActive="active" class="mobile-nav-link" (click)="closeMobileMenu()">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
                  </svg>
                  <span>Applications</span>
                </a>
              }
              @if (authService.isCompany()) {
                <a routerLink="/company/dashboard" routerLinkActive="active" class="mobile-nav-link" (click)="closeMobileMenu()">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="7" height="7"/>
                    <rect x="14" y="3" width="7" height="7"/>
                    <rect x="14" y="14" width="7" height="7"/>
                    <rect x="3" y="14" width="7" height="7"/>
                  </svg>
                  <span>Dashboard</span>
                </a>
              }
            }
          </div>

          <div class="mobile-nav-footer">
            @if (authService.isAuthenticated()) {
              <a routerLink="/settings" class="mobile-btn mobile-btn-outline" (click)="closeMobileMenu()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
                Settings
              </a>
              <button class="mobile-btn mobile-btn-outline" (click)="handleLogout()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                Log out
              </button>
            } @else {
              <a routerLink="/login" class="mobile-btn mobile-btn-outline" (click)="closeMobileMenu()">
                Log in
              </a>
              <a routerLink="/register" class="mobile-btn mobile-btn-primary" (click)="closeMobileMenu()">
                Get Started
              </a>
            }
          </div>
        </div>
      }

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
      overflow-x: hidden;
      max-width: 100vw;
    }

    .app-wrapper {
      min-height: 100vh;
      overflow-x: hidden;
      width: 100%;
      max-width: 100vw;
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
      box-sizing: border-box;
      max-width: 100vw;
      overflow: visible;
      background: transparent;
    }

    .nav-inner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      max-width: 1200px;
      width: 100%;
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
      box-sizing: border-box;
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
      border-radius: var(--radius-sm);
      object-fit: cover;
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

    .btn-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      background: transparent;
      border-radius: var(--radius-full);
      text-decoration: none;
      cursor: pointer;
      transition: all var(--transition-fast);

      svg {
        width: 18px;
        height: 18px;
        color: var(--text-secondary);
        transition: color var(--transition-fast);
      }

      &:hover {
        background: rgba(0, 0, 0, 0.04);

        svg {
          color: var(--text-primary);
        }
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

    /* Mobile Menu Button */
    .mobile-menu-btn {
      display: none;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      width: 40px;
      height: 40px;
      background: transparent;
      border: none;
      cursor: pointer;
      padding: 0;
      gap: 5px;
      border-radius: var(--radius-md);
      transition: background var(--transition-fast);

      &:hover {
        background: rgba(0, 0, 0, 0.04);
      }

      .hamburger-line {
        width: 20px;
        height: 2px;
        background: var(--text-primary);
        border-radius: 1px;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        transform-origin: center;
        transform: rotate(0) translate(0, 0);
        opacity: 1;
      }

      &.active {
        .hamburger-line:nth-child(1) {
          transform: rotate(45deg) translate(5px, 5px);
        }
        .hamburger-line:nth-child(2) {
          opacity: 0;
          transform: scaleX(0);
        }
        .hamburger-line:nth-child(3) {
          transform: rotate(-45deg) translate(5px, -5px);
        }
      }
    }

    /* Mobile Overlay */
    .mobile-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
      z-index: 150;
      animation: fadeIn 0.3s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes fadeOut {
      from { opacity: 1; }
      to { opacity: 0; }
    }

    /* Mobile Drawer */
    .mobile-drawer {
      position: fixed;
      top: 0;
      right: 0;
      bottom: 0;
      width: 85%;
      max-width: 320px;
      background: var(--bg-primary);
      z-index: 200;
      display: flex;
      flex-direction: column;
      box-shadow: var(--shadow-xl);
      animation: slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;

      &.closing {
        animation: slideOut 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
      }
    }

    .mobile-overlay.closing {
      animation: fadeOut 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
    }

    @keyframes slideIn {
      from { transform: translateX(100%); }
      to { transform: translateX(0); }
    }

    @keyframes slideOut {
      from { transform: translateX(0); }
      to { transform: translateX(100%); }
    }

    .mobile-drawer-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid var(--border-light);
    }

    .mobile-drawer-title {
      font-size: 1rem;
      font-weight: 600;
      color: var(--text-primary);
    }

    .mobile-close-btn {
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--bg-tertiary);
      border: none;
      border-radius: 50%;
      cursor: pointer;
      transition: all var(--transition-fast);

      svg {
        width: 18px;
        height: 18px;
        color: var(--text-secondary);
      }

      &:hover {
        background: var(--bg-secondary);
        svg {
          color: var(--text-primary);
        }
      }
    }

    .mobile-nav-links {
      flex: 1;
      padding: 1rem;
      overflow-y: auto;
    }

    .mobile-nav-link {
      display: flex;
      align-items: center;
      gap: 0.875rem;
      padding: 1rem 1.25rem;
      border-radius: var(--radius-lg);
      color: var(--text-secondary);
      text-decoration: none;
      font-size: 0.9375rem;
      font-weight: 500;
      margin-bottom: 0.25rem;
      transition: all var(--transition-fast);

      svg {
        width: 22px;
        height: 22px;
        flex-shrink: 0;
      }

      &:hover {
        background: var(--bg-tertiary);
        color: var(--text-primary);
      }

      &.active {
        background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(168, 85, 247, 0.1));
        color: var(--accent-soft);
      }
    }

    .mobile-nav-footer {
      padding: 1.5rem;
      border-top: 1px solid var(--border-light);
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .mobile-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.875rem 1.5rem;
      border-radius: var(--radius-full);
      font-size: 0.9375rem;
      font-weight: 600;
      text-decoration: none;
      cursor: pointer;
      transition: all var(--transition-base);
      border: none;

      svg {
        width: 18px;
        height: 18px;
      }
    }

    .mobile-btn-outline {
      background: transparent;
      border: 1px solid var(--border-default);
      color: var(--text-secondary);

      &:hover {
        border-color: var(--border-strong);
        color: var(--text-primary);
        background: var(--bg-tertiary);
      }
    }

    .mobile-btn-primary {
      background: linear-gradient(135deg, #6366f1, #a855f7);
      color: white;
      box-shadow: 0 4px 15px rgba(99, 102, 241, 0.3);

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(99, 102, 241, 0.4);
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

    /* Responsive */
    @media (max-width: 768px) {
      .nav-center,
      .nav-actions {
        display: none;
      }

      .mobile-menu-btn {
        display: flex;
      }

      .navbar {
        padding: 0.75rem 1rem;
      }

      .nav-inner {
        padding: 0.5rem 0.75rem;
      }

      main {
        padding-top: 72px;
      }

      .copyright-bar {
        padding: 1rem;
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

    @media (max-width: 480px) {
      .notifications-container {
        left: 1rem;
        right: 1rem;
        max-width: none;
      }
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
      animation: notificationSlideIn 0.3s ease;

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

    @keyframes notificationSlideIn {
      from {
        opacity: 0;
        transform: translateX(100%);
      }
      to {
        opacity: 1;
        transform: translateX(0);
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
  `]
})
export class App {
  mobileMenuOpen = signal(false);
  mobileMenuClosing = signal(false);

  constructor(
    public authService: AuthService,
    public notificationService: NotificationService
  ) { }

  toggleMobileMenu() {
    if (this.mobileMenuOpen()) {
      this.closeMobileMenu();
    } else {
      this.mobileMenuOpen.set(true);
      document.body.style.overflow = 'hidden';
    }
  }

  closeMobileMenu() {
    if (!this.mobileMenuOpen() || this.mobileMenuClosing()) return;

    this.mobileMenuClosing.set(true);
    document.body.style.overflow = '';

    setTimeout(() => {
      this.mobileMenuOpen.set(false);
      this.mobileMenuClosing.set(false);
    }, 300); // Match animation duration
  }

  handleLogout() {
    this.closeMobileMenu();
    this.authService.logout();
  }
}
