using Testify.Attributes;

namespace Testify.Filters;

public class DefaultTypeFilter: ITypeFilter
{
    public bool Filter(Type type)
    {
        var attributes = type.GetCustomAttributes(true);
        return attributes.OfType<Skip>().ToArray().Length == 0 &&
               (!attributes.OfType<SkipIf>().FirstOrDefault()?.Skip ?? true);
    }
}