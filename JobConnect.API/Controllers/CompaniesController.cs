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

        return Ok(applications.Select(a => new ApplicationDto(
            a.Id,
            a.CandidateProfileId,
            $"{a.CandidateProfile.FirstName} {a.CandidateProfile.LastName}",
            a.JobPostingId,
            job.Title,
            a.Status.ToString(),
            a.MatchingScore,
            a.CoverLetter,
            a.Notes,
            a.KanbanOrder,
            a.AppliedAt,
            a.UpdatedAt,
            MapCandidateToDto(a.CandidateProfile)
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
            .FirstOrDefaultAsync(a => a.Id == applicationId && a.JobPostingId == jobId && a.JobPosting.CompanyId == company.Id);

        if (application == null)
            return NotFound();

        application.Status = dto.Status;
        if (dto.Notes != null) application.Notes = dto.Notes;
        if (dto.KanbanOrder.HasValue) application.KanbanOrder = dto.KanbanOrder.Value;
        application.UpdatedAt = DateTime.UtcNow;

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
                .FirstOrDefaultAsync(a => a.Id == update.ApplicationId && a.JobPosting.CompanyId == company.Id);

            if (application != null)
            {
                application.Status = update.NewStatus;
                application.KanbanOrder = update.NewOrder;
                application.UpdatedAt = DateTime.UtcNow;
            }
        }

        await _context.SaveChangesAsync();
        return Ok();
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

    private CandidateProfileDto MapCandidateToDto(CandidateProfile profile)
    {
        return new CandidateProfileDto(
            profile.Id,
            profile.UserId,
            profile.FirstName,
            profile.LastName,
            profile.Phone,
            profile.Summary,
            profile.Location,
            profile.PhotoUrl,
            null,
            null,
            null,
            profile.Skills.Select(s => new CandidateSkillDto(
                s.SkillId,
                s.Skill?.Name ?? "",
                s.ProficiencyLevel,
                s.YearsOfExperience
            )).ToList()
        );
    }
}
