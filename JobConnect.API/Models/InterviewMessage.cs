namespace JobConnect.API.Models;

public class InterviewMessage
{
    public int Id { get; set; }
    public int InterviewId { get; set; }
    public int SenderId { get; set; }
    public string SenderRole { get; set; } = string.Empty; // "Company" or "Candidate"
    
    public string Content { get; set; } = string.Empty;
    public DateTime SentAt { get; set; } = DateTime.UtcNow;
    public bool IsRead { get; set; } = false;
    
    // Navigation properties
    public Interview Interview { get; set; } = null!;
    public User Sender { get; set; } = null!;
}
