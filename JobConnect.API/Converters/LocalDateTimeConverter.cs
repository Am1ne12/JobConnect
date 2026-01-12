using System.Text.Json;
using System.Text.Json.Serialization;

namespace JobConnect.API.Converters;

/// <summary>
/// JSON converter that serializes DateTime without UTC 'Z' suffix
/// to prevent JavaScript from interpreting as UTC and converting to local time
/// </summary>
public class LocalDateTimeConverter : JsonConverter<DateTime>
{
    private const string DateFormat = "yyyy-MM-ddTHH:mm:ss";

    public override DateTime Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        var dateString = reader.GetString();
        if (string.IsNullOrEmpty(dateString))
            return DateTime.MinValue;
        
        // Parse without timezone - treat as local time
        if (DateTime.TryParse(dateString, out var result))
            return result;
        
        return DateTime.MinValue;
    }

    public override void Write(Utf8JsonWriter writer, DateTime value, JsonSerializerOptions options)
    {
        // Write without 'Z' suffix so JavaScript treats it as local time
        writer.WriteStringValue(value.ToString(DateFormat));
    }
}
