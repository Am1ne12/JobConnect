using System.ComponentModel.DataAnnotations.Schema;

namespace JobConnect.API.Models;

public enum InterviewStatus
{
    Scheduled,      // Confirmed, waiting for date
    InWaitingRoom,  // 5 min before, participants can join
    InProgress,     // Video call active
    Completed,      // Finished successfully
    Cancelled,      // Cancelled by either party
    Rescheduled     // Moved to new slot
}

public class Interview
{
    public int Id { get; set; }
    public int ApplicationId { get; set; }
    public int CompanyId { get; set; }
    public int CandidateProfileId { get; set; }
    
    [Column(TypeName = "timestamp without time zone")]
    public DateTime ScheduledAt { get; set; }
    [Column(TypeName = "timestamp without time zone")]
    public DateTime EndsAt { get; set; }
    public InterviewStatus Status { get; set; } = InterviewStatus.Scheduled;
    public string? CancellationReason { get; set; }
    public int? RescheduledFromId { get; set; }
    public DateTime? CompanyJoinedAt { get; set; }  // Track when company joins the call
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    
    // Navigation properties
    public Application Application { get; set; } = null!;
    public Company Company { get; set; } = null!;
    public CandidateProfile CandidateProfile { get; set; } = null!;
    public Interview? RescheduledFrom { get; set; }
    public ICollection<InterviewMessage> Messages { get; set; } = new List<InterviewMessage>();
}
