using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.WebSockets;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Console;

namespace Brainstorm.Web.Handlers;

public class WebSocketHandler: IDisposable
{
    private const short BufferSize = 8 * 1024;
    private static readonly List<WebSocket> _clients = [];
    private readonly ILogger _logger;

    public WebSocketHandler()
    {
        using var loggerFactory = LoggerFactory.Create(builder =>
        {
            builder.AddSimpleConsole(options =>
            {
                options.IncludeScopes = true;
                options.SingleLine = false;
                options.TimestampFormat = "[hh:mm:ss.fff] ";
                options.ColorBehavior = LoggerColorBehavior.Default;
            });
        });
        _logger = loggerFactory.CreateLogger<WebSocketHandler>();
    }

    public async Task Handle(HttpContext context, WebSocket socket)
    {
        _clients.Add(socket);
        await ProcessSocket(context, socket);
    }

    private async Task ProcessSocket(HttpContext context, WebSocket socket)
    {
        var buffer = new byte[BufferSize];
        try
        {
            while (socket.State == WebSocketState.Open)
            {
                _logger.LogInformation("Receiving message");
                var result = await socket.ReceiveAsync(new ArraySegment<byte>(buffer), context.RequestAborted);
                if (result.MessageType == WebSocketMessageType.Text)
                {
                    var json = Encoding.UTF8.GetString(buffer, 0, result.Count);
                    await Broadcast(json, socket, context.RequestAborted);
                }
            }
            
            _clients.Remove(socket);
        }
        catch (OperationCanceledException)
        {
            _logger.LogInformation("Recieve cancelled");
        }
    }

    private async Task Broadcast(string message, WebSocket sender, CancellationToken token)
    {
        var sendTasks = _clients.AsParallel().Where(client => client != sender && client.State == WebSocketState.Open)
            .Select(async client =>
            {
                try
                {
                    await client.SendAsync(Encoding.UTF8.GetBytes(message),
                        WebSocketMessageType.Text,
                        true,
                        token);
                }
                catch (OperationCanceledException)
                {
                    _logger.LogInformation("Send cancelled");
                }
            });
        await Task.WhenAll(sendTasks);
    }

    public void Dispose()
    {
        _logger.LogInformation("Disposing web socket handler");
        GC.SuppressFinalize(this);
    }
}