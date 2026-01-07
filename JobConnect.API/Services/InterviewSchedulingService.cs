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
    string GenerateJitsiRoomId();
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

        // Get company availability for this day
        var availability = await _context.CompanyAvailabilities
            .FirstOrDefaultAsync(a => a.CompanyId == companyId && a.DayOfWeek == dayOfWeek && a.IsActive);

        if (availability == null)
            return new List<(DateTime, DateTime)>();

        // Get existing interviews for this company on this date
        var existingInterviews = await _context.Interviews
            .Where(i => i.CompanyId == companyId 
                && i.ScheduledAt.Date == date.Date
                && i.Status != InterviewStatus.Cancelled
                && i.Status != InterviewStatus.Rescheduled)
            .Select(i => new { i.ScheduledAt, i.EndsAt })
            .ToListAsync();

        var slots = new List<(DateTime Start, DateTime End)>();
        
        // Generate all possible slots
        var currentSlotStart = date.Date.Add(availability.StartTime.ToTimeSpan());
        var dayEnd = date.Date.Add(availability.EndTime.ToTimeSpan());

        while (currentSlotStart.Add(InterviewDuration) <= dayEnd)
        {
            var slotEnd = currentSlotStart.Add(InterviewDuration);
            
            // Check if this slot conflicts with any existing interview
            var hasConflict = existingInterviews.Any(existing =>
                (currentSlotStart >= existing.ScheduledAt && currentSlotStart < existing.EndsAt) ||
                (slotEnd > existing.ScheduledAt && slotEnd <= existing.EndsAt) ||
                (currentSlotStart <= existing.ScheduledAt && slotEnd >= existing.EndsAt));

            if (!hasConflict)
            {
                slots.Add((currentSlotStart, slotEnd));
            }

            // Move to next slot (1h30 intervals)
            currentSlotStart = currentSlotStart.Add(InterviewDuration);
        }

        return slots;
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
            Status = InterviewStatus.Scheduled,
            JitsiRoomId = GenerateJitsiRoomId()
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
            JitsiRoomId = GenerateJitsiRoomId(),
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

    /// <summary>
    /// Generate a unique Jitsi room ID
    /// </summary>
    public string GenerateJitsiRoomId()
    {
        return $"jobconnect-{Guid.NewGuid():N}";
    }
}
