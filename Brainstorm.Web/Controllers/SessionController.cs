using Brainstorm.Data.Sessions;
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
    public async Task<IActionResult> Create([FromBody] string requestData)
    {
        // TODO: FIXME
        //       Microsoft Logging bullshit does not work
        _logger.LogDebug("Got request for session");
        
        _logger.LogDebug("Got request for session");
        if (!ModelState.IsValid) _logger.LogDebug("Invalid request");
        // TODO: FIXME
        //       Create user struct to serialize from request
        var session = await SessionFactory.CreateAsync(requestData);
        
        Response.Redirect($"/Home/Session/{session.SessionId}");
        return new JsonResult(session.SessionId);
    }
}