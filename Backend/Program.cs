using System;
using System.Net.Http;
using System.Threading.Tasks;

class Program
{
    static async Task Main()
    {
        using (var client = new HttpClient())
        {
            try
            {
                var url = "http://localhost:5123/api/v1/settings/number-series/ADMISSION_NO/preview?pattern=ADM-%7BSEQ%7D&numberLength=2&prefix=ADM";
                var response = await client.GetAsync(url);
                Console.WriteLine("Status: " + response.StatusCode);
                Console.WriteLine("Body: " + await response.Content.ReadAsStringAsync());
            }
            catch (Exception ex)
            {
                Console.WriteLine(ex.Message);
            }
        }
    }
}
