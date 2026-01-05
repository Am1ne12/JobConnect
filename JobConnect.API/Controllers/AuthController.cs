using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using JobConnect.API.Data;
using JobConnect.API.DTOs;
using JobConnect.API.Models;
using JobConnect.API.Services;

namespace JobConnect.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IAuthService _authService;

    public AuthController(ApplicationDbContext context, IAuthService authService)
    {
        _context = context;
        _authService = authService;
    }

    [HttpPost("register")]
    public async Task<ActionResult<AuthResponseDto>> Register([FromBody] RegisterDto dto)
    {
        if (await _context.Users.AnyAsync(u => u.Email == dto.Email))
        {
            return BadRequest(new { message = "Email already registered" });
        }

        var user = new User
        {
            Email = dto.Email,
            PasswordHash = _authService.HashPassword(dto.Password),
            Role = dto.Role
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        int? profileId = null;

        // Create profile based on role
        if (dto.Role == UserRole.Candidate)
        {
            var profile = new CandidateProfile
            {
                UserId = user.Id,
                FirstName = dto.FirstName ?? "",
                LastName = dto.LastName ?? ""
            };
            _context.CandidateProfiles.Add(profile);
            await _context.SaveChangesAsync();
            profileId = profile.Id;
        }
        else if (dto.Role == UserRole.Company)
        {
            var company = new Company
            {
                UserId = user.Id,
                Name = dto.CompanyName ?? "My Company"
            };
            _context.Companies.Add(company);
            await _context.SaveChangesAsync();
            profileId = company.Id;
        }

        var token = _authService.GenerateToken(user);

        return Ok(new AuthResponseDto(
            token,
            user.Id,
            user.Email,
            user.Role.ToString(),
            profileId
        ));
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponseDto>> Login([FromBody] LoginDto dto)
    {
        var user = await _context.Users
            .Include(u => u.CandidateProfile)
            .Include(u => u.Company)
            .FirstOrDefaultAsync(u => u.Email == dto.Email);

        if (user == null || !_authService.VerifyPassword(dto.Password, user.PasswordHash))
        {
            return Unauthorized(new { message = "Invalid email or password" });
        }

        var token = _authService.GenerateToken(user);
        int? profileId = user.Role switch
        {
            UserRole.Candidate => user.CandidateProfile?.Id,
            UserRole.Company => user.Company?.Id,
            _ => null
        };

        return Ok(new AuthResponseDto(
            token,
            user.Id,
            user.Email,
            user.Role.ToString(),
            profileId
        ));
    }
}
