using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.Sqlite; 
using Brainstorm.Data;
using Brainstorm.Web.Handlers;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<BrainstormDbContext>(options =>
{
    options.UseSqlite(
        "Data Source=brainstorm.db;Cache=Shared;Mode=ReadWriteCreate",
        x => x.MigrationsAssembly("Brainstorm.Data")
    );
});

builder.Services.AddScoped<UserRepository>();
builder.Services.AddControllersWithViews();

builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(options =>
    {
        options.LoginPath = "/Auth/Login";
        options.AccessDeniedPath = "/Auth/AccessDenied";
    });

var app = builder.Build();

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseStaticFiles();

app.UseRouting();
app.UseAuthentication();
app.UseWebSockets();

app.Map("/ws", async context =>
{
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
    pattern: "{controller=Home}/{action=Index}/{id?}"
);

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<BrainstormDbContext>();
    db.Database.Migrate();
    db.Database.ExecuteSqlRaw("PRAGMA journal_mode=WAL;");
}

app.Run();

public partial class Program { }