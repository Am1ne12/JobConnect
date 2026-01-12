namespace JobConnect.API.Models;

public class CompanyUnavailability
{
    public int Id { get; set; }
    public int CompanyId { get; set; }
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }
    public string? Reason { get; set; }
    
    // Navigation
    public Company Company { get; set; } = null!;
}
