import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Provider = "openrouter" | "openai" | "anthropic" | "gemini";

const ALLOWED_PROVIDERS: Provider[] = ["openrouter", "openai", "anthropic", "gemini"];

function normalizeRepo(repo: string) {
  return repo
    .trim()
    .toLowerCase()
    .replace(/^https:\/\/huggingface\.co\/datasets\//i, "")
    .replace(/^\/+|\/+$/g, "");
}

async function fetchJson(url: string, init: RequestInit, label: string) {
  const response = await fetch(url, {
    ...init,
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });
  const text = await response.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text.slice(0, 400) };
  }
  if (!response.ok) {
    const message = json?.error?.message || json?.error || json?.message || text.slice(0, 240) || `${label} failed`;
    throw new Error(`${label}: ${message}`);
  }
  return json;
}

async function testHuggingFace(hfToken: string, hfRepoId: string) {
  const repo = normalizeRepo(hfRepoId);
  if (!/^[a-z0-9][a-z0-9_.-]*\/[a-z0-9][a-z0-9_.-]*$/.test(repo)) {
    throw new Error("HF repo must be lowercase user/repo, not a URL.");
  }
  if (!hfToken.startsWith("hf_")) throw new Error("HF token must start with hf_.");

  const whoami = await fetchJson(
    "https://huggingface.co/api/whoami-v2",
    { headers: { authorization: `Bearer ${hfToken}` } },
    "HuggingFace token",
  );
  const tokenRole = String(whoami?.auth?.accessToken?.role || whoami?.auth?.accessToken?.displayName || "").toLowerCase();
  if (tokenRole === "read") throw new Error("HuggingFace token is read-only. Create a Write token.");

  await fetchJson(
    `https://huggingface.co/api/datasets/${repo.split("/").map(encodeURIComponent).join("/")}`,
    { headers: { authorization: `Bearer ${hfToken}` } },
    "HuggingFace dataset",
  );

  return {
    ok: true,
    repo,
    user: whoami?.name || whoami?.fullname || "verified",
    writeLikely: tokenRole ? tokenRole !== "read" : true,
  };
}

async function testProvider(provider: Provider, apiKey: string, model: string) {
  if (!model.trim()) throw new Error("Model is required.");
  if (!apiKey.trim()) throw new Error("API key is required.");
  const prompt = "Reply with exactly: ok";

  if (provider === "openai") {
    await fetchJson(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          max_tokens: 8,
          temperature: 0,
        }),
      },
      "OpenAI model",
    );
  } else if (provider === "openrouter") {
    await fetchJson(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${apiKey}`,
          "content-type": "application/json",
          "http-referer": "https://siggy.decka.my.id",
          "x-title": "Siggy Ritual Deployer",
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          max_tokens: 8,
          temperature: 0,
        }),
      },
      "OpenRouter model",
    );
  } else if (provider === "anthropic") {
    await fetchJson(
      "https://api.anthropic.com/v1/messages",
      {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model,
          max_tokens: 8,
          temperature: 0,
          messages: [{ role: "user", content: prompt }],
        }),
      },
      "Anthropic model",
    );
  } else if (provider === "gemini") {
    await fetchJson(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 8, temperature: 0 },
        }),
      },
      "Gemini model",
    );
  }

  return { ok: true, provider, model };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const provider = String(body.provider || "").trim().toLowerCase() as Provider;
    const apiKey = String(body.apiKey || "").trim();
    const model = String(body.model || "").trim();
    const hfToken = String(body.hfToken || "").trim();
    const hfRepoId = String(body.hfRepoId || "").trim();

    if (!ALLOWED_PROVIDERS.includes(provider)) {
      throw new Error(`Provider must be one of ${ALLOWED_PROVIDERS.join(", ")}.`);
    }

    const [hf, llm] = await Promise.all([
      testHuggingFace(hfToken, hfRepoId),
      testProvider(provider, apiKey, model),
    ]);

    return NextResponse.json({
      ok: true,
      hf,
      llm,
      warning: hf.writeLikely ? "" : "HF token passed auth, but write scope could not be fully confirmed.",
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Smoke test failed.",
      },
      { status: 400 },
    );
  }
}
