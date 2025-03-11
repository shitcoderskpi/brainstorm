using Microsoft.EntityFrameworkCore;

namespace Brainstorm.Data
{
    public class BrainstormDbContext : DbContext
    {
        public DbSet<User> Users { get; set; }

        public BrainstormDbContext(DbContextOptions<BrainstormDbContext> options)
            : base(options)
        {
        }
    }
}