using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using JobConnect.API.Data;
using JobConnect.API.DTOs;
using JobConnect.API.Models;

namespace JobConnect.API.Controllers;

[ApiController]
[Route("api/interviews/{interviewId}/[controller]")]
[Authorize]
public class MessagesController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public MessagesController(ApplicationDbContext context)
    {
        _context = context;
    }

    private int GetUserId() => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    private string GetUserRole() => User.FindFirstValue(ClaimTypes.Role)!;

    /// <summary>
    /// Get all messages for an interview
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<List<InterviewMessageDto>>> GetMessages(int interviewId)
    {
        var interview = await _context.Interviews.FindAsync(interviewId);
        if (interview == null)
            return NotFound("Interview not found");

        if (!await HasAccessToInterview(interview))
            return Forbid();

        var messages = await _context.InterviewMessages
            .Where(m => m.InterviewId == interviewId)
            .Include(m => m.Sender)
            .OrderBy(m => m.SentAt)
            .Select(m => new InterviewMessageDto(
                m.Id,
                m.InterviewId,
                m.SenderId,
                m.SenderRole,
                GetSenderName(m),
                m.Content,
                m.SentAt,
                m.IsRead
            ))
            .ToListAsync();

        return Ok(messages);
    }

    /// <summary>
    /// Send a message in an interview thread
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<InterviewMessageDto>> SendMessage(int interviewId, [FromBody] SendMessageDto dto)
    {
        var userId = GetUserId();
        var role = GetUserRole();

        var interview = await _context.Interviews.FindAsync(interviewId);
        if (interview == null)
            return NotFound("Interview not found");

        if (!await HasAccessToInterview(interview))
            return Forbid();

        // Get sender name
        string senderName;
        if (role == "Company")
        {
            var company = await _context.Companies.FirstOrDefaultAsync(c => c.UserId == userId);
            senderName = company?.Name ?? "Company";
        }
        else
        {
            var candidate = await _context.CandidateProfiles.FirstOrDefaultAsync(c => c.UserId == userId);
            senderName = candidate != null ? $"{candidate.FirstName} {candidate.LastName}" : "Candidate";
        }

        var message = new InterviewMessage
        {
            InterviewId = interviewId,
            SenderId = userId,
            SenderRole = role,
            Content = dto.Content,
            SentAt = DateTime.UtcNow,
            IsRead = false
        };

        _context.InterviewMessages.Add(message);
        await _context.SaveChangesAsync();

        // TODO: Send real-time notification via SignalR

        return CreatedAtAction(nameof(GetMessages), new { interviewId }, new InterviewMessageDto(
            message.Id,
            message.InterviewId,
            message.SenderId,
            message.SenderRole,
            senderName,
            message.Content,
            message.SentAt,
            message.IsRead
        ));
    }

    /// <summary>
    /// Mark all messages as read
    /// </summary>
    [HttpPut("read")]
    public async Task<ActionResult> MarkAsRead(int interviewId)
    {
        var userId = GetUserId();

        var interview = await _context.Interviews.FindAsync(interviewId);
        if (interview == null)
            return NotFound("Interview not found");

        if (!await HasAccessToInterview(interview))
            return Forbid();

        // Mark messages from other users as read
        var unreadMessages = await _context.InterviewMessages
            .Where(m => m.InterviewId == interviewId && m.SenderId != userId && !m.IsRead)
            .ToListAsync();

        foreach (var message in unreadMessages)
        {
            message.IsRead = true;
        }

        await _context.SaveChangesAsync();

        return NoContent();
    }

    private async Task<bool> HasAccessToInterview(Interview interview)
    {
        var userId = GetUserId();
        var role = GetUserRole();

        if (role == "Company")
        {
            var company = await _context.Companies.FirstOrDefaultAsync(c => c.UserId == userId);
            return company != null && interview.CompanyId == company.Id;
        }
        else
        {
            var candidate = await _context.CandidateProfiles.FirstOrDefaultAsync(c => c.UserId == userId);
            return candidate != null && interview.CandidateProfileId == candidate.Id;
        }
    }

    private static string GetSenderName(InterviewMessage m)
    {
        // This is a simplified version - in reality, we'd need to load the appropriate profile
        return m.SenderRole == "Company" ? "Company" : "Candidate";
    }
}
