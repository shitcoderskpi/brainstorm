using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using System.Security.Claims;
using Brainstorm.Data;
using System.Threading.Tasks;

namespace Brainstorm.Web.Controllers
{
    public class AuthController : Controller
    {
        private readonly UserRepository _repo;
        public AuthController(UserRepository repo) { _repo = repo; }

        [HttpGet]
        public IActionResult Login()
        {
            return View("~/Views/Home/Login.cshtml");
        }

        [HttpPost]
        public async Task<IActionResult> Login(string login, string password)
        {
            var user = await _repo.GetUserByLoginAsync(login);
            if (user == null || !BCrypt.Net.BCrypt.Verify(password, user.PasswordHash))
                return Unauthorized("Невірні дані");

            var claims = new[] { new Claim(ClaimTypes.Name, user.Login) };
            var identity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);
            var principal = new ClaimsPrincipal(identity);
            await HttpContext.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme, principal);
            return Redirect("/Home/Index");
        }

        [HttpGet]
        public async Task<IActionResult> Logout()
        {
            await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
            return Redirect("/Auth/Login");
        }

        [HttpGet]
        public IActionResult AccessDenied() 
        {
            return Content("Access Denied");
        }
    }
}