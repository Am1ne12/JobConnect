namespace JobConnect.API.Models;

public class Notification
{
    public int Id { get; set; }
    public int UserId { get; set; }
    
    public string Type { get; set; } = string.Empty; // "InterviewScheduled", "Reminder", "Message", etc.
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string? Link { get; set; }
    public int? RelatedId { get; set; } // ID of related entity (ApplicationId, InterviewId, etc.)
    public bool IsRead { get; set; } = false;
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    // Navigation property
    public User User { get; set; } = null!;
}

