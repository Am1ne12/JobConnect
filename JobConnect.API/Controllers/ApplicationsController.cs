using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using JobConnect.API.Data;
using JobConnect.API.DTOs;
using JobConnect.API.Models;
using JobConnect.API.Services;

namespace JobConnect.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ApplicationsController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IMatchingScoreService _matchingService;

    public ApplicationsController(ApplicationDbContext context, IMatchingScoreService matchingService)
    {
        _context = context;
        _matchingService = matchingService;
    }

    private int GetUserId() => int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");

    [HttpPost]
    [Authorize(Roles = "Candidate")]
    public async Task<ActionResult<ApplicationDto>> Apply([FromBody] CreateApplicationDto dto)
    {
        var userId = GetUserId();
        var profile = await _context.CandidateProfiles.FirstOrDefaultAsync(p => p.UserId == userId);

        if (profile == null)
            return BadRequest("Candidate profile not found");

        var job = await _context.JobPostings.FirstOrDefaultAsync(j => j.Id == dto.JobPostingId);
        if (job == null)
            return NotFound("Job not found");

        if (job.Status != JobStatus.Published)
            return BadRequest("Job is not accepting applications");

        // Check if already applied
        var existingApplication = await _context.Applications
            .FirstOrDefaultAsync(a => a.CandidateProfileId == profile.Id && a.JobPostingId == dto.JobPostingId);

        if (existingApplication != null)
            return BadRequest("You have already applied to this job");

        // Calculate matching score
        var matchingScore = await _matchingService.CalculateMatchingScore(profile.Id, dto.JobPostingId);

        // Get max kanban order for this job
        var maxOrder = await _context.Applications
            .Where(a => a.JobPostingId == dto.JobPostingId && a.Status == ApplicationStatus.Submitted)
            .MaxAsync(a => (int?)a.KanbanOrder) ?? 0;

        var application = new Application
        {
            CandidateProfileId = profile.Id,
            JobPostingId = dto.JobPostingId,
            CoverLetter = dto.CoverLetter,
            MatchingScore = matchingScore,
            Status = ApplicationStatus.Submitted,
            KanbanOrder = maxOrder + 1
        };

        _context.Applications.Add(application);
        await _context.SaveChangesAsync();

        // Get company for notification
        var company = await _context.Companies.FirstOrDefaultAsync(c => c.Id == job.CompanyId);
        
        // Create notification for the company
        if (company != null)
        {
            var notification = new Notification
            {
                UserId = company.UserId,
                Type = "application_received",
                Title = "Nouvelle candidature",
                Message = $"{profile.FirstName} {profile.LastName} a postulé à votre offre \"{job.Title}\"",
                Link = $"/company/dashboard",
                RelatedId = application.Id,
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            };
            _context.Notifications.Add(notification);
            await _context.SaveChangesAsync();
        }

        return Ok(new ApplicationDto(
            application.Id,
            application.CandidateProfileId,
            $"{profile.FirstName} {profile.LastName}",
            application.JobPostingId,
            job.Title,
            job.CompanyId,
            company?.Name ?? "",
            application.Status.ToString(),
            application.MatchingScore,
            application.CoverLetter,
            application.Notes,
            application.KanbanOrder,
            application.AppliedAt,
            application.UpdatedAt,
            null,
            null
        ));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ApplicationDto>> GetApplication(int id)
    {
        var userId = GetUserId();
        var userRole = User.FindFirst(ClaimTypes.Role)?.Value;

        var application = await _context.Applications
            .Include(a => a.CandidateProfile)
            .Include(a => a.JobPosting)
            .ThenInclude(j => j.Company)
            .FirstOrDefaultAsync(a => a.Id == id);

        if (application == null)
            return NotFound();

        // Check authorization
        if (userRole == "Candidate")
        {
            var profile = await _context.CandidateProfiles.FirstOrDefaultAsync(p => p.UserId == userId);
            if (profile == null || application.CandidateProfileId != profile.Id)
                return Forbid();
        }
        else if (userRole == "Company")
        {
            var company = await _context.Companies.FirstOrDefaultAsync(c => c.UserId == userId);
            if (company == null || application.JobPosting.CompanyId != company.Id)
                return Forbid();
        }

        // Check for interview
        var interview = await _context.Interviews
            .FirstOrDefaultAsync(i => i.ApplicationId == application.Id);

        return Ok(new ApplicationDto(
            application.Id,
            application.CandidateProfileId,
            $"{application.CandidateProfile.FirstName} {application.CandidateProfile.LastName}",
            application.JobPostingId,
            application.JobPosting.Title,
            application.JobPosting.CompanyId,
            application.JobPosting.Company.Name,
            application.Status.ToString(),
            application.MatchingScore,
            application.CoverLetter,
            application.Notes,
            application.KanbanOrder,
            application.AppliedAt,
            application.UpdatedAt,
            null,
            interview?.Id
        ));
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Candidate")]
    public async Task<ActionResult> WithdrawApplication(int id)
    {
        var userId = GetUserId();
        var profile = await _context.CandidateProfiles.FirstOrDefaultAsync(p => p.UserId == userId);

        if (profile == null)
            return NotFound();

        var application = await _context.Applications
            .FirstOrDefaultAsync(a => a.Id == id && a.CandidateProfileId == profile.Id);

        if (application == null)
            return NotFound();

        if (application.Status != ApplicationStatus.Submitted)
            return BadRequest("Can only withdraw submitted applications");

        _context.Applications.Remove(application);
        await _context.SaveChangesAsync();

        return NoContent();
    }
}
