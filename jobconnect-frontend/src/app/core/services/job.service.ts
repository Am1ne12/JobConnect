import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { JobPosting, CreateJobRequest, PagedResult } from '../models';
import { ConfigService } from './config.service';

@Injectable({
    providedIn: 'root'
})
export class JobService {
    private get API_URL() { return `${this.configService.apiUrl}/jobs`; }

    constructor(private http: HttpClient, private configService: ConfigService) { }

    getJobs(filters?: {
        search?: string;
        location?: string;
        type?: string;
        skills?: number[];
        page?: number;
        pageSize?: number;
    }): Observable<PagedResult<JobPosting>> {
        let params = new HttpParams();
        if (filters?.search) params = params.set('search', filters.search);
        if (filters?.location) params = params.set('location', filters.location);
        if (filters?.type) params = params.set('type', filters.type);
        if (filters?.skills?.length) {
            filters.skills.forEach(skillId => {
                params = params.append('skillIds', skillId.toString());
            });
        }
        if (filters?.page) params = params.set('page', filters.page.toString());
        if (filters?.pageSize) params = params.set('pageSize', filters.pageSize.toString());
        return this.http.get<PagedResult<JobPosting>>(this.API_URL, { params });
    }

    getJob(id: number): Observable<JobPosting> {
        return this.http.get<JobPosting>(`${this.API_URL}/${id}`);
    }

    createJob(job: CreateJobRequest): Observable<JobPosting> {
        return this.http.post<JobPosting>(this.API_URL, job);
    }

    updateJob(id: number, job: Partial<CreateJobRequest>): Observable<JobPosting> {
        return this.http.put<JobPosting>(`${this.API_URL}/${id}`, job);
    }

    deleteJob(id: number): Observable<void> {
        return this.http.delete<void>(`${this.API_URL}/${id}`);
    }

    publishJob(id: number): Observable<void> {
        return this.http.post<void>(`${this.API_URL}/${id}/publish`, {});
    }

    closeJob(id: number): Observable<void> {
        return this.http.post<void>(`${this.API_URL}/${id}/close`, {});
    }

    unpublishJob(id: number): Observable<void> {
        return this.http.post<void>(`${this.API_URL}/${id}/unpublish`, {});
    }
}
