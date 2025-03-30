using System.ComponentModel.DataAnnotations;

namespace Brainstorm.Web.Models;

public class SessionViewModel
{
    [Required]
    public string UserId { get; set; }
    
    public string? Password { get; set; }
}