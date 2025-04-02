using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using System.Security.Claims;
using Brainstorm.Data;
using System.Security.Cryptography;
using System.Text;

namespace Brainstorm.Web.Controllers
{
    public class AuthController : Controller
    {
        private readonly UserRepository _repo;
        public AuthController(UserRepository repo) { _repo = repo; }

        [HttpGet]
        public IActionResult Login()
        {
            return View();
        }

        public IActionResult Register()
        {
            return View();
        }

        [HttpPost]
        public async Task<IActionResult> Login(string login, string password)
        {
            var user = await _repo.GetUserByLoginAsync(login);
            if (user == null || user.PasswordHash != Hash(password)) return Unauthorized("Невірні дані");
            var claims = new[] { new Claim(ClaimTypes.Name, user.Login) };
            var identity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);
            var principal = new ClaimsPrincipal(identity);
            await HttpContext.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme, principal);
            // повернення на початкову сторінку, як оформите вставьте правильне посилання
            return Redirect("/Home/Index");
        }

        [HttpGet]
        public async Task<IActionResult> Logout()
        {
            await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
            return Redirect("/Auth/Login");
        }

        [HttpGet]
        public IActionResult AccessDenied() { return Content("Access Denied"); }

        string Hash(string p)
        {
            using var sha = SHA256.Create();
            var b = sha.ComputeHash(Encoding.UTF8.GetBytes(p));
            var sb = new StringBuilder();
            foreach (var x in b) sb.Append(x.ToString("x2"));
            return sb.ToString();
        }
    }
}