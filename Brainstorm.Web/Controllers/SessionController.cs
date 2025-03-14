using Brainstorm.Data.Sessions;
using Brainstorm.Web.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging.Console;

namespace Brainstorm.Web.Controllers;

[Route("api/[controller]/[action]")]
public class SessionController : Controller
{
    private readonly ILogger<SessionController> _logger;

    public SessionController()
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
        _logger = loggerFactory.CreateLogger<SessionController>();
    }
    
    [HttpPost]
    public IActionResult Create([FromBody]SessionViewModel sessionViewModel)
    {
        using (_logger.BeginScope(sessionViewModel))
        {
            _logger.LogDebug(sessionViewModel.ToString());
        }
        
        if (!ModelState.IsValid) return BadRequest();
        
        var session = SessionFactory.Create(sessionViewModel.UserId, sessionViewModel.Password);
        
        return Json(new { urlToRedirect = $"/home/canvas/{session.SessionId}"});
    }
}