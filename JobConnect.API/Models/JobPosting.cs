using System.ComponentModel.DataAnnotations.Schema;

namespace JobConnect.API.Models;

public enum JobStatus
{
    Draft,
    Published,
    Closed,
    Archived
}

public enum JobType
{
    FullTime,
    PartTime,
    Contract,
    Internship,
    Remote
}

public class JobPosting
{
    public int Id { get; set; }
    public int CompanyId { get; set; }
    
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string? Requirements { get; set; }
    public string? Benefits { get; set; }
    public string? Location { get; set; }
    public JobType Type { get; set; } = JobType.FullTime;
    public decimal? SalaryMin { get; set; }
    public decimal? SalaryMax { get; set; }
    public string? SalaryCurrency { get; set; } = "EUR";
    public JobStatus Status { get; set; } = JobStatus.Draft;
    public int? ExperienceYearsMin { get; set; }
    public int? ExperienceYearsMax { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? PublishedAt { get; set; }
    public DateTime? ClosedAt { get; set; }
    
    // Navigation properties
    public Company Company { get; set; } = null!;
    public ICollection<JobSkill> RequiredSkills { get; set; } = new List<JobSkill>();
    public ICollection<Application> Applications { get; set; } = new List<Application>();
}
