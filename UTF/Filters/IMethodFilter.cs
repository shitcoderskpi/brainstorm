using System.Reflection;

namespace Testify.Filters;

public interface IMethodFilter
{
    public bool Filter(MethodInfo method);
}