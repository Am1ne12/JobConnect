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
[Authorize(Roles = "Company")]
public class CompaniesController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IMatchingScoreService _matchingService;

    public CompaniesController(ApplicationDbContext context, IMatchingScoreService matchingService)
    {
        _context = context;
        _matchingService = matchingService;
    }

    private int GetUserId() => int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");

    [HttpGet("profile")]
    public async Task<ActionResult<CompanyDto>> GetProfile()
    {
        var userId = GetUserId();
        var company = await _context.Companies.FirstOrDefaultAsync(c => c.UserId == userId);

        if (company == null)
            return NotFound();

        return Ok(new CompanyDto(
            company.Id,
            company.UserId,
            company.Name,
            company.Description,
            company.Industry,
            company.Website,
            company.Location,
            company.LogoUrl,
            company.EmployeeCount
        ));
    }

    [HttpPut("profile")]
    public async Task<ActionResult<CompanyDto>> UpdateProfile([FromBody] UpdateCompanyDto dto)
    {
        var userId = GetUserId();
        var company = await _context.Companies.FirstOrDefaultAsync(c => c.UserId == userId);

        if (company == null)
            return NotFound();

        if (dto.Name != null) company.Name = dto.Name;
        if (dto.Description != null) company.Description = dto.Description;
        if (dto.Industry != null) company.Industry = dto.Industry;
        if (dto.Website != null) company.Website = dto.Website;
        if (dto.Location != null) company.Location = dto.Location;
        if (dto.EmployeeCount.HasValue) company.EmployeeCount = dto.EmployeeCount;

        company.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(new CompanyDto(
            company.Id,
            company.UserId,
            company.Name,
            company.Description,
            company.Industry,
            company.Website,
            company.Location,
            company.LogoUrl,
            company.EmployeeCount
        ));
    }

    [HttpGet("jobs")]
    public async Task<ActionResult<List<JobPostingDto>>> GetJobs()
    {
        var userId = GetUserId();
        var company = await _context.Companies.FirstOrDefaultAsync(c => c.UserId == userId);

        if (company == null)
            return NotFound();

        var jobs = await _context.JobPostings
            .Include(j => j.RequiredSkills)
            .ThenInclude(js => js.Skill)
            .Include(j => j.Applications)
            .Where(j => j.CompanyId == company.Id)
            .OrderByDescending(j => j.CreatedAt)
            .ToListAsync();

        return Ok(jobs.Select(j => MapJobToDto(j, company.Name)));
    }

    [HttpGet("jobs/{jobId}/applications")]
    public async Task<ActionResult<List<ApplicationDto>>> GetJobApplications(int jobId)
    {
        var userId = GetUserId();
        var company = await _context.Companies.FirstOrDefaultAsync(c => c.UserId == userId);

        if (company == null)
            return NotFound();

        var job = await _context.JobPostings
            .FirstOrDefaultAsync(j => j.Id == jobId && j.CompanyId == company.Id);

        if (job == null)
            return NotFound();

        var applications = await _context.Applications
            .Include(a => a.CandidateProfile)
            .ThenInclude(cp => cp.Skills)
            .ThenInclude(s => s.Skill)
            .Where(a => a.JobPostingId == jobId)
            .OrderBy(a => a.Status)
            .ThenBy(a => a.KanbanOrder)
            .ToListAsync();

        // Get interview IDs for these applications (only get the latest scheduled one, not rescheduled)
        var applicationIds = applications.Select(a => a.Id).ToList();
        var interviews = await _context.Interviews
            .Where(i => applicationIds.Contains(i.ApplicationId) && i.Status != InterviewStatus.Rescheduled)
            .Select(i => new { i.ApplicationId, i.Id })
            .ToListAsync();
        var interviewMap = interviews
            .GroupBy(i => i.ApplicationId)
            .ToDictionary(g => g.Key, g => g.OrderByDescending(i => i.Id).First().Id);

        return Ok(applications.Select(a => new ApplicationDto(
            a.Id,
            a.CandidateProfileId,
            $"{a.CandidateProfile.FirstName} {a.CandidateProfile.LastName}",
            a.JobPostingId,
            job.Title,
            company.Id,
            company.Name,
            a.Status.ToString(),
            a.MatchingScore,
            a.CoverLetter,
            a.Notes,
            a.KanbanOrder,
            a.AppliedAt,
            a.UpdatedAt,
            MapCandidateToDto(a.CandidateProfile),
            interviewMap.GetValueOrDefault(a.Id)
        )));
    }

    [HttpPut("jobs/{jobId}/applications/{applicationId}/status")]
    public async Task<ActionResult> UpdateApplicationStatus(int jobId, int applicationId, [FromBody] UpdateApplicationStatusDto dto)
    {
        var userId = GetUserId();
        var company = await _context.Companies.FirstOrDefaultAsync(c => c.UserId == userId);

        if (company == null)
            return NotFound();

        var application = await _context.Applications
            .Include(a => a.JobPosting)
            .Include(a => a.CandidateProfile)
            .FirstOrDefaultAsync(a => a.Id == applicationId && a.JobPostingId == jobId && a.JobPosting.CompanyId == company.Id);

        if (application == null)
            return NotFound();

        var previousStatus = application.Status;
        application.Status = dto.Status;
        if (dto.Notes != null) application.Notes = dto.Notes;
        if (dto.KanbanOrder.HasValue) application.KanbanOrder = dto.KanbanOrder.Value;
        application.UpdatedAt = DateTime.UtcNow;

        // Create notification when status changes to Interview
        if (dto.Status == ApplicationStatus.Interview && previousStatus != ApplicationStatus.Interview)
        {
            var notification = new Notification
            {
                UserId = application.CandidateProfile.UserId,
                Title = "📅 Entretien à planifier",
                Message = $"Bonne nouvelle ! {company.Name} souhaite vous rencontrer pour le poste de {application.JobPosting.Title}. Choisissez un créneau d'entretien.",
                Type = "InterviewRequest",
                RelatedId = application.Id,
                CreatedAt = DateTime.UtcNow,
                IsRead = false
            };
            _context.Notifications.Add(notification);
        }

        await _context.SaveChangesAsync();
        return Ok();
    }

    [HttpPost("jobs/{jobId}/kanban/reorder")]
    public async Task<ActionResult> ReorderKanban(int jobId, [FromBody] List<KanbanUpdateDto> updates)
    {
        var userId = GetUserId();
        var company = await _context.Companies.FirstOrDefaultAsync(c => c.UserId == userId);

        if (company == null)
            return NotFound();

        foreach (var update in updates)
        {
            var application = await _context.Applications
                .Include(a => a.JobPosting)
                .Include(a => a.CandidateProfile)
                .FirstOrDefaultAsync(a => a.Id == update.ApplicationId && a.JobPosting.CompanyId == company.Id);

            if (application != null)
            {
                var previousStatus = application.Status;
                application.Status = update.NewStatus;
                application.KanbanOrder = update.NewOrder;
                application.UpdatedAt = DateTime.UtcNow;
                
                // Create notification for candidate if status changed
                if (previousStatus != update.NewStatus)
                {
                    var statusLabel = GetStatusLabel(update.NewStatus);
                    var notification = new Notification
                    {
                        UserId = application.CandidateProfile.UserId,
                        Type = "application_status",
                        Title = "Mise à jour de votre candidature",
                        Message = $"Votre candidature pour \"{application.JobPosting.Title}\" chez {company.Name} est passée à l'étape : {statusLabel}",
                        Link = "/applications",
                        RelatedId = application.Id,
                        IsRead = false,
                        CreatedAt = DateTime.UtcNow
                    };
                    _context.Notifications.Add(notification);
                }
            }
        }

        await _context.SaveChangesAsync();
        return Ok();
    }
    
    private string GetStatusLabel(ApplicationStatus status)
    {
        return status switch
        {
            ApplicationStatus.Submitted => "Soumise",
            ApplicationStatus.Screening => "En cours d'examen",
            ApplicationStatus.Interview => "Entretien",
            ApplicationStatus.Offer => "Offre",
            ApplicationStatus.Hired => "Embauché",
            ApplicationStatus.Rejected => "Refusée",
            _ => status.ToString()
        };
    }

    private JobPostingDto MapJobToDto(JobPosting job, string companyName)
    {
        return new JobPostingDto(
            job.Id,
            job.CompanyId,
            companyName,
            job.Title,
            job.Description,
            job.Requirements,
            job.Benefits,
            job.Location,
            job.Type.ToString(),
            job.SalaryMin,
            job.SalaryMax,
            job.SalaryCurrency,
            job.Status.ToString(),
            job.ExperienceYearsMin,
            job.ExperienceYearsMax,
            job.RequiredSkills.Select(js => new JobSkillDto(
                js.SkillId,
                js.Skill?.Name ?? "",
                js.IsRequired,
                js.MinProficiency
            )).ToList(),
            job.CreatedAt,
            job.PublishedAt,
            job.Applications?.Count ?? 0
        );
    }

    private static readonly System.Text.Json.JsonSerializerOptions _jsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    private CandidateProfileDto MapCandidateToDto(CandidateProfile profile)
    {
        var experience = string.IsNullOrEmpty(profile.ExperienceJson)
            ? null
            : System.Text.Json.JsonSerializer.Deserialize<List<ExperienceDto>>(profile.ExperienceJson, _jsonOptions);

        var education = string.IsNullOrEmpty(profile.EducationJson)
            ? null
            : System.Text.Json.JsonSerializer.Deserialize<List<EducationDto>>(profile.EducationJson, _jsonOptions);

        var certifications = string.IsNullOrEmpty(profile.CertificationsJson)
            ? null
            : System.Text.Json.JsonSerializer.Deserialize<List<CertificationDto>>(profile.CertificationsJson, _jsonOptions);

        return new CandidateProfileDto(
            profile.Id,
            profile.UserId,
            profile.FirstName,
            profile.LastName,
            profile.Phone,
            profile.Summary,
            profile.Location,
            profile.PhotoUrl,
            experience,
            education,
            certifications,
            profile.Skills.Select(s => new CandidateSkillDto(
                s.SkillId,
                s.Skill?.Name ?? "",
                s.ProficiencyLevel,
                s.YearsOfExperience
            )).ToList()
        );
    }
}
