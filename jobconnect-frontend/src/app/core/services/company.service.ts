import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Company, JobPosting, Application, KanbanUpdate } from '../models';
import { ConfigService } from './config.service';

@Injectable({
    providedIn: 'root'
})
export class CompanyService {
    private get API_URL() { return `${this.configService.apiUrl}/companies`; }

    constructor(private http: HttpClient, private configService: ConfigService) { }

    getProfile(): Observable<Company> {
        return this.http.get<Company>(`${this.API_URL}/profile`);
    }

    updateProfile(profile: Partial<Company>): Observable<Company> {
        return this.http.put<Company>(`${this.API_URL}/profile`, profile);
    }

    getJobs(): Observable<JobPosting[]> {
        return this.http.get<JobPosting[]>(`${this.API_URL}/jobs`);
    }

    getJobApplications(jobId: number): Observable<Application[]> {
        return this.http.get<Application[]>(`${this.API_URL}/jobs/${jobId}/applications`);
    }

    updateApplicationStatus(jobId: number, applicationId: number, status: string): Observable<void> {
        return this.http.put<void>(
            `${this.API_URL}/jobs/${jobId}/applications/${applicationId}/status`,
            { status }
        );
    }

    reorderKanban(jobId: number, updates: KanbanUpdate[]): Observable<void> {
        return this.http.post<void>(
            `${this.API_URL}/jobs/${jobId}/kanban/reorder`,
            updates
        );
    }
}
