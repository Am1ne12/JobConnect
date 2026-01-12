using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using JobConnect.API.Data;
using JobConnect.API.DTOs;
using JobConnect.API.Models;

namespace JobConnect.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class JobsController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public JobsController(ApplicationDbContext context)
    {
        _context = context;
    }

    private int GetUserId() => int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");

    // Public endpoint - get all published jobs
    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<PagedResult<JobPostingDto>>> GetJobs(
        [FromQuery] string? search,
        [FromQuery] string? location,
        [FromQuery] string? type,
        [FromQuery] int[]? skills,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var query = _context.JobPostings
            .Include(j => j.Company)
            .Include(j => j.RequiredSkills)
            .ThenInclude(js => js.Skill)
            .Include(j => j.Applications)
            .Where(j => j.Status == JobStatus.Published);

        if (!string.IsNullOrEmpty(search))
        {
            query = query.Where(j => 
                j.Title.ToLower().Contains(search.ToLower()) ||
                j.Description.ToLower().Contains(search.ToLower()));
        }

        if (!string.IsNullOrEmpty(location))
        {
            query = query.Where(j => j.Location != null && 
                j.Location.ToLower().Contains(location.ToLower()));
        }

        if (!string.IsNullOrEmpty(type) && Enum.TryParse<JobType>(type, out var jobType))
        {
            query = query.Where(j => j.Type == jobType);
        }

        if (skills != null && skills.Length > 0)
        {
            query = query.Where(j => 
                j.RequiredSkills.Any(rs => skills.Contains(rs.SkillId)));
        }

        var totalCount = await query.CountAsync();
        var jobs = await query
            .OrderByDescending(j => j.PublishedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var items = jobs.Select(j => new JobPostingDto(
            j.Id,
            j.CompanyId,
            j.Company.Name,
            j.Title,
            j.Description,
            j.Requirements,
            j.Benefits,
            j.Location,
            j.Type.ToString(),
            j.SalaryMin,
            j.SalaryMax,
            j.SalaryCurrency,
            j.Status.ToString(),
            j.ExperienceYearsMin,
            j.ExperienceYearsMax,
            j.RequiredSkills.Select(js => new JobSkillDto(
                js.SkillId,
                js.Skill?.Name ?? "",
                js.IsRequired,
                js.MinProficiency
            )).ToList(),
            j.CreatedAt,
            j.PublishedAt,
            j.Applications.Count
        )).ToList();

        return Ok(new PagedResult<JobPostingDto>(
            items,
            totalCount,
            page,
            pageSize,
            page * pageSize < totalCount
        ));
    }

    [HttpGet("{id}")]
    [AllowAnonymous]
    public async Task<ActionResult<JobPostingDto>> GetJob(int id)
    {
        var job = await _context.JobPostings
            .Include(j => j.Company)
            .Include(j => j.RequiredSkills)
            .ThenInclude(js => js.Skill)
            .Include(j => j.Applications)
            .FirstOrDefaultAsync(j => j.Id == id);

        if (job == null)
            return NotFound();

        return Ok(new JobPostingDto(
            job.Id,
            job.CompanyId,
            job.Company.Name,
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
            job.Applications.Count
        ));
    }

    [HttpPost]
    [Authorize(Roles = "Company")]
    public async Task<ActionResult<JobPostingDto>> CreateJob([FromBody] CreateJobPostingDto dto)
    {
        var userId = GetUserId();
        var company = await _context.Companies.FirstOrDefaultAsync(c => c.UserId == userId);

        if (company == null)
            return NotFound("Company profile not found");

        var job = new JobPosting
        {
            CompanyId = company.Id,
            Title = dto.Title,
            Description = dto.Description,
            Requirements = dto.Requirements,
            Benefits = dto.Benefits,
            Location = dto.Location,
            Type = dto.Type,
            SalaryMin = dto.SalaryMin,
            SalaryMax = dto.SalaryMax,
            SalaryCurrency = dto.SalaryCurrency ?? "EUR",
            ExperienceYearsMin = dto.ExperienceYearsMin,
            ExperienceYearsMax = dto.ExperienceYearsMax,
            Status = JobStatus.Draft
        };

        _context.JobPostings.Add(job);
        await _context.SaveChangesAsync();

        if (dto.RequiredSkills != null)
        {
            foreach (var skill in dto.RequiredSkills)
            {
                job.RequiredSkills.Add(new JobSkill
                {
                    JobPostingId = job.Id,
                    SkillId = skill.SkillId,
                    IsRequired = skill.IsRequired,
                    MinProficiency = skill.MinProficiency
                });
            }
            await _context.SaveChangesAsync();
        }

        return CreatedAtAction(nameof(GetJob), new { id = job.Id }, new JobPostingDto(
            job.Id,
            job.CompanyId,
            company.Name,
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
            null,
            job.CreatedAt,
            job.PublishedAt,
            0
        ));
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Company")]
    public async Task<ActionResult> UpdateJob(int id, [FromBody] UpdateJobPostingDto dto)
    {
        var userId = GetUserId();
        var company = await _context.Companies.FirstOrDefaultAsync(c => c.UserId == userId);

        if (company == null)
            return NotFound();

        var job = await _context.JobPostings
            .Include(j => j.RequiredSkills)
            .FirstOrDefaultAsync(j => j.Id == id && j.CompanyId == company.Id);

        if (job == null)
            return NotFound();

        if (dto.Title != null) job.Title = dto.Title;
        if (dto.Description != null) job.Description = dto.Description;
        if (dto.Requirements != null) job.Requirements = dto.Requirements;
        if (dto.Benefits != null) job.Benefits = dto.Benefits;
        if (dto.Location != null) job.Location = dto.Location;
        if (dto.Type.HasValue) job.Type = dto.Type.Value;
        if (dto.SalaryMin.HasValue) job.SalaryMin = dto.SalaryMin;
        if (dto.SalaryMax.HasValue) job.SalaryMax = dto.SalaryMax;
        if (dto.SalaryCurrency != null) job.SalaryCurrency = dto.SalaryCurrency;
        if (dto.ExperienceYearsMin.HasValue) job.ExperienceYearsMin = dto.ExperienceYearsMin;
        if (dto.ExperienceYearsMax.HasValue) job.ExperienceYearsMax = dto.ExperienceYearsMax;

        if (dto.Status.HasValue)
        {
            job.Status = dto.Status.Value;
            if (dto.Status == JobStatus.Published && job.PublishedAt == null)
                job.PublishedAt = DateTime.UtcNow;
            if (dto.Status == JobStatus.Closed)
                job.ClosedAt = DateTime.UtcNow;
        }

        if (dto.RequiredSkills != null)
        {
            _context.JobSkills.RemoveRange(job.RequiredSkills);
            foreach (var skill in dto.RequiredSkills)
            {
                job.RequiredSkills.Add(new JobSkill
                {
                    JobPostingId = job.Id,
                    SkillId = skill.SkillId,
                    IsRequired = skill.IsRequired,
                    MinProficiency = skill.MinProficiency
                });
            }
        }

        job.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok();
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Company")]
    public async Task<ActionResult> DeleteJob(int id)
    {
        var userId = GetUserId();
        var company = await _context.Companies.FirstOrDefaultAsync(c => c.UserId == userId);

        if (company == null)
            return NotFound();

        var job = await _context.JobPostings
            .FirstOrDefaultAsync(j => j.Id == id && j.CompanyId == company.Id);

        if (job == null)
            return NotFound();

        _context.JobPostings.Remove(job);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    [HttpPost("{id}/publish")]
    [Authorize(Roles = "Company")]
    public async Task<ActionResult> PublishJob(int id)
    {
        var userId = GetUserId();
        var company = await _context.Companies.FirstOrDefaultAsync(c => c.UserId == userId);

        if (company == null)
            return NotFound("Company profile not found");

        var job = await _context.JobPostings
            .FirstOrDefaultAsync(j => j.Id == id && j.CompanyId == company.Id);

        if (job == null)
            return NotFound("Job not found");

        job.Status = JobStatus.Published;
        job.PublishedAt = DateTime.UtcNow;
        job.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok();
    }

    [HttpPost("{id}/unpublish")]
    [Authorize(Roles = "Company")]
    public async Task<ActionResult> UnpublishJob(int id)
    {
        var userId = GetUserId();
        var company = await _context.Companies.FirstOrDefaultAsync(c => c.UserId == userId);

        if (company == null)
            return NotFound();

        var job = await _context.JobPostings
            .FirstOrDefaultAsync(j => j.Id == id && j.CompanyId == company.Id);

        if (job == null)
            return NotFound();

        job.Status = JobStatus.Draft;
        job.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok();
    }

    [HttpPost("{id}/close")]
    [Authorize(Roles = "Company")]
    public async Task<ActionResult> CloseJob(int id)
    {
        var userId = GetUserId();
        var company = await _context.Companies.FirstOrDefaultAsync(c => c.UserId == userId);

        if (company == null)
            return NotFound("Company profile not found");

        var job = await _context.JobPostings
            .FirstOrDefaultAsync(j => j.Id == id && j.CompanyId == company.Id);

        if (job == null)
            return NotFound("Job not found");

        job.Status = JobStatus.Closed;
        job.ClosedAt = DateTime.UtcNow;
        job.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok();
    }

    // Admin endpoints - manage all jobs
    [HttpGet("admin/all")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<PagedResult<JobPostingDto>>> GetAllJobsAdmin(
        [FromQuery] string? search,
        [FromQuery] string? status,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var query = _context.JobPostings
            .Include(j => j.Company)
            .Include(j => j.RequiredSkills)
            .ThenInclude(js => js.Skill)
            .Include(j => j.Applications)
            .AsQueryable();

        if (!string.IsNullOrEmpty(search))
        {
            query = query.Where(j => 
                j.Title.ToLower().Contains(search.ToLower()) ||
                j.Description.ToLower().Contains(search.ToLower()) ||
                j.Company.Name.ToLower().Contains(search.ToLower()));
        }

        if (!string.IsNullOrEmpty(status) && Enum.TryParse<JobStatus>(status, out var jobStatus))
        {
            query = query.Where(j => j.Status == jobStatus);
        }

        var totalCount = await query.CountAsync();
        var jobs = await query
            .OrderByDescending(j => j.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var items = jobs.Select(j => new JobPostingDto(
            j.Id,
            j.CompanyId,
            j.Company.Name,
            j.Title,
            j.Description,
            j.Requirements,
            j.Benefits,
            j.Location,
            j.Type.ToString(),
            j.SalaryMin,
            j.SalaryMax,
            j.SalaryCurrency,
            j.Status.ToString(),
            j.ExperienceYearsMin,
            j.ExperienceYearsMax,
            j.RequiredSkills.Select(js => new JobSkillDto(
                js.SkillId,
                js.Skill?.Name ?? "",
                js.IsRequired,
                js.MinProficiency
            )).ToList(),
            j.CreatedAt,
            j.PublishedAt,
            j.Applications.Count
        )).ToList();

        return Ok(new PagedResult<JobPostingDto>(
            items,
            totalCount,
            page,
            pageSize,
            page * pageSize < totalCount
        ));
    }

    [HttpPut("admin/{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult> UpdateJobAdmin(int id, [FromBody] UpdateJobPostingDto dto)
    {
        var job = await _context.JobPostings
            .Include(j => j.RequiredSkills)
            .FirstOrDefaultAsync(j => j.Id == id);

        if (job == null)
            return NotFound();

        if (dto.Title != null) job.Title = dto.Title;
        if (dto.Description != null) job.Description = dto.Description;
        if (dto.Requirements != null) job.Requirements = dto.Requirements;
        if (dto.Benefits != null) job.Benefits = dto.Benefits;
        if (dto.Location != null) job.Location = dto.Location;
        if (dto.Type.HasValue) job.Type = dto.Type.Value;
        if (dto.SalaryMin.HasValue) job.SalaryMin = dto.SalaryMin;
        if (dto.SalaryMax.HasValue) job.SalaryMax = dto.SalaryMax;
        if (dto.SalaryCurrency != null) job.SalaryCurrency = dto.SalaryCurrency;
        if (dto.ExperienceYearsMin.HasValue) job.ExperienceYearsMin = dto.ExperienceYearsMin;
        if (dto.ExperienceYearsMax.HasValue) job.ExperienceYearsMax = dto.ExperienceYearsMax;

        if (dto.Status.HasValue)
        {
            job.Status = dto.Status.Value;
            if (dto.Status == JobStatus.Published && job.PublishedAt == null)
                job.PublishedAt = DateTime.UtcNow;
            if (dto.Status == JobStatus.Closed)
                job.ClosedAt = DateTime.UtcNow;
        }

        if (dto.RequiredSkills != null)
        {
            _context.JobSkills.RemoveRange(job.RequiredSkills);
            foreach (var skill in dto.RequiredSkills)
            {
                job.RequiredSkills.Add(new JobSkill
                {
                    JobPostingId = job.Id,
                    SkillId = skill.SkillId,
                    IsRequired = skill.IsRequired,
                    MinProficiency = skill.MinProficiency
                });
            }
        }

        job.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok();
    }

    [HttpDelete("admin/{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult> DeleteJobAdmin(int id)
    {
        var job = await _context.JobPostings.FirstOrDefaultAsync(j => j.Id == id);

        if (job == null)
            return NotFound();

        _context.JobPostings.Remove(job);
        await _context.SaveChangesAsync();

        return NoContent();
    }
}
