namespace Brainstorm.Data.Sessions;

public static class SessionDirector
{
    private static readonly List<Session> _sessions = [];

    public static async Task AddSession(Session session, CancellationToken cancellationToken = default)
    {
        await new Task(() => _sessions.Add(session), cancellationToken);
    }

    public static void AddSessionSync(Session session)
    {
        _sessions.Add(session);
    }

    public static Task<bool> SessionExists(string sessionId)
    {
        return Task.FromResult<bool>(_sessions.Any(session => session.SessionId == sessionId));
    }
}