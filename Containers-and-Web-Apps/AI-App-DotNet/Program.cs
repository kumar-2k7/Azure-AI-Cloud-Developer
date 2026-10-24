var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

// Enable serving default HTML page (e.g., index.html / default.html) and static files from wwwroot
app.UseDefaultFiles();
app.UseStaticFiles();

// Backend API endpoints for health check and system info
app.MapGet("/api/health", () => Results.Ok(new
{
    status = "Healthy",
    timestamp = DateTime.UtcNow,
    runtime = ".NET 10.0",
    environment = app.Environment.EnvironmentName,
    server = "Kestrel"
}));

app.MapGet("/api/info", () => Results.Ok(new
{
    appName = "Azure AI Cloud Developer - AI-App-DotNet",
    version = "1.0.0",
    framework = ".NET 10.0",
    architecture = "x64",
    features = new[]
    {
        "Static Web Hosting",
        "ASP.NET Core Minimal APIs",
        "Azure Container Ready",
        "Semantic Kernel & Azure OpenAI Compatible"
    }
}));

app.MapGet("/api/appsettings", () => Results.Ok(new
{
    Azure_Api_Url = app.Configuration["Azure:AZURE_API_URL"] ?? app.Configuration["AZURE_API_URL"],
    Azure_Api_Key = app.Configuration["Azure:AZURE_API_KEY"] ?? app.Configuration["AZURE_API_KEY"],
    AZURE_Model_Name = app.Configuration["Azure:AZURE_MODEL_NAME"] ?? app.Configuration["AZURE_MODEL_NAME"],
    TimeStamp = DateTime.UtcNow,
    RunTime = ".NET 10.0",
    Environment = app.Environment.EnvironmentName
}));

app.Run();
