import { Routes } from '@angular/router';
import { authGuard, candidateGuard, companyGuard, guestGuard, adminGuard, redirectAdminFromJobsGuard, pwaGuard } from './core/guards/auth.guard';

export const routes: Routes = [
    // Landing page (only in browser mode, not PWA)
    {
        path: '',
        canActivate: [pwaGuard, guestGuard],
        loadComponent: () => import('./features/landing/landing.component').then(m => m.LandingComponent),
        pathMatch: 'full'
    },
    {
        path: 'jobs',
        canActivate: [redirectAdminFromJobsGuard],
        loadComponent: () => import('./features/jobs/jobs-list.component').then(m => m.JobsListComponent)
    },

    {
        path: 'jobs/:id',
        canActivate: [redirectAdminFromJobsGuard],
        loadComponent: () => import('./features/jobs/job-detail.component').then(m => m.JobDetailComponent)
    },

    // Auth routes (redirect to landing if already logged in)
    {
        path: 'login',
        canActivate: [guestGuard],
        loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent)
    },
    {
        path: 'register',
        canActivate: [guestGuard],
        loadComponent: () => import('./features/auth/register.component').then(m => m.RegisterComponent)
    },

    // Settings route (authenticated users only)
    {
        path: 'settings',
        canActivate: [authGuard],
        loadComponent: () => import('./features/settings/settings.component').then(m => m.SettingsComponent)
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
                path: 'jobs/new',
                loadComponent: () => import('./features/company/job-create/job-create.component').then(m => m.JobCreateComponent)
            },
            {
                path: 'jobs/:id/edit',
                loadComponent: () => import('./features/company/job-edit/job-edit.component').then(m => m.JobEditComponent)
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

    // Admin routes
    {
        path: 'admin',
        canActivate: [adminGuard],
        children: [
            {
                path: 'jobs',
                loadComponent: () => import('./features/admin/jobs/admin-jobs.component').then(m => m.AdminJobsComponent)
            },
            {
                path: 'jobs/:id/edit',
                loadComponent: () => import('./features/admin/job-edit/admin-job-edit.component').then(m => m.AdminJobEditComponent)
            },
            {
                path: 'users',
                loadComponent: () => import('./features/admin/users/admin-users.component').then(m => m.AdminUsersComponent)
            },
            {
                path: 'users/new',
                loadComponent: () => import('./features/admin/user-edit/admin-user-edit.component').then(m => m.AdminUserEditComponent)
            },
            {
                path: 'users/:id/edit',
                loadComponent: () => import('./features/admin/user-edit/admin-user-edit.component').then(m => m.AdminUserEditComponent)
            },
            {
                path: '',
                redirectTo: 'jobs',
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
