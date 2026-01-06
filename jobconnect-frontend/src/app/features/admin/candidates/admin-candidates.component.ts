import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { ConfigService } from '../../../core/services/config.service';
import { NotificationService } from '../../../core/services/notification.service';

interface AdminCandidate {
    id: number;
    userId: number;
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    summary?: string;
    location?: string;
    photoUrl?: string;
    skills?: { skillId: number; skillName: string; proficiencyLevel: number }[];
    applicationCount: number;
    createdAt: Date;
    updatedAt: Date;
}

@Component({
    selector: 'app-admin-candidates',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './admin-candidates.component.html',
    styleUrl: './admin-candidates.component.scss'
})
export class AdminCandidatesComponent implements OnInit {
    candidates = signal<AdminCandidate[]>([]);
    loading = signal(true);
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
        this.loadCandidates();

        this.searchSubject.pipe(
            debounceTime(300),
            distinctUntilChanged(),
            takeUntil(this.destroy$)
        ).subscribe(() => {
            this.loadCandidates();
        });
    }

    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
    }

    loadCandidates() {
        this.loading.set(true);
        let url = `${this.configService.apiUrl}/admin/candidates`;
        if (this.searchQuery) {
            url += `?search=${encodeURIComponent(this.searchQuery)}`;
        }

        this.http.get<AdminCandidate[]>(url).subscribe({
            next: (candidates) => {
                this.candidates.set(candidates);
                this.loading.set(false);
            },
            error: () => {
                this.loading.set(false);
            }
        });
    }

    onSearchInput() {
        if (this.searchQuery.length === 0 || this.searchQuery.length >= 2) {
            this.searchSubject.next(this.searchQuery);
        }
    }

    addCandidate() {
        this.router.navigate(['/admin/candidates/new']);
    }

    editCandidate(candidate: AdminCandidate) {
        this.router.navigate(['/admin/candidates', candidate.id, 'edit']);
    }

    deleteCandidate(candidate: AdminCandidate) {
        if (confirm(`Are you sure you want to delete ${candidate.firstName} ${candidate.lastName}? This action cannot be undone.`)) {
            this.http.delete(`${this.configService.apiUrl}/admin/candidates/${candidate.id}`).subscribe({
                next: () => {
                    this.candidates.update(c => c.filter(x => x.id !== candidate.id));
                    this.notificationService.success('Candidate deleted successfully');
                },
                error: () => {
                    this.notificationService.error('Failed to delete candidate');
                }
            });
        }
    }
}
