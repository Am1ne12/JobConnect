import { Routes } from '@angular/router';
import { authGuard, candidateGuard, companyGuard } from './core/guards/auth.guard';

export const routes: Routes = [
    // Public routes
    {
        path: '',
        loadComponent: () => import('./features/landing/landing.component').then(m => m.LandingComponent)
    },
    {
        path: 'jobs',
        loadComponent: () => import('./features/jobs/jobs-list.component').then(m => m.JobsListComponent)
    },
    {
        path: 'jobs/:id',
        loadComponent: () => import('./features/jobs/job-detail.component').then(m => m.JobDetailComponent)
    },

    // Auth routes
    {
        path: 'login',
        loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent)
    },
    {
        path: 'register',
        loadComponent: () => import('./features/auth/register.component').then(m => m.RegisterComponent)
    },

    // Candidate routes
    {
        path: 'candidate',
        canActivate: [candidateGuard],
        children: [
            {
                path: 'cv-builder',
                loadComponent: () => import('./features/candidate/cv-builder/cv-builder.component').then(m => m.CvBuilderComponent)
            },
            {
                path: 'applications',
                loadComponent: () => import('./features/candidate/application-tracker/application-tracker.component').then(m => m.ApplicationTrackerComponent)
            },
            {
                path: 'profile',
                redirectTo: 'cv-builder'
            },
            {
                path: '',
                redirectTo: 'cv-builder',
                pathMatch: 'full'
            }
        ]
    },

    // Company routes
    {
        path: 'company',
        canActivate: [companyGuard],
        children: [
            {
                path: 'dashboard',
                loadComponent: () => import('./features/company/dashboard/company-dashboard.component').then(m => m.CompanyDashboardComponent)
            },
            {
                path: 'jobs/:id/candidates',
                loadComponent: () => import('./features/company/candidates/candidates-view.component').then(m => m.CandidatesViewComponent)
            },
            {
                path: '',
                redirectTo: 'dashboard',
                pathMatch: 'full'
            }
        ]
    },

    // Catch-all
    {
        path: '**',
        redirectTo: ''
    }
];
