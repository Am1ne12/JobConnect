import { Component, signal, OnInit, inject, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
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
            @if (!authService.isAdmin()) {
              <a routerLink="/jobs" routerLinkActive="active" class="nav-link">Jobs</a>
            }
            
            @if (authService.isAuthenticated()) {
              @if (authService.isCandidate()) {
                <a routerLink="/candidate/cv-builder" routerLinkActive="active" class="nav-link">CV</a>
                <a routerLink="/candidate/applications" routerLinkActive="active" class="nav-link">Applications</a>
                <a routerLink="/interviews" routerLinkActive="active" class="nav-link">Entretiens</a>
              }
              @if (authService.isCompany()) {
                <a routerLink="/company/dashboard" routerLinkActive="active" class="nav-link">Dashboard</a>
                <a routerLink="/interviews" routerLinkActive="active" class="nav-link">Entretiens</a>
              }
              @if (authService.isAdmin()) {
                <a routerLink="/admin/jobs" routerLinkActive="active" class="nav-link">Manage Jobs</a>
                <a routerLink="/admin/users" routerLinkActive="active" class="nav-link">Manage Users</a>
              }
            }
          </div>


          <div class="nav-actions">
            @if (authService.isAuthenticated()) {
              <!-- Notifications Bell -->
              <div class="notification-wrapper">
                <button class="btn-icon notification-btn" (click)="toggleNotifications($event)" title="Notifications">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                  </svg>
                  @if (notificationService.unreadCount() > 0) {
                    <span class="notification-badge">{{ notificationService.unreadCount() }}</span>
                  }
                </button>
                
                @if (notificationsOpen()) {
                  <div class="notification-dropdown">
                    <div class="dropdown-header">
                      <span>Notifications</span>
                      <div class="header-actions">
                        @if (notificationService.unreadCount() > 0) {
                          <button class="mark-read-btn" (click)="notificationService.markAllAsRead()">
                            Tout marquer lu
                          </button>
                        }
                        @if (notificationService.appNotifications().length > 0) {
                          <button class="clear-all-btn" (click)="clearAllNotifications()">
                            Effacer tout
                          </button>
                        }
                      </div>
                    </div>
                    <div class="dropdown-body">
                      @if (notificationService.appNotifications().length === 0) {
                        <div class="empty-notifications">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                          </svg>
                          <p>Aucune notification</p>
                        </div>
                      } @else {
                        @for (notif of notificationService.appNotifications(); track notif.id) {
                          <div class="notification-item" [class.unread]="!notif.isRead" (click)="onNotificationClick(notif)">
                            <div class="notif-icon" [class]="notif.type">
                              @switch (notif.type) {
                                @case ('interview_cancelled') {
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/>
                                  </svg>
                                }
                                @case ('interview_scheduled') {
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                                  </svg>
                                }
                                @case ('application_received') {
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/>
                                  </svg>
                                }
                                @case ('application_status') {
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                                  </svg>
                                }
                                @default {
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
                                  </svg>
                                }
                              }
                            </div>
                            <div class="notif-content">
                              <span class="notif-title">{{ notif.title }}</span>
                              <span class="notif-message">{{ notif.message }}</span>
                              <span class="notif-time">{{ getTimeAgo(notif.createdAt) }}</span>
                            </div>
                          </div>
                        }
                      }
                    </div>
                  </div>
                }
              </div>

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

          <!-- Mobile Actions (bell + hamburger grouped together) -->
          <div class="mobile-actions">
            @if (authService.isAuthenticated()) {
              <div class="mobile-notification-wrapper">
                <button class="btn-icon notification-btn" (click)="toggleNotifications($event)" title="Notifications">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                  </svg>
                  @if (notificationService.unreadCount() > 0) {
                    <span class="notification-badge">{{ notificationService.unreadCount() }}</span>
                  }
                </button>
                
                <!-- Mobile Notification Dropdown -->
                @if (notificationsOpen()) {
                  <div class="notification-dropdown">
                    <div class="dropdown-header">
                      <span>Notifications</span>
                      <div class="header-actions">
                        @if (notificationService.unreadCount() > 0) {
                          <button class="mark-read-btn" (click)="notificationService.markAllAsRead()">
                            Tout marquer lu
                          </button>
                        }
                        @if (notificationService.appNotifications().length > 0) {
                          <button class="clear-all-btn" (click)="clearAllNotifications()">
                            Effacer tout
                          </button>
                        }
                      </div>
                    </div>
                    <div class="dropdown-body">
                      @if (notificationService.appNotifications().length === 0) {
                        <div class="empty-notifications">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                          </svg>
                          <p>Aucune notification</p>
                        </div>
                      } @else {
                        @for (notif of notificationService.appNotifications(); track notif.id) {
                          <div class="notification-item" [class.unread]="!notif.isRead" (click)="onNotificationClick(notif)">
                            <div class="notif-icon" [class]="notif.type">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
                              </svg>
                            </div>
                            <div class="notif-content">
                              <span class="notif-title">{{ notif.title }}</span>
                              <span class="notif-message">{{ notif.message }}</span>
                              <span class="notif-time">{{ getTimeAgo(notif.createdAt) }}</span>
                            </div>
                          </div>
                        }
                      }
                    </div>
                  </div>
                }
              </div>
            }

            <!-- Mobile Menu Button -->
            <button class="mobile-menu-btn" (click)="toggleMobileMenu()" [class.active]="mobileMenuOpen()">
              <span class="hamburger-line"></span>
              <span class="hamburger-line"></span>
              <span class="hamburger-line"></span>
            </button>
          </div>
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
            @if (!authService.isAdmin()) {
              <a routerLink="/jobs" routerLinkActive="active" class="mobile-nav-link" (click)="closeMobileMenu()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                </svg>
                <span>Browse Jobs</span>
              </a>
            }
            
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
                <a routerLink="/interviews" routerLinkActive="active" class="mobile-nav-link" (click)="closeMobileMenu()">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                  <span>Entretiens</span>
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
                <a routerLink="/interviews" routerLinkActive="active" class="mobile-nav-link" (click)="closeMobileMenu()">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                  <span>Entretiens</span>
                </a>
              }
              @if (authService.isAdmin()) {
                <a routerLink="/admin/jobs" routerLinkActive="active" class="mobile-nav-link" (click)="closeMobileMenu()">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                  </svg>
                  <span>Manage Jobs</span>
                </a>
                <a routerLink="/admin/users" routerLinkActive="active" class="mobile-nav-link" (click)="closeMobileMenu()">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                  <span>Manage Users</span>
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
            <div class="notification-icon">
              @switch (notification.type) {
                @case ('success') {
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                }
                @case ('error') {
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="15" y1="9" x2="9" y2="15"/>
                    <line x1="9" y1="9" x2="15" y2="15"/>
                  </svg>
                }
                @case ('warning') {
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/>
                    <line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                }
                @default {
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="16" x2="12" y2="12"/>
                    <line x1="12" y1="8" x2="12.01" y2="8"/>
                  </svg>
                }
              }
            </div>
            <span class="notification-message">{{ notification.message }}</span>
            <button class="notification-close" (click)="notificationService.dismiss(notification.id)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
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


    /* Notification Dropdown */
    .notification-wrapper {
      position: relative;
    }

    .notification-btn {
      position: relative;
    }

    .notification-badge {
      position: absolute;
      top: 2px;
      right: 2px;
      min-width: 18px;
      height: 18px;
      background: linear-gradient(135deg, #ef4444, #dc2626);
      color: white;
      font-size: 11px;
      font-weight: 600;
      border-radius: 9px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 4px;
      box-shadow: 0 2px 4px rgba(239, 68, 68, 0.4);
    }

    .notification-dropdown {
      position: absolute;
      top: calc(100% + 8px);
      right: 0;
      width: 360px;
      max-height: 450px;
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.15), 0 10px 20px rgba(0, 0, 0, 0.1);
      overflow: hidden;
      z-index: 1000;
      animation: dropdownSlide 0.2s ease-out;
    }

    @keyframes dropdownSlide {
      from {
        opacity: 0;
        transform: translateY(-8px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .dropdown-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      border-bottom: 1px solid #e5e7eb;
      background: #f9fafb;

      span {
        font-weight: 600;
        font-size: 15px;
        color: #111827;
      }
    }

    .header-actions {
      display: flex;
      gap: 8px;
    }

    .mark-read-btn {
      background: none;
      border: none;
      color: #6366f1;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 6px;
      transition: all 0.2s;

      &:hover {
        background: rgba(99, 102, 241, 0.1);
      }
    }

    .clear-all-btn {
      background: none;
      border: none;
      color: #ef4444;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 6px;
      transition: all 0.2s;

      &:hover {
        background: rgba(239, 68, 68, 0.1);
      }
    }

    .dropdown-body {
      max-height: 380px;
      overflow-y: auto;
    }

    .empty-notifications {
      padding: 40px 20px;
      text-align: center;
      color: #9ca3af;

      svg {
        width: 48px;
        height: 48px;
        margin-bottom: 12px;
        opacity: 0.5;
      }

      p {
        margin: 0;
        font-size: 14px;
      }
    }

    .notification-item {
      display: flex;
      gap: 12px;
      padding: 14px 20px;
      cursor: pointer;
      transition: all 0.2s;
      border-bottom: 1px solid #f3f4f6;

      &:hover {
        background: #f9fafb;
      }

      &.unread {
        background: rgba(99, 102, 241, 0.04);
      }

      &:last-child {
        border-bottom: none;
      }
    }

    .notif-icon {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      svg {
        width: 18px;
        height: 18px;
      }

      &.interview_cancelled {
        background: #fef2f2;
        color: #ef4444;
      }

      &.interview_scheduled {
        background: #f0fdf4;
        color: #22c55e;
      }

      &.application_received {
        background: #eff6ff;
        color: #3b82f6;
      }

      &.application_status {
        background: #fef3c7;
        color: #f59e0b;
      }

      &.application_update {
        background: #eff6ff;
        color: #3b82f6;
      }

      &.message {
        background: #faf5ff;
        color: #a855f7;
      }

      &.system {
        background: #f5f5f5;
        color: #6b7280;
      }
    }

    .notif-content {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .notif-title {
      font-weight: 600;
      font-size: 13px;
      color: #111827;
    }

    .notif-message {
      font-size: 13px;
      color: #6b7280;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .notif-time {
      font-size: 11px;
      color: #9ca3af;
      margin-top: 2px;
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

      .mobile-actions {
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .mobile-notification-wrapper {
        display: flex;
        position: relative;
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

      .notification-dropdown {
        position: fixed;
        top: 70px;
        right: 10px;
        left: 10px;
        width: auto;
        max-height: 70vh;
      }
    }

    @media (min-width: 769px) {
      .mobile-actions,
      .mobile-notification-wrapper {
        display: none;
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
      gap: 0.875rem;
      padding: 1rem 1.25rem;
      border-radius: var(--radius-xl);
      background: var(--bg-glass-strong);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid var(--border-light);
      box-shadow: 
        0 10px 40px rgba(0, 0, 0, 0.12),
        0 4px 12px rgba(0, 0, 0, 0.08);
      animation: notificationSlideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1);

      &.success {
        .notification-icon {
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(16, 185, 129, 0.05));
          color: #10b981;
        }
      }

      &.error {
        .notification-icon {
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(239, 68, 68, 0.05));
          color: #ef4444;
        }
      }

      &.warning {
        .notification-icon {
          background: linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(245, 158, 11, 0.05));
          color: #f59e0b;
        }
      }

      &.info {
        .notification-icon {
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(99, 102, 241, 0.05));
          color: #6366f1;
        }
      }
    }

    .notification-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border-radius: var(--radius-md);
      flex-shrink: 0;

      svg {
        width: 18px;
        height: 18px;
      }
    }

    @keyframes notificationSlideIn {
      from {
        opacity: 0;
        transform: translateX(100%) scale(0.95);
      }
      to {
        opacity: 1;
        transform: translateX(0) scale(1);
      }
    }

    .notification-message {
      flex: 1;
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--text-primary);
      line-height: 1.4;
    }

    .notification-close {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      background: transparent;
      border: none;
      border-radius: var(--radius-md);
      cursor: pointer;
      padding: 0;
      transition: all var(--transition-fast);
      flex-shrink: 0;

      svg {
        width: 14px;
        height: 14px;
        color: var(--text-muted);
        transition: color var(--transition-fast);
      }

      &:hover {
        background: rgba(0, 0, 0, 0.05);

        svg {
          color: var(--text-primary);
        }
      }
    }
  `]
})
export class App implements OnInit {
  mobileMenuOpen = signal(false);
  mobileMenuClosing = signal(false);
  notificationsOpen = signal(false);

  constructor(
    public authService: AuthService,
    public notificationService: NotificationService
  ) { }

  ngOnInit() {
    // Load notifications if user is authenticated
    if (this.authService.isAuthenticated()) {
      this.notificationService.loadNotifications();
    }
  }

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

  private elementRef = inject(ElementRef);

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    // Close notification dropdown if clicking outside
    if (this.notificationsOpen()) {
      const target = event.target as HTMLElement;
      const isInsideDropdown = target.closest('.notification-dropdown') || target.closest('.notification-btn');
      if (!isInsideDropdown) {
        this.notificationsOpen.set(false);
      }
    }
  }

  toggleNotifications(event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    const willOpen = !this.notificationsOpen();
    this.notificationsOpen.set(willOpen);

    // Reload notifications when opening the dropdown
    if (willOpen && this.authService.isAuthenticated()) {
      this.notificationService.loadNotifications();
    }
  }

  private router = inject(Router);

  onNotificationClick(notif: any) {
    this.notificationService.markAsRead(notif.id);
    this.notificationsOpen.set(false);

    // Navigate based on notification type with scroll support
    if (notif.link) {
      // Add fragment for scrolling to specific item
      let url = notif.link;

      // For application status updates, scroll to the application
      if (notif.type === 'application_status' && notif.link.includes('/candidate/applications')) {
        // Extract application ID from link if present
        const match = notif.link.match(/application[_-]?(\d+)/i);
        if (match) {
          url = `/candidate/applications`;
          this.router.navigateByUrl(url).then(() => {
            setTimeout(() => {
              const element = document.getElementById(`application-${match[1]}`);
              if (element) element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 300);
          });
          return;
        }
      }

      // For interview notifications
      if ((notif.type === 'interview_scheduled' || notif.type === 'interview_cancelled') && notif.link.includes('/interviews')) {
        this.router.navigateByUrl('/interviews').then(() => {
          setTimeout(() => {
            const match = notif.link.match(/interview[_-]?(\d+)/i);
            if (match) {
              const element = document.getElementById(`interview-${match[1]}`);
              if (element) element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }, 300);
        });
        return;
      }

      this.router.navigateByUrl(url);
    }
  }

  clearAllNotifications() {
    this.notificationService.deleteAllNotifications();
    this.notificationsOpen.set(false);
  }

  getTimeAgo(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'À l\'instant';
    if (minutes < 60) return `Il y a ${minutes} min`;
    if (hours < 24) return `Il y a ${hours}h`;
    if (days === 1) return 'Hier';
    return `Il y a ${days} jours`;
  }
}

