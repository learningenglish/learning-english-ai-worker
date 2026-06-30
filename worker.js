/**
 * Cloudflare Worker — Learning English AI
 * PHIÊN BẢN NHIỀU FILE (worker.js + prompts.js), dùng ES module import.
 *
 * QUAN TRỌNG VỀ CÁCH DEPLOY: file này CHỈ chạy đúng nếu prompts.js được Cloudflare
 * coi là một module THỰC SỰ thuộc cùng Worker (không phải file rời nằm ngoài). Có 2 cách
 * deploy đúng — xem README.md để biết chi tiết từng bước:
 *   A. wrangler CLI (`wrangler deploy`) — wrangler tự bundle mọi file được import, luôn đúng.
 *   B. Cloudflare Dashboard, dùng trình soạn thảo nhiều file (nút "+" thêm file mới trong
 *      cùng Worker) — KHÔNG dùng ô "Quick Edit" kiểu cũ chỉ có 1 ô text duy nhất, vì nó
 *      không hỗ trợ import file thứ hai và sẽ làm Worker crash khi khởi động (đúng lỗi
 *      500 + thiếu CORS header mà bạn từng gặp).
 */

// ====== CẤU HÌNH ======
const ALLOWED_ORIGINS = [
  "https://learningenglish.github.io",
  "http://localhost:3000",
];

const DAILY_LIMIT_PER_IP = 100;
const MAX_TOKENS_CAP = 4000;

import {
  buildAnalyzePrompt,
  ANALYZE_SYSTEM,
  buildWordTipPrompt,
  buildWordExplainPrompt,
  buildPhraseExplainPrompt,
  buildSentenceTipPrompt,
} from "./prompts.js";

// ====== HELPERS ======
function getCors(origin) {
  if (ALLOWED_ORIGINS.includes(origin)) {
    return {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-App-Secret",
      "Access-Control-Max-Age": "86400",
      Vary: "Origin",
    };
  }
  return {
    "Access-Control-Allow-Origin": "null",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-App-Secret",
  };
}

function json(data, status, headers) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

async function callOpenAI(env, body) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: body.model || "gpt-4o-mini",
      max_tokens: Math.min(body.max_tokens || 500, MAX_TOKENS_CAP),
      messages: body.messages,
      ...(body.response_format ? { response_format: body.response_format } : {}),
    }),
  });
  const data = await response.json();
  return { ok: response.ok, status: response.status, data };
}

function content(result) {
  return result?.data?.choices?.[0]?.message?.content || "";
}

function safeOpenAIError(r) {
  console.error("OpenAI error:", r.status, JSON.stringify(r.data));
  if (r.status === 429) return { error: "Hệ thống đang quá tải, vui lòng thử lại sau ít phút.", status: 503 };
  return { error: "Dịch vụ AI tạm thời không khả dụng.", status: 502 };
}

async function rateLimit(env, ip) {
  const date = new Date().toISOString().slice(0, 10);
  const key = `limit:${ip}:${date}`;
  const count = Number((await env.RATE_LIMIT_KV.get(key)) || 0);
  if (count >= DAILY_LIMIT_PER_IP) return false;
  await env.RATE_LIMIT_KV.put(key, String(count + 1), { expirationTtl: 86400 });
  return true;
}

// ====== ACTIONS ======
const ACTIONS = {
  async analyze_sentence(env, data) {
    if (!data.sentence) return { error: "Thiếu 'sentence'", status: 400 };
    const prompt = buildAnalyzePrompt(data.sentence, data.level || "A1-A2");
    const r = await callOpenAI(env, {
      max_tokens: 4000,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: ANALYZE_SYSTEM },
        { role: "user", content: prompt },
      ],
    });
    if (!r.ok) return safeOpenAIError(r);
    return { content: content(r) };
  },

  async word_tip(env, data) {
    if (!data.word) return { error: "Thiếu 'word'", status: 400 };
    const r = await callOpenAI(env, {
      max_tokens: 200,
      messages: [{ role: "user", content: buildWordTipPrompt(data.word, data.sentenceContext || "") }],
    });
    if (!r.ok) return safeOpenAIError(r);
    return { content: content(r) };
  },

  async word_explain(env, data) {
    if (!data.word || !data.sentence) return { error: "Thiếu 'word' hoặc 'sentence'", status: 400 };
    const r = await callOpenAI(env, {
      max_tokens: 300,
      messages: [{ role: "user", content: buildWordExplainPrompt(data.word, data.sentence) }],
    });
    if (!r.ok) return safeOpenAIError(r);
    return { content: content(r) };
  },

  async phrase_explain(env, data) {
    if (!data.phrase || !data.context) return { error: "Thiếu 'phrase' hoặc 'context'", status: 400 };
    const r = await callOpenAI(env, {
      max_tokens: 300,
      messages: [{ role: "user", content: buildPhraseExplainPrompt(data.phrase, data.context) }],
    });
    if (!r.ok) return safeOpenAIError(r);
    return { content: content(r) };
  },

  async sentence_tip(env, data) {
    if (!data.sentence) return { error: "Thiếu 'sentence'", status: 400 };
    const r = await callOpenAI(env, {
      max_tokens: 300,
      messages: [{ role: "user", content: buildSentenceTipPrompt(data.sentence) }],
    });
    if (!r.ok) return safeOpenAIError(r);
    return { content: content(r) };
  },

  // Dùng cho tạo đề thi IELTS/PTTH — prompt khung đề vẫn do frontend gửi tạm thời
  // (xem TODO ở các bản trước), nhưng API key + model vẫn ẩn hoàn toàn ở Worker.
  async generate_exam_legacy(env, data) {
    if (!Array.isArray(data.messages) || data.messages.length === 0) {
      return { error: "Thiếu 'messages'", status: 400 };
    }
    const r = await callOpenAI(env, {
      model: "gpt-4o", // cố định ở server, frontend không chọn được model
      max_tokens: data.max_tokens || 4000,
      response_format: { type: "json_object" },
      messages: data.messages,
    });
    if (!r.ok) return safeOpenAIError(r);
    return { content: content(r) };
  },
};

// ====== ENTRYPOINT ======
export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const cors = getCors(origin);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    if (!ALLOWED_ORIGINS.includes(origin)) {
      return json({ error: "Origin blocked" }, 403, cors);
    }

    if (request.method !== "POST") {
      return json({ error: "Only POST allowed" }, 405, cors);
    }

    const url = new URL(request.url);
    if (url.pathname !== "/api/chat") {
      return json({ error: "Not found" }, 404, cors);
    }

    const secret = request.headers.get("X-App-Secret");
    if (secret !== env.APP_SECRET) {
      return json({ error: "Unauthorized" }, 401, cors);
    }

    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    if (!(await rateLimit(env, ip))) {
      return json({ error: "Too many requests" }, 429, cors);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid JSON" }, 400, cors);
    }

    const { action, ...data } = body;
    const handler = ACTIONS[action];
    if (!handler) {
      return json({ error: "Unknown action" }, 400, cors);
    }

    try {
      const result = await handler(env, data);
      const status = result.error ? result.status || 502 : 200;
      return json(result, status, cors);
    } catch (e) {
      console.error(e);
      return json({ error: "Worker error" }, 500, cors);
    }
  },
};
