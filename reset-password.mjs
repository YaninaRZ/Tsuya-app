import { createClient } from "@supabase/supabase-js";
import http from "http";

const SUPABASE_URL = "https://fucbnakryykklsowoacc.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1Y2JuYWtyeXlra2xzb3dvYWNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4MzY0MjcsImV4cCI6MjA5NjQxMjQyN30.BmwyUTcm4alhZhsLN1hB8Bh9hSawjc5jgswZHoDXtBY";
const NEW_PASSWORD = "Tsuya2001";

const supabase = createClient(SUPABASE_URL, ANON_KEY);

const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Reset mot de passe</title></head>
<body>
<h2 id="msg">Traitement en cours...</h2>
<script>
  const hash = window.location.hash.substring(1);
  const params = new URLSearchParams(hash);
  const access_token = params.get("access_token");
  const refresh_token = params.get("refresh_token");
  const error = params.get("error");

  if (error) {
    document.getElementById("msg").innerText = "Erreur: " + params.get("error_description");
  } else if (access_token) {
    fetch("/update-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ access_token, refresh_token })
    })
    .then(r => r.json())
    .then(data => {
      document.getElementById("msg").innerText = data.message;
    });
  } else {
    document.getElementById("msg").innerText = "Aucun token trouvé dans le lien.";
  }
</script>
</body>
</html>`;

const server = http.createServer(async (req, res) => {
  if (req.method === "GET") {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(html);
  } else if (req.method === "POST" && req.url === "/update-password") {
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", async () => {
      try {
        const { access_token, refresh_token } = JSON.parse(body);
        const { error: sessionError } = await supabase.auth.setSession({ access_token, refresh_token });
        if (sessionError) throw sessionError;
        const { error } = await supabase.auth.updateUser({ password: NEW_PASSWORD });
        if (error) throw error;
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ message: "Mot de passe changé ! Nouveau mdp : " + NEW_PASSWORD }));
        console.log("✅ Mot de passe changé avec succès !");
        setTimeout(() => process.exit(0), 1000);
      } catch (e) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ message: "Erreur: " + e.message }));
      }
    });
  }
});

server.listen(3000, () => {
  console.log("✅ Serveur prêt sur http://localhost:3000");
  console.log("👉 Va sur Supabase et clique 'Send magic link' pour hibasahbane3@gmail.com");
  console.log("👉 Ouvre l'email et clique le lien");
  console.log("👉 Le nouveau mot de passe sera : " + NEW_PASSWORD);
});
