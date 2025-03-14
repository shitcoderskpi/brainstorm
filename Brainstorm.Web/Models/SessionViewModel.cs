using System.ComponentModel.DataAnnotations;

namespace Brainstorm.Web.Models;

public class UserViewModel
{
    [Required]
    public string UserId { get; set; }
}