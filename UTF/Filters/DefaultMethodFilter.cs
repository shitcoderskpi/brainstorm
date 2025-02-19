using System.Reflection;
using Testify.Attributes;

namespace Testify.Filters;

public class DefaultMethodFilter: IMethodFilter
{
    public bool Filter(MethodInfo method)
    {
        var attributes = method.GetCustomAttributes(true);
        return method.Name.EndsWith("Test") &&
               attributes.OfType<Skip>().ToArray().Length == 0 &&
               (!attributes.OfType<SkipIf>().FirstOrDefault()?.Skip ?? true);
    }
}