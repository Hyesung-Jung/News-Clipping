// /api/crawl.js — Vercel Serverless Function
// 기사 URL을 받아 본문 텍스트를 추출해서 반환
// 허용된 한국 바이오/의학 뉴스 도메인만 크롤링

const ALLOWED_DOMAINS = [
  "biospectator.com", "hitnews.co.kr", "medipana.com", "yakup.com",
  "biotimes.co.kr", "pharmnews.com", "bosa.co.kr", "dailypharm.com",
  "medigatenews.com", "thebell.co.kr", "edaily.co.kr", "mt.co.kr",
  "etnews.com", "hankyung.com", "mk.co.kr", "chosun.com",
  "joongang.co.kr", "donga.com", "yonhapnews.co.kr", "newsis.com",
  "news1.kr", "n.news.naver.com", "news.naver.com",
];

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") { res.status(200).end(); return; }

  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "url required" });

  // 보안: 허용된 도메인만 크롤링
  try {
    const parsed = new URL(url);
    const ok = ALLOWED_DOMAINS.some(d => parsed.hostname.endsWith(d));
    if (!ok) return res.status(403).json({ error: "domain not allowed" });
  } catch {
    return res.status(400).json({ error: "invalid url" });
  }

  try {
    const r = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "ko-KR,ko;q=0.9",
        "Referer": "https://www.naver.com/",
      },
      signal: AbortSignal.timeout(7000),
    });

    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const html = await r.text();
    const body = extractBody(html);

    res.json({ body: body ? body.slice(0, 3000) : null });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

// ── HTML에서 기사 본문 추출 ────────────────────────────────────────────────────
function clean(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
    .replace(/<figure[\s\S]*?<\/figure>/gi, "");
}

function toText(html) {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&").replace(/&[^;]+;/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractBody(raw) {
  const html = clean(raw);

  // 1단계: ID/class 패턴으로 기사 영역 탐색
  const SELECTORS = [
    // 아이디
    "article-view-content-div",   // 대부분의 한국 언론사 (allat CMS)
    "articleBodyContents",         // 네이버 뉴스
    "dic_area",                    // 네이버 뉴스 (신)
    "news_body_area",
    "article_body",
    "article-body",
    "view_content",
    "newsView",
    "viewBox",
    "content-article",
    "articleContent",
    "news-content-area",
    "hn_content",
  ];

  for (const sel of SELECTORS) {
    // id="..." 형태
    const idRe = new RegExp(`id=["']${sel}["'][^>]*>([\\s\\S]{80,})`, "i");
    const idM  = html.match(idRe);
    if (idM) {
      const text = toText(idM[1].slice(0, 8000));
      if (text.length > 150) return text;
    }
    // class="..." 형태
    const clRe = new RegExp(`class=["'][^"']*\\b${sel}\\b[^"']*["'][^>]*>([\\s\\S]{80,})`, "i");
    const clM  = html.match(clRe);
    if (clM) {
      const text = toText(clM[1].slice(0, 8000));
      if (text.length > 150) return text;
    }
  }

  // 2단계: <article> 태그
  const artM = html.match(/<article[^>]*>([\s\S]{100,}?)<\/article>/i);
  if (artM) {
    const text = toText(artM[1]);
    if (text.length > 150) return text;
  }

  // 3단계: <p> 태그 모아서 가장 긴 블록 반환
  const paras = [];
  const pRe   = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  let m;
  while ((m = pRe.exec(html)) !== null) {
    const t = toText(m[1]);
    if (t.length > 30) paras.push(t);
  }
  if (paras.length >= 3) return paras.join("\n");

  return null;
}
