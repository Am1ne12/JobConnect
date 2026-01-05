using System.ComponentModel.DataAnnotations.Schema;

namespace JobConnect.API.Models;

public class CandidateProfile
{
    public int Id { get; set; }
    public int UserId { get; set; }
    
    // Personal Info
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Summary { get; set; }
    public string? Location { get; set; }
    public string? PhotoUrl { get; set; }
    
    // CV Data stored as JSON
    [Column(TypeName = "jsonb")]
    public string? ExperienceJson { get; set; }
    
    [Column(TypeName = "jsonb")]
    public string? EducationJson { get; set; }
    
    [Column(TypeName = "jsonb")]
    public string? CertificationsJson { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    
    // Navigation properties
    public User User { get; set; } = null!;
    public ICollection<CandidateSkill> Skills { get; set; } = new List<CandidateSkill>();
    public ICollection<Application> Applications { get; set; } = new List<Application>();
}

public class Experience
{
    public string Company { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public DateTime StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public bool IsCurrentRole { get; set; }
    public string? Description { get; set; }
}

public class Education
{
    public string Institution { get; set; } = string.Empty;
    public string Degree { get; set; } = string.Empty;
    public string Field { get; set; } = string.Empty;
    public int GraduationYear { get; set; }
    public string? Description { get; set; }
}

public class Certification
{
    public string Name { get; set; } = string.Empty;
    public string Issuer { get; set; } = string.Empty;
    public DateTime IssueDate { get; set; }
    public DateTime? ExpiryDate { get; set; }
}
