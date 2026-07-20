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

async function debugHtml() {
  const c1 = `psicohub_session=${encodeURIComponent(JSON.stringify({ uid: "1", email: "victorsena04@gmail.com", consultorioId: "desperte-psique", role: "principal" }))}`;
  
  console.log("🔍 Solicitando HTML para c1 (desperte-psique)...");
  const res = await fetchUrl("https://psicohub-rust.vercel.app/financeiro", c1);
  
  let matches = [];
  let pos = res.body.indexOf("R$");
  while (pos !== -1) {
    matches.push(res.body.substring(pos, pos + 50));
    pos = res.body.indexOf("R$", pos + 1);
  }

  console.log("Ocorrências de R$ no HTML para c1 (desperte-psique):", matches);
}

debugHtml().catch(console.error);
