import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Application } from '../models';
import { ConfigService } from './config.service';

@Injectable({
    providedIn: 'root'
})
export class ApplicationService {
    private get API_URL() { return `${this.configService.apiUrl}/applications`; }

    constructor(private http: HttpClient, private configService: ConfigService) { }

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
