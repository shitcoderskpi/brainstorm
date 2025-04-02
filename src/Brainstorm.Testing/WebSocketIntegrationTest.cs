using System;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Json;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Xunit;

namespace Brainstorm.Testing;

public struct URL
{
    public URL()
    {
    }

    public string urlToRedirect { get; set; } = string.Empty;
}

public class WebSocketIntegrationTest : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;
    private WebSocketClient _client;
    private HttpClient _httpClient;
    private const uint BufferSize = 8192;
    private string _wsUrl;

    public WebSocketIntegrationTest(WebApplicationFactory<Program> factory)
    {
        _factory = factory;
    }

    private async Task<(WebSocket socket, string sessionId)> CreateSessionAndConnect()
    {
        var sessionUrl = await _httpClient.PostAsJsonAsync("api/session/create", new { UserId = Guid.NewGuid().ToString() });
        var url = JsonSerializer.Deserialize<URL>(await sessionUrl.Content.ReadAsStringAsync());
        
        // Extract the session ID from the redirect URL
        var sessionId = url.urlToRedirect.Split('/').Last();
        
        // Construct the WebSocket URL using the test server's base URL
        var baseUrl = _factory.Server.BaseAddress.ToString().TrimEnd('/');
        _wsUrl = $"{baseUrl}/home/canvas/{sessionId}/ws";
        
        var socket = await _client.ConnectAsync(new Uri(_wsUrl), CancellationToken.None);
        return (socket, sessionId);
    }
    
    private async Task<WebSocket> TryConnect()
    {
        var (socket, _) = await CreateSessionAndConnect();
        Assert.Equal(WebSocketState.Open, socket.State);
        return socket;
    }

    [Fact(Timeout = 100)]
    public async Task ConnectionTest()
    {
        _client = _factory.Server.CreateWebSocketClient();
        _httpClient = _factory.Server.CreateClient();

        var socket = await TryConnect();
        Assert.NotNull(socket);
        Assert.Equal(WebSocketState.Open, socket.State);

        socket.Abort();
    }

    [Fact(Timeout = 5000)]
    public async Task ReceiveTest()
    {
        _client = _factory.Server.CreateWebSocketClient();
        _httpClient = _factory.Server.CreateClient();
        
        // Create a single session and connect both sockets to it
        var (sendingSocket, sessionId) = await CreateSessionAndConnect();
        var receivingSocket = await _client.ConnectAsync(new Uri(_wsUrl), CancellationToken.None);
        
        var rnd = new Random();
        var data = rnd.Next(1_000_000, 100_000_000).ToString();
        
        // Send the data
        await sendingSocket.SendAsync(new ArraySegment<byte>(data.Select(x => (byte)x).ToArray()), WebSocketMessageType.Text, true, CancellationToken.None);

        // Receive the data
        var buffer = new byte[BufferSize];
        var result = await receivingSocket.ReceiveAsync(new ArraySegment<byte>(buffer), CancellationToken.None);
        
        Assert.Equal(WebSocketMessageType.Text, result.MessageType);
        Assert.Equal(data, Encoding.UTF8.GetString(buffer, 0, result.Count));
        
        sendingSocket.Abort();
        receivingSocket.Abort();
    }

    [Fact(Timeout = 5000)]
    public async Task ReceiveDiffSessionTest()
    {
        _client = _factory.Server.CreateWebSocketClient();
        _httpClient = _factory.Server.CreateClient();
        
        // Create two different sessions
        var (sendingSocket, _) = await CreateSessionAndConnect();
        var (receivingSocket, _) = await CreateSessionAndConnect();
        
        var rnd = new Random();
        var data = rnd.Next(1_000_000, 100_000_000).ToString();
        
        // Send the data
        await sendingSocket.SendAsync(new ArraySegment<byte>(data.Select(x => (byte)x).ToArray()), WebSocketMessageType.Text, true, CancellationToken.None);

        // Try to receive the data (should timeout since sockets are in different sessions)
        var buffer = new byte[BufferSize];
        var cts = new CancellationTokenSource(TimeSpan.FromSeconds(1));
        await Assert.ThrowsAsync<OperationCanceledException>(() => 
            receivingSocket.ReceiveAsync(new ArraySegment<byte>(buffer), cts.Token));
        
        sendingSocket.Abort();
        receivingSocket.Abort();
    }
}