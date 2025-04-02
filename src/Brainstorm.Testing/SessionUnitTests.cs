using System;
using System.Threading.Tasks;
using Brainstorm.Data.Sessions;
using Xunit;

namespace Brainstorm.Testing;

public class SessionUnitTests
{
    [Fact(Timeout = 500)]
    public async Task SessionExistsAsyncTest()
    {
        var res = await SessionFactory.SessionExists("test");
        Assert.False(res);
    }
    [Fact(Timeout = 1000)]
    public async Task SessionCreateAsyncTest()
    {
        var session = await SessionFactory.CreateAsync(Guid.NewGuid().ToString());
        Assert.True(await SessionFactory.SessionExists(session.SessionId));
    }

}