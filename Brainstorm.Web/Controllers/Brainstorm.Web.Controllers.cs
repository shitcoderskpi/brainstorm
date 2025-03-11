using Brainstorm.Data;
using Microsoft.AspNetCore.Mvc;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;

namespace Brainstorm.Web.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class UsersController : ControllerBase
    {
        private readonly UserRepository _userRepository;

        public UsersController(UserRepository userRepository)
        {
            _userRepository = userRepository;
        }

        // POST: api/Users/register
        [HttpPost("register")]
        public async Task<IActionResult> Register([FromForm] string login, [FromForm] string password)
        {
            var existingUser = await _userRepository.GetUserByLoginAsync(login);
            if (existingUser != null)
            {
                return BadRequest("Користувач із таким логіном уже існує.");
            }

            var user = new User
            {
                Login = login,
                PasswordHash = ComputeSha256Hash(password)
            };

            await _userRepository.AddUserAsync(user);
            return Ok("Користувача зареєстровано!");
        }

        // GET: api/Users/all
        [HttpGet("all")]
        public async Task<IActionResult> GetAllUsers()
        {
            var users = await _userRepository.GetAllUsersAsync();
            return Ok(users);
        }

        // POST: api/Users/login
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromForm] string login, [FromForm] string password)
        {
            var user = await _userRepository.GetUserByLoginAsync(login);
            if (user == null || user.PasswordHash != ComputeSha256Hash(password))
            {
                return Unauthorized("Невірний логін або пароль.");
            }

            return Ok("Авторизація успішна!");
        }

        // DELETE: api/Users/delete/{id}
        [HttpDelete("delete/{id}")]
        public async Task<IActionResult> DeleteUser(int id)
        {
            var result = await _userRepository.DeleteUserAsync(id);
            if (!result) return NotFound("Користувача не знайдено.");
            return Ok("Користувач видалений.");
        }

        // Метод хешування пароля (SHA256)
        private string ComputeSha256Hash(string rawData)
        {
            using (SHA256 sha256Hash = SHA256.Create())
            {
                byte[] bytes = sha256Hash.ComputeHash(Encoding.UTF8.GetBytes(rawData));
                StringBuilder builder = new StringBuilder();
                foreach (var b in bytes)
                {
                    builder.Append(b.ToString("x2"));
                }
                return builder.ToString();
            }
        }
    }
}
