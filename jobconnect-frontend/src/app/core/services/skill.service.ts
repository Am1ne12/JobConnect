import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Skill } from '../models';
import { ConfigService } from './config.service';

@Injectable({
    providedIn: 'root'
})
export class SkillService {
    private get API_URL() { return `${this.configService.apiUrl}/skills`; }

    constructor(private http: HttpClient, private configService: ConfigService) { }

    getSkills(category?: string): Observable<Skill[]> {
        let params = new HttpParams();
        if (category) params = params.set('category', category);
        return this.http.get<Skill[]>(this.API_URL, { params });
    }

    getCategories(): Observable<string[]> {
        return this.http.get<string[]>(`${this.API_URL}/categories`);
    }
}
