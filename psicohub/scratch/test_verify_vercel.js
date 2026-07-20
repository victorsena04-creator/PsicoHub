const https = require("https");

function fetchUrl(url, cookie = "") {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        Cookie: cookie,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
      }
    };
    https.get(url, options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => resolve({ statusCode: res.statusCode, headers: res.headers, body: data }));
    }).on("error", reject);
  });
}

async function verificarHeadersVercel() {
  console.log("📡 Imprimindo TODOS os cabeçalhos de resposta retornados pela Vercel...");
  
  const res = await fetchUrl("https://psicohub-rust.vercel.app/financeiro", "psicohub_session=%7B%22uid%22%3A%22user-123%22%2C%22email%22%3A%22victorsena04%40gmail.com%22%2C%22consultorioId%22%3A%22desperte-psique%22%2C%22role%22%3A%22principal%22%7D");
  
  console.log("Status Code:", res.statusCode);
  console.log("Headers completos:", res.headers);
}

verificarHeadersVercel().catch(console.error);
