using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using JobConnect.API.Data;
using JobConnect.API.DTOs;
using JobConnect.API.Models;
using JobConnect.API.Services;
using JobConnect.API.Hubs;

namespace JobConnect.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class InterviewsController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IInterviewSchedulingService _schedulingService;
    private readonly IHmsService _hmsService;
    private readonly INotificationHubService _notificationHub;

    public InterviewsController(
        ApplicationDbContext context, 
        IInterviewSchedulingService schedulingService,
        IHmsService hmsService,
        INotificationHubService notificationHub)
    {
        _context = context;
        _schedulingService = schedulingService;
        _hmsService = hmsService;
        _notificationHub = notificationHub;
    }

    private int GetUserId() => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    private string GetUserRole() => User.FindFirstValue(ClaimTypes.Role)!;

    /// <summary>
    /// Get all interviews for the current user (filtered by role)
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<List<InterviewDto>>> GetInterviews()
    {
        var userId = GetUserId();
        var role = GetUserRole();

        IQueryable<Interview> query = _context.Interviews
            .Include(i => i.Application)
                .ThenInclude(a => a.JobPosting)
            .Include(i => i.Company)
            .Include(i => i.CandidateProfile)
            .Include(i => i.Messages);

        if (role == "Company")
        {
            var company = await _context.Companies.FirstOrDefaultAsync(c => c.UserId == userId);
            if (company == null) return NotFound("Company profile not found");
            query = query.Where(i => i.CompanyId == company.Id);
        }
        else
        {
            var candidate = await _context.CandidateProfiles.FirstOrDefaultAsync(c => c.UserId == userId);
            if (candidate == null) return NotFound("Candidate profile not found");
            query = query.Where(i => i.CandidateProfileId == candidate.Id);
        }

        var interviews = await query
            .Where(i => i.Status != InterviewStatus.Rescheduled) // Exclude old rescheduled interviews
            .OrderByDescending(i => i.ScheduledAt)
            .Select(i => MapToDto(i, userId))
            .ToListAsync();

        return Ok(interviews);
    }

    /// <summary>
    /// Get a specific interview
    /// </summary>
    [HttpGet("{id}")]
    public async Task<ActionResult<InterviewDto>> GetInterview(int id)
    {
        var userId = GetUserId();
        var interview = await _context.Interviews
            .Include(i => i.Application)
                .ThenInclude(a => a.JobPosting)
            .Include(i => i.Company)
            .Include(i => i.CandidateProfile)
            .Include(i => i.Messages)
            .FirstOrDefaultAsync(i => i.Id == id);

        if (interview == null)
            return NotFound();

        // Verify access
        if (!await HasAccessToInterview(interview))
            return Forbid();

        return Ok(MapToDto(interview, userId));
    }

    /// <summary>
    /// Schedule a new interview (Candidate only)
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<InterviewDto>> CreateInterview([FromBody] CreateInterviewDto dto)
    {
        var userId = GetUserId();
        var role = GetUserRole();

        if (role != "Candidate")
            return Forbid("Only candidates can schedule interviews");

        var candidate = await _context.CandidateProfiles.FirstOrDefaultAsync(c => c.UserId == userId);
        if (candidate == null)
            return NotFound("Candidate profile not found");

        // Verify application belongs to this candidate
        var application = await _context.Applications
            .Include(a => a.JobPosting)
            .FirstOrDefaultAsync(a => a.Id == dto.ApplicationId && a.CandidateProfileId == candidate.Id);

        if (application == null)
            return NotFound("Application not found");

        try
        {
            var interview = await _schedulingService.ScheduleInterviewAsync(
                dto.ApplicationId, 
                dto.ScheduledAt, 
                candidate.Id);

            // Reload with includes
            interview = await _context.Interviews
                .Include(i => i.Application)
                    .ThenInclude(a => a.JobPosting)
                .Include(i => i.Company)
                .Include(i => i.CandidateProfile)
                .FirstAsync(i => i.Id == interview.Id);

            // Create notification for the company about new interview
            var scheduledDate = interview.ScheduledAt.ToString("dd/MM/yyyy à HH:mm");
            var notification = new Notification
            {
                UserId = interview.Company.UserId,
                Type = "interview_scheduled",
                Title = "Nouvel entretien planifié",
                Message = $"{interview.CandidateProfile.FirstName} {interview.CandidateProfile.LastName} a planifié un entretien pour \"{interview.Application.JobPosting.Title}\" le {scheduledDate}",
                Link = "/interviews",
                RelatedId = interview.Id,
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            };
            _context.Notifications.Add(notification);
            await _context.SaveChangesAsync();

            // Send real-time notification via SignalR
            await _notificationHub.SendNotificationAsync(
                interview.Company.UserId,
                new NotificationMessage(
                    notification.Id,
                    notification.Type,
                    notification.Title,
                    notification.Message,
                    notification.Link,
                    notification.CreatedAt
                )
            );

            // Also send interview update
            await _notificationHub.SendInterviewUpdateAsync(
                interview.Company.UserId,
                new InterviewUpdateMessage(
                    "scheduled",
                    interview.Id,
                    interview.ApplicationId,
                    interview.Application.JobPosting.Title,
                    interview.ScheduledAt,
                    $"Nouvel entretien planifié le {scheduledDate}"
                )
            );

            // Notify all clients that this slot is now booked (remove from other candidates' view)
            await _notificationHub.SendSlotBookedAsync(interview.CompanyId, interview.ScheduledAt, interview.EndsAt);

            return CreatedAtAction(nameof(GetInterview), new { id = interview.Id }, MapToDto(interview, userId));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    /// <summary>
    /// Reschedule an interview
    /// </summary>
    [HttpPut("{id}/reschedule")]
    public async Task<ActionResult<InterviewDto>> RescheduleInterview(int id, [FromBody] RescheduleInterviewDto dto)
    {
        var userId = GetUserId();
        var interview = await _context.Interviews.FindAsync(id);
        
        if (interview == null)
            return NotFound();

        if (!await HasAccessToInterview(interview))
            return Forbid();

        try
        {
            var newInterview = await _schedulingService.RescheduleInterviewAsync(id, dto.NewScheduledAt, dto.Reason);

            // Reload with includes
            newInterview = await _context.Interviews
                .Include(i => i.Application)
                    .ThenInclude(a => a.JobPosting)
                .Include(i => i.Company)
                .Include(i => i.CandidateProfile)
                .FirstAsync(i => i.Id == newInterview.Id);

            // TODO: Send notifications to both parties

            return Ok(MapToDto(newInterview, userId));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    /// <summary>
    /// Mark interview as completed (called when session ends)
    /// </summary>
    [HttpPut("{id}/complete")]
    public async Task<ActionResult<InterviewDto>> CompleteInterview(int id)
    {
        var userId = GetUserId();
        var interview = await _context.Interviews
            .Include(i => i.Application)
                .ThenInclude(a => a.JobPosting)
            .Include(i => i.Company)
            .Include(i => i.CandidateProfile)
            .FirstOrDefaultAsync(i => i.Id == id);
        
        if (interview == null)
            return NotFound();

        if (!await HasAccessToInterview(interview))
            return Forbid();

        interview.Status = InterviewStatus.Completed;
        interview.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        // Notify candidate via SignalR that interview is completed
        var candidateUserId = interview.CandidateProfile?.UserId ?? 
            await _context.CandidateProfiles
                .Where(c => c.Id == interview.CandidateProfileId)
                .Select(c => c.UserId)
                .FirstOrDefaultAsync();
        
        if (candidateUserId > 0)
        {
            await _notificationHub.SendInterviewUpdateAsync(
                candidateUserId,
                new InterviewUpdateMessage(
                    "completed",
                    interview.Id,
                    interview.ApplicationId,
                    interview.Application?.JobPosting?.Title,
                    interview.ScheduledAt,
                    "L'entretien est terminé"
                )
            );
            Console.WriteLine($"SignalR: Notified candidate {candidateUserId} that interview {interview.Id} is completed");
        }

        // Disable the 100ms room
        try 
        {
            var roomName = $"interview-{interview.Id}";
            var templateId = Environment.GetEnvironmentVariable("HMS_TEMPLATE_ID") ?? "";
            var roomInfo = await _hmsService.CreateOrGetRoomAsync(roomName, templateId);
            await _hmsService.DisableRoomAsync(roomInfo.Id);
            Console.WriteLine($"Room {roomInfo.Id} disabled successfully");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Warning: Could not disable 100ms room: {ex.Message}");
        }

        return Ok(MapToDto(interview, userId));
    }

    /// <summary>
    /// Cancel an interview
    /// </summary>
    [HttpPut("{id}/cancel")]
    public async Task<ActionResult> CancelInterview(int id, [FromBody] CancelInterviewDto dto)
    {
        var userId = GetUserId();
        var role = GetUserRole();
        var interview = await _context.Interviews
            .Include(i => i.CandidateProfile)
            .Include(i => i.Company)
            .Include(i => i.Application)
                .ThenInclude(a => a.JobPosting)
            .FirstOrDefaultAsync(i => i.Id == id);
        
        if (interview == null)
            return NotFound();

        if (!await HasAccessToInterview(interview))
            return Forbid();

        // Prepare notification message
        var cancelledBy = role == "Company" ? interview.Company.Name : 
            $"{interview.CandidateProfile.FirstName} {interview.CandidateProfile.LastName}";
        var scheduledDate = interview.ScheduledAt.ToString("dd/MM/yyyy à HH:mm");
        var jobTitle = interview.Application?.JobPosting?.Title ?? "Entretien";
        
        // Determine who to notify (the other party)
        int notifyUserId;
        if (role == "Company")
        {
            // Company cancelled -> notify candidate
            notifyUserId = interview.CandidateProfile.UserId;
        }
        else
        {
            // Candidate cancelled -> notify company
            notifyUserId = interview.Company.UserId;
        }
        
        try
        {
            // Delete the interview
            await _schedulingService.CancelInterviewAsync(id, dto.Reason);

            // Create notification for the other party
            var notification = new Notification
            {
                UserId = notifyUserId,
                Type = "interview_cancelled",
                Title = "Entretien annulé",
                Message = $"{cancelledBy} a annulé l'entretien pour \"{jobTitle}\" prévu le {scheduledDate}. Motif : {dto.Reason}",
                Link = "/interviews",
                RelatedId = id,
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            };
            _context.Notifications.Add(notification);
            await _context.SaveChangesAsync();

            // Send real-time notification via SignalR
            await _notificationHub.SendNotificationAsync(
                notifyUserId,
                new NotificationMessage(
                    notification.Id,
                    notification.Type,
                    notification.Title,
                    notification.Message,
                    notification.Link,
                    notification.CreatedAt
                )
            );

            // Also send interview cancellation update
            await _notificationHub.SendInterviewUpdateAsync(
                notifyUserId,
                new InterviewUpdateMessage(
                    "cancelled",
                    id,
                    null,
                    jobTitle,
                    null,
                    $"Entretien annulé par {cancelledBy}"
                )
            );

            // Return success with cancellation info
            return Ok(new { 
                message = "Entretien annulé avec succès",
                cancelledBy = cancelledBy,
                reason = dto.Reason,
                jobTitle = jobTitle,
                scheduledDate = scheduledDate
            });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    /// <summary>
    /// Get Daily.co room join details with meeting token (only available 5 min before and during interview)
    /// </summary>
    [HttpGet("{id}/join")]
    public async Task<ActionResult<InterviewJoinDto>> GetJoinDetails(int id)
    {
        var userId = GetUserId();
        var role = GetUserRole();

        var interview = await _context.Interviews
            .Include(i => i.CandidateProfile)
            .Include(i => i.Company)
            .FirstOrDefaultAsync(i => i.Id == id);
        
        if (interview == null)
            return NotFound();

        if (!await HasAccessToInterview(interview))
            return Forbid();

        var now = DateTime.Now;
        var waitingRoomOpens = interview.ScheduledAt.AddMinutes(-5);
        var secondsUntilStart = (int)(waitingRoomOpens - now).TotalSeconds;

        // Determine user display name and if they are owner
        string displayName;
        bool isOwner;
        if (role == "Company")
        {
            displayName = interview.Company.Name;
            isOwner = true; // Company is always the host/owner
        }
        else
        {
            displayName = $"{interview.CandidateProfile.FirstName} {interview.CandidateProfile.LastName}";
            isOwner = false; // Candidate is participant only
        }

        // Check if interview is cancelled or already completed
        if (interview.Status == InterviewStatus.Cancelled || 
            interview.Status == InterviewStatus.Rescheduled ||
            interview.Status == InterviewStatus.Completed)
        {
            return Ok(new InterviewJoinDto(
                "",
                "", // No domain for Daily.co
                displayName,
                false,
                $"Cet entretien a été {interview.Status.ToString().ToLower()}",
                null,
                null // No token if can't join
            ));
        }

        // Check if it's too early
        if (now < waitingRoomOpens)
        {
            return Ok(new InterviewJoinDto(
                "",
                "",
                displayName,
                false,
                "La salle d'attente ouvrira 5 minutes avant l'heure prévue",
                secondsUntilStart > 0 ? secondsUntilStart : null,
                null
            ));
        }

        // Company-first join logic - candidate must wait for company
        if (role != "Company" && interview.CompanyJoinedAt == null)
        {
            return Ok(new InterviewJoinDto(
                "",
                "",
                displayName,
                false,
                "En attente que l'entreprise démarre l'entretien...",
                null,
                null
            ));
        }

        // Check if interview has ended
        if (now > interview.EndsAt)
        {
            if (interview.Status != InterviewStatus.Completed)
            {
                interview.Status = InterviewStatus.Completed;
                interview.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
            }

            return Ok(new InterviewJoinDto(
                "",
                "",
                displayName,
                false,
                "Cet entretien est terminé",
                null,
                null
            ));
        }

        // Generate 100ms auth token with role-based access
        try
        {
            var roomName = $"interview-{interview.Id}";
            var templateId = Environment.GetEnvironmentVariable("HMS_TEMPLATE_ID") ?? "";
            
            // Create or get room via 100ms API
            var roomInfo = await _hmsService.CreateOrGetRoomAsync(roomName, templateId);
            
            // Ensure the room is enabled (it might have been disabled after a previous interview)
            await _hmsService.EnableRoomAsync(roomInfo.Id);
            
            var visitorId = $"user-{userId}";
            
            // Company = host (moderator), Candidate = guest (participant)
            var hmsRole = isOwner ? "host" : "guest";
            
            // Get room code for the prebuilt interface
            var roomCode = await _hmsService.GetRoomCodeAsync(roomInfo.Id, hmsRole);
            Console.WriteLine($"Got room code: {roomCode} for role: {hmsRole}");

            // Update interview status and mark company joined
            if (role == "Company" && interview.CompanyJoinedAt == null)
            {
                interview.CompanyJoinedAt = DateTime.UtcNow;
            }
            
            // Always notify candidate via SignalR when company joins
            if (role == "Company")
            {
                var candidateUserId = await _context.CandidateProfiles
                    .Where(c => c.Id == interview.CandidateProfileId)
                    .Select(c => c.UserId)
                    .FirstOrDefaultAsync();
                
                Console.WriteLine($"SignalR DEBUG: Company joined, notifying candidate userId={candidateUserId}");
                
                if (candidateUserId > 0)
                {
                    await _notificationHub.SendInterviewUpdateAsync(
                        candidateUserId,
                        new InterviewUpdateMessage(
                            "started",
                            interview.Id,
                            interview.ApplicationId,
                            null, // JobTitle
                            interview.ScheduledAt,
                            "L'entreprise a rejoint l'entretien"
                        )
                    );
                }
            }
            
            if (now >= interview.ScheduledAt && interview.Status == InterviewStatus.Scheduled)
            {
                interview.Status = InterviewStatus.InProgress;
            }
            else if (now >= waitingRoomOpens && interview.Status == InterviewStatus.Scheduled)
            {
                interview.Status = InterviewStatus.InWaitingRoom;
            }
            
            interview.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(new InterviewJoinDto(
                roomCode, // 100ms room CODE (not ID) for prebuilt
                "100ms", // Provider indicator
                displayName,
                true,
                interview.Status == InterviewStatus.InWaitingRoom 
                    ? "La salle d'attente est ouverte. L'entretien commencera bientôt." 
                    : "L'entretien est en cours",
                null,
                roomCode // Use room code as token for prebuilt
            ));
        }
        catch (Exception ex)
        {
            Console.WriteLine($"ERROR creating 100ms room: {ex}");
            return BadRequest($"Erreur lors de la création de la salle: {ex.Message}");
        }
    }

    private async Task<bool> HasAccessToInterview(Interview interview)
    {
        var userId = GetUserId();
        var role = GetUserRole();

        if (role == "Company")
        {
            var company = await _context.Companies.FirstOrDefaultAsync(c => c.UserId == userId);
            return company != null && interview.CompanyId == company.Id;
        }
        else
        {
            var candidate = await _context.CandidateProfiles.FirstOrDefaultAsync(c => c.UserId == userId);
            return candidate != null && interview.CandidateProfileId == candidate.Id;
        }
    }

    private static InterviewDto MapToDto(Interview i, int currentUserId)
    {
        var unreadCount = i.Messages?.Count(m => !m.IsRead && m.SenderId != currentUserId) ?? 0;
        
        return new InterviewDto(
            i.Id,
            i.ApplicationId,
            i.CompanyId,
            i.Company?.Name ?? "",
            i.CandidateProfileId,
            $"{i.CandidateProfile?.FirstName} {i.CandidateProfile?.LastName}".Trim(),
            i.Application?.JobPostingId ?? 0,
            i.Application?.JobPosting?.Title ?? "",
            i.ScheduledAt,
            i.EndsAt,
            i.Status.ToString(),
            i.CancellationReason,
            i.RescheduledFromId,
            i.CreatedAt,
            unreadCount,
            i.CompanyJoinedAt
        );
    }
}
