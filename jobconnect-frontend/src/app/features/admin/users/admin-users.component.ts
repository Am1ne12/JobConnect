import { Component, OnInit, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { ConfigService } from '../../../core/services/config.service';
import { NotificationService } from '../../../core/services/notification.service';
import { PagedResult } from '../../../core/models';

interface AdminUser {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    createdAt: Date;
    updatedAt: Date;
}

@Component({
    selector: 'app-admin-users',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './admin-users.component.html',
    styleUrl: './admin-users.component.scss'
})
export class AdminUsersComponent implements OnInit, OnDestroy {
    users = signal<AdminUser[]>([]);
    loading = signal(true);
    loadingMore = signal(false);
    hasMore = signal(false);
    totalCount = signal(0);
    currentPage = 1;
    readonly pageSize = 20;

    searchQuery = '';

    private searchSubject = new Subject<string>();
    private destroy$ = new Subject<void>();

    constructor(
        private http: HttpClient,
        private configService: ConfigService,
        private notificationService: NotificationService,
        private router: Router
    ) { }

    ngOnInit() {
        this.loadUsers();

        this.searchSubject.pipe(
            debounceTime(300),
            distinctUntilChanged(),
            takeUntil(this.destroy$)
        ).subscribe(() => {
            this.loadUsers();
        });
    }

    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
    }

    loadUsers() {
        this.currentPage = 1;
        this.loading.set(true);
        let url = `${this.configService.apiUrl}/admin/users`;
        const params = new URLSearchParams();

        if (this.searchQuery) {
            params.append('search', this.searchQuery);
        }
        params.append('page', this.currentPage.toString());
        params.append('pageSize', this.pageSize.toString());

        url += `?${params.toString()}`;

        this.http.get<PagedResult<AdminUser>>(url).subscribe({
            next: (result) => {
                this.users.set(result.items);
                this.totalCount.set(result.totalCount);
                this.hasMore.set(result.hasMore);
                this.loading.set(false);
            },
            error: () => {
                this.loading.set(false);
            }
        });
    }

    loadMore() {
        this.currentPage++;
        this.loadingMore.set(true);
        let url = `${this.configService.apiUrl}/admin/users`;
        const params = new URLSearchParams();

        if (this.searchQuery) {
            params.append('search', this.searchQuery);
        }
        params.append('page', this.currentPage.toString());
        params.append('pageSize', this.pageSize.toString());

        url += `?${params.toString()}`;

        this.http.get<PagedResult<AdminUser>>(url).subscribe({
            next: (result) => {
                this.users.update(current => [...current, ...result.items]);
                this.hasMore.set(result.hasMore);
                this.loadingMore.set(false);
            },
            error: () => {
                this.loadingMore.set(false);
            }
        });
    }

    onSearchInput() {
        if (this.searchQuery.length === 0 || this.searchQuery.length >= 2) {
            this.searchSubject.next(this.searchQuery);
        }
    }

    addUser() {
        this.router.navigate(['/admin/users/new']);
    }

    editUser(user: AdminUser) {
        this.router.navigate(['/admin/users', user.id, 'edit']);
    }

    deleteUser(user: AdminUser) {
        const displayName = user.lastName ? `${user.firstName} ${user.lastName}` : user.firstName;
        if (confirm(`Are you sure you want to delete ${displayName}? This action cannot be undone.`)) {
            this.http.delete(`${this.configService.apiUrl}/admin/users/${user.id}`).subscribe({
                next: () => {
                    this.users.update(u => u.filter(x => x.id !== user.id));
                    this.totalCount.update(count => count - 1);
                    this.notificationService.success('User deleted successfully');
                },
                error: () => {
                    this.notificationService.error('Failed to delete user');
                }
            });
        }
    }

    getRoleBadgeClass(role: string): string {
        switch (role) {
            case 'Admin': return 'role-admin';
            case 'Company': return 'role-company';
            case 'Candidate': return 'role-candidate';
            default: return '';
        }
    }
}
