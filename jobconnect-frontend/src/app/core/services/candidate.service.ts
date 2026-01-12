import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { CandidateProfile, Application, PagedResult } from '../models';
import { ConfigService } from './config.service';

@Injectable({
    providedIn: 'root'
})
export class CandidateService {
    private get API_URL() { return `${this.configService.apiUrl}/candidates`; }

    constructor(private http: HttpClient, private configService: ConfigService) { }

    getProfile(): Observable<CandidateProfile> {
        return this.http.get<CandidateProfile>(`${this.API_URL}/profile`);
    }

    updateProfile(profile: Partial<CandidateProfile>): Observable<CandidateProfile> {
        return this.http.put<CandidateProfile>(`${this.API_URL}/profile`, profile);
    }

    updateSkills(skills: { skillId: number; proficiencyLevel: number; yearsOfExperience?: number }[]): Observable<void> {
        return this.http.put<void>(`${this.API_URL}/skills`, { skills });
    }

    getApplications(page?: number, pageSize?: number): Observable<PagedResult<Application>> {
        let params = new HttpParams();
        if (page) params = params.set('page', page.toString());
        if (pageSize) params = params.set('pageSize', pageSize.toString());
        return this.http.get<PagedResult<Application>>(`${this.API_URL}/applications`, { params });
    }

    hasApplied(jobId: number): Observable<boolean> {
        return this.getApplications(1, 100).pipe(
            map(result => result.items.some(app => app.jobPostingId === jobId))
        );
    }
}
