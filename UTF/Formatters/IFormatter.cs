namespace Testify.Formatters;

public interface IFormatter
{
    public string Fmt { get; set; }
    public string DateFmt { get; set; }
    public string Format(TestLog log);
    public string FormatTime(TestLog log);
}