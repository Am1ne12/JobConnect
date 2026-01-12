namespace JobConnect.API.Models;

public class CompanyAvailability
{
    public int Id { get; set; }
    public int CompanyId { get; set; }
    
    public DayOfWeek DayOfWeek { get; set; }
    public TimeOnly StartTime { get; set; }
    public TimeOnly EndTime { get; set; }
    public bool IsActive { get; set; } = true;
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    
    // Navigation property
    public Company Company { get; set; } = null!;
}
