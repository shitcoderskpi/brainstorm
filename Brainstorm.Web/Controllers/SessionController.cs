using Microsoft.AspNetCore.Mvc;

namespace Brainstorm.Web.Controllers;

public class SessionController : Controller
{
    // GET
    public IActionResult Index()
    {
        return View();
    }
}