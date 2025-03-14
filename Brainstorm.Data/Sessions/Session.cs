namespace Brainstorm.Data.Sessions;

public struct Session()
{
    public string SessionId { get; set; } = Guid.NewGuid().ToString();
    public string? Password { get; set; } = null;
    public List<string> UsersIds { get; set; } = [];
}