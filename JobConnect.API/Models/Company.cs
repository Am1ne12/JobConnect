namespace JobConnect.API.Models;

public class Company
{
    public int Id { get; set; }
    public int UserId { get; set; }
    
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Industry { get; set; }
    public string? Website { get; set; }
    public string? Location { get; set; }
    public string? LogoUrl { get; set; }
    public int? EmployeeCount { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    
    // Navigation properties
    public User User { get; set; } = null!;
    public ICollection<JobPosting> JobPostings { get; set; } = new List<JobPosting>();
    public ICollection<CompanyAvailability> Availabilities { get; set; } = new List<CompanyAvailability>();
    public ICollection<Interview> Interviews { get; set; } = new List<Interview>();
}
