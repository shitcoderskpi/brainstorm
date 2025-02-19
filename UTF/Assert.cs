namespace Testify;

public static class Assert
{
    public static void Equal<T>(T expected, T actual)
    {
        if (!Equals(expected, actual))
            throw new AssertionException($"Assertion Failed: Expected {expected}, but got {actual}");
    }
        
    public static void Exception(Action action)
    {
        try
        {
            action.Invoke();
        }
        catch (Exception)
        {
            throw new AssertionException($"Assertion Failed: Exception was thrown");
        }
    }
}