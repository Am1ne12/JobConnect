namespace JobConnect.API.Models;

public enum UserRole
{
    Candidate,
    Company,
    Admin
}

public class User
{
    public int Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public UserRole Role { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    
    // Navigation properties
    public CandidateProfile? CandidateProfile { get; set; }
    public Company? Company { get; set; }
}
