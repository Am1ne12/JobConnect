import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink } from '@angular/router';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink],
  template: `
    <nav class="navbar">
      <a routerLink="/" class="logo">
        <span class="logo-icon">💼</span>
        JobConnect
      </a>
      
      <div class="nav-links">
        <a routerLink="/jobs" class="nav-link">Find Jobs</a>
        
        @if (authService.isAuthenticated()) {
          @if (authService.isCandidate()) {
            <a routerLink="/candidate/cv-builder" class="nav-link">My CV</a>
            <a routerLink="/candidate/applications" class="nav-link">Applications</a>
          }
          @if (authService.isCompany()) {
            <a routerLink="/company/dashboard" class="nav-link">Dashboard</a>
          }
          <button class="btn-logout" (click)="authService.logout()">Logout</button>
        } @else {
          <a routerLink="/login" class="nav-link">Login</a>
          <a routerLink="/register" class="btn-register">Get Started</a>
        }
      </div>
    </nav>

    <main>
      <router-outlet></router-outlet>
    </main>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
      background: #0f0f1a;
    }

    .navbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem 2rem;
      background: rgba(15, 15, 26, 0.9);
      backdrop-filter: blur(10px);
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      position: sticky;
      top: 0;
      z-index: 100;
    }

    .logo {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 1.25rem;
      font-weight: 700;
      color: white;
      text-decoration: none;

      .logo-icon {
        font-size: 1.5rem;
      }
    }

    .nav-links {
      display: flex;
      align-items: center;
      gap: 1.5rem;
    }

    .nav-link {
      color: rgba(255, 255, 255, 0.7);
      text-decoration: none;
      font-weight: 500;
      transition: color 0.2s ease;

      &:hover {
        color: white;
      }
    }

    .btn-register {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 0.625rem 1.25rem;
      border-radius: 10px;
      text-decoration: none;
      font-weight: 600;
      transition: all 0.2s ease;

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 20px rgba(102, 126, 234, 0.3);
      }
    }

    .btn-logout {
      background: transparent;
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: rgba(255, 255, 255, 0.7);
      padding: 0.5rem 1rem;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.2s ease;

      &:hover {
        background: rgba(255, 255, 255, 0.1);
        color: white;
      }
    }

    main {
      min-height: calc(100vh - 70px);
    }
  `]
})
export class App {
  constructor(public authService: AuthService) { }
}
