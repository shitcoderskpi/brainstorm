namespace Testify;

public readonly struct TestLog(
    string className,
    string methodName,
    string message = "",
    Exception? exception = null,
    TestStatus? status = null,
    TestCaseStatus? caseStatus = null,
    bool isCaseLog = false)
{
    public DateTime Created { get; } = DateTime.Now;
    public string Message { get; } = message;
    public string ClassName { get; } = className;
    public string MethodName { get; } = methodName;
    public Exception? Exception { get; } = exception;
    public TestStatus? Status { get; } = status;
    public TestCaseStatus? CaseStatus { get; } = caseStatus;
    public bool IsCaseLog { get; } = isCaseLog;
}