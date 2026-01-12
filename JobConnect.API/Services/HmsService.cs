using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace JobConnect.API.Services;

public interface IHmsService
{
    Task<HmsRoomInfo> CreateOrGetRoomAsync(string roomName, string templateId);
    Task<string> GetRoomCodeAsync(string roomId, string role);
    Task DisableRoomAsync(string roomId);
    Task EnableRoomAsync(string roomId);
    string CreateAuthToken(string roomId, string visitorId, string role);
    string CreateManagementToken();
}

public class HmsRoomInfo
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
}

public class HmsService : IHmsService
{
    private readonly string _accessKey;
    private readonly byte[] _secretBytes;
    private readonly HttpClient _httpClient;
    private const string HmsApiBaseUrl = "https://api.100ms.live/v2";

    public HmsService(IConfiguration configuration)
    {
        _accessKey = Environment.GetEnvironmentVariable("HMS_ACCESS_KEY") 
            ?? configuration["Hms:AccessKey"] 
            ?? throw new InvalidOperationException("100ms Access Key not configured");
        
        var secret = Environment.GetEnvironmentVariable("HMS_SECRET") 
            ?? configuration["Hms:Secret"] 
            ?? throw new InvalidOperationException("100ms Secret not configured");
        
        // Use the secret directly as UTF-8 bytes for JWT signing
        _secretBytes = Encoding.UTF8.GetBytes(secret);
        
        _httpClient = new HttpClient();
        
        Console.WriteLine($"HmsService initialized with access key: {_accessKey.Substring(0, 8)}...");
    }

    private string Base64UrlEncode(byte[] input)
    {
        return Convert.ToBase64String(input)
            .TrimEnd('=')
            .Replace('+', '-')
            .Replace('/', '_');
    }

    private string CreateJwtToken(Dictionary<string, object> payload)
    {
        // Header
        var header = new Dictionary<string, object>
        {
            { "alg", "HS256" },
            { "typ", "JWT" }
        };
        
        var headerJson = JsonSerializer.Serialize(header);
        var headerBase64 = Base64UrlEncode(Encoding.UTF8.GetBytes(headerJson));
        
        // Payload
        var payloadJson = JsonSerializer.Serialize(payload);
        var payloadBase64 = Base64UrlEncode(Encoding.UTF8.GetBytes(payloadJson));
        
        // Signature
        var dataToSign = $"{headerBase64}.{payloadBase64}";
        using var hmac = new HMACSHA256(_secretBytes);
        var signatureBytes = hmac.ComputeHash(Encoding.UTF8.GetBytes(dataToSign));
        var signatureBase64 = Base64UrlEncode(signatureBytes);
        
        return $"{headerBase64}.{payloadBase64}.{signatureBase64}";
    }

    public string CreateManagementToken()
    {
        var now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        var expiry = now + 86400; // 24 hours
        
        var payload = new Dictionary<string, object>
        {
            { "access_key", _accessKey },
            { "type", "management" },
            { "version", 2 },  // Integer, not string!
            { "iat", now },
            { "nbf", now },
            { "exp", expiry },
            { "jti", Guid.NewGuid().ToString() }
        };

        return CreateJwtToken(payload);
    }

    public string CreateAuthToken(string roomId, string visitorId, string role)
    {
        var now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        var expiry = now + 86400; // 24 hours
        
        var payload = new Dictionary<string, object>
        {
            { "access_key", _accessKey },
            { "room_id", roomId },
            { "user_id", visitorId },
            { "role", role },
            { "type", "app" },
            { "version", 2 },  // Integer, not string!
            { "iat", now },
            { "nbf", now },
            { "exp", expiry },
            { "jti", Guid.NewGuid().ToString() }
        };

        return CreateJwtToken(payload);
    }

    public async Task<string> GetRoomCodeAsync(string roomId, string role)
    {
        var managementToken = CreateManagementToken();
        _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", managementToken);
        _httpClient.DefaultRequestHeaders.Accept.Clear();
        _httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

        // Get room codes for the room
        var response = await _httpClient.GetAsync($"{HmsApiBaseUrl}/room-codes/room/{roomId}");
        var responseContent = await response.Content.ReadAsStringAsync();
        
        Console.WriteLine($"Room codes response ({response.StatusCode}): {responseContent}");

        if (response.IsSuccessStatusCode)
        {
            var result = JsonSerializer.Deserialize<JsonElement>(responseContent);
            if (result.TryGetProperty("data", out var data))
            {
                // Find the room code for the requested role - must be enabled!
                foreach (var item in data.EnumerateArray())
                {
                    if (item.TryGetProperty("role", out var roleElement) &&
                        item.TryGetProperty("code", out var codeElement) &&
                        item.TryGetProperty("enabled", out var enabledElement))
                    {
                        var itemRole = roleElement.GetString();
                        var isEnabled = enabledElement.GetBoolean();
                        if (itemRole != null && itemRole.Equals(role, StringComparison.OrdinalIgnoreCase) && isEnabled)
                        {
                            return codeElement.GetString() ?? "";
                        }
                    }
                }
                // No enabled code found for role - will need to create new ones
                Console.WriteLine($"No enabled room code found for role {role}, will regenerate");
            }
        }

        // If we can't get a room code, create one
        var createResponse = await _httpClient.PostAsync($"{HmsApiBaseUrl}/room-codes/room/{roomId}", null);
        var createContent = await createResponse.Content.ReadAsStringAsync();
        Console.WriteLine($"Create room codes response ({createResponse.StatusCode}): {createContent}");

        if (createResponse.IsSuccessStatusCode)
        {
            var result = JsonSerializer.Deserialize<JsonElement>(createContent);
            if (result.TryGetProperty("data", out var data))
            {
                foreach (var item in data.EnumerateArray())
                {
                    if (item.TryGetProperty("role", out var roleElement) &&
                        item.TryGetProperty("code", out var codeElement))
                    {
                        var itemRole = roleElement.GetString();
                        if (itemRole != null && itemRole.Equals(role, StringComparison.OrdinalIgnoreCase))
                        {
                            return codeElement.GetString() ?? "";
                        }
                    }
                }
            }
        }

        throw new Exception($"Could not get room code for role {role}");
    }

    public async Task<HmsRoomInfo> CreateOrGetRoomAsync(string roomName, string templateId)
    {
        var managementToken = CreateManagementToken();
        Console.WriteLine($"Management token created (first 50 chars): {managementToken.Substring(0, Math.Min(50, managementToken.Length))}...");
        
        _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", managementToken);
        _httpClient.DefaultRequestHeaders.Accept.Clear();
        _httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

        // Try to create a room
        var request = new
        {
            name = roomName,
            description = "JobConnect Interview Room",
            template_id = templateId
        };

        var content = new StringContent(JsonSerializer.Serialize(request), Encoding.UTF8, "application/json");
        var response = await _httpClient.PostAsync($"{HmsApiBaseUrl}/rooms", content);

        var responseContent = await response.Content.ReadAsStringAsync();
        Console.WriteLine($"100ms API response ({response.StatusCode}): {responseContent}");

        if (response.IsSuccessStatusCode)
        {
            var room = JsonSerializer.Deserialize<JsonElement>(responseContent);
            return new HmsRoomInfo
            {
                Id = room.GetProperty("id").GetString() ?? "",
                Name = room.GetProperty("name").GetString() ?? roomName
            };
        }

        // If room exists (409 Conflict), try to get it by name
        if (response.StatusCode == System.Net.HttpStatusCode.Conflict || 
            responseContent.Contains("already exists"))
        {
            var getResponse = await _httpClient.GetAsync($"{HmsApiBaseUrl}/rooms?name={roomName}");
            if (getResponse.IsSuccessStatusCode)
            {
                var json = await getResponse.Content.ReadAsStringAsync();
                var result = JsonSerializer.Deserialize<JsonElement>(json);
                if (result.TryGetProperty("data", out var data) && data.GetArrayLength() > 0)
                {
                    var room = data[0];
                    return new HmsRoomInfo
                    {
                        Id = room.GetProperty("id").GetString() ?? "",
                        Name = room.GetProperty("name").GetString() ?? roomName
                    };
                }
            }
        }

        throw new Exception($"Failed to create or get room: {responseContent}");
    }

    public async Task DisableRoomAsync(string roomId)
    {
        var managementToken = CreateManagementToken();
        _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", managementToken);
        _httpClient.DefaultRequestHeaders.Accept.Clear();
        _httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

        var request = new { enabled = false };
        var content = new StringContent(JsonSerializer.Serialize(request), Encoding.UTF8, "application/json");
        
        var response = await _httpClient.PostAsync($"{HmsApiBaseUrl}/rooms/{roomId}", content);
        var responseContent = await response.Content.ReadAsStringAsync();
        
        Console.WriteLine($"Disable room response ({response.StatusCode}): {responseContent}");
    }

    public async Task EnableRoomAsync(string roomId)
    {
        var managementToken = CreateManagementToken();
        _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", managementToken);
        _httpClient.DefaultRequestHeaders.Accept.Clear();
        _httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

        var request = new { enabled = true };
        var content = new StringContent(JsonSerializer.Serialize(request), Encoding.UTF8, "application/json");
        
        var response = await _httpClient.PostAsync($"{HmsApiBaseUrl}/rooms/{roomId}", content);
        var responseContent = await response.Content.ReadAsStringAsync();
        
        Console.WriteLine($"Enable room response ({response.StatusCode}): {responseContent}");
    }
}
