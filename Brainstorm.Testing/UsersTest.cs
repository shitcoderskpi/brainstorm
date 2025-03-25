using System.Net;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit.Abstractions;

namespace Brainstorm.Testing
{
    public class StressTests : IClassFixture<WebApplicationFactory<Program>>
    {
        private readonly HttpClient _client;
        private readonly ITestOutputHelper _output;

        public StressTests(WebApplicationFactory<Program> factory, ITestOutputHelper output)
        {
            _client = factory.CreateClient();
            _output = output;
        }

        [Fact]
        public async Task ConcurrentRegistrationStressTest()
        {
            int requestCount = 20;
            var tasks = new List<Task<HttpResponseMessage>>();
            for (int i = 0; i < requestCount; i++)
            {
                var login = $"stressuser_{Guid.NewGuid():N}";
                var content = new FormUrlEncodedContent(new[]
                {
                    new KeyValuePair<string, string>("login", login),
                    new KeyValuePair<string, string>("password", "password123")
                });
                tasks.Add(_client.PostAsync("/api/Users/register", content));
                _output.WriteLine($"Sent registration for {login}");
            }
            var responses = await Task.WhenAll(tasks);
            foreach (var response in responses)
            {
                var body = await response.Content.ReadAsStringAsync();
                _output.WriteLine($"Registration response: {response.StatusCode}, body={body}");
                Assert.True(
                    response.StatusCode == HttpStatusCode.OK || response.StatusCode == HttpStatusCode.Redirect,
                    $"Registration failed. Status={response.StatusCode}, Body={body}"
                );
            }
        }

        [Fact]
        public async Task ConcurrentLoginStressTest()
        {
            var username = $"stresslogin_{Guid.NewGuid():N}";
            var regContent = new FormUrlEncodedContent(new[]
            {
                new KeyValuePair<string, string>("login", username),
                new KeyValuePair<string, string>("password", "password123")
            });
            var regResponse = await _client.PostAsync("/api/Users/register", regContent);
            _output.WriteLine($"Registered {username}: {regResponse.StatusCode}");
            Assert.True(
                regResponse.StatusCode == HttpStatusCode.OK || regResponse.StatusCode == HttpStatusCode.Redirect,
                "Registration for stress login failed");
            
            int requestCount = 20;
            var tasks = new List<Task<HttpResponseMessage>>();
            for (int i = 0; i < requestCount; i++)
            {
                var loginContent = new FormUrlEncodedContent(new[]
                {
                    new KeyValuePair<string, string>("login", username),
                    new KeyValuePair<string, string>("password", "password123")
                });
                tasks.Add(_client.PostAsync("/Auth/Login", loginContent));
                _output.WriteLine($"Sent login request {i + 1} for {username}");
            }
            var responses = await Task.WhenAll(tasks);
            foreach (var response in responses)
            {
                _output.WriteLine($"Login response: {response.StatusCode}");
                Assert.True(
                    response.StatusCode == HttpStatusCode.OK || response.StatusCode == HttpStatusCode.Redirect,
                    $"Login failed. Status={response.StatusCode}"
                );
            }
        }
    }
}