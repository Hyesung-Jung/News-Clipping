// /api/news.js
// Supabase에서 최신 뉴스 캐시를 읽어서 클라이언트에 반환

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") { res.status(200).end(); return; }

  try {
    const r = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/news_cache?key=eq.latest&select=data,updated_at`,
      {
        headers: {
          "apikey":        process.env.SUPABASE_SERVICE_KEY,
          "Authorization": `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
        },
      }
    );
    if (!r.ok) throw new Error(`Supabase read failed: ${r.status}`);
    const rows = await r.json();

    if (!rows.length) {
      return res.json({ domestic:[], global:[], updatedAt:null });
    }

    const { data, updated_at } = rows[0];
    res.json({ domestic:data.domestic||[], global:data.global||[], updatedAt:updated_at });
  } catch (e) {
    res.status(500).json({ error: e.message, domestic:[], global:[], updatedAt:null });
  }
}
