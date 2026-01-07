import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="landing-page">
      <!-- Hero Section -->
      <section class="hero">
        <div class="hero-content">
          <div class="badge">
            <span class="badge-dot"></span>
            <span>Over 10,000+ jobs available</span>
          </div>
          
          <h1 class="hero-title">
            Find the perfect job<br/>
            <span class="gradient-text">that fits your life</span>
          </h1>
          
          <p class="hero-subtitle">
            Connect with top companies, showcase your skills, and take the next step in your career journey.
          </p>
          
          <div class="hero-actions">
            <a routerLink="/jobs" class="btn-primary-lg">
              <span>Browse Jobs</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </a>
            <a routerLink="/register" class="btn-secondary-lg">
              Create Profile
            </a>
          </div>

          <div class="hero-stats">
            <div class="stat">
              <span class="stat-number">50K+</span>
              <span class="stat-label">Active Users</span>
            </div>
            <div class="stat-divider"></div>
            <div class="stat">
              <span class="stat-number">10K+</span>
              <span class="stat-label">Jobs Posted</span>
            </div>
            <div class="stat-divider"></div>
            <div class="stat">
              <span class="stat-number">5K+</span>
              <span class="stat-label">Companies</span>
            </div>
          </div>
        </div>

        <!-- Floating Cards -->
        <div class="hero-visual">
          <div class="floating-card card-1">
            <div class="card-icon">💼</div>
            <div class="card-text">
              <span class="card-title">Software Engineer</span>
              <span class="card-subtitle">Google • Remote</span>
            </div>
            <span class="card-salary">$180K</span>
          </div>
          
          <div class="floating-card card-2">
            <div class="card-icon">🎨</div>
            <div class="card-text">
              <span class="card-title">Product Designer</span>
              <span class="card-subtitle">Apple • Cupertino</span>
            </div>
            <span class="card-salary">$150K</span>
          </div>
          
          <div class="floating-card card-3">
            <div class="card-icon">📊</div>
            <div class="card-text">
              <span class="card-title">Data Scientist</span>
              <span class="card-subtitle">Meta • New York</span>
            </div>
            <span class="card-salary">$200K</span>
          </div>
        </div>
      </section>

      <!-- Features Section -->
      <section class="features">
        <div class="features-header">
          <h2>Why JobConnect?</h2>
          <p>Everything you need to land your dream job</p>
        </div>
        
        <div class="features-grid">
          <div class="feature-card">
            <div class="feature-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
            </div>
            <h3>Smart Search</h3>
            <p>Find jobs that match your skills and preferences with our intelligent search algorithm.</p>
          </div>
          
          <div class="feature-card">
            <div class="feature-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
            </div>
            <h3>CV Builder</h3>
            <p>Create a professional CV that stands out with our easy-to-use builder.</p>
          </div>
          
          <div class="feature-card">
            <div class="feature-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
              </svg>
            </div>
            <h3>Track Applications</h3>
            <p>Keep track of all your applications in one place with real-time status updates.</p>
          </div>
        </div>
      </section>

      <!-- CTA Section -->
      <section class="cta">
        <div class="cta-content">
          <h2>Ready to find your dream job?</h2>
          <p>Join thousands of professionals who found their perfect role through JobConnect.</p>
          <a routerLink="/register" class="btn-primary-lg">
            Get Started Free
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </a>
        </div>
      </section>

    </div>
  `,
  styles: [`
    .landing-page {
      min-height: 100vh;
      background: var(--bg-secondary);
    }

    /* Hero Section */
    .hero {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4rem;
      max-width: 1200px;
      margin: 0 auto;
      padding: 4rem 2rem 6rem;
      min-height: calc(100vh - 80px);
      align-items: center;

      @media (max-width: 968px) {
        grid-template-columns: 1fr;
        text-align: center;
        padding: 2rem 1.5rem 4rem;
      }
    }

    .hero-content {
      animation: fadeInUp 0.6s ease;
    }

    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(30px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: var(--bg-glass-strong);
      border: 1px solid var(--border-light);
      border-radius: var(--radius-full);
      padding: 0.5rem 1rem;
      font-size: 0.8125rem;
      color: var(--text-secondary);
      margin-bottom: 1.5rem;
      animation: fadeInUp 0.6s ease 0.1s backwards;
    }

    .badge-dot {
      width: 8px;
      height: 8px;
      background: #22c55e;
      border-radius: 50%;
      animation: pulse 2s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.6; transform: scale(1.1); }
    }

    .hero-title {
      font-size: 3.5rem;
      font-weight: 800;
      line-height: 1.1;
      letter-spacing: -0.03em;
      color: var(--text-primary);
      margin-bottom: 1.5rem;
      animation: fadeInUp 0.6s ease 0.2s backwards;

      @media (max-width: 768px) {
        font-size: 2.5rem;
      }
    }

    .gradient-text {
      background: linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #ec4899 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .hero-subtitle {
      font-size: 1.125rem;
      color: var(--text-secondary);
      line-height: 1.7;
      margin-bottom: 2rem;
      max-width: 480px;
      animation: fadeInUp 0.6s ease 0.3s backwards;

      @media (max-width: 968px) {
        margin: 0 auto 2rem;
      }
    }

    .hero-actions {
      display: flex;
      gap: 0.75rem;
      margin-bottom: 3rem;
      animation: fadeInUp 0.6s ease 0.4s backwards;

      @media (max-width: 968px) {
        justify-content: center;
      }

      @media (max-width: 480px) {
        flex-direction: column;
      }
    }

    .btn-primary-lg {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: var(--accent);
      color: var(--text-inverse);
      padding: 0.875rem 1.5rem;
      border-radius: var(--radius-full);
      font-size: 0.9375rem;
      font-weight: 600;
      text-decoration: none;
      transition: all var(--transition-base);

      svg {
        width: 18px;
        height: 18px;
      }

      &:hover {
        background: var(--accent-hover);
        transform: translateY(-2px);
        box-shadow: var(--shadow-lg);
      }
    }

    .btn-secondary-lg {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: var(--bg-primary);
      color: var(--text-primary);
      padding: 0.875rem 1.5rem;
      border-radius: var(--radius-full);
      font-size: 0.9375rem;
      font-weight: 600;
      text-decoration: none;
      border: 1px solid var(--border-default);
      transition: all var(--transition-base);

      &:hover {
        border-color: var(--border-strong);
        box-shadow: var(--shadow-sm);
      }
    }

    .hero-stats {
      display: flex;
      align-items: center;
      gap: 1.5rem;
      animation: fadeInUp 0.6s ease 0.5s backwards;

      @media (max-width: 968px) {
        justify-content: center;
      }

      @media (max-width: 480px) {
        gap: 1rem;
      }
    }

    .stat {
      display: flex;
      flex-direction: column;
    }

    .stat-number {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--text-primary);
    }

    .stat-label {
      font-size: 0.8125rem;
      color: var(--text-muted);
    }

    .stat-divider {
      width: 1px;
      height: 40px;
      background: var(--border-default);
    }

    /* Floating Cards Visual */
    .hero-visual {
      position: relative;
      height: 400px;
      animation: fadeIn 0.8s ease 0.4s backwards;

      @media (max-width: 968px) {
        display: none;
      }
    }

    .floating-card {
      position: absolute;
      display: flex;
      align-items: center;
      gap: 0.875rem;
      background: var(--bg-glass-strong);
      backdrop-filter: blur(12px);
      border: 1px solid var(--border-light);
      border-radius: var(--radius-lg);
      padding: 1rem 1.25rem;
      box-shadow: var(--shadow-lg);
      animation: float 6s ease-in-out infinite;
    }

    .card-1 {
      top: 10%;
      left: 5%;
      animation-delay: 0s;
    }

    .card-2 {
      top: 40%;
      right: 0;
      animation-delay: 1s;
    }

    .card-3 {
      bottom: 15%;
      left: 15%;
      animation-delay: 2s;
    }

    @keyframes float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-12px); }
    }

    .card-icon {
      font-size: 1.5rem;
    }

    .card-text {
      display: flex;
      flex-direction: column;
    }

    .card-title {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--text-primary);
    }

    .card-subtitle {
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    .card-salary {
      font-size: 0.875rem;
      font-weight: 600;
      color: #22c55e;
      margin-left: auto;
    }

    /* Features Section */
    .features {
      padding: 6rem 2rem;
      background: var(--bg-primary);
    }

    .features-header {
      text-align: center;
      margin-bottom: 3rem;

      h2 {
        font-size: 2rem;
        font-weight: 700;
        color: var(--text-primary);
        margin-bottom: 0.5rem;
      }

      p {
        color: var(--text-secondary);
        font-size: 1rem;
      }
    }

    .features-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1.5rem;
      max-width: 1000px;
      margin: 0 auto;

      @media (max-width: 768px) {
        grid-template-columns: 1fr;
      }
    }

    .feature-card {
      background: var(--bg-secondary);
      border: 1px solid var(--border-light);
      border-radius: var(--radius-xl);
      padding: 2rem;
      text-align: center;
      transition: all var(--transition-base);

      &:hover {
        transform: translateY(-4px);
        box-shadow: var(--shadow-lg);
        border-color: var(--border-default);
      }
    }

    .feature-icon {
      width: 48px;
      height: 48px;
      background: var(--accent-soft-bg);
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 1rem;

      svg {
        width: 24px;
        height: 24px;
        color: var(--accent-soft);
      }
    }

    .feature-card h3 {
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: 0.5rem;
    }

    .feature-card p {
      font-size: 0.875rem;
      color: var(--text-secondary);
      line-height: 1.6;
    }

    /* CTA Section */
    .cta {
      padding: 6rem 2rem;
      background: var(--bg-secondary);
    }

    .cta-content {
      max-width: 600px;
      margin: 0 auto;
      text-align: center;

      h2 {
        font-size: 2rem;
        font-weight: 700;
        color: var(--text-primary);
        margin-bottom: 0.75rem;
      }

      p {
        color: var(--text-secondary);
        margin-bottom: 2rem;
        font-size: 1rem;
      }
    }



    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    /* ============================================
       Mobile-Native App Styles
       ============================================ */
    
    @media (max-width: 768px) {
      .hero {
        padding: 1.5rem 1rem 3rem;
        min-height: auto;
        gap: 2rem;
      }

      .badge {
        padding: 0.375rem 0.75rem;
        font-size: 0.75rem;
        margin-bottom: 1rem;
      }

      .hero-title {
        font-size: 2rem;
        margin-bottom: 1rem;
        line-height: 1.15;
      }

      .hero-subtitle {
        font-size: 0.9375rem;
        margin-bottom: 1.5rem;
        line-height: 1.6;
      }

      .hero-actions {
        margin-bottom: 2rem;
        gap: 0.625rem;
      }

      .btn-primary-lg,
      .btn-secondary-lg {
        width: 100%;
        justify-content: center;
        padding: 1rem 1.5rem;
        font-size: 1rem;
        min-height: 52px;
      }

      .hero-stats {
        background: var(--bg-glass-strong);
        border: 1px solid var(--border-light);
        border-radius: var(--radius-xl);
        padding: 1rem;
        gap: 0;
        justify-content: space-around;
        width: 100%;
      }

      .stat {
        align-items: center;
        flex: 1;
      }

      .stat-number {
        font-size: 1.25rem;
      }

      .stat-label {
        font-size: 0.6875rem;
        text-align: center;
      }

      .stat-divider {
        height: 32px;
      }

      /* Features - Horizontal scroll on mobile */
      .features {
        padding: 3rem 0;
      }

      .features-header {
        padding: 0 1rem;
        margin-bottom: 1.5rem;

        h2 {
          font-size: 1.5rem;
        }

        p {
          font-size: 0.875rem;
        }
      }

      .features-grid {
        display: flex;
        overflow-x: auto;
        scroll-snap-type: x mandatory;
        -webkit-overflow-scrolling: touch;
        gap: 1rem;
        padding: 0 1rem;
        margin: 0;
        
        &::-webkit-scrollbar {
          display: none;
        }
      }

      .feature-card {
        min-width: 280px;
        scroll-snap-align: center;
        padding: 1.5rem;
        border-radius: var(--radius-lg);

        &:hover {
          transform: none;
        }
      }

      .feature-icon {
        width: 44px;
        height: 44px;
        margin-bottom: 0.75rem;

        svg {
          width: 22px;
          height: 22px;
        }
      }

      .feature-card h3 {
        font-size: 1rem;
      }

      .feature-card p {
        font-size: 0.8125rem;
      }

      /* CTA Section */
      .cta {
        padding: 3rem 1rem;
      }

      .cta-content {
        h2 {
          font-size: 1.5rem;
        }

        p {
          font-size: 0.9375rem;
          margin-bottom: 1.5rem;
        }

        .btn-primary-lg {
          width: 100%;
        }
      }
    }

    /* Extra small devices */
    @media (max-width: 375px) {
      .hero-title {
        font-size: 1.75rem;
      }

      .hero-subtitle {
        font-size: 0.875rem;
      }

      .stat-number {
        font-size: 1.125rem;
      }

      .feature-card {
        min-width: 260px;
      }
    }
  `]
})
export class LandingComponent { }
