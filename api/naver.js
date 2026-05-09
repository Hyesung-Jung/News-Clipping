// /api/naver.js  — Vercel Serverless Function
// 네이버 검색 API를 서버에서 호출 후 프론트에 전달 (CORS 우회)
//
// 환경변수 설정 (Vercel 대시보드 → Settings → Environment Variables):
//   NAVER_CLIENT_ID     = 네이버 개발자 콘솔 Client ID
//   NAVER_CLIENT_SECRET = 네이버 개발자 콘솔 Client Secret

export default async function handler(req, res) {
  // CORS 허용
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") { res.status(200).end(); return; }

  const { query, display = "100", sort = "date" } = req.query;
  if (!query) {
    return res.status(400).json({ error: "query param required" });
  }

  const apiUrl =
    `https://openapi.naver.com/v1/search/news.json` +
    `?query=${encodeURIComponent(query)}&display=${display}&sort=${sort}`;

  try {
    const r = await fetch(apiUrl, {
      headers: {
        "X-Naver-Client-Id":     process.env.NAVER_CLIENT_ID,
        "X-Naver-Client-Secret": process.env.NAVER_CLIENT_SECRET,
      },
    });
    const data = await r.json();
    return res.status(r.status).json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
