using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace JobConnect.API.Services;

public interface IDailyService
{
    Task<DailyRoomInfo> CreateRoomAsync(string roomName);
    Task<string> CreateMeetingTokenAsync(string roomName, string userName, bool isOwner, int expiryMinutes = 120);
    Task DeleteRoomAsync(string roomName);
}

public class DailyRoomInfo
{
    public string Name { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

public class DailyService : IDailyService
{
    private readonly HttpClient _httpClient;
    private readonly string _apiKey;
    private const string DailyApiBaseUrl = "https://api.daily.co/v1";

    public DailyService(IConfiguration configuration)
    {
        _httpClient = new HttpClient();
        _apiKey = Environment.GetEnvironmentVariable("DAILY_API_KEY") 
            ?? configuration["Daily:ApiKey"] 
            ?? throw new InvalidOperationException("Daily API key not configured");
        
        _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _apiKey);
        _httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
    }

    public async Task<DailyRoomInfo> CreateRoomAsync(string roomName)
    {
        var request = new
        {
            name = roomName,
            privacy = "private", // Requires token to join
            properties = new
            {
                enable_chat = true,
                enable_screenshare = true,
                start_video_off = false,
                start_audio_off = false,
                enable_knocking = false,
                exp = DateTimeOffset.UtcNow.AddHours(24).ToUnixTimeSeconds() // Room expires in 24h
            }
        };

        var content = new StringContent(JsonSerializer.Serialize(request), Encoding.UTF8, "application/json");
        var response = await _httpClient.PostAsync($"{DailyApiBaseUrl}/rooms", content);

        if (!response.IsSuccessStatusCode)
        {
            var error = await response.Content.ReadAsStringAsync();
            // If room already exists, try to get it
            if (response.StatusCode == System.Net.HttpStatusCode.BadRequest && error.Contains("already exists"))
            {
                return await GetRoomAsync(roomName);
            }
            throw new Exception($"Failed to create Daily room: {error}");
        }

        var json = await response.Content.ReadAsStringAsync();
        var room = JsonSerializer.Deserialize<JsonElement>(json);

        return new DailyRoomInfo
        {
            Name = room.GetProperty("name").GetString() ?? roomName,
            Url = room.GetProperty("url").GetString() ?? $"https://jobconnect.daily.co/{roomName}",
            CreatedAt = DateTime.UtcNow
        };
    }

    private async Task<DailyRoomInfo> GetRoomAsync(string roomName)
    {
        var response = await _httpClient.GetAsync($"{DailyApiBaseUrl}/rooms/{roomName}");
        
        if (!response.IsSuccessStatusCode)
        {
            throw new Exception($"Room {roomName} not found");
        }

        var json = await response.Content.ReadAsStringAsync();
        var room = JsonSerializer.Deserialize<JsonElement>(json);

        return new DailyRoomInfo
        {
            Name = room.GetProperty("name").GetString() ?? roomName,
            Url = room.GetProperty("url").GetString() ?? $"https://jobconnect.daily.co/{roomName}",
            CreatedAt = DateTime.UtcNow
        };
    }

    public async Task<string> CreateMeetingTokenAsync(string roomName, string userName, bool isOwner, int expiryMinutes = 120)
    {
        var request = new
        {
            properties = new
            {
                room_name = roomName,
                user_name = userName,
                is_owner = isOwner, // Owner = moderator/host, can kick, mute others
                enable_screenshare = true,
                start_video_off = false,
                start_audio_off = false,
                exp = DateTimeOffset.UtcNow.AddMinutes(expiryMinutes).ToUnixTimeSeconds()
            }
        };

        var content = new StringContent(JsonSerializer.Serialize(request), Encoding.UTF8, "application/json");
        var response = await _httpClient.PostAsync($"{DailyApiBaseUrl}/meeting-tokens", content);

        if (!response.IsSuccessStatusCode)
        {
            var error = await response.Content.ReadAsStringAsync();
            throw new Exception($"Failed to create meeting token: {error}");
        }

        var json = await response.Content.ReadAsStringAsync();
        var result = JsonSerializer.Deserialize<JsonElement>(json);
        
        return result.GetProperty("token").GetString() ?? throw new Exception("No token returned");
    }

    public async Task DeleteRoomAsync(string roomName)
    {
        var response = await _httpClient.DeleteAsync($"{DailyApiBaseUrl}/rooms/{roomName}");
        // Ignore errors - room might not exist
    }
}
