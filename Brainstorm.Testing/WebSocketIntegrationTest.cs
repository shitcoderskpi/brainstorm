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

    // ReSharper disable once InconsistentNaming
    public string urlToRedirect { get; set; } = string.Empty;
}

public class WebSocketIntegrationTest(WebApplicationFactory<Program> factory)
    : IClassFixture<WebApplicationFactory<Program>>
{
    // ReSharper disable once InconsistentNaming
    private readonly string[] _URIs = ["localhost:5057/", "localhost:7042/"];
    // ReSharper disable once InconsistentNaming
    private string currURLWS = string.Empty;
    private const string Scheme = "http://";
    private const string WebSocketEndpoint = "ws://";
    private WebSocketClient _client;
    private HttpClient _httpClient;
    private const uint BufferSize = 8192;

    private async Task<WebSocket> CreateSessionAndConnect(WebSocketClient client, HttpClient httpClient)
    {
        var sessionUrl = httpClient.PostAsJsonAsync("http://" + _URIs[0] + "api/session/create", new {UserId = Guid.NewGuid().ToString()}).Result;
        var url = JsonSerializer.Deserialize<URL>(sessionUrl.Content.ReadAsStringAsync().Result);
        currURLWS = url.urlToRedirect.Replace(Scheme, WebSocketEndpoint) + "/ws";
        return await client.ConnectAsync(new Uri(currURLWS), CancellationToken.None);
    }
    
    private async Task<WebSocket> TryConnect(WebSocketClient client, HttpClient httpClient)
    {
        var socket = await CreateSessionAndConnect(client, httpClient);

        for (var i = 0; i < _URIs.Length || socket.State != WebSocketState.Open; i++)
        {
            socket = await CreateSessionAndConnect(client, httpClient);
        }
        return socket;
    }

    private static async Task<WebSocket> TryConnect(WebSocketClient client, string url)
    {
        return await client.ConnectAsync(new Uri(url), CancellationToken.None);
    }


    [Fact(Timeout = 5000)]
    public async Task ConnectionTest()
    {
        _client ??= factory.Server.CreateWebSocketClient();
        _httpClient ??= factory.Server.CreateClient();

        var socket = await TryConnect(_client, _httpClient);

        Assert.NotNull(socket);
        Assert.Equal(WebSocketState.Open, socket.State);

        socket.Abort();
        // socket.Dispose();
    }

    [Fact(Timeout = 5000)]
    public async Task ReceiveTest()
    {
        _client ??= factory.Server.CreateWebSocketClient();
        _httpClient ??= factory.Server.CreateClient();
        
        var sendingSocket = await TryConnect(_client, _httpClient);
        var receivingSocket = await TryConnect(_client, currURLWS);
        
        var rnd = new Random();
        
        var data = rnd.Next(1_000_000, 100_000_000).ToString();
        
        await sendingSocket.SendAsync(new ArraySegment<byte>(data.Select(x => (byte)x).ToArray()), WebSocketMessageType.Text, true, CancellationToken.None);

        var buffer = new byte[BufferSize];
        var result = await receivingSocket.ReceiveAsync(new ArraySegment<byte>(buffer), CancellationToken.None);
        
        Assert.Equal(WebSocketMessageType.Text, result.MessageType);
        Assert.Equal(data, Encoding.UTF8.GetString(buffer, 0, result.Count));
        
        sendingSocket.Abort();
        receivingSocket.Abort();
    }
}