namespace Brainstorm.Data.Sessions;

public static class SessionFactory
{
    private static readonly CancellationTokenSource Cts = new();
    
    private static readonly List<Session> Sessions = [];
    
    public static async Task<Session> CreateAsync(string usersId, string? password = null)
    {
        var session = password == null ? Task.Run(() => new Session {UsersIds = [usersId]}, Cts.Token) : 
            Task.Run(() => new Session { UsersIds = [usersId], Password = password }, Cts.Token);
        
        await Task.Run(() => Sessions.Add(session.Result), Cts.Token);
        
        return await session;
    }

    public static Session Create(string usersId, string? password = null)
    {
        var session = password == null ? new Session {UsersIds = [usersId]} 
            : new Session {UsersIds = [usersId], Password = password};
        Sessions.Add(session);
        return session;
    }

    public static Task<bool> SessionExists(string sessionId)
    {
        return Task.Run(() => Sessions.AsParallel().Any(s => s.SessionId == sessionId));
    }

}