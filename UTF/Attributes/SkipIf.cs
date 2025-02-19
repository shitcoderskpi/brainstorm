using System.Reflection;

namespace Testify.Attributes;

[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, Inherited = false)]
public class SkipIf: Attribute
{
    private const BindingFlags Flags = BindingFlags.Instance | BindingFlags.Static | BindingFlags.Public | BindingFlags.NonPublic;
    public bool Skip { get; set; }
    public string Reason { get; }
    
    
    public SkipIf(Type conditionEvaluatorType, string methodName, string reason = "")
    {
        var methodInfo = conditionEvaluatorType.GetMethod(methodName, Flags);
        var instance = Activator.CreateInstance(conditionEvaluatorType);
        if (methodInfo == null)
            throw new ArgumentException("Method not found", nameof(methodName));
        if (methodInfo.ReturnType != typeof(bool))
            throw new ArgumentException("The condition method must return bool.", nameof(methodName));
        
        Skip = (bool)(methodInfo.Invoke(instance, null) ?? false);
        Reason = reason;
    }
}