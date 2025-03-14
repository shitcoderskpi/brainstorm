using Brainstorm.Data.Sessions;
using Brainstorm.Web.Handlers;
using Microsoft.Extensions.Logging.Console;

var session = SessionFactory.Create("0");
Console.WriteLine($"http://localhost:5057/home/canvas/{session.SessionId}");

session = SessionFactory.Create("0");
Console.WriteLine($"http://localhost:5057/home/canvas/{session.SessionId}");

var builder = WebApplication.CreateBuilder(args);

builder.Logging.AddSimpleConsole(options =>
{
    options.IncludeScopes = true;
    options.SingleLine = false;
    options.TimestampFormat = "[hh:mm:ss.fff] ";
    options.ColorBehavior = LoggerColorBehavior.Default;
});

builder.Services.AddControllersWithViews();

var app = builder.Build();

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    // The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
    app.UseHsts();
}


app.UseHttpsRedirection();

app.UseStaticFiles();
app.UseRouting();
app.UseWebSockets();


app.Map("home/canvas/{sessionId}/ws", async (HttpContext context, string sessionId) =>
{
    if (!SessionDirector.SessionExists(sessionId).Result)
    {
        context.Response.StatusCode = 404;
        return;
    }
    
    if (context.WebSockets.IsWebSocketRequest)
    {
        var webSocket = await context.WebSockets.AcceptWebSocketAsync();
        var handler = new WebSocketHandler();
        await handler.Handle(context, webSocket);
    }
    else
    {
        context.Response.StatusCode = 400;
    }
});

app.UseAuthorization();

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Canvas}/{id}");

app.MapControllerRoute(
        name: "default",
        pattern: "{controller=Home}/{action=Session}");

app.Run();


public partial class Program { }
