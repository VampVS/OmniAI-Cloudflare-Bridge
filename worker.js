export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const targetHost = request.headers.get("x-target-host") || "https://generativelanguage.googleapis.com";
    const isValidationRequest = request.headers.get("x-validate-only") === "true";

    if (request.method === "GET") {
      try {
        const response = await fetch(targetHost, { 
          method: "GET",
          headers: { "User-Agent": "Mozilla/5.0" }
        });
        const status = response.ok || response.status === 401 || response.status === 404 ? "ONLINE" : "OFFLINE";
        return new Response(JSON.stringify({ status, target: targetHost }), { 
          status: 200, 
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } 
        });
      } catch (e) {
        return new Response(JSON.stringify({ status: "ERROR", error: e.message }), { status: 502 });
      }
    }

    const cleanHeaders = new Headers();
    cleanHeaders.set("Content-Type", "application/json");
    const auth = request.headers.get("Authorization") || request.headers.get("x-goog-api-key") || request.headers.get("x-api-key");
    
    if (targetHost.includes("anthropic.com")) {
      cleanHeaders.set("x-api-key", auth);
      cleanHeaders.set("anthropic-version", "2023-06-01");
    } else if (targetHost.includes("openai.com")) {
      cleanHeaders.set("Authorization", "Bearer " + (auth ? auth.replace("Bearer ", "") : ""));
    } else {
      cleanHeaders.set("x-goog-api-key", auth);
    }

    if (isValidationRequest) {
        let testUrl = targetHost.includes("googleapis") ? `${targetHost}/v1beta/models?key=${auth}` : `${targetHost}/v1/models`;
        const testRes = await fetch(testUrl, { method: "GET", headers: cleanHeaders });
        return new Response(JSON.stringify({ valid: testRes.ok, code: testRes.status }), { status: testRes.status });
    }
    
    try {
      const targetUrl = targetHost + url.pathname + url.search;
      const aiResponse = await fetch(targetUrl, {
        method: "POST",
        headers: cleanHeaders,
        body: request.body,
      });
      const body = await aiResponse.text();
      return new Response(body, { status: aiResponse.status, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
  },
};
