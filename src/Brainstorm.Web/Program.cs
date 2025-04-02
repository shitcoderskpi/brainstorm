using Brainstorm.Data.Sessions;
using Brainstorm.Web.Factories;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.EntityFrameworkCore;
using Brainstorm.Data;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllersWithViews();

builder.Services.AddDbContext<BrainstormDbContext>(options =>
{
    options.UseSqlite(
        "Data Source=brainstorm.db;Cache=Shared;Mode=ReadWriteCreate",
        x => x.MigrationsAssembly("Brainstorm.Data")
    );
});

builder.Services.AddScoped<UserRepository>();

builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(o =>
    {
        o.LoginPath = "/Auth/Login";
        o.AccessDeniedPath = "/Auth/AccessDenied";
    });

var app = builder.Build();

// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseStaticFiles();
app.UseRouting();
app.UseAuthentication();
app.UseAuthorization();
app.UseWebSockets();

app.Map("home/canvas/{sessionId}/ws", async (HttpContext context, string sessionId) =>
{
    if (!SessionFactory.SessionExists(sessionId).Result)
    {
        context.Response.StatusCode = 404;
        return;
    }
    
    if (context.WebSockets.IsWebSocketRequest)
    {
        Console.WriteLine($"WebSocket request on session: {sessionId}");
        var webSocket = await context.WebSockets.AcceptWebSocketAsync();
        var handler = WebSocketHandlerFactory.CreateOrGet(sessionId);
        await handler.Handle(context, webSocket);
    }
    else
    {
        context.Response.StatusCode = 400;
    }
});
app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Canvas}/{id?}"
);

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<BrainstormDbContext>();
    db.Database.Migrate();
    db.Database.ExecuteSqlRaw("PRAGMA journal_mode=WAL;");
}

app.Run();


public partial class Program {}