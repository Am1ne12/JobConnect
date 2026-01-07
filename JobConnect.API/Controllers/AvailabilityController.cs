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
public class AvailabilityController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IInterviewSchedulingService _schedulingService;

    public AvailabilityController(
        ApplicationDbContext context,
        IInterviewSchedulingService schedulingService)
    {
        _context = context;
        _schedulingService = schedulingService;
    }

    private int GetUserId() => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    private string GetUserRole() => User.FindFirstValue(ClaimTypes.Role)!;

    /// <summary>
    /// Get company's availability settings (Company only)
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<List<CompanyAvailabilityDto>>> GetAvailability()
    {
        var userId = GetUserId();
        var role = GetUserRole();

        if (role != "Company")
            return Forbid("Only companies can manage availability");

        var company = await _context.Companies.FirstOrDefaultAsync(c => c.UserId == userId);
        if (company == null)
            return NotFound("Company profile not found");

        var availabilities = await _context.CompanyAvailabilities
            .Where(a => a.CompanyId == company.Id)
            .OrderBy(a => a.DayOfWeek)
            .Select(a => new CompanyAvailabilityDto(
                a.Id,
                a.CompanyId,
                a.DayOfWeek,
                a.StartTime,
                a.EndTime,
                a.IsActive
            ))
            .ToListAsync();

        return Ok(availabilities);
    }

    /// <summary>
    /// Update company's availability settings (Company only)
    /// </summary>
    [HttpPut]
    public async Task<ActionResult<List<CompanyAvailabilityDto>>> UpdateAvailability([FromBody] UpdateAvailabilityDto dto)
    {
        var userId = GetUserId();
        var role = GetUserRole();

        Console.WriteLine($"UpdateAvailability called with {dto.Slots.Count} slots");
        foreach (var slot in dto.Slots)
        {
            Console.WriteLine($"  Slot: DayOfWeek={slot.DayOfWeek}, Start={slot.StartTime}, End={slot.EndTime}, Active={slot.IsActive}");
        }

        if (role != "Company")
            return Forbid("Only companies can manage availability");

        var company = await _context.Companies.FirstOrDefaultAsync(c => c.UserId == userId);
        if (company == null)
            return NotFound("Company profile not found");

        // Remove existing availabilities
        var existing = await _context.CompanyAvailabilities
            .Where(a => a.CompanyId == company.Id)
            .ToListAsync();
        _context.CompanyAvailabilities.RemoveRange(existing);

        // Add new availabilities
        foreach (var slot in dto.Slots)
        {
            // Only allow weekdays
            if (slot.DayOfWeek == DayOfWeek.Saturday || slot.DayOfWeek == DayOfWeek.Sunday)
                continue;

            _context.CompanyAvailabilities.Add(new CompanyAvailability
            {
                CompanyId = company.Id,
                DayOfWeek = slot.DayOfWeek,
                StartTime = slot.StartTime,
                EndTime = slot.EndTime,
                IsActive = slot.IsActive
            });
        }

        await _context.SaveChangesAsync();

        // Return updated list
        var availabilities = await _context.CompanyAvailabilities
            .Where(a => a.CompanyId == company.Id)
            .OrderBy(a => a.DayOfWeek)
            .Select(a => new CompanyAvailabilityDto(
                a.Id,
                a.CompanyId,
                a.DayOfWeek,
                a.StartTime,
                a.EndTime,
                a.IsActive
            ))
            .ToListAsync();

        return Ok(availabilities);
    }

    /// <summary>
    /// Get available slots for a company (for candidates to book)
    /// </summary>
    [HttpGet("{companyId}/slots")]
    public async Task<ActionResult<List<AvailableSlotDto>>> GetAvailableSlots(
        int companyId, 
        [FromQuery] DateTime? startDate = null,
        [FromQuery] int days = 14)
    {
        var company = await _context.Companies.FindAsync(companyId);
        if (company == null)
            return NotFound("Company not found");

        var start = startDate ?? DateTime.UtcNow.Date.AddDays(1); // Start from tomorrow
        var allSlots = new List<AvailableSlotDto>();

        // Get slots for the next N days
        for (int i = 0; i < days; i++)
        {
            var date = start.AddDays(i);
            
            // Skip past dates
            if (date.Date < DateTime.UtcNow.Date)
                continue;

            var daySlots = await _schedulingService.GetAvailableSlotsAsync(companyId, date);
            
            foreach (var slot in daySlots)
            {
                // Skip slots that are in the past
                if (slot.Start <= DateTime.UtcNow)
                    continue;

                allSlots.Add(new AvailableSlotDto(slot.Start, slot.End));
            }
        }

        return Ok(allSlots);
    }

    /// <summary>
    /// Initialize default availability for a company (Mon-Fri 9:00-18:00)
    /// </summary>
    [HttpPost("initialize")]
    public async Task<ActionResult<List<CompanyAvailabilityDto>>> InitializeDefaultAvailability()
    {
        var userId = GetUserId();
        var role = GetUserRole();

        if (role != "Company")
            return Forbid("Only companies can manage availability");

        var company = await _context.Companies.FirstOrDefaultAsync(c => c.UserId == userId);
        if (company == null)
            return NotFound("Company profile not found");

        // Check if already has availability
        var existingCount = await _context.CompanyAvailabilities
            .CountAsync(a => a.CompanyId == company.Id);

        if (existingCount > 0)
            return BadRequest("Availability already initialized. Use PUT to update.");

        // Create default availability (Mon-Fri, 9:00-18:00)
        var weekdays = new[] { DayOfWeek.Monday, DayOfWeek.Tuesday, DayOfWeek.Wednesday, 
                               DayOfWeek.Thursday, DayOfWeek.Friday };

        foreach (var day in weekdays)
        {
            _context.CompanyAvailabilities.Add(new CompanyAvailability
            {
                CompanyId = company.Id,
                DayOfWeek = day,
                StartTime = new TimeOnly(9, 0),
                EndTime = new TimeOnly(18, 0),
                IsActive = true
            });
        }

        await _context.SaveChangesAsync();

        var availabilities = await _context.CompanyAvailabilities
            .Where(a => a.CompanyId == company.Id)
            .OrderBy(a => a.DayOfWeek)
            .Select(a => new CompanyAvailabilityDto(
                a.Id,
                a.CompanyId,
                a.DayOfWeek,
                a.StartTime,
                a.EndTime,
                a.IsActive
            ))
            .ToListAsync();

        return CreatedAtAction(nameof(GetAvailability), availabilities);
    }
}
