using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using JobConnect.API.Data;
using JobConnect.API.DTOs;
using JobConnect.API.Models;
using JobConnect.API.Hubs;

namespace JobConnect.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ScheduleController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly INotificationHubService _notificationHub;

    // Fixed slots: 6 slots of 1h30 from 09:00 to 18:00
    private static readonly TimeOnly[] SlotStartTimes = new[]
    {
        new TimeOnly(9, 0),   // 09:00 - 10:30
        new TimeOnly(10, 30), // 10:30 - 12:00
        new TimeOnly(12, 0),  // 12:00 - 13:30
        new TimeOnly(13, 30), // 13:30 - 15:00
        new TimeOnly(15, 0),  // 15:00 - 16:30
        new TimeOnly(16, 30)  // 16:30 - 18:00
    };

    private static readonly TimeSpan SlotDuration = TimeSpan.FromMinutes(90);

    public ScheduleController(ApplicationDbContext context, INotificationHubService notificationHub)
    {
        _context = context;
        _notificationHub = notificationHub;
    }

    private int GetUserId() => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    private string GetUserRole() => User.FindFirstValue(ClaimTypes.Role)!;

    /// <summary>
    /// Get available slots for a company on a specific date
    /// </summary>
    [HttpGet("slots")]
    public async Task<ActionResult<List<SlotDto>>> GetAvailableSlots(
        [FromQuery] int companyId, 
        [FromQuery] string dateStr)
    {
        // Parse date
        if (!DateOnly.TryParse(dateStr, out var date))
            return BadRequest("Invalid date format. Use yyyy-MM-dd");
        
        // Validate company exists
        var company = await _context.Companies.FindAsync(companyId);
        if (company == null)
            return NotFound("Company not found");

        // Don't allow past dates
        var today = DateOnly.FromDateTime(DateTime.Now);
        if (date < today)
            return BadRequest("Cannot get slots for past dates");

        // Don't allow weekends
        if (date.DayOfWeek == DayOfWeek.Saturday || date.DayOfWeek == DayOfWeek.Sunday)
            return Ok(new List<SlotDto>()); // Empty list for weekends

        // Get existing interviews for this date
        var dateStart = date.ToDateTime(TimeOnly.MinValue);
        var dateEnd = date.ToDateTime(new TimeOnly(23, 59, 59));
        
        var existingInterviews = await _context.Interviews
            .Where(i => i.CompanyId == companyId && 
                        i.ScheduledAt >= dateStart && 
                        i.ScheduledAt <= dateEnd &&
                        i.Status != InterviewStatus.Cancelled &&
                        i.Status != InterviewStatus.Rescheduled)
            .Select(i => new { i.ScheduledAt, i.EndsAt })
            .ToListAsync();

        // Get unavailabilities that overlap with this date
        var unavailabilities = await _context.CompanyUnavailabilities
            .Where(u => u.CompanyId == companyId && 
                        u.StartTime < dateEnd && 
                        u.EndTime > dateStart)
            .Select(u => new { u.StartTime, u.EndTime, u.Reason })
            .ToListAsync();

        var now = DateTime.Now;
        var availableSlots = new List<SlotDto>();

        foreach (var slotStart in SlotStartTimes)
        {
            var slotDateTime = date.ToDateTime(slotStart);
            var slotEndDateTime = slotDateTime.Add(SlotDuration);

            // Skip slots in the past (if today)
            if (date == today && slotDateTime <= now)
                continue;

            // Check if slot overlaps with existing interview
            bool isBooked = existingInterviews.Any(i => 
                slotDateTime < i.EndsAt && slotEndDateTime > i.ScheduledAt);

            if (isBooked)
                continue;

            // Check if slot overlaps with unavailability
            var blockingUnavailability = unavailabilities.FirstOrDefault(u =>
                slotDateTime < u.EndTime && slotEndDateTime > u.StartTime);

            if (blockingUnavailability != null)
                continue;

            availableSlots.Add(new SlotDto(
                slotStart.ToString("HH:mm"),
                slotStart.Add(SlotDuration).ToString("HH:mm"),
                true
            ));
        }

        return Ok(availableSlots);
    }

    /// <summary>
    /// Book an interview slot (Candidate)
    /// </summary>
    [HttpPost("book")]
    public async Task<ActionResult<BookingResultDto>> BookSlot([FromBody] BookSlotDto dto)
    {
        var userId = GetUserId();
        var role = GetUserRole();

        if (role != "Candidate")
            return Forbid("Only candidates can book slots");

        // Validate application exists and belongs to candidate
        var application = await _context.Applications
            .Include(a => a.CandidateProfile)
            .Include(a => a.JobPosting)
                .ThenInclude(j => j.Company)
            .FirstOrDefaultAsync(a => a.Id == dto.ApplicationId);

        if (application == null)
            return NotFound("Application not found");

        if (application.CandidateProfile.UserId != userId)
            return Forbid("You can only book for your own applications");

        var companyId = application.JobPosting.CompanyId;

        // Parse date and time
        if (!DateOnly.TryParse(dto.Date, out var date))
            return BadRequest("Invalid date format");

        if (!TimeOnly.TryParse(dto.StartTime, out var startTime))
            return BadRequest("Invalid time format");

        // Validate this is a valid slot time
        if (!SlotStartTimes.Contains(startTime))
            return BadRequest("Invalid slot time. Must be one of: 09:00, 10:30, 12:00, 13:30, 15:00, 16:30");

        // Validate date is not in the past
        var today = DateOnly.FromDateTime(DateTime.Now);
        if (date < today)
            return BadRequest("Cannot book slots in the past");

        // Validate not a weekend
        if (date.DayOfWeek == DayOfWeek.Saturday || date.DayOfWeek == DayOfWeek.Sunday)
            return BadRequest("Cannot book slots on weekends");

        var scheduledAt = date.ToDateTime(startTime);
        var endsAt = scheduledAt.Add(SlotDuration);
        
        // Convert for comparison queries
        var dateStart = date.ToDateTime(TimeOnly.MinValue);
        var dateEnd = date.ToDateTime(new TimeOnly(23, 59, 59));

        // Check for conflicts (double booking)
        var conflict = await _context.Interviews
            .AnyAsync(i => i.CompanyId == companyId &&
                           i.ScheduledAt >= dateStart &&
                           i.ScheduledAt <= dateEnd &&
                           i.Status != InterviewStatus.Cancelled &&
                           i.Status != InterviewStatus.Rescheduled &&
                           scheduledAt < i.EndsAt && endsAt > i.ScheduledAt);

        if (conflict)
            return Conflict("This slot is no longer available");

        // Check for unavailability conflict
        var unavailabilityConflict = await _context.CompanyUnavailabilities
            .AnyAsync(u => u.CompanyId == companyId &&
                           scheduledAt < u.EndTime && endsAt > u.StartTime);

        if (unavailabilityConflict)
            return Conflict("This slot is blocked by the company");

        // Create interview
        var interview = new Interview
        {
            ApplicationId = dto.ApplicationId,
            CompanyId = companyId,
            CandidateProfileId = application.CandidateProfileId,
            ScheduledAt = scheduledAt,
            EndsAt = endsAt,
            Status = InterviewStatus.Scheduled
        };

        _context.Interviews.Add(interview);
        await _context.SaveChangesAsync();

        // Send notification to company
        var companyUser = await _context.Companies
            .Where(c => c.Id == companyId)
            .Select(c => c.User)
            .FirstAsync();

        var notification = new Notification
        {
            UserId = companyUser.Id,
            Title = "📅 Nouvel entretien programmé",
            Message = $"{application.CandidateProfile.FirstName} {application.CandidateProfile.LastName} a réservé un entretien le {date:dd/MM/yyyy} à {startTime:HH:mm}",
            Type = "InterviewBooked",
            RelatedId = interview.Id,
            IsRead = false,
            CreatedAt = DateTime.UtcNow
        };
        _context.Notifications.Add(notification);
        await _context.SaveChangesAsync();

        await _notificationHub.SendNotificationAsync(companyUser.Id, new NotificationMessage(
            notification.Id,
            notification.Type,
            notification.Title,
            notification.Message,
            null,
            notification.CreatedAt
        ));

        // Also send InterviewUpdated for real-time calendar refresh
        await _notificationHub.SendInterviewUpdateAsync(companyUser.Id, new InterviewUpdateMessage(
            "scheduled",
            interview.Id,
            application.Id,
            application.JobPosting.Title,
            interview.ScheduledAt,
            $"Entretien planifié avec {application.CandidateProfile.FirstName} {application.CandidateProfile.LastName}"
        ));

        return Ok(new BookingResultDto(
            interview.Id,
            interview.ScheduledAt,
            interview.EndsAt,
            application.JobPosting.Company.Name,
            application.JobPosting.Title
        ));
    }

    /// <summary>
    /// Block a time period (Company only)
    /// </summary>
    [HttpPost("block")]
    public async Task<ActionResult<UnavailabilityDto>> BlockPeriod([FromBody] BlockPeriodDto dto)
    {
        var userId = GetUserId();
        var role = GetUserRole();

        if (role != "Company")
            return Forbid("Only companies can block periods");

        var company = await _context.Companies.FirstOrDefaultAsync(c => c.UserId == userId);
        if (company == null)
            return NotFound("Company profile not found");

        // Validate times
        if (dto.EndTime <= dto.StartTime)
            return BadRequest("End time must be after start time");

        // Don't allow blocking in the past
        if (dto.StartTime < DateTime.Now)
            return BadRequest("Cannot block periods in the past");

        var unavailability = new CompanyUnavailability
        {
            CompanyId = company.Id,
            StartTime = dto.StartTime,
            EndTime = dto.EndTime,
            Reason = dto.Reason
        };

        _context.CompanyUnavailabilities.Add(unavailability);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetUnavailabilities), new UnavailabilityDto(
            unavailability.Id,
            unavailability.StartTime,
            unavailability.EndTime,
            unavailability.Reason
        ));
    }

    /// <summary>
    /// Get all unavailabilities for the company
    /// </summary>
    [HttpGet("unavailabilities")]
    public async Task<ActionResult<List<UnavailabilityDto>>> GetUnavailabilities()
    {
        var userId = GetUserId();
        var role = GetUserRole();

        if (role != "Company")
            return Forbid("Only companies can view unavailabilities");

        var company = await _context.Companies.FirstOrDefaultAsync(c => c.UserId == userId);
        if (company == null)
            return NotFound("Company profile not found");

        var unavailabilities = await _context.CompanyUnavailabilities
            .Where(u => u.CompanyId == company.Id && u.EndTime >= DateTime.Now)
            .OrderBy(u => u.StartTime)
            .Select(u => new UnavailabilityDto(u.Id, u.StartTime, u.EndTime, u.Reason))
            .ToListAsync();

        return Ok(unavailabilities);
    }

    /// <summary>
    /// Delete an unavailability
    /// </summary>
    [HttpDelete("unavailabilities/{id}")]
    public async Task<ActionResult> DeleteUnavailability(int id)
    {
        var userId = GetUserId();
        var role = GetUserRole();

        if (role != "Company")
            return Forbid("Only companies can delete unavailabilities");

        var company = await _context.Companies.FirstOrDefaultAsync(c => c.UserId == userId);
        if (company == null)
            return NotFound("Company profile not found");

        var unavailability = await _context.CompanyUnavailabilities
            .FirstOrDefaultAsync(u => u.Id == id && u.CompanyId == company.Id);

        if (unavailability == null)
            return NotFound("Unavailability not found");

        _context.CompanyUnavailabilities.Remove(unavailability);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    /// <summary>
    /// Cancel an interview (both candidate and company can cancel)
    /// </summary>
    [HttpPost("interviews/{id}/cancel")]
    public async Task<ActionResult> CancelInterview(int id, [FromBody] ScheduleCancelDto dto)
    {
        var userId = GetUserId();
        var role = GetUserRole();

        var interview = await _context.Interviews
            .Include(i => i.Application)
                .ThenInclude(a => a.CandidateProfile)
            .Include(i => i.Application)
                .ThenInclude(a => a.JobPosting)
                    .ThenInclude(j => j.Company)
            .FirstOrDefaultAsync(i => i.Id == id);

        if (interview == null)
            return NotFound("Interview not found");

        // Check authorization
        bool isCandidate = role == "Candidate" && interview.Application.CandidateProfile.UserId == userId;
        bool isCompany = role == "Company" && interview.Application.JobPosting.Company.UserId == userId;

        if (!isCandidate && !isCompany)
            return Forbid("You are not authorized to cancel this interview");

        if (interview.Status == InterviewStatus.Cancelled)
            return BadRequest("Interview is already cancelled");

        if (interview.Status == InterviewStatus.Completed)
            return BadRequest("Cannot cancel a completed interview");

        interview.Status = InterviewStatus.Cancelled;
        interview.CancellationReason = dto.Reason;
        await _context.SaveChangesAsync();

        // Send notification to the other party
        int notifyUserId;
        string cancellerName;
        if (isCandidate)
        {
            notifyUserId = interview.Application.JobPosting.Company.UserId;
            cancellerName = $"{interview.Application.CandidateProfile.FirstName} {interview.Application.CandidateProfile.LastName}";
        }
        else
        {
            notifyUserId = interview.Application.CandidateProfile.UserId;
            cancellerName = interview.Application.JobPosting.Company.Name;
        }

        var notification = new Notification
        {
            UserId = notifyUserId,
            Title = "❌ Entretien annulé",
            Message = $"L'entretien du {interview.ScheduledAt:dd/MM/yyyy à HH:mm} a été annulé par {cancellerName}. Raison : {dto.Reason ?? "Non spécifiée"}",
            Type = "InterviewCancelled",
            RelatedId = interview.Id,
            IsRead = false,
            CreatedAt = DateTime.UtcNow
        };
        _context.Notifications.Add(notification);
        await _context.SaveChangesAsync();

        await _notificationHub.SendNotificationAsync(notifyUserId, new NotificationMessage(
            notification.Id,
            notification.Type,
            notification.Title,
            notification.Message,
            null,
            notification.CreatedAt
        ));

        // Also send InterviewUpdated for real-time calendar refresh
        await _notificationHub.SendInterviewUpdateAsync(notifyUserId, new InterviewUpdateMessage(
            "cancelled",
            interview.Id,
            interview.ApplicationId,
            interview.Application.JobPosting.Title,
            interview.ScheduledAt,
            $"Entretien annulé par {cancellerName}"
        ));

        return Ok(new { message = "Interview cancelled successfully" });
    }

    /// <summary>
    /// Reschedule an interview (both candidate and company can reschedule)
    /// </summary>
    [HttpPost("interviews/{id}/reschedule")]
    public async Task<ActionResult<BookingResultDto>> RescheduleInterview(int id, [FromBody] ScheduleRescheduleDto dto)
    {
        var userId = GetUserId();
        var role = GetUserRole();

        var interview = await _context.Interviews
            .Include(i => i.Application)
                .ThenInclude(a => a.CandidateProfile)
            .Include(i => i.Application)
                .ThenInclude(a => a.JobPosting)
                    .ThenInclude(j => j.Company)
            .FirstOrDefaultAsync(i => i.Id == id);

        if (interview == null)
            return NotFound("Interview not found");

        // Check authorization
        bool isCandidate = role == "Candidate" && interview.Application.CandidateProfile.UserId == userId;
        bool isCompany = role == "Company" && interview.Application.JobPosting.Company.UserId == userId;

        if (!isCandidate && !isCompany)
            return Forbid("You are not authorized to reschedule this interview");

        if (interview.Status == InterviewStatus.Cancelled || interview.Status == InterviewStatus.Completed)
            return BadRequest("Cannot reschedule a cancelled or completed interview");

        // Parse new date and time
        if (!DateOnly.TryParse(dto.NewDate, out var newDate))
            return BadRequest("Invalid date format");

        if (!TimeOnly.TryParse(dto.NewStartTime, out var newStartTime))
            return BadRequest("Invalid time format");

        if (!SlotStartTimes.Contains(newStartTime))
            return BadRequest("Invalid slot time");

        var today = DateOnly.FromDateTime(DateTime.Now);
        if (newDate < today)
            return BadRequest("Cannot reschedule to a past date");

        if (newDate.DayOfWeek == DayOfWeek.Saturday || newDate.DayOfWeek == DayOfWeek.Sunday)
            return BadRequest("Cannot reschedule to weekends");

        var newScheduledAt = newDate.ToDateTime(newStartTime);
        var newEndsAt = newScheduledAt.Add(SlotDuration);
        var companyId = interview.CompanyId;

        // Check for conflicts
        var dateStart = newDate.ToDateTime(TimeOnly.MinValue);
        var dateEnd = newDate.ToDateTime(new TimeOnly(23, 59, 59));

        var conflict = await _context.Interviews
            .AnyAsync(i => i.CompanyId == companyId &&
                           i.Id != id &&
                           i.ScheduledAt >= dateStart &&
                           i.ScheduledAt <= dateEnd &&
                           i.Status != InterviewStatus.Cancelled &&
                           i.Status != InterviewStatus.Rescheduled &&
                           newScheduledAt < i.EndsAt && newEndsAt > i.ScheduledAt);

        if (conflict)
            return Conflict("The new slot is not available");


        var unavailabilityConflict = await _context.CompanyUnavailabilities
            .AnyAsync(u => u.CompanyId == companyId &&
                           newScheduledAt < u.EndTime && newEndsAt > u.StartTime);

        if (unavailabilityConflict)
            return Conflict("The new slot is blocked");

        // Store old date for notification message
        var oldScheduledAt = interview.ScheduledAt;

        // Simply UPDATE the existing interview dates (no new interview created)
        interview.ScheduledAt = newScheduledAt;
        interview.EndsAt = newEndsAt;
        interview.UpdatedAt = DateTime.UtcNow;
        
        await _context.SaveChangesAsync();

        // Notify the other party
        int notifyUserId;
        string reschedulerName;
        if (isCandidate)
        {
            notifyUserId = interview.Application.JobPosting.Company.UserId;
            reschedulerName = $"{interview.Application.CandidateProfile.FirstName} {interview.Application.CandidateProfile.LastName}";
        }
        else
        {
            notifyUserId = interview.Application.CandidateProfile.UserId;
            reschedulerName = interview.Application.JobPosting.Company.Name;
        }

        var notification = new Notification
        {
            UserId = notifyUserId,
            Title = "📅 Entretien reprogrammé",
            Message = $"L'entretien a été déplacé par {reschedulerName} du {oldScheduledAt:dd/MM/yyyy à HH:mm} au {newScheduledAt:dd/MM/yyyy à HH:mm}",
            Type = "InterviewRescheduled",
            RelatedId = interview.Id,
            IsRead = false,
            CreatedAt = DateTime.UtcNow
        };
        _context.Notifications.Add(notification);
        await _context.SaveChangesAsync();

        await _notificationHub.SendNotificationAsync(notifyUserId, new NotificationMessage(
            notification.Id,
            notification.Type,
            notification.Title,
            notification.Message,
            null,
            notification.CreatedAt
        ));

        // Also send InterviewUpdated for real-time calendar refresh
        await _notificationHub.SendInterviewUpdateAsync(notifyUserId, new InterviewUpdateMessage(
            "rescheduled",
            interview.Id,
            interview.ApplicationId,
            interview.Application.JobPosting.Title,
            interview.ScheduledAt,
            $"Entretien reprogrammé au {newScheduledAt:dd/MM/yyyy à HH:mm}"
        ));

        return Ok(new BookingResultDto(
            interview.Id,
            interview.ScheduledAt,
            interview.EndsAt,
            interview.Application.JobPosting.Company.Name,
            interview.Application.JobPosting.Title
        ));
    }

    /// <summary>
    /// Get company's weekly calendar view with all slots
    /// </summary>
    [HttpGet("calendar")]
    public async Task<ActionResult<WeekCalendarDto>> GetWeekCalendar([FromQuery] string? weekStart = null)
    {
        var userId = GetUserId();
        var role = GetUserRole();

        if (role != "Company")
            return Forbid("Only companies can view their calendar");

        var company = await _context.Companies.FirstOrDefaultAsync(c => c.UserId == userId);
        if (company == null)
            return NotFound("Company profile not found");

        // Default to current week (Monday)
        var today = DateOnly.FromDateTime(DateTime.Now);
        DateOnly startDate;
        
        if (!string.IsNullOrEmpty(weekStart) && DateOnly.TryParse(weekStart, out var parsedDate))
        {
            startDate = parsedDate;
        }
        else
        {
            startDate = today.AddDays(-(int)today.DayOfWeek + 1);
        }
        
        // Ensure we start on Monday
        if (startDate.DayOfWeek != DayOfWeek.Monday)
            startDate = startDate.AddDays(-(int)startDate.DayOfWeek + 1);

        var endDate = startDate.AddDays(4); // Friday
        
        // Date range for queries
        var weekStartDt = startDate.ToDateTime(TimeOnly.MinValue);
        var weekEndDt = endDate.ToDateTime(new TimeOnly(23, 59, 59));

        // Get interviews for the week
        var interviews = await _context.Interviews
            .Include(i => i.Application)
                .ThenInclude(a => a.CandidateProfile)
            .Include(i => i.Application)
                .ThenInclude(a => a.JobPosting)
            .Where(i => i.CompanyId == company.Id &&
                        i.ScheduledAt >= weekStartDt &&
                        i.ScheduledAt <= weekEndDt &&
                        i.Status != InterviewStatus.Cancelled &&
                        i.Status != InterviewStatus.Rescheduled)
            .ToListAsync();

        // Get unavailabilities for the week
        var unavailabilities = await _context.CompanyUnavailabilities
            .Where(u => u.CompanyId == company.Id &&
                        u.StartTime <= weekEndDt &&
                        u.EndTime >= weekStartDt)
            .ToListAsync();

        var days = new List<DayCalendarDto>();

        for (var d = startDate; d <= endDate; d = d.AddDays(1))
        {
            var slots = new List<CalendarSlotDto>();

            foreach (var slotStart in SlotStartTimes)
            {
                var slotDateTime = d.ToDateTime(slotStart);
                var slotEndDateTime = slotDateTime.Add(SlotDuration);

                // Check for interview
                var interview = interviews.FirstOrDefault(i =>
                    slotDateTime < i.EndsAt && slotEndDateTime > i.ScheduledAt);

                // Check for unavailability
                var unavail = unavailabilities.FirstOrDefault(u =>
                    slotDateTime < u.EndTime && slotEndDateTime > u.StartTime);

                string status;
                string? candidateName = null;
                string? jobTitle = null;
                int? interviewId = null;
                string? interviewStatus = null;
                string? cancellationReason = null;

                if (interview != null)
                {
                    status = "booked";
                    candidateName = $"{interview.Application.CandidateProfile.FirstName} {interview.Application.CandidateProfile.LastName}";
                    jobTitle = interview.Application.JobPosting.Title;
                    interviewId = interview.Id;
                    interviewStatus = interview.Status.ToString();
                    cancellationReason = interview.CancellationReason;
                }
                else if (unavail != null)
                {
                    status = "blocked";
                }
                else if (slotDateTime <= DateTime.Now)
                {
                    status = "past";
                }
                else
                {
                    status = "available";
                }

                slots.Add(new CalendarSlotDto(
                    slotStart.ToString("HH:mm"),
                    slotStart.Add(SlotDuration).ToString("HH:mm"),
                    status,
                    candidateName,
                    jobTitle,
                    interviewId,
                    interviewStatus,
                    cancellationReason,
                    unavail?.Reason
                ));
            }

            days.Add(new DayCalendarDto(d, d.DayOfWeek.ToString(), slots));
        }

        return Ok(new WeekCalendarDto(startDate, endDate, days));
    }
}

// DTOs
public record SlotDto(string StartTime, string EndTime, bool Available);
public record BookSlotDto(int ApplicationId, string Date, string StartTime);
public record BookingResultDto(int InterviewId, DateTime ScheduledAt, DateTime EndsAt, string CompanyName, string JobTitle);
public record BlockPeriodDto(DateTime StartTime, DateTime EndTime, string? Reason);
public record UnavailabilityDto(int Id, DateTime StartTime, DateTime EndTime, string? Reason);
public record CalendarSlotDto(
    string StartTime, 
    string EndTime, 
    string Status, 
    string? CandidateName, 
    string? JobTitle,
    int? InterviewId,
    string? InterviewStatus,
    string? CancellationReason,
    string? BlockReason
);
public record DayCalendarDto(DateOnly Date, string DayName, List<CalendarSlotDto> Slots);
public record WeekCalendarDto(DateOnly StartDate, DateOnly EndDate, List<DayCalendarDto> Days);
public record ScheduleCancelDto(string? Reason);
public record ScheduleRescheduleDto(string NewDate, string NewStartTime, string? Reason);
