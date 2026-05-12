// /api/edits.js
// 뉴스 편집 오버라이드 (숨김·이동·순서) 를 Supabase에 저장/조회

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") { res.status(200).end(); return; }

  const headers = {
    "apikey":        process.env.SUPABASE_SERVICE_KEY,
    "Authorization": `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
  };

  // GET — 현재 편집 상태 조회
  if (req.method === "GET") {
    const r = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/news_edits?key=eq.overrides&select=data`,
      { headers }
    );
    const rows = await r.json();
    return res.json(rows[0]?.data || { hidden: [], moved: {}, domOrder: [], gloOrder: [] });
  }

  // POST — 편집 상태 저장
  if (req.method === "POST") {
    const r = await fetch(`${process.env.SUPABASE_URL}/rest/v1/news_edits`, {
      method: "POST",
      headers: {
        ...headers,
        "Content-Type": "application/json",
        "Prefer":        "resolution=merge-duplicates",
      },
      body: JSON.stringify({
        key:        "overrides",
        data:       req.body,
        updated_at: new Date().toISOString(),
      }),
    });
    return res.json({ ok: r.ok });
  }

  res.status(405).json({ error: "method not allowed" });
}
