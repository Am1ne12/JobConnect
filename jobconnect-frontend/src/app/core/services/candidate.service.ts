import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CandidateProfile, Application } from '../models';
import { environment } from '../../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class CandidateService {
    private readonly API_URL = `${environment.apiUrl}/candidates`;

    constructor(private http: HttpClient) { }

    getProfile(): Observable<CandidateProfile> {
        return this.http.get<CandidateProfile>(`${this.API_URL}/profile`);
    }

    updateProfile(profile: Partial<CandidateProfile>): Observable<CandidateProfile> {
        return this.http.put<CandidateProfile>(`${this.API_URL}/profile`, profile);
    }

    updateSkills(skills: { skillId: number; proficiencyLevel: number; yearsOfExperience?: number }[]): Observable<void> {
        return this.http.put<void>(`${this.API_URL}/skills`, { skills });
    }

    getApplications(): Observable<Application[]> {
        return this.http.get<Application[]>(`${this.API_URL}/applications`);
    }
}
