using System.Net.WebSockets;
using System.Text;

public class WebSocketHandler
{
    private static readonly List<WebSocket> _clients = new();

    public async Task Handle(HttpContext context, WebSocket socket)
    {
        _clients.Add(socket);
        var buffer = new byte[1024 * 8];

        while (socket.State == WebSocketState.Open)
        {
            var result = await socket.ReceiveAsync(new ArraySegment<byte>(buffer), CancellationToken.None);
            if (result.MessageType == WebSocketMessageType.Text)
            {
                var json = Encoding.UTF8.GetString(buffer, 0, result.Count);
                await Broadcast(json, socket);
            }
        }

        _clients.Remove(socket);
    }

    private static async Task Broadcast(string message, WebSocket sender)
    {
        foreach (var client in _clients)
        {
            if (client != sender && client.State == WebSocketState.Open)
            {
                await client.SendAsync(Encoding.UTF8.GetBytes(message), WebSocketMessageType.Text, true, CancellationToken.None);
            }
        }
    }
}