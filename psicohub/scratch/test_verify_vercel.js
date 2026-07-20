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

async function verificarVercelComMiddleware() {
  console.log("📡 Testando resposta da Vercel enviando cookie com consultorioId antigo...");
  
  const cookieAntigo = `psicohub_session=${encodeURIComponent(JSON.stringify({
    uid: "user-123",
    email: "victorsena04@gmail.com",
    consultorioId: "qualquer_id_antigo_qualquer",
    role: "principal"
  }))}`;

  const res = await fetchUrl("https://psicohub-rust.vercel.app/financeiro", cookieAntigo);
  
  console.log("Status Code:", res.statusCode);
  console.log("Set-Cookie retornado pela Vercel no cabeçalho HTTP:", res.headers["set-cookie"]);

  const indexSaldo = res.body.indexOf("Saldo Acumulado");
  if (indexSaldo !== -1) {
    console.log("\n📄 HTML retornado pelo servidor contendo Saldo:");
    console.log(res.body.substring(indexSaldo, indexSaldo + 400));
  } else {
    console.log("⚠️ Não encontrou Saldo no HTML.");
  }
}

verificarVercelComMiddleware().catch(console.error);
