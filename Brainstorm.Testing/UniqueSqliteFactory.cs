using System.IO;
using System.Linq;
using System;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Brainstorm.Data;

namespace Brainstorm.Testing
{
    public class UniqueSqliteFactory : WebApplicationFactory<Program>, IDisposable
    {
        private readonly string _dbFilePath;

        public UniqueSqliteFactory()
        {
            _dbFilePath = Path.Combine(Path.GetTempPath(), $"brainstorm_test_{Guid.NewGuid():N}.db");
        }

        protected override IHost CreateHost(IHostBuilder builder)
        {
            builder.UseEnvironment("Development"); 
            return base.CreateHost(builder);
        }

        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            builder.ConfigureServices(services =>
            {
                var descriptor = services.SingleOrDefault(
                    d => d.ServiceType == typeof(DbContextOptions<BrainstormDbContext>));
                if (descriptor != null)
                {
                    services.Remove(descriptor);
                }
                
                services.AddDbContext<BrainstormDbContext>(options =>
                {
                    options.UseSqlite(
                        $"Data Source={_dbFilePath};Cache=Shared;Mode=ReadWriteCreate",
                        x => x.MigrationsAssembly("Brainstorm.Data")
                    );
                });
            });
        }

        public void Dispose()
        {
            try
            {
                if (File.Exists(_dbFilePath))
                {
                    File.Delete(_dbFilePath);
                }
            }
            catch
            {
            }
        }
    }
}
