using System.Diagnostics;
using System.Text.RegularExpressions;

namespace Testify.Formatters;

internal class FormatHelper(Exception? exception = null)
{
    private readonly StackFrame[] _stackFrames = new StackTrace(exception ?? new Exception(), true).GetFrames();

    private static bool FrameFilter(StackFrame frame) => frame.GetFileName() != null;
    public string GetFilename()
    {
        if (exception == null) return string.Empty;
        return _stackFrames.Last(FrameFilter).GetFileName() ?? string.Empty;
    }

    public int GetLineNumber()
    {
        if (exception == null) return -1;
        return _stackFrames.Last(FrameFilter).GetFileLineNumber();
    }

    public int GetColumnNumber()
    {
        if (exception == null) return -1;
        return _stackFrames.Last(FrameFilter).GetFileColumnNumber();
    }

    public string GetLine()
    {
        return exception == null ? string.Empty : File.ReadAllLines(GetFilename()).Skip(GetLineNumber() - 1).Take(1).First();
    }

    public string GenerateUnderline()
    {
        if (exception == null && GetFilename() == string.Empty) return string.Empty;
        var columnNumber = GetColumnNumber();
        return new string('-', columnNumber - 1) + new string('^', GetLine().Length - columnNumber + 1);
    }

    public string GetAllStackFrames()
    {
        return exception == null ? string.Empty : string.Join(Environment.NewLine, _stackFrames.ToString());
    }
}

/// <summary>
/// Keywords:
///     %datetime
///     %timestamp
///     %className
///     %methodName
///     %status
///     %caseStatus
///     %msg
/// Exception Only:
///     %excType
///     %excMsg
///     %file
///     %lineNo
///     %columnNo
///     %line
///     %uLOffset
///     %underline
///     %fullStackTrace
/// </summary>
public partial class DefaultFormatter : IFormatter
{
    [GeneratedRegex(@"%(\w+)", RegexOptions.Compiled)]
    private static partial Regex KeywordRegex();

    public string CaseFmt { get; set; } = "TestCase %className ... %caseStatus: %msg";
    public string Fmt { get; set; } = "\tTest %className.%methodName ... %status";
    public string ExcFmt { get; set; } = """
                                         [%datetime] StackTrace:
                                                         Exception '%excType' was thrown: %excMsg
                                                         File %file, line %lineNo
                                                         %lineNo: %line
                                                         %uLOffset%underline
                                         """;
    public string DateFmt { get; set; } = "HH:mm:ss.fff";
    
    public string Format(TestLog log)
    {
        return log.Exception == null ?  log.IsCaseLog ? KeywordRegex()
            .Replace(CaseFmt, match => ReplaceKeyword(match, log)) :
            KeywordRegex().Replace(Fmt, match => ReplaceKeyword(match, log)) :
            KeywordRegex().Replace(ExcFmt, match => ReplaceKeyword(match, log));
    }
    
    public string FormatTime(TestLog log)
    {
        return log.Created.ToString(DateFmt);
    }
    
    private string ReplaceKeyword(Match match, TestLog log)
    {
        var keyword = match.Groups[1].Value;
        
        var helper = new FormatHelper(log.Exception);
        return (keyword switch
        {
            "datetime" => log.Created.ToString(DateFmt),
            "timestamp" => log.Created.ToString("o"), // ISO 8601 format
            "className" => log.ClassName,
            "methodName" => log.MethodName,
            "status" => log.Status.ToString(),
            "caseStatus" => log.CaseStatus.ToString(),
            "msg" => log.Message,
            "excType" => log.Exception?.GetType().Name ?? string.Empty,
            "excMsg" => log.Exception?.Message ?? string.Empty,
            "file" => helper.GetFilename(),
            "lineNo" => helper.GetLineNumber() != -1 ? helper.GetLineNumber().ToString() : string.Empty,
            "columnNo" => helper.GetColumnNumber() != -1 ? helper.GetColumnNumber().ToString() : string.Empty,
            "line" => helper.GetLine(),
            "uLOffset" => new string(' ', helper.GetLineNumber().ToString().Length + 1),
            "underline" => helper.GenerateUnderline(),
            "fullStackTrace" => helper.GetAllStackFrames(),
            _ => match.Value
        })!;
    }
}