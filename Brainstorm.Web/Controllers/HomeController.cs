using System.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Brainstorm.Web.Models;    

namespace Brainstorm.Web.Controllers;

public class HomeController : Controller
{
    private readonly ILogger<HomeController> _logger;

    public HomeController(ILogger<HomeController> logger)
    {
        _logger = logger;
    }

    public IActionResult Index()
    {
        _logger.LogDebug("Loading canvas page");
        return View();
    }

    public IActionResult Canvas()
    {
        return View();
    }

    public IActionResult Session()
    {
        _logger.LogDebug("Loading new session page");
        return View();
    }

    [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
    public IActionResult Error()
    {
        return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
    }
}
