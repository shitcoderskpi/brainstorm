using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Brainstorm.Data
{
    public class UserRepository
    {
        private readonly BrainstormDbContext _context;

        public UserRepository(BrainstormDbContext context)
        {
            _context = context;
        }
        
        public async Task AddUserAsync(User user)
        {
            _context.Users.Add(user);
            await _context.SaveChangesAsync();
        }
        
        public async Task<User> GetUserByLoginAsync(string login)
        {
            return await _context.Users.FirstOrDefaultAsync(u => u.Login == login);
        }
        
        public async Task<IEnumerable<User>> GetAllUsersAsync()
        {
            return await _context.Users.ToListAsync();
        }
        
        public async Task<bool> DeleteUserAsync(int id)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null) return false;

            _context.Users.Remove(user);
            await _context.SaveChangesAsync();
            return true;
        }
        
        public async Task<bool> UpdateUserAsync(User user)
        {
            var existingUser = await _context.Users.FindAsync(user.Id);
            if (existingUser == null) return false;

            existingUser.Login = user.Login;
            existingUser.PasswordHash = user.PasswordHash;

            _context.Users.Update(existingUser);
            await _context.SaveChangesAsync();
            return true;
        }
    }
}