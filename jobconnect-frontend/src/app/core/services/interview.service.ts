import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
    Interview,
    CreateInterviewRequest,
    RescheduleInterviewRequest,
    CancelInterviewRequest,
    InterviewJoinInfo,
    CompanyAvailability,
    UpdateAvailabilityRequest,
    AvailableSlot,
    CalendarSlot,
    InterviewMessage,
    SendMessageRequest
} from '../models';
import { ConfigService } from './config.service';

@Injectable({
    providedIn: 'root'
})
export class InterviewService {
    private get API_URL() { return `${this.configService.apiUrl}/interviews`; }
    private get AVAILABILITY_URL() { return `${this.configService.apiUrl}/availability`; }

    constructor(
        private http: HttpClient,
        private configService: ConfigService
    ) { }

    // ============ Interview CRUD ============

    getInterviews(): Observable<Interview[]> {
        return this.http.get<Interview[]>(this.API_URL);
    }

    getInterview(id: number): Observable<Interview> {
        return this.http.get<Interview>(`${this.API_URL}/${id}`);
    }

    scheduleInterview(request: CreateInterviewRequest): Observable<Interview> {
        return this.http.post<Interview>(this.API_URL, request);
    }

    rescheduleInterview(id: number, request: RescheduleInterviewRequest): Observable<Interview> {
        return this.http.put<Interview>(`${this.API_URL}/${id}/reschedule`, request);
    }

    cancelInterview(id: number, request: CancelInterviewRequest): Observable<Interview> {
        return this.http.put<Interview>(`${this.API_URL}/${id}/cancel`, request);
    }

    getJoinInfo(id: number): Observable<InterviewJoinInfo> {
        return this.http.get<InterviewJoinInfo>(`${this.API_URL}/${id}/join`);
    }

    completeInterview(id: number): Observable<Interview> {
        return this.http.put<Interview>(`${this.API_URL}/${id}/complete`, {});
    }

    // ============ Company Availability ============

    getAvailability(): Observable<CompanyAvailability[]> {
        return this.http.get<CompanyAvailability[]>(this.AVAILABILITY_URL);
    }

    updateAvailability(request: UpdateAvailabilityRequest): Observable<CompanyAvailability[]> {
        return this.http.put<CompanyAvailability[]>(this.AVAILABILITY_URL, request);
    }

    initializeDefaultAvailability(): Observable<CompanyAvailability[]> {
        return this.http.post<CompanyAvailability[]>(`${this.AVAILABILITY_URL}/initialize`, {});
    }

    getAvailableSlots(companyId: number, startDate?: Date, days: number = 14): Observable<AvailableSlot[]> {
        let params = new HttpParams().set('days', days.toString());
        if (startDate) {
            const year = startDate.getFullYear();
            const month = String(startDate.getMonth() + 1).padStart(2, '0');
            const day = String(startDate.getDate()).padStart(2, '0');
            params = params.set('startDate', `${year}-${month}-${day}`);
        }
        return this.http.get<AvailableSlot[]>(`${this.AVAILABILITY_URL}/${companyId}/slots`, { params });
    }

    // ============ Interview Messages ============

    getMessages(interviewId: number): Observable<InterviewMessage[]> {
        return this.http.get<InterviewMessage[]>(`${this.API_URL}/${interviewId}/messages`);
    }

    sendMessage(interviewId: number, request: SendMessageRequest): Observable<InterviewMessage> {
        return this.http.post<InterviewMessage>(`${this.API_URL}/${interviewId}/messages`, request);
    }

    markMessagesAsRead(interviewId: number): Observable<void> {
        return this.http.put<void>(`${this.API_URL}/${interviewId}/messages/read`, {});
    }

    // ============ Helper Methods ============

    getStatusLabel(status: string): string {
        const labels: Record<string, string> = {
            'Scheduled': 'Planifié',
            'InWaitingRoom': 'Salle d\'attente',
            'InProgress': 'En cours',
            'Completed': 'Terminé',
            'Cancelled': 'Annulé',
            'Rescheduled': 'Reprogrammé'
        };
        return labels[status] || status;
    }

    getStatusClass(status: string): string {
        const classes: Record<string, string> = {
            'Scheduled': 'status-scheduled',
            'InWaitingRoom': 'status-waiting',
            'InProgress': 'status-active',
            'Completed': 'status-completed',
            'Cancelled': 'status-cancelled',
            'Rescheduled': 'status-rescheduled'
        };
        return classes[status] || '';
    }

    getDayName(dayOfWeek: number): string {
        const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
        return days[dayOfWeek] || '';
    }
}
