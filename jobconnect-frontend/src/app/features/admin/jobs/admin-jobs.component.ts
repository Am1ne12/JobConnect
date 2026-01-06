import { Component, OnInit, signal, OnDestroy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { ConfigService } from '../../../core/services/config.service';
import { JobPosting, PagedResult } from '../../../core/models';
import { CustomDropdownComponent, DropdownOption } from '../../../shared/components/custom-dropdown/custom-dropdown.component';

@Component({
    selector: 'app-admin-jobs',
    standalone: true,
    imports: [CommonModule, RouterLink, FormsModule, CustomDropdownComponent],
    templateUrl: './admin-jobs.component.html',
    styleUrl: './admin-jobs.component.scss'
})
export class AdminJobsComponent implements OnInit, OnDestroy {
    jobs = signal<JobPosting[]>([]);
    loading = signal(true);
    loadingMore = signal(false);
    hasMore = signal(false);
    totalCount = signal(0);
    currentPage = 1;
    readonly pageSize = 20;

    searchQuery = '';
    statusFilter = '';

    readonly statusOptions: DropdownOption[] = [
        { value: '', label: 'All Statuses', icon: '📋' },
        { value: 'Published', label: 'Published', icon: '✅' },
        { value: 'Draft', label: 'Draft', icon: '📝' },
        { value: 'Closed', label: 'Closed', icon: '🔒' }
    ];

    private searchSubject = new Subject<string>();
    private destroy$ = new Subject<void>();

    constructor(
        private http: HttpClient,
        private configService: ConfigService
    ) { }

    ngOnInit() {
        this.loadJobs();

        this.searchSubject.pipe(
            debounceTime(300),
            distinctUntilChanged(),
            takeUntil(this.destroy$)
        ).subscribe(() => {
            this.loadJobs();
        });
    }

    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
    }

    loadJobs() {
        this.currentPage = 1;
        this.loading.set(true);
        const params = new URLSearchParams();

        if (this.searchQuery) params.append('search', this.searchQuery);
        if (this.statusFilter) params.append('status', this.statusFilter);
        params.append('page', this.currentPage.toString());
        params.append('pageSize', this.pageSize.toString());

        const url = `${this.configService.apiUrl}/jobs/admin/all?${params.toString()}`;

        this.http.get<PagedResult<JobPosting>>(url).subscribe({
            next: (result) => {
                this.jobs.set(result.items);
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
        const params = new URLSearchParams();

        if (this.searchQuery) params.append('search', this.searchQuery);
        if (this.statusFilter) params.append('status', this.statusFilter);
        params.append('page', this.currentPage.toString());
        params.append('pageSize', this.pageSize.toString());

        const url = `${this.configService.apiUrl}/jobs/admin/all?${params.toString()}`;

        this.http.get<PagedResult<JobPosting>>(url).subscribe({
            next: (result) => {
                this.jobs.update(current => [...current, ...result.items]);
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

    onFilterChange() {
        this.loadJobs();
    }

    deleteJob(job: JobPosting) {
        if (confirm(`Are you sure you want to delete "${job.title}"?`)) {
            this.http.delete(`${this.configService.apiUrl}/jobs/admin/${job.id}`).subscribe({
                next: () => {
                    this.jobs.update(jobs => jobs.filter(j => j.id !== job.id));
                    this.totalCount.update(count => count - 1);
                }
            });
        }
    }
}
