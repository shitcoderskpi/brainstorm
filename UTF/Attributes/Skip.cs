namespace Testify.Attributes;

[AttributeUsage(AttributeTargets.Method | AttributeTargets.Class, Inherited = false)]
public class Skip(string reason): Attribute
{
    public string Reason { get; } = reason;
}