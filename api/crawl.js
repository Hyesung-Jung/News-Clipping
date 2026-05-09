// /api/crawl.js — Vercel Serverless Function
// 기사 URL 본문 추출 · 한국/해외 뉴스 사이트 전반 지원

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") { res.status(200).end(); return; }

  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "url required" });

  // 최소 보안: http/https 이고 IP가 아닌 도메인만 허용
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return res.status(403).json({ error: "protocol not allowed" });
    }
    // IP 직접 접근 차단
    if (/^\d+\.\d+\.\d+\.\d+$/.test(parsed.hostname)) {
      return res.status(403).json({ error: "IP not allowed" });
    }
    // localhost 차단
    if (parsed.hostname === "localhost" || parsed.hostname.endsWith(".local")) {
      return res.status(403).json({ error: "local not allowed" });
    }
  } catch {
    return res.status(400).json({ error: "invalid url" });
  }

  try {
    const r = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
        "Referer": "https://www.naver.com/",
        "Cache-Control": "no-cache",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const html = await r.text();
    const body = extractBody(html);

    res.json({ body: body ? body.slice(0, 3500) : null });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

// ── HTML 정리 ─────────────────────────────────────────────────────────────────
function cleanHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
    .replace(/<figure[\s\S]*?<\/figure>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<aside[\s\S]*?<\/aside>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "");
}

function toText(html) {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&[a-zA-Z]+;/g, " ")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ── 본문 추출 ─────────────────────────────────────────────────────────────────
function extractBody(rawHtml) {
  const html = cleanHtml(rawHtml);

  // 1단계: ID 기반 탐색 (한국 언론사 공통 패턴)
  const ID_PATTERNS = [
    "article-view-content-div",   // allat CMS (히트뉴스·바이오타임즈 등 다수)
    "articleBodyContents",         // 네이버 뉴스 (구)
    "dic_area",                    // 네이버 뉴스 (신)
    "article_body",
    "article-body",
    "articleBody",
    "articleContent",
    "article-content",
    "article_content",
    "news-content",
    "news_content",
    "newsView",
    "newsBody",
    "view_content",
    "view-content",
    "viewBox",
    "content_view",
    "read_body",
    "post-content",
    "post_content",
    "entry-content",
    "td-post-content",
    "hn_content",
    "storyText",
    "story-body",
    "body-text",
    "main-content",
  ];

  for (const id of ID_PATTERNS) {
    // id="..." 탐색
    const idRe = new RegExp(`id=["']${id}["'][^>]*>([\\s\\S]{100,})`, "i");
    const idM  = html.match(idRe);
    if (idM) {
      const text = toText(idM[1].slice(0, 10000));
      if (text.length > 150) return text;
    }
    // class="..." 탐색
    const clRe = new RegExp(`class=["'][^"']*\\b${id.replace(/-/g,"[_-]")}\\b[^"']*["'][^>]*>([\\s\\S]{100,})`, "i");
    const clM  = html.match(clRe);
    if (clM) {
      const text = toText(clM[1].slice(0, 10000));
      if (text.length > 150) return text;
    }
  }

  // 2단계: <article> 태그
  const artM = html.match(/<article[^>]*>([\s\S]{100,}?)<\/article>/i);
  if (artM) {
    const text = toText(artM[1]);
    if (text.length > 150) return text;
  }

  // 3단계: itemprop="articleBody"
  const itemM = html.match(/itemprop=["']articleBody["'][^>]*>([\s\S]{100,}?)<\/(?:div|section|article)>/i);
  if (itemM) {
    const text = toText(itemM[1]);
    if (text.length > 150) return text;
  }

  // 4단계: <p> 태그 집합 — 가장 밀집된 구간 추출
  const allP = [];
  const pRe  = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  let m;
  while ((m = pRe.exec(html)) !== null) {
    const t = toText(m[1]);
    if (t.length > 25) allP.push(t);
  }
  if (allP.length >= 3) {
    // 연속된 문단 중 가장 긴 블록 선택 (광고 제거 효과)
    let best = "", cur = "";
    for (const p of allP) {
      cur += (cur ? "\n" : "") + p;
      if (cur.length > best.length) best = cur;
      if (p.length < 20) cur = ""; // 짧은 문단으로 끊김 → 리셋
    }
    if (best.length > 150) return best;
  }

  // 5단계: 전체 텍스트에서 최장 연속 문자열 (최후 수단)
  const fullText = toText(html);
  if (fullText.length > 300) {
    // 200자 이상 연속 구간 찾기
    const chunks = fullText.split(/\n+/).filter(c => c.length > 80);
    if (chunks.length >= 2) return chunks.slice(0, 15).join("\n");
  }

  return null;
}
