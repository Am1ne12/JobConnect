using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using JobConnect.API.Data;
using JobConnect.API.DTOs;
using JobConnect.API.Models;

namespace JobConnect.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Candidate")]
public class CandidatesController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public CandidatesController(ApplicationDbContext context)
    {
        _context = context;
    }

    private int GetUserId() => int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");

    [HttpGet("profile")]
    public async Task<ActionResult<CandidateProfileDto>> GetProfile()
    {
        var userId = GetUserId();
        var profile = await _context.CandidateProfiles
            .Include(p => p.Skills)
            .ThenInclude(s => s.Skill)
            .FirstOrDefaultAsync(p => p.UserId == userId);

        if (profile == null)
            return NotFound();

        return Ok(MapToDto(profile));
    }

    [HttpPut("profile")]
    public async Task<ActionResult<CandidateProfileDto>> UpdateProfile([FromBody] UpdateCandidateProfileDto dto)
    {
        var userId = GetUserId();
        var profile = await _context.CandidateProfiles
            .Include(p => p.Skills)
            .FirstOrDefaultAsync(p => p.UserId == userId);

        if (profile == null)
            return NotFound();

        if (dto.FirstName != null) profile.FirstName = dto.FirstName;
        if (dto.LastName != null) profile.LastName = dto.LastName;
        if (dto.Phone != null) profile.Phone = dto.Phone;
        if (dto.Summary != null) profile.Summary = dto.Summary;
        if (dto.Location != null) profile.Location = dto.Location;

        if (dto.Experience != null)
            profile.ExperienceJson = JsonSerializer.Serialize(dto.Experience);

        if (dto.Education != null)
            profile.EducationJson = JsonSerializer.Serialize(dto.Education);

        if (dto.Certifications != null)
            profile.CertificationsJson = JsonSerializer.Serialize(dto.Certifications);

        if (dto.SkillIds != null)
        {
            // Remove existing skills
            _context.CandidateSkills.RemoveRange(profile.Skills);

            // Add new skills
            foreach (var skillId in dto.SkillIds)
            {
                profile.Skills.Add(new CandidateSkill
                {
                    CandidateProfileId = profile.Id,
                    SkillId = skillId,
                    ProficiencyLevel = 3
                });
            }
        }

        profile.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(MapToDto(profile));
    }

    [HttpPut("profile/skills")]
    public async Task<ActionResult> UpdateSkills([FromBody] List<CandidateSkillDto> skills)
    {
        var userId = GetUserId();
        var profile = await _context.CandidateProfiles
            .Include(p => p.Skills)
            .FirstOrDefaultAsync(p => p.UserId == userId);

        if (profile == null)
            return NotFound();

        // Remove existing skills
        _context.CandidateSkills.RemoveRange(profile.Skills);

        // Add new skills
        foreach (var skill in skills)
        {
            profile.Skills.Add(new CandidateSkill
            {
                CandidateProfileId = profile.Id,
                SkillId = skill.SkillId,
                ProficiencyLevel = skill.ProficiencyLevel,
                YearsOfExperience = skill.YearsOfExperience
            });
        }

        await _context.SaveChangesAsync();
        return Ok();
    }

    [HttpGet("applications")]
    public async Task<ActionResult<PagedResult<ApplicationDto>>> GetApplications(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var userId = GetUserId();
        var profile = await _context.CandidateProfiles.FirstOrDefaultAsync(p => p.UserId == userId);
        
        if (profile == null)
            return NotFound();

        var query = _context.Applications
            .Include(a => a.JobPosting)
            .ThenInclude(j => j.Company)
            .Where(a => a.CandidateProfileId == profile.Id);

        var totalCount = await query.CountAsync();
        var applications = await query
            .OrderByDescending(a => a.AppliedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
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

        var items = applications.Select(a => new ApplicationDto(
            a.Id,
            a.CandidateProfileId,
            $"{profile.FirstName} {profile.LastName}",
            a.JobPostingId,
            a.JobPosting.Title,
            a.JobPosting.CompanyId,
            a.JobPosting.Company.Name,
            a.Status.ToString(),
            a.MatchingScore,
            a.CoverLetter,
            a.Notes,
            a.KanbanOrder,
            a.AppliedAt,
            a.UpdatedAt,
            null,
            interviewMap.GetValueOrDefault(a.Id)
        )).ToList();

        return Ok(new PagedResult<ApplicationDto>(
            items,
            totalCount,
            page,
            pageSize,
            page * pageSize < totalCount
        ));
    }

    private CandidateProfileDto MapToDto(CandidateProfile profile)
    {
        var experience = string.IsNullOrEmpty(profile.ExperienceJson)
            ? null
            : JsonSerializer.Deserialize<List<ExperienceDto>>(profile.ExperienceJson);

        var education = string.IsNullOrEmpty(profile.EducationJson)
            ? null
            : JsonSerializer.Deserialize<List<EducationDto>>(profile.EducationJson);

        var certifications = string.IsNullOrEmpty(profile.CertificationsJson)
            ? null
            : JsonSerializer.Deserialize<List<CertificationDto>>(profile.CertificationsJson);

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
