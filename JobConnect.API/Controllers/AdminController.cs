using System.Text.Json;
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
[Authorize(Roles = "Admin")]
public class AdminController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IAuthService _authService;

    public AdminController(ApplicationDbContext context, IAuthService authService)
    {
        _context = context;
        _authService = authService;
    }

    // Candidate Management
    [HttpGet("candidates")]
    public async Task<ActionResult<List<AdminCandidateDto>>> GetAllCandidates([FromQuery] string? search)
    {
        var query = _context.CandidateProfiles
            .Include(p => p.User)
            .Include(p => p.Skills)
            .ThenInclude(s => s.Skill)
            .Include(p => p.Applications)
            .AsQueryable();

        if (!string.IsNullOrEmpty(search))
        {
            query = query.Where(p =>
                p.FirstName.ToLower().Contains(search.ToLower()) ||
                p.LastName.ToLower().Contains(search.ToLower()) ||
                p.User.Email.ToLower().Contains(search.ToLower()));
        }

        var candidates = await query.OrderByDescending(p => p.CreatedAt).ToListAsync();

        return Ok(candidates.Select(MapToAdminDto));
    }

    [HttpGet("candidates/{id}")]
    public async Task<ActionResult<AdminCandidateDto>> GetCandidate(int id)
    {
        var candidate = await _context.CandidateProfiles
            .Include(p => p.User)
            .Include(p => p.Skills)
            .ThenInclude(s => s.Skill)
            .Include(p => p.Applications)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (candidate == null)
            return NotFound();

        return Ok(MapToAdminDto(candidate));
    }

    [HttpPost("candidates")]
    public async Task<ActionResult<AdminCandidateDto>> CreateCandidate([FromBody] CreateCandidateDto dto)
    {
        if (await _context.Users.AnyAsync(u => u.Email == dto.Email))
        {
            return BadRequest(new { message = "Email already registered" });
        }

        var user = new User
        {
            Email = dto.Email,
            PasswordHash = _authService.HashPassword(dto.Password),
            Role = UserRole.Candidate
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        var profile = new CandidateProfile
        {
            UserId = user.Id,
            FirstName = dto.FirstName,
            LastName = dto.LastName,
            Phone = dto.Phone,
            Summary = dto.Summary,
            Location = dto.Location
        };

        _context.CandidateProfiles.Add(profile);
        await _context.SaveChangesAsync();

        // Add skills if provided
        if (dto.SkillIds != null && dto.SkillIds.Any())
        {
            foreach (var skillId in dto.SkillIds)
            {
                profile.Skills.Add(new CandidateSkill
                {
                    CandidateProfileId = profile.Id,
                    SkillId = skillId,
                    ProficiencyLevel = 3
                });
            }
            await _context.SaveChangesAsync();
        }

        var createdCandidate = await _context.CandidateProfiles
            .Include(p => p.User)
            .Include(p => p.Skills)
            .ThenInclude(s => s.Skill)
            .FirstOrDefaultAsync(p => p.Id == profile.Id);

        return CreatedAtAction(nameof(GetCandidate), new { id = profile.Id }, MapToAdminDto(createdCandidate!));
    }

    [HttpPut("candidates/{id}")]
    public async Task<ActionResult<AdminCandidateDto>> UpdateCandidate(int id, [FromBody] UpdateAdminCandidateDto dto)
    {
        var candidate = await _context.CandidateProfiles
            .Include(p => p.User)
            .Include(p => p.Skills)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (candidate == null)
            return NotFound();

        if (dto.FirstName != null) candidate.FirstName = dto.FirstName;
        if (dto.LastName != null) candidate.LastName = dto.LastName;
        if (dto.Phone != null) candidate.Phone = dto.Phone;
        if (dto.Summary != null) candidate.Summary = dto.Summary;
        if (dto.Location != null) candidate.Location = dto.Location;

        if (dto.Email != null && dto.Email != candidate.User.Email)
        {
            if (await _context.Users.AnyAsync(u => u.Email == dto.Email && u.Id != candidate.UserId))
            {
                return BadRequest(new { message = "Email already in use" });
            }
            candidate.User.Email = dto.Email;
        }

        // Update Experience
        if (dto.Experience != null)
        {
            candidate.ExperienceJson = JsonSerializer.Serialize(dto.Experience);
        }

        // Update Education
        if (dto.Education != null)
        {
            candidate.EducationJson = JsonSerializer.Serialize(dto.Education);
        }

        // Update Certifications
        if (dto.Certifications != null)
        {
            candidate.CertificationsJson = JsonSerializer.Serialize(dto.Certifications);
        }

        if (dto.SkillIds != null)
        {
            _context.CandidateSkills.RemoveRange(candidate.Skills);
            foreach (var skillId in dto.SkillIds)
            {
                candidate.Skills.Add(new CandidateSkill
                {
                    CandidateProfileId = candidate.Id,
                    SkillId = skillId,
                    ProficiencyLevel = 3
                });
            }
        }

        candidate.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        var updatedCandidate = await _context.CandidateProfiles
            .Include(p => p.User)
            .Include(p => p.Skills)
            .ThenInclude(s => s.Skill)
            .FirstOrDefaultAsync(p => p.Id == id);

        return Ok(MapToAdminDto(updatedCandidate!));
    }

    [HttpDelete("candidates/{id}")]
    public async Task<ActionResult> DeleteCandidate(int id)
    {
        var candidate = await _context.CandidateProfiles
            .Include(p => p.User)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (candidate == null)
            return NotFound();

        // Delete the user (which will cascade delete the profile)
        _context.Users.Remove(candidate.User);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    private static AdminCandidateDto MapToAdminDto(CandidateProfile profile)
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

        return new AdminCandidateDto(
            profile.Id,
            profile.UserId,
            profile.User.Email,
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
            )).ToList(),
            profile.Applications.Count,
            profile.CreatedAt,
            profile.UpdatedAt
        );
    }
}

// Admin-specific DTOs
public record AdminCandidateDto(
    int Id,
    int UserId,
    string Email,
    string FirstName,
    string LastName,
    string? Phone,
    string? Summary,
    string? Location,
    string? PhotoUrl,
    List<ExperienceDto>? Experience,
    List<EducationDto>? Education,
    List<CertificationDto>? Certifications,
    List<CandidateSkillDto>? Skills,
    int ApplicationCount,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record CreateCandidateDto(
    string Email,
    string Password,
    string FirstName,
    string LastName,
    string? Phone,
    string? Summary,
    string? Location,
    int[]? SkillIds
);

public record UpdateAdminCandidateDto(
    string? Email,
    string? FirstName,
    string? LastName,
    string? Phone,
    string? Summary,
    string? Location,
    List<ExperienceDto>? Experience,
    List<EducationDto>? Education,
    List<CertificationDto>? Certifications,
    int[]? SkillIds
);
