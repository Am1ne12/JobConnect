namespace JobConnect.API.Models;

public enum ApplicationStatus
{
    Submitted,
    Screening,
    Interview,
    Offer,
    Hired,
    Rejected
}

public class Application
{
    public int Id { get; set; }
    public int CandidateProfileId { get; set; }
    public int JobPostingId { get; set; }
    
    public ApplicationStatus Status { get; set; } = ApplicationStatus.Submitted;
    public int MatchingScore { get; set; }
    public string? CoverLetter { get; set; }
    public string? Notes { get; set; }
    
    // Kanban position for drag & drop
    public int KanbanOrder { get; set; }
    
    public DateTime AppliedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    
    // Navigation properties
    public CandidateProfile CandidateProfile { get; set; } = null!;
    public JobPosting JobPosting { get; set; } = null!;
}
