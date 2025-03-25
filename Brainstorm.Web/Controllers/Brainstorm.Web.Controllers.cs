using Brainstorm.Data;
using Microsoft.AspNetCore.Mvc;
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
                PasswordHash = HashPassword(password)
            };

            await _userRepository.AddUserAsync(user);
            return Ok("Користувача зареєстровано!");
        }
        
        [HttpGet("all")]
        public async Task<IActionResult> GetAllUsers()
        {
            var users = await _userRepository.GetAllUsersAsync();
            return Ok(users);
        }
        
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromForm] string login, [FromForm] string password)
        {
            var user = await _userRepository.GetUserByLoginAsync(login);
            if (user == null || !VerifyPassword(password, user.PasswordHash))
            {
                return Unauthorized("Невірний логін або пароль.");
            }

            return Ok("Авторизація успішна!");
        }
        
        [HttpDelete("delete/{id}")]
        public async Task<IActionResult> DeleteUser(int id)
        {
            var result = await _userRepository.DeleteUserAsync(id);
            if (!result) return NotFound("Користувача не знайдено.");
            return Ok("Користувач видалений.");
        }
        
        private string HashPassword(string password)
        {
            return BCrypt.Net.BCrypt.HashPassword(password);
        }
 
        private bool VerifyPassword(string password, string hashedPassword)
        {
            return BCrypt.Net.BCrypt.Verify(password, hashedPassword);
        }
    }
}
