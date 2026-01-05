import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Application } from '../models';
import { environment } from '../../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class ApplicationService {
    private readonly API_URL = `${environment.apiUrl}/applications`;

    constructor(private http: HttpClient) { }

    apply(jobId: number, coverLetter?: string): Observable<Application> {
        return this.http.post<Application>(this.API_URL, { jobPostingId: jobId, coverLetter });
    }

    getApplication(id: number): Observable<Application> {
        return this.http.get<Application>(`${this.API_URL}/${id}`);
    }

    withdraw(id: number): Observable<void> {
        return this.http.delete<void>(`${this.API_URL}/${id}`);
    }
}
