namespace Angular_ASPNET_FIDO2.Server
{
    public class Program
    {
        //public static void Main(string[] args)
        //{
        //    var builder = WebApplication.CreateBuilder(args);

        //    // Add services to the container.

        //    builder.Services.AddControllers();

        //    var app = builder.Build();

        //    app.UseDefaultFiles();
        //    app.UseStaticFiles();

        //    // Configure the HTTP request pipeline.

        //    app.UseHttpsRedirection();

        //    app.UseAuthorization();


        //    app.MapControllers();

        //    app.MapFallbackToFile("/index.html");

        //    app.Run();
        //}

        public static void Main(string[] args)
        {
            CreateHostBuilder(args).Build().Run();
        }

        public static IHostBuilder CreateHostBuilder(string[] args)
        {
            return Host.CreateDefaultBuilder(args)
                .ConfigureWebHostDefaults(webBuilder =>
                {
                    webBuilder.UseStartup<Startup>();
                });
        }
    }
}
