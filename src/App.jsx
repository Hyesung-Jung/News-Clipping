import { useState, useEffect, useCallback } from "react";

// ── 네이버 뉴스 검색 쿼리 ─────────────────────────────────────────────────────
const NAVER_QUERIES = [
  "세포치료 유전자치료",
  "CAR-T CRISPR",
  "줄기세포 치료제",
  "첨단재생의료 첨생법 첨단바이오의약품",
  "큐로셀 알지노믹스 지씨셀",
  "박셀바이오 코오롱생명과학 툴젠",
  "엔케이맥스 이뮨온시아 헬릭스미스",
  "차바이오텍 메디포스트 안트로젠",
  "강스템바이오텍 이엔셀 오름테라퓨틱",
  "노바티스 유전자치료",
  "길리어드 CAR-T",
  "FDA 유전자치료 허가",
  "EMA 세포치료 승인",
  "인텔리아 에디타스 유니큐어",
];

// ── CGT 키워드 ────────────────────────────────────────────────────────────────
const CGT_KW = [
  "세포치료","유전자치료","세포유전자","줄기세포","유전자편집","CAR-T","CRISPR",
  "NK세포","키메릭항원","항원수용체","렌티바이러스","CGT","iPSC","TCR","TIL",
  "항암바이러스","백시니아","조혈모","수지상세포","재생의료","첨생법",
  "첨단바이오의약품","첨단재생의료","전달벡터","바이러스벡터","HSV벡터",
  "수포성표피박리증","근이영양증","혈우병","척수성근위축",
  "gene therapy","cell therapy","gene editing","stem cell","AAV","lentiviral",
  "cell & gene","mRNA therapy","base editing","prime editing",
  "allogeneic","autologous","NK cell","CAR T","CAR-NK",
  "chimeric antigen","adeno-associated","vaccinia","oncolytic",
  "viral vector","HSV vector","plasmid","dystrophy","hemophilia","SMA",
];

// ── 국내 기업·기관 ─────────────────────────────────────────────────────────────
const KOREAN_KW = [
  "지씨셀","GC셀","GC녹십자셀","메디포스트","테고사이언스","바이오솔루션",
  "코아스템","코아스템켐온","파미셀","안트로젠",
  "코오롱","코오롱생명과학","코오롱티슈진",
  "알지노믹스","툴젠","제넥신","헬릭스미스",
  "큐로셀","박셀바이오","엔케이맥스","유틸렉스",
  "이뮨온시아","오름테라퓨틱","오름테라퓨틱스",
  "지아이이노베이션","다안바이오테라퓨틱스","에이비엘바이오",
  "차바이오텍","차바이오그룹","네이처셀",
  "이엔셀","강스템바이오텍","입셀","인투셀",
  "에스티팜","올리패스","셀리버리","삼성바이오","삼성바이오로직스",
  "바이넥스","셀트리온","한미약품","종근당","대웅제약","유한양행",
  "JW중외제약","SK바이오팜","LG화학","보령","동아ST","동아에스티",
  "HK이노엔","진원생명과학","녹십자","GC녹십자",
  "식약처","KFDA","식품의약품안전처","보건복지부","복지부","과기부","범부처",
  "심평원","건강보험심사평가원","건보공단","국민건강보험공단",
  "질병청","질병관리청","국가신약개발사업단","범부처재생의료기술개발사업단",
  "한국법인","한국지사","국내 임상","국내 진출","Korea","코리아",
];

// ── 해외 기업·기관 ─────────────────────────────────────────────────────────────
const GLOBAL_KW = [
  "노바티스","길리어드","블루버드","로슈","아스트라제네카","화이자","얀센","BMS",
  "바이오젠","리제네론","사렙타","스파크","유니큐어","크리스퍼","인텔리아","빔",
  "알로진","페이트","아이오반스","에디타스","버텍스","모더나","레오파마",
  "Novartis","Gilead","Pfizer","Roche","AstraZeneca","Biogen",
  "Regeneron","Sarepta","Spark","UniQure","Intellia","Beam","Bluebird",
  "Allogene","Fate Therapeutics","Iovance","Editas","Vertex","Moderna",
  "Bristol","BMS","Janssen","Bayer","Takeda","Astellas",
  "LEO Pharma","Replicate","Krystal Biotech","Passage Bio",
  "FDA","EMA","NIH","NCI",
];

// ── 카테고리 ──────────────────────────────────────────────────────────────────
const CATS = [
  { label: "임상",       dot: "#2563eb", keys: ["임상","phase","clinical","승인신청","ind ","투약 개시","first-in-human"] },
  { label: "허가",       dot: "#16a34a", keys: ["허가","approved","approval","fda 승인","식약처 허가","breakthrough","rmat","fast track","희귀의약품","품목허가"] },
  { label: "투자",       dot: "#7c3aed", keys: ["투자","유치","funding","series","ipo","억원","million","billion","deal","인수","협약","계약"] },
  { label: "연구",       dot: "#d97706", keys: ["연구","결과","논문","발표","study","data","result","전임상","preclinical","효능","비임상"] },
  { label: "파이프라인", dot: "#dc2626", keys: ["파이프라인","pipeline","candidate","착수","도입","initiates","후보물질"] },
  { label: "제품",       dot: "#0891b2", keys: ["제품","출시","상용화","product","launch","commercial","의료기기","급여","처방","판매"] },
  { label: "특허",       dot: "#be185d", keys: ["특허","patent","지식재산","기술이전","라이선스아웃","license out","독점권"] },
  { label: "규제",       dot: "#b45309", keys: ["규제","가이드라인","정책","법안","고시","지침","regulation","guideline","policy","첨생법"] },
  { label: "기업",       dot: "#6b7280", keys: [] },
];

const CACHE_KEY = "cgt_v18";
const WEEK_MS   = 7 * 24 * 60 * 60 * 1000;
const todayStr  = () => new Date().toISOString().slice(0, 10);
const sleep     = ms => new Promise(r => setTimeout(r, ms));

// ── 유틸 ──────────────────────────────────────────────────────────────────────
const noSp = s => s.replace(/\s+/g, "");

function isCGT(title, desc) {
  const s = `${title} ${desc}`.toLowerCase(), n = noSp(s);
  return CGT_KW.some(k => { const kl = k.toLowerCase(); return s.includes(kl) || n.includes(noSp(kl)); });
}

function region(title, desc) {
  const s = `${title} ${desc}`.toLowerCase(), n = noSp(s);
  const hit = kws => kws.some(k => { const kl = k.toLowerCase(); return s.includes(kl) || n.includes(noSp(kl)); });
  if (hit(KOREAN_KW)) return "domestic";
  if (hit(GLOBAL_KW)) return "global";
  const h = (s.match(/[가-힣]/g) || []).length;
  return h / (n.length || 1) > 0.7 ? "domestic" : "global";
}

function classify(title, desc) {
  const s = `${title} ${desc}`.toLowerCase();
  return CATS.find((c, i) => i < CATS.length - 1 && c.keys.some(k => s.includes(k))) ?? CATS.at(-1);
}

function stripHTML(s) { return s ? s.replace(/<[^>]+>/g, "").replace(/&[^;]+;/g, " ").replace(/\s+/g, " ").trim() : ""; }

function fmtDate(d) {
  if (!d) return "—";
  const dt = new Date(d);
  return isNaN(dt) ? "—" : `${String(dt.getMonth()+1).padStart(2,"0")}.${String(dt.getDate()).padStart(2,"0")}`;
}

const SOURCE_MAP = {
  "biospectator.com":"바이오스펙테이터","hitnews.co.kr":"히트뉴스","medipana.com":"메디파나",
  "yakup.com":"약업신문","biotimes.co.kr":"바이오타임즈","pharmnews.com":"팜뉴스",
  "bosa.co.kr":"의학신문","dailypharm.com":"데일리팜","medigatenews.com":"메디게이트",
  "thebell.co.kr":"더벨","edaily.co.kr":"이데일리","mt.co.kr":"머니투데이",
  "etnews.com":"전자신문","hankyung.com":"한국경제","mk.co.kr":"매일경제",
  "chosun.com":"조선일보","joongang.co.kr":"중앙일보","donga.com":"동아일보",
  "yonhapnews.co.kr":"연합뉴스","newsis.com":"뉴시스","news1.kr":"뉴스1",
};

function srcFromUrl(url) {
  try { const h = new URL(url).hostname.replace("www.",""); return SOURCE_MAP[h] || h.split(".")[0]; }
  catch { return "기타"; }
}

// ── 네이버 뉴스 fetch (순차 실행 + 딜레이 → 429 방지) ────────────────────────
async function fetchNaverQuery(query, log) {
  try {
    const url  = `/api/naver?query=${encodeURIComponent(query)}&display=100&sort=date`;
    const r    = await fetch(url);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const data = await r.json();
    if (!data.items) throw new Error(data.errorMessage || "no items");

    const weekAgo = Date.now() - WEEK_MS;
    const items = data.items.flatMap(it => {
      const title = stripHTML(it.title);
      const desc  = stripHTML(it.description);
      if (!isCGT(title, desc)) return [];
      const t = new Date(it.pubDate).getTime();
      if (!isNaN(t) && t < weekAgo) return [];
      const link = it.originallink || it.link || "#";
      return [{ title, link, date: it.pubDate || "", source: srcFromUrl(link), desc }];
    });

    log(`네이버: ${query.slice(0, 14)}…`, `OK · ${items.length}건`);
    return items;
  } catch (e) {
    log(`네이버: ${query.slice(0, 14)}…`, `fail: ${e.message}`);
    return [];
  }
}

// ── 클러스터링 ────────────────────────────────────────────────────────────────
const SW = new Set(["그리고","하지만","또한","위해","대해","위한","대한","통해","따라","관련","기자","뉴스","속보","단독","오늘","최근","이번","지난","현재","발표","공개","the","and","for","with","from","this","that","will","new","said"]);
const tokenize = t => t.replace(/[^\w가-힣\s]/g," ").split(/\s+/).filter(w=>w.length>=2&&!SW.has(w.toLowerCase())).map(w=>w.toLowerCase());
function isSame(a,b) { const ta=new Set(a.tokens),tb=new Set(b.tokens); let s=0; ta.forEach(x=>{if(tb.has(x))s++;}); if(s>=3)return true; const u=new Set([...ta,...tb]).size; return u>0&&s/u>=0.4; }
function cluster(items) { const cs=[]; for(const it of items){let ok=false;for(const c of cs){if(c.some(x=>isSame(x,it))){c.push(it);ok=true;break;}}if(!ok)cs.push([it]);}return cs; }

// ── 전체 fetch ────────────────────────────────────────────────────────────────
async function fetchAll(log) {
  const allItems = [];
  // 순차 실행 + 300ms 간격 → 429 방지
  for (const query of NAVER_QUERIES) {
    const items = await fetchNaverQuery(query, log);
    allItems.push(...items);
    await sleep(300);
  }

  const deduped = [...new Map(allItems.map(i => [i.link, i])).values()];
  deduped.forEach(it => { it.tokens = tokenize(it.title); });
  log("시스템", `수집 ${allItems.length}건 → 중복 제거 후 ${deduped.length}건`);

  const pickTop = (items, n) =>
    cluster(items)
      .map(c => { const s=[...c].sort((a,b)=>new Date(b.date)-new Date(a.date)); const srcs=new Set(c.map(x=>x.source)); return {...s[0],sourceCount:srcs.size,allSources:[...srcs]}; })
      .sort((a,b) => b.sourceCount!==a.sourceCount ? b.sourceCount-a.sourceCount : new Date(b.date)-new Date(a.date))
      .slice(0,n);

  return {
    domestic: pickTop(deduped.filter(i=>region(i.title,i.desc)==="domestic"), 10),
    global:   pickTop(deduped.filter(i=>region(i.title,i.desc)==="global"),   10),
  };
}

// ── 캐시 ──────────────────────────────────────────────────────────────────────
function loadCache() { try{const r=localStorage.getItem(CACHE_KEY);if(!r)return null;const{date,data}=JSON.parse(r);return date===todayStr()?data:null;}catch{return null;} }
function saveCache(d) { try{localStorage.setItem(CACHE_KEY,JSON.stringify({date:todayStr(),data:d}));}catch{} }

// ── 기사 본문 크롤링 ──────────────────────────────────────────────────────────
async function crawlArticle(url) {
  try {
    const r    = await fetch(`/api/crawl?url=${encodeURIComponent(url)}`);
    const data = await r.json();
    return data.body || null;
  } catch { return null; }
}

// ── Row ───────────────────────────────────────────────────────────────────────
function Row({ item, idx, isLast }) {
  const [open,     setOpen]     = useState(false);
  const [fullText, setFullText] = useState(null);   // 크롤링된 본문
  const [crawling, setCrawling] = useState(false);  // 크롤링 중

  const cat = classify(item.title, item.desc);

  const handleClick = async () => {
    const next = !open;
    setOpen(next);
    // 처음 열 때 본문 크롤링
    if (next && fullText === null && !crawling) {
      setCrawling(true);
      const body = await crawlArticle(item.link);
      setFullText(body ?? "");   // ""이면 실패로 간주
      setCrawling(false);
    }
  };

  // 표시할 텍스트: 크롤링 성공 > 네이버 스니펫
  const displayText = (fullText && fullText.length > 50) ? fullText : (item.desc || "본문을 불러올 수 없어요.");

  return (
    <>
      <tr
        onClick={handleClick}
        style={{ borderBottom: isLast && !open ? "none" : "1px solid #f0ede8", cursor: "pointer", background: open ? "#fafaf8" : "transparent", transition: "background .15s", animation: `fi .3s ease ${idx*.04}s both` }}
        onMouseEnter={e => { if (!open) e.currentTarget.style.background = "#fdfcfb"; }}
        onMouseLeave={e => { e.currentTarget.style.background = open ? "#fafaf8" : "transparent"; }}
      >
        <td style={{ padding: "14px 18px", width: 90, whiteSpace: "nowrap" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: cat.dot, flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: cat.dot, fontWeight: 600, letterSpacing: "0.03em" }}>{cat.label}</span>
          </span>
        </td>
        <td style={{ padding: "14px 12px", width: 68, minWidth: 68, fontSize: 11.5, color: "#b0a89a", fontFamily: "'IBM Plex Mono', monospace", whiteSpace: "nowrap", letterSpacing: "0.04em" }}>
          {fmtDate(item.date)}
        </td>
        <td style={{ padding: "14px 18px", fontSize: 13.5, color: "#1a1612", fontWeight: 500, lineHeight: 1.55 }}>
          {item.title}
        </td>
        <td style={{ padding: "14px 18px", width: 160, fontSize: 11, color: "#c0b8ae", whiteSpace: "nowrap", textAlign: "right" }}>
          <span>{item.source}</span>
          {item.sourceCount > 1 && <span style={{ marginLeft: 6, padding: "1px 6px", background: "#fef3c7", color: "#92400e", borderRadius: 3, fontSize: 9.5, fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace", border: "1px solid #fde68a" }}>+{item.sourceCount - 1}</span>}
        </td>
        <td style={{ padding: "14px 16px", width: 24, fontSize: 9, color: "#d0c8be", textAlign: "center" }}>{open ? "▲" : "▼"}</td>
      </tr>

      {open && (
        <tr style={{ borderBottom: isLast ? "none" : "1px solid #f0ede8" }}>
          <td colSpan={5} style={{ padding: 0 }}>
            <div style={{ padding: "26px 32px 26px 86px", background: "linear-gradient(160deg,#faf9f7 0%,#f5f3ef 100%)", borderLeft: `3px solid ${cat.dot}`, animation: "ed .2s ease" }}>

              {/* 메타 배지 */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
                <span style={{ fontSize: 9.5, fontWeight: 700, color: "#fff", background: cat.dot, letterSpacing: "0.1em", textTransform: "uppercase", padding: "2px 8px", borderRadius: 3, fontFamily: "'IBM Plex Mono', monospace" }}>{cat.label}</span>
                <span style={{ fontSize: 11, color: "#a09890", fontFamily: "'IBM Plex Mono', monospace" }}>{item.source}</span>
                <span style={{ fontSize: 10, color: "#c0b8b0", fontFamily: "'IBM Plex Mono', monospace" }}>{fmtDate(item.date)}</span>
                {item.sourceCount > 1 && <span style={{ fontSize: 10, color: "#92400e", fontFamily: "'IBM Plex Mono', monospace" }}>외 {item.sourceCount - 1}개 매체</span>}
                {/* 크롤링 상태 */}
                {crawling && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 10, color: "#b0a89a", fontFamily: "'IBM Plex Mono', monospace" }}>
                    <span style={{ display: "inline-block", width: 10, height: 10, border: "1.5px solid #e0dbd4", borderTopColor: "#8a7a6a", borderRadius: "50%", animation: "spin .8s linear infinite" }} />
                    본문 로딩 중…
                  </span>
                )}
              </div>

              {/* 본문 */}
              <p style={{ margin: "0 0 24px", fontSize: 14.5, lineHeight: 2.05, color: "#28231f", fontFamily: "'Noto Serif KR', Georgia, serif", wordBreak: "keep-all", letterSpacing: "0.008em", fontWeight: 400, whiteSpace: "pre-line" }}>
                {displayText}
              </p>

              <a href={item.link} target="_blank" rel="noopener noreferrer"
                style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 10.5, fontWeight: 700, color: cat.dot, textDecoration: "none", letterSpacing: "0.09em", textTransform: "uppercase", padding: "6px 16px", border: `1px solid ${cat.dot}55`, borderRadius: 4, fontFamily: "'IBM Plex Mono', monospace", background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                원문 보기 →
              </a>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ── Section ───────────────────────────────────────────────────────────────────
function Section({ label, no, items, loading }) {
  return (
    <div style={{ marginBottom: 44 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16, paddingBottom: 14, borderBottom: "2px solid #1a1612" }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: "#c0b8ae", fontFamily: "'IBM Plex Mono', monospace", letterSpacing: "0.14em" }}>{String(no).padStart(2,"0")}</span>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#1a1612", letterSpacing: "-0.01em" }}>{label}</h2>
        {!loading && <span style={{ marginLeft: "auto", fontSize: 11, color: "#b0a89a", fontFamily: "'IBM Plex Mono', monospace" }}>{items.length} articles</span>}
      </div>
      <div style={{ border: "1px solid #ede9e3", borderRadius: 8, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#faf9f6", borderBottom: "1px solid #ede9e3" }}>
              {[["구분",90],["일자",68],["헤드라인",null],["출처",160],["",24]].map(([h,w])=>(
                <th key={String(h)+String(w)} style={{ padding:"9px 18px",fontSize:10,fontWeight:700,color:"#c0b8ae",letterSpacing:"0.1em",textTransform:"uppercase",textAlign:h==="출처"?"right":"left",width:w||"auto",whiteSpace:"nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={5} style={{ padding:"52px 0",textAlign:"center",background:"#fff" }}>
              <div style={{ display:"inline-block",width:20,height:20,border:"2px solid #e8e3dc",borderTopColor:"#8a7a6a",borderRadius:"50%",animation:"spin .9s linear infinite" }}/>
              <p style={{ marginTop:12,color:"#c0b8ae",fontSize:11,fontFamily:"'IBM Plex Mono',monospace" }}>fetching…</p>
            </td></tr>}
            {!loading && items.length===0 && <tr><td colSpan={5} style={{ padding:"44px 0",textAlign:"center",color:"#c0b8ae",fontSize:11,background:"#fff",fontFamily:"'IBM Plex Mono',monospace" }}>no results found</td></tr>}
            {!loading && items.map((item,i)=><Row key={item.link+i} item={item} idx={i} isLast={i===items.length-1}/>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── 진단 패널 ─────────────────────────────────────────────────────────────────
function DiagPanel({ logs }) {
  const [open,setOpen] = useState(false);
  if(!logs.length) return null;
  return (
    <div style={{ marginBottom:32,border:"1px solid #ede9e3",borderRadius:8,overflow:"hidden" }}>
      <button onClick={()=>setOpen(o=>!o)} style={{ width:"100%",padding:"10px 18px",background:"#faf9f6",border:"none",textAlign:"left",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
        <span style={{ fontSize:10,fontWeight:700,color:"#b0a89a",fontFamily:"'IBM Plex Mono',monospace",letterSpacing:"0.1em",textTransform:"uppercase" }}>fetch diagnostics ({logs.length} events)</span>
        <span style={{ fontSize:9,color:"#c0b8ae" }}>{open?"▲":"▼"}</span>
      </button>
      {open && <div style={{ padding:"12px 18px",background:"#fff",maxHeight:240,overflowY:"auto" }}>
        {logs.map((l,i)=>(
          <div key={i} style={{ display:"flex",gap:12,padding:"4px 0",borderBottom:"1px solid #f5f3ef",fontFamily:"'IBM Plex Mono',monospace",fontSize:10.5 }}>
            <span style={{ color:"#c0b8ae",flexShrink:0,minWidth:180 }}>{l.src}</span>
            <span style={{ color:l.msg.includes("fail")?"#dc2626":l.msg.includes("OK")?"#16a34a":"#6b7280" }}>{l.msg}</span>
          </div>
        ))}
      </div>}
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [domestic, setDomestic] = useState([]);
  const [global,   setGlobal]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [updated,  setUpdated]  = useState(null);
  const [fromCache,setFromCache]= useState(false);
  const [logs,     setLogs]     = useState([]);

  const load = useCallback(async (force=false) => {
    setLoading(true); setLogs([]);
    if(!force){ const c=loadCache(); if(c){setDomestic(c.domestic);setGlobal(c.global);setUpdated(new Date(c.fetchedAt));setFromCache(true);setLoading(false);return;} }
    setFromCache(false);
    const logFn=(src,msg)=>setLogs(p=>[...p,{src,msg}]);
    const data=await fetchAll(logFn);
    const fetchedAt=new Date().toISOString();
    saveCache({...data,fetchedAt});
    setDomestic(data.domestic);setGlobal(data.global);
    setUpdated(new Date(fetchedAt));setLoading(false);
  },[]);

  useEffect(()=>{load();},[load]);

  return (
    <div style={{ minHeight:"100vh",background:"#fff",fontFamily:"'Noto Sans KR',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&family=Noto+Sans+KR:wght@400;500;600;700&family=Noto+Serif+KR:wght@400;500;700&display=swap');
        @keyframes fi{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}
        @keyframes ed{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}
        @keyframes spin{to{transform:rotate(360deg)}}
        *{box-sizing:border-box;}
        a:hover{opacity:.75;transition:opacity .15s;}
      `}</style>

      <div style={{ borderBottom:"1px solid #ede9e3",background:"#fff" }}>
        <div style={{ maxWidth:960,margin:"0 auto",padding:"24px 40px" }}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,flexWrap:"wrap",gap:10 }}>
            <span style={{ fontSize:10,color:"#c0b8ae",fontFamily:"'IBM Plex Mono',monospace",letterSpacing:"0.16em",textTransform:"uppercase" }}>Cell &amp; Gene Therapy · Daily Intelligence</span>
            {updated && (
              <div style={{ display:"flex",alignItems:"center",gap:16 }}>
                <span style={{ fontSize:11,color:"#b0a89a",fontFamily:"'IBM Plex Mono',monospace" }}>
                  {updated.toLocaleDateString("ko-KR",{year:"numeric",month:"long",day:"numeric"})}
                  {fromCache && <span style={{ marginLeft:10,color:"#c8d4c0" }}>· cached</span>}
                </span>
                <button onClick={()=>load(true)} disabled={loading}
                  style={{ background:"#fff",color:"#6b5f54",border:"1px solid #e0dbd4",borderRadius:4,padding:"5px 14px",fontSize:10.5,fontWeight:600,fontFamily:"'IBM Plex Mono',monospace",letterSpacing:"0.06em",cursor:loading?"not-allowed":"pointer",opacity:loading?0.4:1,transition:"all .2s" }}
                  onMouseEnter={e=>{e.currentTarget.style.background="#faf9f6";e.currentTarget.style.borderColor="#b0a89a";}}
                  onMouseLeave={e=>{e.currentTarget.style.background="#fff";e.currentTarget.style.borderColor="#e0dbd4";}}>
                  ↻ refresh
                </button>
              </div>
            )}
          </div>
          <div style={{ borderLeft:"3px solid #1a1612",paddingLeft:18 }}>
            <h1 style={{ margin:"0 0 4px",fontSize:28,fontWeight:800,color:"#1a1612",letterSpacing:"-0.03em",fontFamily:"'Noto Serif KR',Georgia,serif",lineHeight:1.2 }}>CGT 뉴스 브리핑</h1>
            <p style={{ margin:0,fontSize:12,color:"#b0a89a",fontFamily:"'IBM Plex Mono',monospace" }}>최근 7일 · 네이버 뉴스 검색 · 국내·해외 자동 분류</p>
          </div>
        </div>
      </div>

      <div style={{ maxWidth:960,margin:"0 auto",padding:"40px 40px 32px" }}>
        <DiagPanel logs={logs}/>
        <Section label="국내 뉴스" no={1} items={domestic} loading={loading}/>
        <Section label="해외 뉴스" no={2} items={global}   loading={loading}/>
        <div style={{ marginTop:32,paddingTop:24,borderTop:"1px solid #ede9e3" }}>
          <div style={{ display:"flex",flexWrap:"wrap",gap:20,alignItems:"center" }}>
            <span style={{ fontSize:10,color:"#c0b8ae",fontFamily:"'IBM Plex Mono',monospace",letterSpacing:"0.12em",textTransform:"uppercase" }}>category</span>
            {CATS.map(c=>(
              <span key={c.label} style={{ display:"inline-flex",alignItems:"center",gap:6 }}>
                <span style={{ width:5,height:5,borderRadius:"50%",background:c.dot }}/>
                <span style={{ fontSize:11,color:"#8a7a6a" }}>{c.label}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
