using System.Collections;
using Brainstorm.Web.Handlers;

namespace Brainstorm.Web.Factories;

public static class WebSocketHandlerFactory
{
    private static readonly Hashtable Handlers = new();

    public static WebSocketHandler CreateOrGet(string sessionId)
    {
        if (Handlers.ContainsKey(sessionId)) return (WebSocketHandler)Handlers[sessionId]!;
        var handler = new WebSocketHandler();
        Handlers.Add(sessionId, handler);
        return handler;
    }
}