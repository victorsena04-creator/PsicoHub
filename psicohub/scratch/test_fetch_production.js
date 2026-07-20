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

async function testarProducaoComCookie() {
  console.log("📡 Testando resposta da Vercel COM COOKIE de sessao...");

  const sessionObj = {
    uid: "test-uid",
    email: "victorsena04@gmail.com",
    consultorioId: "desperte-psique",
    role: "principal"
  };

  const sessionJson = JSON.stringify(sessionObj);
  const cookieHeader = `psicohub_session=${encodeURIComponent(sessionJson)}`;

  const res = await fetchUrl("https://psicohub-rust.vercel.app/financeiro", cookieHeader);
  console.log("Status Code:", res.statusCode);
  
  const indexSaldo = res.body.indexOf("Saldo Acumulado");
  if (indexSaldo !== -1) {
    console.log("\n📄 HTML retornado pelo servidor Vercel:");
    console.log(res.body.substring(indexSaldo, indexSaldo + 450));
  } else {
    console.log("⚠️ Saldo Acumulado nao foi encontrado no HTML.");
  }
}

testarProducaoComCookie().catch(console.error);
