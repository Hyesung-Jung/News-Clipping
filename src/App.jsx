import { useState, useEffect, useCallback } from "react";

const SOURCES = [
  { name: "바이오스펙테이터", url: "https://www.biospectator.com/rss/rss.xml" },
  { name: "히트뉴스",         url: "https://www.hitnews.co.kr/rss/allArticle.xml" },
  { name: "메디파나",         url: "https://medipana.com/rss/allArticle.xml" },
  { name: "약업신문",         url: "https://www.yakup.com/rss/rss.xml" },
  { name: "바이오타임즈",     url: "https://www.biotimes.co.kr/rss/allArticle.xml" },
  { name: "팜뉴스",           url: "https://www.pharmnews.com/rss/allArticle.xml" },
  { name: "의학신문",         url: "https://www.bosa.co.kr/rss/allArticle.xml" },
];

const CGT_KW = [
  // 국내어
  "세포치료","유전자치료","세포유전자","줄기세포","유전자편집","CAR-T","CRISPR",
  "NK세포","키메릭","항원수용체","아데노","렌티바이러스","CGT","iPSC","TCR","TIL",
  "항암 바이러스","백시니아 바이러스","TG-C",
  // 영문
  "gene therapy","cell therapy","gene editing","stem cell","AAV","lentiviral",
  "cell & gene","mRNA","base editing","allogeneic","autologous","NK cell",
  "chimeric antigen","adeno-associated","vaccinia virus","oncolytic",
];

// 한국 CGT 기업 화이트리스트 (1단계: 국내로 분류)
const KOREAN_KW = [
  "코오롱","셀트리온","녹십자","GC셀","지씨셀","메디포스트","차바이오텍",
  "제넥신","툴젠","헬릭스미스","엔케이맥스","박셀바이오","큐로셀","안트로젠",
  "파미셀","강스템바이오텍","유틸렉스","이엔셀","인투셀","입셀","네오이뮨텍",
  "삼성바이오","한미약품","종근당","대웅제약","유한양행","JW중외제약",
  "SK바이오팜","LG화학","보령","동아ST","HK이노엔","에스티팜",
  "식약처","KFDA","식품의약품안전처","범부처","과기부","산자부",
];

// 해외 기업·기관 화이트리스트 (2단계: 해외로 분류)
const GLOBAL_KW = [
  // 국내어 회사명
  "노바티스","길리어드","블루버드","로슈","아스트라제네카","화이자","얀센","BMS",
  "바이오젠","리제네론","사렙타","스파크","유니큐어","크리스퍼","인텔리아","빔",
  "알로진","페이트","아이오반스","에디타스","버텍스",
  // 영문 회사·기관명
  "Novartis","Gilead","Pfizer","Roche","AstraZeneca","Biogen",
  "Regeneron","Sarepta","Spark","UniQure","Intellia","Beam","Bluebird",
  "Allogene","Fate Therapeutics","Iovance","Editas","Vertex",
  "FDA","EMA","NIH","NCI",
];

const CATS = [
  { label: "임상",       dot: "#2563eb", keys: ["임상","phase","clinical","승인신청","ind "] },
  { label: "허가",       dot: "#16a34a", keys: ["허가","approved","approval","fda 승인","식약처","breakthrough"] },
  { label: "투자",       dot: "#7c3aed", keys: ["투자","유치","funding","series","ipo","억원","million","billion","deal","라이선스"] },
  { label: "연구",       dot: "#d97706", keys: ["연구","결과","논문","발표","study","data","result"] },
  { label: "파이프라인", dot: "#dc2626", keys: ["파이프라인","pipeline","candidate","착수","도입","initiates"] },
  { label: "기업",       dot: "#6b7280", keys: [] },
];

const CACHE_KEY = "cgt_v6";
const RSS_API   = "https://api.rss2json.com/v1/api.json?rss_url=";
const todayStr  = () => new Date().toISOString().slice(0, 10);

// ── 유틸 ──────────────────────────────────────────────────────────────────────
function isCGT(item) {
  const t = `${item.title ?? ""} ${item.description ?? ""}`.toLowerCase();
  return CGT_KW.some(k => t.includes(k.toLowerCase()));
}
// 분류 로직: Korean → 국내, Global → 해외, 둘 다 X → 한글 비율로 판단
function classifyRegion(item) {
  const t = `${item.title} ${item.desc}`;
  const lower = t.toLowerCase();

  // 1단계: 한국 기업 언급 시 무조건 국내 (코오롱티슈진 같은 케이스 처리)
  if (KOREAN_KW.some(k => lower.includes(k.toLowerCase()))) return "domestic";

  // 2단계: 해외 기업·기관 언급 시 해외
  if (GLOBAL_KW.some(k => lower.includes(k.toLowerCase()))) return "global";

  // 3단계: 둘 다 안 걸리면 한글 비율 체크 (한글 70% 이상이면 국내 자체 분석으로 간주)
  const hangul = (t.match(/[가-힣]/g) || []).length;
  const total  = t.replace(/\s/g, "").length || 1;
  return hangul / total > 0.7 ? "domestic" : "global";
}

function isGlobal(item) {
  return classifyRegion(item) === "global";
}
function classify(item) {
  const t = `${item.title} ${item.desc}`.toLowerCase();
  return CATS.find((c, i) => i < CATS.length - 1 && c.keys.some(k => t.includes(k))) ?? CATS[CATS.length - 1];
}
function stripHTML(s) {
  return s ? s.replace(/<[^>]+>/g, "").replace(/&[^;]+;/g, " ").replace(/\s+/g, " ").trim() : "";
}
function fmtDate(d) {
  if (!d) return "—";
  const dt = new Date(d);
  return `${String(dt.getMonth()+1).padStart(2,"0")}.${String(dt.getDate()).padStart(2,"0")}`;
}

// ── RSS 수집 ──────────────────────────────────────────────────────────────────
async function fetchSource(src) {
  try {
    const r = await fetch(`${RSS_API}${encodeURIComponent(src.url)}`);
    const j = await r.json();
    if (j.status !== "ok") return [];
    return (j.items ?? []).filter(isCGT).map(it => ({
      title:  (it.title ?? "").trim(),
      link:   it.link ?? it.guid ?? "#",
      date:   it.pubDate ?? "",
      source: src.name,
      desc:   stripHTML(it.description ?? it.content ?? ""),
    }));
  } catch { return []; }
}

async function fetchAll() {
  const results = await Promise.allSettled(SOURCES.map(fetchSource));
  const all = results.flatMap(r => r.status === "fulfilled" ? r.value : []);
  const seen = new Set();
  const unique = all.filter(item => {
    const key = item.title.slice(0, 30);
    if (seen.has(key)) return false;
    seen.add(key); return true;
  });
  unique.sort((a, b) => new Date(b.date) - new Date(a.date));
  return {
    domestic: unique.filter(i => !isGlobal(i)).slice(0, 20),
    global:   unique.filter(i =>  isGlobal(i)).slice(0, 20),
  };
}

// ── 캐시 ──────────────────────────────────────────────────────────────────────
function loadCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { date, data } = JSON.parse(raw);
    return date === todayStr() ? data : null;
  } catch { return null; }
}
function saveCache(data) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ date: todayStr(), data })); } catch {}
}

// ── RSS 본문 요약 (500~600자) ─────────────────────────────────────────────────
function getDesc(item) {
  const raw = item.desc || item.title;
  if (raw.length <= 1000) return raw;
  const cut = raw.slice(0, 120);
  const last = Math.max(cut.lastIndexOf("다. "), cut.lastIndexOf(". "));
  return last > 800 ? cut.slice(0, last + 1) : cut + "…";
}

// ── Row ──────────────────────────────────────────────────────────────────────
function Row({ item, idx, isLast }) {
  const [open, setOpen] = useState(false);
  const cat = classify(item);
  const desc = getDesc(item);

  return (
    <>
      <tr
        onClick={() => setOpen(o => !o)}
        style={{
          borderBottom: isLast && !open ? "none" : "1px solid #f0ede8",
          cursor: "pointer",
          background: open ? "#fafaf8" : "transparent",
          transition: "background .15s",
          animation: `fi .3s ease ${idx * 0.03}s both`,
        }}
        onMouseEnter={e => { if (!open) e.currentTarget.style.background = "#fdfcfb"; }}
        onMouseLeave={e => { if (!open) e.currentTarget.style.background = "transparent"; }}
      >
        <td style={{ padding: "14px 18px", width: 82, whiteSpace: "nowrap" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: cat.dot, flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: cat.dot, fontWeight: 600, letterSpacing: "0.03em" }}>
              {cat.label}
            </span>
          </span>
        </td>
        <td style={{ padding: "14px 10px", width: 52, fontSize: 11, color: "#b0a89a",
          fontFamily: "'IBM Plex Mono', monospace", whiteSpace: "nowrap" }}>
          {fmtDate(item.date)}
        </td>
        <td style={{ padding: "14px 18px", fontSize: 13.5, color: "#1a1612",
          fontWeight: 500, lineHeight: 1.5 }}>
          {item.title}
        </td>
        <td style={{ padding: "14px 18px", width: 130, fontSize: 11,
          color: "#c0b8ae", whiteSpace: "nowrap", textAlign: "right" }}>
          {item.source}
        </td>
        <td style={{ padding: "14px 16px", width: 24, fontSize: 9,
          color: "#d0c8be", textAlign: "center" }}>
          {open ? "▲" : "▼"}
        </td>
      </tr>

      {open && (
        <tr style={{ borderBottom: isLast ? "none" : "1px solid #f0ede8" }}>
          <td colSpan={5} style={{ padding: 0 }}>
            <div style={{
              padding: "24px 24px 24px 82px",
              background: "#faf9f6",
              borderLeft: `2px solid ${cat.dot}`,
              animation: "ed .2s ease",
            }}>
              <p style={{ margin: "0 0 20px", fontSize: 14, lineHeight: 1.9,
                color: "#3a3430", fontFamily: "'Noto Serif KR', Georgia, serif",
                wordBreak: "keep-all" }}>
                {desc || "본문 내용을 불러올 수 없어요."}
              </p>
              <a href={item.link} target="_blank" rel="noopener noreferrer"
                style={{ display: "inline-flex", alignItems: "center", gap: 5,
                  fontSize: 10.5, fontWeight: 700, color: cat.dot,
                  textDecoration: "none", letterSpacing: "0.08em",
                  textTransform: "uppercase", padding: "5px 14px",
                  border: `1px solid ${cat.dot}55`, borderRadius: 3,
                  fontFamily: "'IBM Plex Mono', monospace", background: "#fff" }}>
                원문 보기 →
              </a>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ── Section ──────────────────────────────────────────────────────────────────
function Section({ label, no, items, loading }) {
  return (
    <div style={{ marginBottom: 44 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16,
        marginBottom: 16, paddingBottom: 14, borderBottom: "2px solid #1a1612" }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: "#c0b8ae",
          fontFamily: "'IBM Plex Mono', monospace", letterSpacing: "0.14em" }}>
          {String(no).padStart(2, "0")}
        </span>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700,
          color: "#1a1612", letterSpacing: "-0.01em" }}>{label}</h2>
        {!loading && (
          <span style={{ marginLeft: "auto", fontSize: 11, color: "#b0a89a",
            fontFamily: "'IBM Plex Mono', monospace" }}>
            {items.length} articles
          </span>
        )}
      </div>
      <div style={{ border: "1px solid #ede9e3", borderRadius: 8, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#faf9f6", borderBottom: "1px solid #ede9e3" }}>
              {[["구분",82],["일자",52],["헤드라인",null],["출처",130],["",24]].map(([h,w]) => (
                <th key={h+w} style={{
                  padding: "9px 18px", fontSize: 10, fontWeight: 700,
                  color: "#c0b8ae", letterSpacing: "0.1em", textTransform: "uppercase",
                  textAlign: h === "출처" ? "right" : "left", width: w || "auto",
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={5} style={{ padding: "48px 0", textAlign: "center", background: "#fff" }}>
                <div style={{ display: "inline-block", width: 20, height: 20,
                  border: "2px solid #e8e3dc", borderTopColor: "#8a7a6a",
                  borderRadius: "50%", animation: "spin .9s linear infinite" }} />
                <p style={{ marginTop: 12, color: "#c0b8ae", fontSize: 11,
                  fontFamily: "'IBM Plex Mono', monospace" }}>fetching…</p>
              </td></tr>
            )}
            {!loading && items.length === 0 && (
              <tr><td colSpan={5} style={{ padding: "44px 0", textAlign: "center",
                color: "#c0b8ae", fontSize: 11, background: "#fff",
                fontFamily: "'IBM Plex Mono', monospace" }}>
                no results for today
              </td></tr>
            )}
            {!loading && items.map((item, i) => (
              <Row key={item.link + i} item={item} idx={i} isLast={i === items.length - 1} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [domestic,  setDomestic]  = useState([]);
  const [global,    setGlobal]    = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [updated,   setUpdated]   = useState(null);
  const [fromCache, setFromCache] = useState(false);

  const load = useCallback(async (force = false) => {
    setLoading(true);
    if (!force) {
      const c = loadCache();
      if (c) {
        setDomestic(c.domestic); setGlobal(c.global);
        setUpdated(new Date(c.fetchedAt)); setFromCache(true);
        setLoading(false); return;
      }
    }
    setFromCache(false);
    const data = await fetchAll();
    const fetchedAt = new Date().toISOString();
    saveCache({ ...data, fetchedAt });
    setDomestic(data.domestic); setGlobal(data.global);
    setUpdated(new Date(fetchedAt)); setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div style={{ minHeight: "100vh", background: "#ffffff",
      fontFamily: "'Noto Sans KR', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&family=Noto+Sans+KR:wght@400;500;600;700&family=Noto+Serif+KR:wght@400;700&display=swap');
        @keyframes fi   { from{opacity:0;transform:translateY(5px)} to{opacity:1;transform:none} }
        @keyframes ed   { from{opacity:0;transform:translateY(-3px)} to{opacity:1;transform:none} }
        @keyframes spin { to{transform:rotate(360deg)} }
        * { box-sizing:border-box; }
      `}</style>

      {/* 헤더 */}
      <div style={{ borderBottom: "1px solid #ede9e3", background: "#fff" }}>
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "24px 40px" }}>
          <div style={{ display: "flex", justifyContent: "space-between",
            alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
            <span style={{ fontSize: 10, color: "#c0b8ae",
              fontFamily: "'IBM Plex Mono', monospace",
              letterSpacing: "0.16em", textTransform: "uppercase" }}>
              Cell &amp; Gene Therapy · Daily Intelligence
            </span>
            {updated && (
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <span style={{ fontSize: 11, color: "#b0a89a",
                  fontFamily: "'IBM Plex Mono', monospace" }}>
                  {updated.toLocaleDateString("ko-KR",
                    { year: "numeric", month: "long", day: "numeric" })}
                  {fromCache && <span style={{ marginLeft: 10, color: "#c8d4c0" }}>· cached</span>}
                </span>
                <button onClick={() => load(true)} disabled={loading}
                  style={{ background: "#fff", color: "#6b5f54",
                    border: "1px solid #e0dbd4", borderRadius: 4,
                    padding: "5px 14px", fontSize: 10.5, fontWeight: 600,
                    fontFamily: "'IBM Plex Mono', monospace", letterSpacing: "0.06em",
                    cursor: loading ? "not-allowed" : "pointer",
                    opacity: loading ? 0.4 : 1, transition: "all .2s" }}
                  onMouseEnter={e => { e.currentTarget.style.background = "#faf9f6"; e.currentTarget.style.borderColor = "#b0a89a"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.borderColor = "#e0dbd4"; }}>
                  ↻ refresh
                </button>
              </div>
            )}
          </div>
          <div style={{ borderLeft: "3px solid #1a1612", paddingLeft: 18 }}>
            <h1 style={{ margin: "0 0 4px", fontSize: 28, fontWeight: 800,
              color: "#1a1612", letterSpacing: "-0.03em",
              fontFamily: "'Noto Serif KR', Georgia, serif", lineHeight: 1.2 }}>
              CGT 뉴스 브리핑
            </h1>
            <p style={{ margin: 0, fontSize: 12, color: "#b0a89a",
              fontFamily: "'IBM Plex Mono', monospace" }}>
              국내 바이오 전문지 7개 매체 · CGT 키워드 자동 필터 · 헤드라인 클릭 시 본문 요약
            </p>
          </div>
        </div>
      </div>

      {/* 본문 */}
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "40px 40px 32px" }}>
        <Section label="국내 뉴스" no={1} items={domestic} loading={loading} />
        <Section label="해외 뉴스" no={2} items={global}   loading={loading} />

        {/* 하단 범례 */}
        <div style={{ marginTop: 32, paddingTop: 24, borderTop: "1px solid #ede9e3" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 24,
            alignItems: "center", marginBottom: 14 }}>
            <span style={{ fontSize: 10, color: "#c0b8ae",
              fontFamily: "'IBM Plex Mono', monospace",
              letterSpacing: "0.12em", textTransform: "uppercase" }}>category</span>
            {CATS.map(c => (
              <span key={c.label} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: c.dot }} />
                <span style={{ fontSize: 11, color: "#8a7a6a" }}>{c.label}</span>
              </span>
            ))}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
            <span style={{ fontSize: 10, color: "#c0b8ae",
              fontFamily: "'IBM Plex Mono', monospace",
              letterSpacing: "0.12em", textTransform: "uppercase", marginRight: 6 }}>sources</span>
            {SOURCES.map(s => (
              <span key={s.name} style={{ fontSize: 11, color: "#b0a89a",
                padding: "2px 9px", border: "1px solid #ede9e3",
                borderRadius: 3, background: "#faf9f6" }}>{s.name}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
