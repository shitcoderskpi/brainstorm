using System.Reflection;
using Testify.Attributes;
using Testify.Filters;
using Testify.Formatters;
using Type = System.Type;

namespace Testify;

public class Dispatcher
{
    private const BindingFlags Flags = BindingFlags.Instance | BindingFlags.Static | BindingFlags.Public | BindingFlags.NonPublic;
    private readonly List<ITypeFilter> _typeFilters = [];
    private readonly List<IMethodFilter> _methodFilters = [];
    private readonly StreamWriter _outputStreamWriter;
    private IFormatter _formatter = new DefaultFormatter();
    private int _cursorPositionTestCase;
    private int _cursorPositionTest;

    private static Type[] GetDerivedTypes()
    {
        return AppDomain.CurrentDomain.GetAssemblies().SelectMany(assembly => assembly.GetTypes())
            .Where(type => type.IsSubclassOf(typeof(TestCase))).ToArray();
    }

    private static MethodInfo[] GetMethods(Type type)
    {
        return type.GetMethods(Flags);
    }

    private static string GetAttributeStr<T>(T assembly)
    {
        var type = assembly as Type;
        var method = assembly as MethodInfo;
        return type switch
        {
            null when method == null => "",
            null => method.GetCustomAttribute<Skip>()?.Reason ?? (method.GetCustomAttribute<SkipIf>()?.Skip ?? false
                ? method.GetCustomAttribute<SkipIf>()?.Reason
                : "") ?? "",
            _ => type.GetCustomAttribute<Skip>()?.Reason ?? (type.GetCustomAttribute<SkipIf>()?.Skip ?? false
                ? type.GetCustomAttribute<SkipIf>()?.Reason
                : "") ?? ""
        };
    }

    private MethodInfo[] FilterMethods(Type type, MethodInfo[] methods, ref int skipped)
    {
        var filteredMethods = methods.ToList();
        foreach (var method in from filter in _methodFilters from method in filteredMethods.ToList() where !filter.Filter(method) select method)
        {
            if (method.Name.EndsWith("Test"))
            {
                skipped++;
            }
            filteredMethods.Remove(method);
        }
        
        return filteredMethods.ToArray();
    }

    private Type[] FilterTypes(Type[] types, ref int skipped)
    {
        var filteredTypes = types.ToList();
        foreach (var type in from filter in _typeFilters from type in filteredTypes.ToList() where !filter.Filter(type) select type)
        {
            PrintTestCaseLog(type.Name, TestCaseStatus.Skipped, GetAttributeStr(type));
            _cursorPositionTestCase = Console.GetCursorPosition().Top;
            filteredTypes.Remove(type);
            FilterMethods(type, type.GetMethods(Flags), ref skipped);
        }
        return filteredTypes.ToArray();
    }

    private string FormatTestCaseLog(string className, TestCaseStatus status, string message)
    {
        return new string(' ', Console.WindowWidth) + "\r" + _formatter.Format(new TestLog(className, string.Empty, message: message, caseStatus: status, isCaseLog: true));
    }

    private string FormatTestLog(string className, string methodName, TestStatus status, string message, Exception? exception = null)
    {
        return new string(' ', Console.WindowWidth) + "\r" + _formatter.Format(new TestLog(className, methodName, message: message, exception: exception, status: status));
    }

    private void PrintTestCaseLog(string className, TestCaseStatus status, string message = "")
    {
        Console.SetCursorPosition(0, _cursorPositionTestCase);
        _outputStreamWriter.WriteLine(FormatTestCaseLog(className, status, message));
        _outputStreamWriter.Flush();
    }

    private void PrintTestLog(string className, string methodName, TestStatus status, string message = "", Exception? exception = null)
    {
        Console.SetCursorPosition(0, _cursorPositionTest);
        _outputStreamWriter.WriteLine(FormatTestLog(className, methodName, status, message, exception));
        _outputStreamWriter.Flush();
    }

    ~Dispatcher()
    {
        _outputStreamWriter.Dispose();
    }


    public Dispatcher(Stream? outputStream = null)
    {
        _outputStreamWriter = new StreamWriter(outputStream ?? Console.OpenStandardOutput());
    }
    
    public void AddTypeFilter(ITypeFilter filter)
    {
        _typeFilters.Add(filter);
    }

    public void RemoveTypeFilter(ITypeFilter filter)
    {
        _typeFilters.Remove(filter);
    }

    public void ClearTypeFilters()
    {
        _typeFilters.Clear();
    }

    public void AddMethodFilter(IMethodFilter filter)
    {
        _methodFilters.Add(filter);
    }

    public void RemoveMethodFilter(IMethodFilter filter)
    {
        _methodFilters.Remove(filter);
    }

    public void ClearMethodFilters()
    {
        _methodFilters.Clear();
    }

    public void SetFormatter(IFormatter formatter)
    {
        _formatter = formatter;
    }

    public void RunTests()
    {
        var derivedTypes = GetDerivedTypes();
        int passed = 0, failed = 0, skipped = 0;
        _cursorPositionTestCase = Console.GetCursorPosition().Top;
        
        derivedTypes = FilterTypes(derivedTypes, ref skipped);
        
        _cursorPositionTestCase = Console.GetCursorPosition().Top;
        foreach (var type in derivedTypes)
        {
            PrintTestCaseLog(type.Name, TestCaseStatus.Preparing);
            _cursorPositionTestCase = Console.GetCursorPosition().Top - 1;
            
            var instance = Activator.CreateInstance(type)!;
            
            type.GetMethod("Setup", Flags)!.Invoke(instance, null);
            
            PrintTestCaseLog(type.Name, TestCaseStatus.Running);
            
            var testMethods = FilterMethods(type, GetMethods(type), ref skipped);
            
            _cursorPositionTest = Console.GetCursorPosition().Top;
            foreach (var test in testMethods)
            {
                PrintTestLog(type.Name, test.Name, TestStatus.Running);
                _cursorPositionTest = Console.GetCursorPosition().Top - 1;
                try
                {
                    test.Invoke(instance, null);
                }
                catch (Exception e) when (e.InnerException is AssertionException)
                {
                    PrintTestLog(type.Name, test.Name, TestStatus.Failed, exception: e.InnerException);
                    _cursorPositionTest = Console.GetCursorPosition().Top;
                    failed++;
                    continue;
                }
                PrintTestLog(type.Name, test.Name, TestStatus.Passed);
                _cursorPositionTest++;
                passed++;
            }
            PrintTestCaseLog(type.Name, TestCaseStatus.Finishing);
            type.GetMethod("Teardown", Flags)!.Invoke(instance, null);
            PrintTestCaseLog(type.Name, TestCaseStatus.Finished);
            Console.SetCursorPosition(0, _cursorPositionTest);
            _outputStreamWriter.WriteLine(new string('=', Console.WindowWidth));
            _outputStreamWriter.Flush();
            _cursorPositionTestCase = _cursorPositionTest + 1;
        }

        var message = $"\n{new string('*', Console.WindowWidth)}RAN {failed + passed} test(s) total, {skipped} test(s) skipped\n\n";
        if (failed > 0) message += $"FAILED ({failed} failed)";
        else message += $"PASSED ({failed} failed)";
        _outputStreamWriter.WriteLine(message);
        _outputStreamWriter.Flush();
    }
}