using Microsoft.EntityFrameworkCore;
using JobConnect.API.Data;
using JobConnect.API.Models;

namespace JobConnect.API.Services;

public interface IInterviewSchedulingService
{
    Task<List<(DateTime Start, DateTime End)>> GetAvailableSlotsAsync(int companyId, DateTime date);
    Task<List<(DateTime Start, DateTime End)>> GetAvailableSlotsForWeekAsync(int companyId, DateTime weekStart);
    Task<bool> IsSlotAvailableAsync(int companyId, DateTime scheduledAt);
    Task<Interview> ScheduleInterviewAsync(int applicationId, DateTime scheduledAt, int candidateProfileId);
    Task<Interview> RescheduleInterviewAsync(int interviewId, DateTime newScheduledAt, string? reason);
    Task<Interview> CancelInterviewAsync(int interviewId, string reason);
}

public class InterviewSchedulingService : IInterviewSchedulingService
{
    private readonly ApplicationDbContext _context;
    private static readonly TimeSpan InterviewDuration = TimeSpan.FromMinutes(90); // 1h30

    public InterviewSchedulingService(ApplicationDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Get available interview slots for a specific date based on company availability
    /// </summary>
    public async Task<List<(DateTime Start, DateTime End)>> GetAvailableSlotsAsync(int companyId, DateTime date)
    {
        var dayOfWeek = date.DayOfWeek;
        
        // Only Monday-Friday
        if (dayOfWeek == DayOfWeek.Saturday || dayOfWeek == DayOfWeek.Sunday)
            return new List<(DateTime, DateTime)>();

        // Get ALL company availabilities for this day (each slot is stored separately)
        var availabilities = await _context.CompanyAvailabilities
            .Where(a => a.CompanyId == companyId && a.DayOfWeek == dayOfWeek && a.IsActive)
            .ToListAsync();

        if (availabilities.Count == 0)
            return new List<(DateTime, DateTime)>();

        // Get existing interviews for this company on this date
        // Use range comparison with UTC kind for EF Core/Npgsql compatibility
        var dateStart = DateTime.SpecifyKind(date.Date, DateTimeKind.Utc);
        var dateEnd = DateTime.SpecifyKind(date.Date.AddDays(1), DateTimeKind.Utc);
        var existingInterviews = await _context.Interviews
            .Where(i => i.CompanyId == companyId 
                && i.ScheduledAt >= dateStart
                && i.ScheduledAt < dateEnd
                && i.Status != InterviewStatus.Cancelled
                && i.Status != InterviewStatus.Rescheduled)
            .Select(i => new { i.ScheduledAt, i.EndsAt })
            .ToListAsync();

        var slots = new List<(DateTime Start, DateTime End)>();
        
        // Each availability entry represents an exact configured slot
        foreach (var availability in availabilities)
        {
            var slotStart = date.Date.Add(availability.StartTime.ToTimeSpan());
            var slotEnd = date.Date.Add(availability.EndTime.ToTimeSpan());
            
            // Check if this slot conflicts with any existing interview
            var hasConflict = existingInterviews.Any(existing =>
                (slotStart >= existing.ScheduledAt && slotStart < existing.EndsAt) ||
                (slotEnd > existing.ScheduledAt && slotEnd <= existing.EndsAt) ||
                (slotStart <= existing.ScheduledAt && slotEnd >= existing.EndsAt));

            if (!hasConflict)
            {
                slots.Add((slotStart, slotEnd));
            }
        }

        // Sort slots by start time
        return slots.OrderBy(s => s.Start).ToList();
    }

    /// <summary>
    /// Get available slots for an entire week
    /// </summary>
    public async Task<List<(DateTime Start, DateTime End)>> GetAvailableSlotsForWeekAsync(int companyId, DateTime weekStart)
    {
        var allSlots = new List<(DateTime Start, DateTime End)>();
        
        for (int i = 0; i < 7; i++)
        {
            var date = weekStart.AddDays(i);
            var daySlots = await GetAvailableSlotsAsync(companyId, date);
            allSlots.AddRange(daySlots);
        }

        return allSlots;
    }

    /// <summary>
    /// Check if a specific slot is available
    /// </summary>
    public async Task<bool> IsSlotAvailableAsync(int companyId, DateTime scheduledAt)
    {
        var slots = await GetAvailableSlotsAsync(companyId, scheduledAt.Date);
        return slots.Any(s => s.Start == scheduledAt);
    }

    /// <summary>
    /// Schedule a new interview
    /// </summary>
    public async Task<Interview> ScheduleInterviewAsync(int applicationId, DateTime scheduledAt, int candidateProfileId)
    {
        var application = await _context.Applications
            .Include(a => a.JobPosting)
            .FirstOrDefaultAsync(a => a.Id == applicationId)
            ?? throw new InvalidOperationException("Application not found");

        var companyId = application.JobPosting.CompanyId;

        // Verify slot is available
        if (!await IsSlotAvailableAsync(companyId, scheduledAt))
            throw new InvalidOperationException("Selected time slot is not available");

        var interview = new Interview
        {
            ApplicationId = applicationId,
            CompanyId = companyId,
            CandidateProfileId = candidateProfileId,
            ScheduledAt = scheduledAt,
            EndsAt = scheduledAt.Add(InterviewDuration),
            Status = InterviewStatus.Scheduled
        };

        _context.Interviews.Add(interview);
        
        // Update application status to Interview
        application.Status = ApplicationStatus.Interview;
        application.UpdatedAt = DateTime.UtcNow;
        
        await _context.SaveChangesAsync();
        return interview;
    }

    /// <summary>
    /// Reschedule an existing interview
    /// </summary>
    public async Task<Interview> RescheduleInterviewAsync(int interviewId, DateTime newScheduledAt, string? reason)
    {
        var oldInterview = await _context.Interviews
            .FirstOrDefaultAsync(i => i.Id == interviewId)
            ?? throw new InvalidOperationException("Interview not found");

        // Verify new slot is available
        if (!await IsSlotAvailableAsync(oldInterview.CompanyId, newScheduledAt))
            throw new InvalidOperationException("Selected time slot is not available");

        // Mark old interview as rescheduled
        oldInterview.Status = InterviewStatus.Rescheduled;
        oldInterview.CancellationReason = reason ?? "Rescheduled to new time";
        oldInterview.UpdatedAt = DateTime.UtcNow;

        // Create new interview
        var newInterview = new Interview
        {
            ApplicationId = oldInterview.ApplicationId,
            CompanyId = oldInterview.CompanyId,
            CandidateProfileId = oldInterview.CandidateProfileId,
            ScheduledAt = newScheduledAt,
            EndsAt = newScheduledAt.Add(InterviewDuration),
            Status = InterviewStatus.Scheduled,
            RescheduledFromId = oldInterview.Id
        };

        _context.Interviews.Add(newInterview);
        await _context.SaveChangesAsync();
        
        return newInterview;
    }

    /// <summary>
    /// Cancel an interview
    /// </summary>
    public async Task<Interview> CancelInterviewAsync(int interviewId, string reason)
    {
        var interview = await _context.Interviews
            .Include(i => i.CandidateProfile)
            .Include(i => i.Company)
            .FirstOrDefaultAsync(i => i.Id == interviewId)
            ?? throw new InvalidOperationException("Interview not found");

        // Store interview info before deletion (for notification purposes)
        var deletedInterview = new Interview
        {
            Id = interview.Id,
            CandidateProfileId = interview.CandidateProfileId,
            CompanyId = interview.CompanyId,
            ScheduledAt = interview.ScheduledAt,
            CancellationReason = reason,
            CandidateProfile = interview.CandidateProfile,
            Company = interview.Company
        };

        // Delete the interview from database
        _context.Interviews.Remove(interview);
        await _context.SaveChangesAsync();
        
        return deletedInterview;
    }
}
