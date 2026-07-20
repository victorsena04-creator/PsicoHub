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

async function testarDiferentesCookies() {
  console.log("🧪 TESTANDO DIFERENTES COOKIES CONTRA VERCEL PRODUÇÃO...\n");

  const c1 = `psicohub_session=${encodeURIComponent(JSON.stringify({ uid: "1", email: "victorsena04@gmail.com", consultorioId: "desperte-psique", role: "principal" }))}`;
  const c2 = `psicohub_session=${encodeURIComponent(JSON.stringify({ uid: "2", email: "lidia.mussi.psi@gmail.com", consultorioId: "desperte-psique", role: "principal" }))}`;
  const c3 = `psicohub_session=${encodeURIComponent(JSON.stringify({ uid: "3", email: "victorsena04@gmail.com", consultorioId: "consultorio-principal", role: "principal" }))}`;
  const c4 = `psicohub_session=${encodeURIComponent(JSON.stringify({ uid: "4", email: "victorsena04@gmail.com", consultorioId: "reR95VFxowBkoWzXaEsu", role: "principal" }))}`;
  const c5 = `psicohub_session=${encodeURIComponent(JSON.stringify({ uid: "5", email: "victorsena04@gmail.com", consultorioId: "dev-admin", role: "principal" }))}`;

  const tests = [
    { name: "Cookie limpo (desperte-psique)", cookie: c1 },
    { name: "Cookie Dra. Lídia (desperte-psique)", cookie: c2 },
    { name: "Cookie antigo consultorio-principal", cookie: c3 },
    { name: "Cookie antigo reR95VFxowBkoWzXaEsu", cookie: c4 },
    { name: "Cookie antigo dev-admin", cookie: c5 },
  ];

  for (const t of tests) {
    const res = await fetchUrl("https://psicohub-rust.vercel.app/financeiro", t.cookie);
    const hasSaldoReal = res.body.includes("2.737,60");
    const hasSaldoZero = res.body.includes("0,00");
    console.log(`📌 Teste: [${t.name}]`);
    console.log(`   - Status: ${res.statusCode}`);
    console.log(`   - Saldo R$ 2.737,60 presente? ${hasSaldoReal}`);
    console.log(`   - Saldo R$ 0,00 presente? ${hasSaldoZero}`);
    console.log(`--------------------------------------------------`);
  }
}

testarDiferentesCookies().catch(console.error);
