using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using JobConnect.API.Data;
using JobConnect.API.DTOs;

namespace JobConnect.API.Controllers;

[ApiController]
[Route("api/public")]
public class PublicController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public PublicController(ApplicationDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Get public company information (including calendar link for booking)
    /// </summary>
    [HttpGet("companies/{companyId}")]
    public async Task<ActionResult<CompanyDto>> GetCompany(int companyId)
    {
        var company = await _context.Companies.FindAsync(companyId);
        
        if (company == null)
            return NotFound("Company not found");

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
}
