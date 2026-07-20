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

async function testarSemCookie() {
  console.log("📡 Testando resposta da Vercel para requisicao SEM COOKIE...");
  
  const res = await fetchUrl("https://psicohub-rust.vercel.app/financeiro", "");
  
  console.log("Status Code:", res.statusCode);
  console.log("Set-Cookie:", res.headers["set-cookie"]);

  const indexSaldo = res.body.indexOf("Saldo Acumulado");
  if (indexSaldo !== -1) {
    console.log("\n📄 HTML contem Saldo Acumulado:");
    console.log(res.body.substring(indexSaldo, indexSaldo + 400));
  } else {
    console.log("⚠️ Não encontrou Saldo no HTML.");
    console.log("Primeiros 300 chars do body:", res.body.substring(0, 300));
  }
}

testarSemCookie().catch(console.error);
