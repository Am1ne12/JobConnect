using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using System.Security.Claims;

namespace JobConnect.API.Hubs;

/// <summary>
/// SignalR Hub for real-time notifications and updates
/// </summary>
[Authorize]
public class NotificationHub : Hub
{
    /// <summary>
    /// Called when a client connects to the hub
    /// </summary>
    public override async Task OnConnectedAsync()
    {
        var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userId != null)
        {
            // Add user to a group based on their user ID for targeted notifications
            await Groups.AddToGroupAsync(Context.ConnectionId, $"user-{userId}");
            Console.WriteLine($"SignalR: User {userId} connected (ConnectionId: {Context.ConnectionId})");
        }
        await base.OnConnectedAsync();
    }

    /// <summary>
    /// Called when a client disconnects from the hub
    /// </summary>
    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userId != null)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"user-{userId}");
            Console.WriteLine($"SignalR: User {userId} disconnected");
        }
        await base.OnDisconnectedAsync(exception);
    }
}

/// <summary>
/// Service to send notifications through SignalR from controllers/services
/// </summary>
public interface INotificationHubService
{
    Task SendNotificationAsync(int userId, NotificationMessage notification);
    Task SendInterviewUpdateAsync(int userId, InterviewUpdateMessage update);
    Task SendAvailabilityUpdateAsync(int companyId);
    Task SendSlotBookedAsync(int companyId, DateTime slotStart, DateTime slotEnd);
}

public class NotificationHubService : INotificationHubService
{
    private readonly IHubContext<NotificationHub> _hubContext;

    public NotificationHubService(IHubContext<NotificationHub> hubContext)
    {
        _hubContext = hubContext;
    }

    public async Task SendNotificationAsync(int userId, NotificationMessage notification)
    {
        await _hubContext.Clients.Group($"user-{userId}").SendAsync("ReceiveNotification", notification);
        Console.WriteLine($"SignalR: Sent notification to user {userId}: {notification.Title}");
    }

    public async Task SendInterviewUpdateAsync(int userId, InterviewUpdateMessage update)
    {
        await _hubContext.Clients.Group($"user-{userId}").SendAsync("InterviewUpdated", update);
        Console.WriteLine($"SignalR: Sent interview update to user {userId}: {update.Type}");
    }

    public async Task SendAvailabilityUpdateAsync(int companyId)
    {
        // Notify all clients (candidates viewing this company's calendar)
        await _hubContext.Clients.All.SendAsync("AvailabilityUpdated", new { companyId });
        Console.WriteLine($"SignalR: Sent availability update for company {companyId}");
    }

    public async Task SendSlotBookedAsync(int companyId, DateTime slotStart, DateTime slotEnd)
    {
        // Notify all clients that a slot has been booked (so they can remove it from their view)
        await _hubContext.Clients.All.SendAsync("SlotBooked", new { 
            companyId, 
            slotStart = slotStart.ToString("o"),
            slotEnd = slotEnd.ToString("o")
        });
        Console.WriteLine($"SignalR: Sent slot booked for company {companyId}: {slotStart:HH:mm}");
    }
}

// Message DTOs for SignalR
public record NotificationMessage(
    int Id,
    string Type,
    string Title,
    string Message,
    string? Link,
    DateTime CreatedAt
);

public record InterviewUpdateMessage(
    string Type, // "scheduled", "cancelled", "rescheduled", "started", "completed"
    int InterviewId,
    int? ApplicationId,
    string? JobTitle,
    DateTime? ScheduledAt,
    string? Message
);
