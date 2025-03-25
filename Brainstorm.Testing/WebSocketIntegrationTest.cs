using System;
using System.Linq;
using System.Net.WebSockets;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Xunit;

namespace Brainstorm.Testing;

public class WebSocketIntegrationTest(WebApplicationFactory<Program> factory)
    : IClassFixture<WebApplicationFactory<Program>>
{
    // ReSharper disable once InconsistentNaming
    private readonly string[] _URIs = ["ws://localhost:5057/ws", "ws://localhost:7042/ws"];
    private WebSocketClient _client;

    private async Task<WebSocket> TryConnect(WebSocketClient client)
    {
        var socket = await client.ConnectAsync(new Uri(_URIs[0]), CancellationToken.None);
        for (var i = 1; i < _URIs.Length || socket.State != WebSocketState.Open; i++)
        {
            socket = await client.ConnectAsync(new Uri(_URIs[i]), CancellationToken.None);
        }
        return socket;
    }

    [Fact]
    public async Task ConnectionTest()
    {
        _client ??= factory.Server.CreateWebSocketClient();
        
        var socket = await TryConnect(_client);
        
        Assert.NotNull(socket);
        Assert.Equal(WebSocketState.Open, socket.State);
        
        socket.Abort();
        // socket.Dispose();
    }

    [Fact]
    public async Task SendTest()
    {
        _client ??= factory.Server.CreateWebSocketClient();
        var socket = await TryConnect(_client);
        
        await socket.SendAsync(new ArraySegment<byte>("Hello world"u8.ToArray()), WebSocketMessageType.Text, true, CancellationToken.None);
        
        socket.Abort();
    }

    // [Fact]
    // public async Task ReceiveTest()
    // {
    //     _client ??= factory.Server.CreateWebSocketClient();
    //     var socket = await TryConnect(_client);
    //     
    //     await socket.SendAsync(new ArraySegment<byte>("Hello world"u8.ToArray()), WebSocketMessageType.Text, true, CancellationToken.None);
    //     
    //     var data = await socket.ReceiveAsync(new ArraySegment<byte>("Hello world"u8.ToArray()), CancellationToken.None);
    //     
    //     Assert.Equal(WebSocketMessageType.Text, data.MessageType);
    //     
    //     Assert.Equal("Hello world", data.ToString());
    //     
    //     socket.Abort();
    // } 
}