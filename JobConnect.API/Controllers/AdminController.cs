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
    public async Task<ActionResult<PagedResult<AdminCandidateDto>>> GetAllCandidates(
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
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

        var totalCount = await query.CountAsync();
        var candidates = await query
            .OrderByDescending(p => p.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return Ok(new PagedResult<AdminCandidateDto>(
            candidates.Select(MapToAdminDto).ToList(),
            totalCount,
            page,
            pageSize,
            page * pageSize < totalCount
        ));
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

    // User Management
    [HttpGet("users")]
    public async Task<ActionResult<PagedResult<AdminUserDto>>> GetAllUsers(
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var query = _context.Users.AsQueryable();

        if (!string.IsNullOrEmpty(search))
        {
            query = query.Where(u =>
                u.Email.ToLower().Contains(search.ToLower()));
        }

        var totalCount = await query.CountAsync();
        var users = await query
            .OrderByDescending(u => u.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var result = new List<AdminUserDto>();
        foreach (var user in users)
        {
            string firstName = "", lastName = "";
            
            if (user.Role == UserRole.Candidate)
            {
                var profile = await _context.CandidateProfiles.FirstOrDefaultAsync(p => p.UserId == user.Id);
                if (profile != null)
                {
                    firstName = profile.FirstName;
                    lastName = profile.LastName;
                }
            }
            else if (user.Role == UserRole.Company)
            {
                var company = await _context.Companies.FirstOrDefaultAsync(c => c.UserId == user.Id);
                if (company != null)
                {
                    firstName = company.Name;
                    lastName = "";
                }
            }
            else if (user.Role == UserRole.Admin)
            {
                firstName = user.FirstName ?? "Admin";
                lastName = user.LastName ?? "";
            }

            result.Add(new AdminUserDto(
                user.Id,
                user.Email,
                firstName,
                lastName,
                user.Role.ToString(),
                user.CreatedAt,
                user.UpdatedAt
            ));
        }

        return Ok(new PagedResult<AdminUserDto>(
            result,
            totalCount,
            page,
            pageSize,
            page * pageSize < totalCount
        ));
    }

    [HttpGet("users/{id}")]
    public async Task<ActionResult<AdminUserDto>> GetUser(int id)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == id);
        if (user == null)
            return NotFound();

        string firstName = "", lastName = "";
        
        if (user.Role == UserRole.Candidate)
        {
            var profile = await _context.CandidateProfiles.FirstOrDefaultAsync(p => p.UserId == user.Id);
            if (profile != null)
            {
                firstName = profile.FirstName;
                lastName = profile.LastName;
            }
        }
        else if (user.Role == UserRole.Company)
        {
            var company = await _context.Companies.FirstOrDefaultAsync(c => c.UserId == user.Id);
            if (company != null)
            {
                firstName = company.Name;
                lastName = "";
            }
        }
        else if (user.Role == UserRole.Admin)
        {
            firstName = user.FirstName ?? "Admin";
            lastName = user.LastName ?? "";
        }

        return Ok(new AdminUserDto(
            user.Id,
            user.Email,
            firstName,
            lastName,
            user.Role.ToString(),
            user.CreatedAt,
            user.UpdatedAt
        ));
    }

    [HttpPost("users")]
    public async Task<ActionResult<AdminUserDto>> CreateUser([FromBody] CreateUserDto dto)
    {
        if (await _context.Users.AnyAsync(u => u.Email == dto.Email))
        {
            return BadRequest(new { message = "Email already registered" });
        }

        if (!Enum.TryParse<UserRole>(dto.Role, out var role))
        {
            return BadRequest(new { message = "Invalid role. Must be Candidate, Company, or Admin" });
        }

        var user = new User
        {
            Email = dto.Email,
            PasswordHash = _authService.HashPassword(dto.Password),
            Role = role,
            FirstName = role == UserRole.Admin ? dto.FirstName : null,
            LastName = role == UserRole.Admin ? dto.LastName : null
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        // Create profile based on role
        if (role == UserRole.Candidate)
        {
            var profile = new CandidateProfile
            {
                UserId = user.Id,
                FirstName = dto.FirstName,
                LastName = dto.LastName ?? ""
            };
            _context.CandidateProfiles.Add(profile);
            await _context.SaveChangesAsync();
        }
        else if (role == UserRole.Company)
        {
            var company = new Company
            {
                UserId = user.Id,
                Name = dto.FirstName
            };
            _context.Companies.Add(company);
            await _context.SaveChangesAsync();
        }

        return CreatedAtAction(nameof(GetUser), new { id = user.Id }, new AdminUserDto(
            user.Id,
            user.Email,
            dto.FirstName,
            dto.LastName ?? "",
            role.ToString(),
            user.CreatedAt,
            user.UpdatedAt
        ));
    }

    [HttpPut("users/{id}")]
    public async Task<ActionResult<AdminUserDto>> UpdateUser(int id, [FromBody] UpdateUserDto dto)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == id);
        if (user == null)
            return NotFound();

        if (dto.Email != null && dto.Email != user.Email)
        {
            if (await _context.Users.AnyAsync(u => u.Email == dto.Email && u.Id != id))
            {
                return BadRequest(new { message = "Email already in use" });
            }
            user.Email = dto.Email;
        }

        if (!string.IsNullOrEmpty(dto.Password))
        {
            user.PasswordHash = _authService.HashPassword(dto.Password);
        }

        string firstName = dto.FirstName ?? "", lastName = dto.LastName ?? "";

        // Update profile based on role
        if (user.Role == UserRole.Candidate)
        {
            var profile = await _context.CandidateProfiles.FirstOrDefaultAsync(p => p.UserId == user.Id);
            if (profile != null)
            {
                if (dto.FirstName != null) profile.FirstName = dto.FirstName;
                if (dto.LastName != null) profile.LastName = dto.LastName;
                firstName = profile.FirstName;
                lastName = profile.LastName;
            }
        }
        else if (user.Role == UserRole.Company)
        {
            var company = await _context.Companies.FirstOrDefaultAsync(c => c.UserId == user.Id);
            if (company != null)
            {
                if (dto.FirstName != null) company.Name = dto.FirstName;
                firstName = company.Name;
                lastName = "";
            }
        }
        else if (user.Role == UserRole.Admin)
        {
            if (dto.FirstName != null) user.FirstName = dto.FirstName;
            if (dto.LastName != null) user.LastName = dto.LastName;
            firstName = user.FirstName ?? "Admin";
            lastName = user.LastName ?? "";
        }

        user.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(new AdminUserDto(
            user.Id,
            user.Email,
            firstName,
            lastName,
            user.Role.ToString(),
            user.CreatedAt,
            user.UpdatedAt
        ));
    }

    [HttpDelete("users/{id}")]
    public async Task<ActionResult> DeleteUser(int id)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == id);
        if (user == null)
            return NotFound();

        _context.Users.Remove(user);
        await _context.SaveChangesAsync();

        return NoContent();
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

// User Management DTOs
public record AdminUserDto(
    int Id,
    string Email,
    string FirstName,
    string LastName,
    string Role,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record CreateUserDto(
    string Email,
    string Password,
    string FirstName,
    string? LastName,
    string Role
);

public record UpdateUserDto(
    string? Email,
    string? Password,
    string? FirstName,
    string? LastName
);
