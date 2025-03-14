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
    public IActionResult Create([FromBody]UserViewModel userViewModel)
    {
        _logger.LogInformation("Got request for session");
        _logger.LogInformation(userViewModel.UserId);
        if (!ModelState.IsValid) return BadRequest();
        // TODO: FIXME
        //       Create user struct to serialize from request
        var session = SessionFactory.Create(userViewModel.UserId);
        
        _logger.LogInformation("Session created");
        
        return Json(new { urlToRedirect = $"/home/canvas/{session.SessionId}" });
    }
}