import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ConfigService } from './config.service';

export interface Slot {
    startTime: string;
    endTime: string;
    available: boolean;
}

export interface BookingResult {
    interviewId: number;
    scheduledAt: string;
    endsAt: string;
    companyName: string;
    jobTitle: string;
}

export interface Unavailability {
    id: number;
    startTime: string;
    endTime: string;
    reason?: string;
}

export interface CalendarSlot {
    startTime: string;
    endTime: string;
    status: 'available' | 'booked' | 'blocked' | 'past';
    candidateName?: string;
    jobTitle?: string;
    interviewId?: number;
    interviewStatus?: 'Scheduled' | 'InProgress' | 'Completed' | 'Cancelled' | 'InWaitingRoom';
    cancellationReason?: string;
    blockReason?: string;
}

export interface DayCalendar {
    date: string;
    dayName: string;
    slots: CalendarSlot[];
}

export interface WeekCalendar {
    startDate: string;
    endDate: string;
    days: DayCalendar[];
}

@Injectable({
    providedIn: 'root'
})
export class ScheduleService {
    private get API_URL() { return `${this.configService.apiUrl}/schedule`; }

    constructor(private http: HttpClient, private configService: ConfigService) { }

    // Get available slots for a company on a specific date
    getAvailableSlots(companyId: number, date: string): Observable<Slot[]> {
        return this.http.get<Slot[]>(`${this.API_URL}/slots`, {
            params: { companyId: companyId.toString(), dateStr: date }
        });
    }

    // Book a slot (Candidate)
    bookSlot(applicationId: number, date: string, startTime: string): Observable<BookingResult> {
        return this.http.post<BookingResult>(`${this.API_URL}/book`, {
            applicationId,
            date,
            startTime
        });
    }

    // Block a period (Company)
    blockPeriod(startTime: Date, endTime: Date, reason?: string): Observable<Unavailability> {
        return this.http.post<Unavailability>(`${this.API_URL}/block`, {
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            reason
        });
    }

    // Get unavailabilities (Company)
    getUnavailabilities(): Observable<Unavailability[]> {
        return this.http.get<Unavailability[]>(`${this.API_URL}/unavailabilities`);
    }

    // Delete unavailability (Company)
    deleteUnavailability(id: number): Observable<void> {
        return this.http.delete<void>(`${this.API_URL}/unavailabilities/${id}`);
    }

    // Get weekly calendar (Company)
    getWeekCalendar(weekStart?: string): Observable<WeekCalendar> {
        if (weekStart) {
            return this.http.get<WeekCalendar>(`${this.API_URL}/calendar`, {
                params: { weekStart }
            });
        }
        return this.http.get<WeekCalendar>(`${this.API_URL}/calendar`);
    }

    // Cancel an interview
    cancelInterview(interviewId: number, reason?: string): Observable<{ message: string }> {
        return this.http.post<{ message: string }>(`${this.API_URL}/interviews/${interviewId}/cancel`, { reason });
    }

    // Reschedule an interview
    rescheduleInterview(interviewId: number, newDate: string, newStartTime: string, reason?: string): Observable<BookingResult> {
        return this.http.post<BookingResult>(`${this.API_URL}/interviews/${interviewId}/reschedule`, {
            newDate,
            newStartTime,
            reason
        });
    }
}
