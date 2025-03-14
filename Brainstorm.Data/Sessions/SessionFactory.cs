using System.Dynamic;

namespace Brainstorm.Data.Sessions;

public static class SessionFactory
{
    private static readonly CancellationTokenSource Cts = new();
    
    public static async Task<Session> CreateAsync(string usersId, string? password = null)
    {
        var session = password == null ? new Task<Session>(() => new Session {UsersIds = [usersId]}, Cts.Token) : 
            new Task<Session>(() => new Session { UsersIds = [usersId], Password = password }, Cts.Token);
        
        await SessionDirector.AddSession(session.Result, Cts.Token);
        
        return await session;
    }

    public static Session Create(string usersId, string? password = null)
    {
        var session = password == null ? new Session {UsersIds = [usersId]} 
            : new Session {UsersIds = [usersId], Password = password};
        SessionDirector.AddSessionSync(session);
        return session;
    }

}