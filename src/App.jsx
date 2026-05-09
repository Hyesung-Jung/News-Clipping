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
  "세포치료","유전자치료","세포유전자","줄기세포","유전자편집","CAR-T","CRISPR",
  "NK세포","키메릭","항원수용체","아데노","렌티바이러스","CGT","iPSC","TCR","TIL",
  "항암 바이러스","백시니아","TG-C",
  "gene therapy","cell therapy","gene editing","stem cell","AAV","lentiviral",
  "cell & gene","mRNA","base editing","allogeneic","autologous","NK cell",
  "chimeric antigen","adeno-associated","vaccinia","oncolytic",
];
const KOREAN_KW = [
  "코오롱","셀트리온","녹십자","GC셀","지씨셀","메디포스트","차바이오텍",
  "제넥신","툴젠","헬릭스미스","엔케이맥스","박셀바이오","큐로셀","안트로젠",
  "파미셀","강스템바이오텍","유틸렉스","이엔셀","인투셀","입셀","네오이뮨텍",
  "삼성바이오","한미약품","종근당","대웅제약","유한양행","JW중외제약",
  "SK바이오팜","LG화학","보령","동아ST","HK이노엔","에스티팜",
  "식약처","KFDA","식품의약품안전처","심평원","건강보험심사평가원",
  "건보공단","국민건강보험공단","한국법인","한국지사","국내 임상","국내 진출",
];
const GLOBAL_KW = [
  "노바티스","길리어드","블루버드","로슈","아스트라제네카","화이자","얀센","BMS",
  "바이오젠","리제네론","사렙타","스파크","유니큐어","크리스퍼","인텔리아","빔",
  "알로진","페이트","아이오반스","에디타스","버텍스",
  "Novartis","Gilead","Pfizer","Roche","AstraZeneca","Biogen",
  "Regeneron","Sarepta","Spark","UniQure","Intellia","Beam","Bluebird",
  "Allogene","Fate Therapeutics","Iovance","Editas","Vertex",
  "FDA","EMA","NIH","NCI",
];
const CATS = [
  { label: "임상",       dot: "#2563eb", keys: ["임상","phase","clinical","승인신청","ind "] },
  { label: "허가",       dot: "#16a34a", keys: ["허가","approved","approval","fda 승인","식약처 허가","breakthrough"] },
  { label: "투자",       dot: "#7c3aed", keys: ["투자","유치","funding","series","ipo","억원","million","billion","deal","인수"] },
  { label: "연구",       dot: "#d97706", keys: ["연구","결과","논문","발표","study","data","result","전임상","preclinical"] },
  { label: "파이프라인", dot: "#dc2626", keys: ["파이프라인","pipeline","candidate","착수","도입","initiates"] },
  { label: "제품",       dot: "#0891b2", keys: ["제품","출시","상용화","product","launch","commercial","의료기기","device","급여"] },
  { label: "특허",       dot: "#be185d", keys: ["특허","patent","지식재산","기술이전","라이선스아웃","license out","독점권"] },
  { label: "규제",       dot: "#b45309", keys: ["규제","가이드라인","정책","법안","고시","지침","regulation","guideline","policy"] },
  { label: "기업",       dot: "#6b7280", keys: [] },
];

const CACHE_KEY = "cgt_v11";
const todayStr  = () => new Date().toISOString().slice(0, 10);

// ── 유틸 ──────────────────────────────────────────────────────────────────────
function isCGT(t, d) {
  const s = `${t} ${d}`.toLowerCase();
  return CGT_KW.some(k => s.includes(k.toLowerCase()));
}
function region(t, d) {
  const s = `${t} ${d}`.toLowerCase();
  if (KOREAN_KW.some(k => s.includes(k.toLowerCase()))) return "domestic";
  if (GLOBAL_KW.some(k => s.includes(k.toLowerCase()))) return "global";
  const h = (s.match(/[가-힣]/g) || []).length;
  return h / (s.replace(/\s/g,"").length || 1) > 0.7 ? "domestic" : "global";
}
function classify(t, d) {
  const s = `${t} ${d}`.toLowerCase();
  return CATS.find((c, i) => i < CATS.length - 1 && c.keys.some(k => s.includes(k))) ?? CATS.at(-1);
}
function stripHTML(s) {
  return s ? s.replace(/<[^>]+>/g,"").replace(/&[^;]+;/g," ").replace(/\s+/g," ").trim() : "";
}
function fmtDate(d) {
  if (!d) return "—";
  const dt = new Date(d);
  return isNaN(dt) ? "—" : `${String(dt.getMonth()+1).padStart(2,"0")}.${String(dt.getDate()).padStart(2,"0")}`;
}
function getDesc(item) {
  const raw = item.desc || item.title;
  if (raw.length <= 1000) return raw;
  const cut = raw.slice(0,1100);
  const last = Math.max(cut.lastIndexOf("다. "), cut.lastIndexOf(". "));
  return last > 800 ? cut.slice(0, last+1) : cut+"…";
}

// ── XML 파싱 ──────────────────────────────────────────────────────────────────
function parseXML(text, srcName) {
  const xml = new DOMParser().parseFromString(text, "text/xml");
  if (xml.querySelector("parsererror")) throw new Error("parseerror");
  return [...xml.querySelectorAll("item")].flatMap(el => {
    const g = tag => {
      const n = el.querySelector(tag) || el.getElementsByTagNameNS("*", tag.split(":").pop())[0];
      return n?.textContent?.trim() ?? "";
    };
    const title = g("title"), desc = stripHTML(g("description") || g("encoded") || "");
    const link  = g("link") || g("guid") || "#";
    const date  = g("pubDate") || g("date") || g("updated") || "";
    if (!isCGT(title, desc)) return [];
    return [{ title, link, date, source: srcName, desc }];
  });
}

// ── rss2json 파싱 ─────────────────────────────────────────────────────────────
function parseRss2json(json, srcName) {
  if (json.status !== "ok") return [];
  return (json.items ?? []).flatMap(it => {
    const title = (it.title ?? "").trim();
    const desc  = stripHTML(it.description ?? it.content ?? "");
    if (!isCGT(title, desc)) return [];
    return [{ title, link: it.link ?? "#", date: it.pubDate ?? "", source: srcName, desc }];
  });
}

// ── 프록시 전략 ───────────────────────────────────────────────────────────────
// 1) allorigins (JSON wrap) — 가장 안정적
// 2) corsproxy.io
// 3) codetabs
// ※ 셋 모두 Promise.any로 병렬 시도 → 첫 성공 사용
// ※ 전부 실패 → rss2json (무료 10개, 최소 보장)

async function tryProxy(url) {
  const ok = text => typeof text === "string" && text.includes("<item");

  const via = async (fetchPromise) => {
    const text = await fetchPromise;
    if (!ok(text)) throw new Error("no items");
    return text;
  };

  return Promise.any([
    via(
      fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`, { cache:"no-store" })
        .then(r => { if (!r.ok) throw new Error(); return r.json(); })
        .then(j => j.contents ?? "")
    ),
    via(
      fetch(`https://corsproxy.io/?${encodeURIComponent(url)}`, { cache:"no-store" })
        .then(r => { if (!r.ok) throw new Error(); return r.text(); })
    ),
    via(
      fetch(`https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`, { cache:"no-store" })
        .then(r => { if (!r.ok) throw new Error(); return r.text(); })
    ),
  ]);
}

async function fetchSource(src, log) {
  // --- 경로 1: 프록시 직접 XML ---
  try {
    const text  = await tryProxy(src.url);
    const items = parseXML(text, src.name);
    log(src.name, `proxy OK · ${items.length}건`);
    return items;
  } catch (e) {
    log(src.name, `proxy fail (${e.message}) → rss2json`);
  }
  // --- 경로 2: rss2json 폴백 ---
  try {
    const r    = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(src.url)}`, { cache:"no-store" });
    const json = await r.json();
    const items = parseRss2json(json, src.name);
    log(src.name, `rss2json OK · ${items.length}건`);
    return items;
  } catch (e2) {
    log(src.name, `rss2json also fail: ${e2.message}`);
    return [];
  }
}

// ── 클러스터링 ────────────────────────────────────────────────────────────────
const SW = new Set(["그리고","하지만","또한","위해","대해","위한","대한","통해","따라","관련","기자","뉴스","속보","단독","오늘","최근","이번","지난","현재","발표","공개","the","and","for","with","from","this","that","will","new","said"]);
function tokenize(t) { return t.replace(/[^\w가-힣\s]/g," ").split(/\s+/).filter(w=>w.length>=2&&!SW.has(w.toLowerCase())).map(w=>w.toLowerCase()); }
function isSame(a,b) { const ta=new Set(a.tokens),tb=new Set(b.tokens); let s=0; ta.forEach(x=>{if(tb.has(x))s++;}); if(s>=3)return true; const u=new Set([...ta,...tb]).size; return u>0&&s/u>=0.4; }
function cluster(items) { const cs=[]; for(const it of items){let ok=false;for(const c of cs){if(c.some(x=>isSame(x,it))){c.push(it);ok=true;break;}}if(!ok)cs.push([it]);} return cs; }

async function fetchAll(log) {
  const results = await Promise.allSettled(SOURCES.map(s => fetchSource(s, log)));
  const all = results.flatMap(r => r.status === "fulfilled" ? r.value : []);

  const weekAgo = Date.now() - 7*24*60*60*1000;
  const recent  = all.filter(it => { const t=new Date(it.date).getTime(); return !isNaN(t)&&t>=weekAgo; });
  const noDate  = all.filter(it => isNaN(new Date(it.date).getTime())); // 날짜 파싱 실패분도 포함
  const pool    = [...recent, ...noDate];

  log("시스템", `전체 ${all.length}건 · 7일 내 ${recent.length}건 · 날짜 미상 ${noDate.length}건`);

  pool.forEach(it => { it.tokens = tokenize(it.title); });
  const pickTop = (items, n) =>
    cluster(items)
      .map(c => { const s=[...c].sort((a,b)=>new Date(b.date)-new Date(a.date)); const srcs=new Set(c.map(x=>x.source)); return {...s[0], sourceCount:srcs.size, allSources:[...srcs]}; })
      .sort((a,b) => b.sourceCount!==a.sourceCount ? b.sourceCount-a.sourceCount : new Date(b.date)-new Date(a.date))
      .slice(0,n);

  return {
    domestic: pickTop(pool.filter(i=>region(i.title,i.desc)==="domestic"), 10),
    global:   pickTop(pool.filter(i=>region(i.title,i.desc)==="global"),   10),
  };
}

// ── 캐시 ──────────────────────────────────────────────────────────────────────
function loadCache() { try { const r=localStorage.getItem(CACHE_KEY); if(!r)return null; const {date,data}=JSON.parse(r); return date===todayStr()?data:null; } catch{return null;} }
function saveCache(d) { try{localStorage.setItem(CACHE_KEY,JSON.stringify({date:todayStr(),data:d}));}catch{} }

// ── Row ───────────────────────────────────────────────────────────────────────
function Row({ item, idx, isLast }) {
  const [open,setOpen] = useState(false);
  const cat  = classify(item.title, item.desc);
  const desc = getDesc(item);
  return (
    <>
      <tr onClick={()=>setOpen(o=>!o)} style={{ borderBottom:isLast&&!open?"none":"1px solid #f0ede8", cursor:"pointer", background:open?"#fafaf8":"transparent", transition:"background .15s", animation:`fi .3s ease ${idx*.04}s both` }}
        onMouseEnter={e=>{if(!open)e.currentTarget.style.background="#fdfcfb";}}
        onMouseLeave={e=>{e.currentTarget.style.background=open?"#fafaf8":"transparent";}}>
        <td style={{padding:"14px 18px",width:90,whiteSpace:"nowrap"}}>
          <span style={{display:"inline-flex",alignItems:"center",gap:6}}>
            <span style={{width:5,height:5,borderRadius:"50%",background:cat.dot,flexShrink:0}}/>
            <span style={{fontSize:11,color:cat.dot,fontWeight:600,letterSpacing:"0.03em"}}>{cat.label}</span>
          </span>
        </td>
        <td style={{padding:"14px 12px",width:68,minWidth:68,fontSize:11.5,color:"#b0a89a",fontFamily:"'IBM Plex Mono',monospace",whiteSpace:"nowrap",letterSpacing:"0.04em"}}>{fmtDate(item.date)}</td>
        <td style={{padding:"14px 18px",fontSize:13.5,color:"#1a1612",fontWeight:500,lineHeight:1.55}}>{item.title}</td>
        <td style={{padding:"14px 18px",width:150,fontSize:11,color:"#c0b8ae",whiteSpace:"nowrap",textAlign:"right"}}>
          <span>{item.source}</span>
          {item.sourceCount>1&&<span style={{marginLeft:6,padding:"1px 6px",background:"#fef3c7",color:"#92400e",borderRadius:3,fontSize:9.5,fontWeight:700,fontFamily:"'IBM Plex Mono',monospace",border:"1px solid #fde68a"}}>+{item.sourceCount-1}</span>}
        </td>
        <td style={{padding:"14px 16px",width:24,fontSize:9,color:"#d0c8be",textAlign:"center"}}>{open?"▲":"▼"}</td>
      </tr>
      {open&&(
        <tr style={{borderBottom:isLast?"none":"1px solid #f0ede8"}}>
          <td colSpan={5} style={{padding:0}}>
            <div style={{padding:"26px 32px 26px 86px",background:"linear-gradient(160deg,#faf9f7 0%,#f5f3ef 100%)",borderLeft:`3px solid ${cat.dot}`,animation:"ed .2s ease"}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:18}}>
                <span style={{fontSize:9.5,fontWeight:700,color:"#fff",background:cat.dot,letterSpacing:"0.1em",textTransform:"uppercase",padding:"2px 8px",borderRadius:3,fontFamily:"'IBM Plex Mono',monospace"}}>{cat.label}</span>
                <span style={{fontSize:11,color:"#a09890",fontFamily:"'IBM Plex Mono',monospace"}}>{item.source}</span>
                <span style={{fontSize:10,color:"#c0b8b0",fontFamily:"'IBM Plex Mono',monospace"}}>{fmtDate(item.date)}</span>
                {item.sourceCount>1&&<span style={{fontSize:10,color:"#92400e",fontFamily:"'IBM Plex Mono',monospace"}}>외 {item.sourceCount-1}개 매체</span>}
              </div>
              <p style={{margin:"0 0 24px",fontSize:14.5,lineHeight:2.05,color:"#28231f",fontFamily:"'Noto Serif KR',Georgia,serif",wordBreak:"keep-all",letterSpacing:"0.008em",fontWeight:400}}>
                {desc||"본문을 불러올 수 없어요."}
              </p>
              <a href={item.link} target="_blank" rel="noopener noreferrer"
                style={{display:"inline-flex",alignItems:"center",gap:6,fontSize:10.5,fontWeight:700,color:cat.dot,textDecoration:"none",letterSpacing:"0.09em",textTransform:"uppercase",padding:"6px 16px",border:`1px solid ${cat.dot}55`,borderRadius:4,fontFamily:"'IBM Plex Mono',monospace",background:"#fff",boxShadow:"0 1px 4px rgba(0,0,0,0.06)"}}>
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
    <div style={{marginBottom:44}}>
      <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:16,paddingBottom:14,borderBottom:"2px solid #1a1612"}}>
        <span style={{fontSize:10,fontWeight:700,color:"#c0b8ae",fontFamily:"'IBM Plex Mono',monospace",letterSpacing:"0.14em"}}>{String(no).padStart(2,"0")}</span>
        <h2 style={{margin:0,fontSize:16,fontWeight:700,color:"#1a1612",letterSpacing:"-0.01em"}}>{label}</h2>
        {!loading&&<span style={{marginLeft:"auto",fontSize:11,color:"#b0a89a",fontFamily:"'IBM Plex Mono',monospace"}}>{items.length} articles</span>}
      </div>
      <div style={{border:"1px solid #ede9e3",borderRadius:8,overflow:"hidden"}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead>
            <tr style={{background:"#faf9f6",borderBottom:"1px solid #ede9e3"}}>
              {[["구분",90],["일자",68],["헤드라인",null],["출처",150],["",24]].map(([h,w])=>(
                <th key={String(h)+String(w)} style={{padding:"9px 18px",fontSize:10,fontWeight:700,color:"#c0b8ae",letterSpacing:"0.1em",textTransform:"uppercase",textAlign:h==="출처"?"right":"left",width:w||"auto",whiteSpace:"nowrap"}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading&&<tr><td colSpan={5} style={{padding:"52px 0",textAlign:"center",background:"#fff"}}>
              <div style={{display:"inline-block",width:20,height:20,border:"2px solid #e8e3dc",borderTopColor:"#8a7a6a",borderRadius:"50%",animation:"spin .9s linear infinite"}}/>
              <p style={{marginTop:12,color:"#c0b8ae",fontSize:11,fontFamily:"'IBM Plex Mono',monospace"}}>fetching…</p>
            </td></tr>}
            {!loading&&items.length===0&&<tr><td colSpan={5} style={{padding:"44px 0",textAlign:"center",color:"#c0b8ae",fontSize:11,background:"#fff",fontFamily:"'IBM Plex Mono',monospace"}}>no results found</td></tr>}
            {!loading&&items.map((item,i)=><Row key={item.link+i} item={item} idx={i} isLast={i===items.length-1}/>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── DiagPanel ─────────────────────────────────────────────────────────────────
function DiagPanel({ logs }) {
  const [open, setOpen] = useState(false);
  if (!logs.length) return null;
  return (
    <div style={{marginBottom:32,border:"1px solid #ede9e3",borderRadius:8,overflow:"hidden"}}>
      <button onClick={()=>setOpen(o=>!o)}
        style={{width:"100%",padding:"10px 18px",background:"#faf9f6",border:"none",textAlign:"left",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontSize:10,fontWeight:700,color:"#b0a89a",fontFamily:"'IBM Plex Mono',monospace",letterSpacing:"0.1em",textTransform:"uppercase"}}>
          fetch diagnostics ({logs.length} events)
        </span>
        <span style={{fontSize:9,color:"#c0b8ae"}}>{open?"▲":"▼"}</span>
      </button>
      {open&&(
        <div style={{padding:"12px 18px",background:"#fff",maxHeight:260,overflowY:"auto"}}>
          {logs.map((l,i)=>(
            <div key={i} style={{display:"flex",gap:12,padding:"4px 0",borderBottom:"1px solid #f5f3ef",fontFamily:"'IBM Plex Mono',monospace",fontSize:10.5}}>
              <span style={{color:"#c0b8ae",flexShrink:0,minWidth:140}}>{l.src}</span>
              <span style={{color: l.msg.includes("fail")?"#dc2626": l.msg.includes("OK")?"#16a34a":"#6b7280"}}>{l.msg}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [domestic,  setDomestic]  = useState([]);
  const [global,    setGlobal]    = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [updated,   setUpdated]   = useState(null);
  const [fromCache, setFromCache] = useState(false);
  const [logs,      setLogs]      = useState([]);

  const load = useCallback(async (force=false) => {
    setLoading(true);
    setLogs([]);
    if (!force) {
      const c = loadCache();
      if (c) {
        setDomestic(c.domestic); setGlobal(c.global);
        setUpdated(new Date(c.fetchedAt)); setFromCache(true);
        setLoading(false); return;
      }
    }
    setFromCache(false);
    const logFn = (src, msg) => setLogs(prev => [...prev, { src, msg }]);
    const data = await fetchAll(logFn);
    const fetchedAt = new Date().toISOString();
    saveCache({ ...data, fetchedAt });
    setDomestic(data.domestic); setGlobal(data.global);
    setUpdated(new Date(fetchedAt)); setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div style={{minHeight:"100vh",background:"#ffffff",fontFamily:"'Noto Sans KR',sans-serif"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&family=Noto+Sans+KR:wght@400;500;600;700&family=Noto+Serif+KR:wght@400;500;700&display=swap');
        @keyframes fi   { from{opacity:0;transform:translateY(5px)} to{opacity:1;transform:none} }
        @keyframes ed   { from{opacity:0;transform:translateY(-4px)} to{opacity:1;transform:none} }
        @keyframes spin { to{transform:rotate(360deg)} }
        * { box-sizing:border-box; }
        a:hover { opacity:.75; transition:opacity .15s; }
      `}</style>

      {/* 헤더 */}
      <div style={{borderBottom:"1px solid #ede9e3",background:"#fff"}}>
        <div style={{maxWidth:960,margin:"0 auto",padding:"24px 40px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,flexWrap:"wrap",gap:10}}>
            <span style={{fontSize:10,color:"#c0b8ae",fontFamily:"'IBM Plex Mono',monospace",letterSpacing:"0.16em",textTransform:"uppercase"}}>
              Cell &amp; Gene Therapy · Daily Intelligence
            </span>
            {updated&&(
              <div style={{display:"flex",alignItems:"center",gap:16}}>
                <span style={{fontSize:11,color:"#b0a89a",fontFamily:"'IBM Plex Mono',monospace"}}>
                  {updated.toLocaleDateString("ko-KR",{year:"numeric",month:"long",day:"numeric"})}
                  {fromCache&&<span style={{marginLeft:10,color:"#c8d4c0"}}>· cached</span>}
                </span>
                <button onClick={()=>load(true)} disabled={loading}
                  style={{background:"#fff",color:"#6b5f54",border:"1px solid #e0dbd4",borderRadius:4,padding:"5px 14px",fontSize:10.5,fontWeight:600,fontFamily:"'IBM Plex Mono',monospace",letterSpacing:"0.06em",cursor:loading?"not-allowed":"pointer",opacity:loading?0.4:1,transition:"all .2s"}}
                  onMouseEnter={e=>{e.currentTarget.style.background="#faf9f6";e.currentTarget.style.borderColor="#b0a89a";}}
                  onMouseLeave={e=>{e.currentTarget.style.background="#fff";e.currentTarget.style.borderColor="#e0dbd4";}}>
                  ↻ refresh
                </button>
              </div>
            )}
          </div>
          <div style={{borderLeft:"3px solid #1a1612",paddingLeft:18}}>
            <h1 style={{margin:"0 0 4px",fontSize:28,fontWeight:800,color:"#1a1612",letterSpacing:"-0.03em",fontFamily:"'Noto Serif KR',Georgia,serif",lineHeight:1.2}}>
              CGT 뉴스 브리핑
            </h1>
            <p style={{margin:0,fontSize:12,color:"#b0a89a",fontFamily:"'IBM Plex Mono',monospace"}}>
              최근 7일 · 이슈 파급력 순 Top 10 · 국내·해외 자동 분류
            </p>
          </div>
        </div>
      </div>

      {/* 본문 */}
      <div style={{maxWidth:960,margin:"0 auto",padding:"40px 40px 32px"}}>
        <DiagPanel logs={logs}/>
        <Section label="국내 뉴스" no={1} items={domestic} loading={loading}/>
        <Section label="해외 뉴스" no={2} items={global}   loading={loading}/>

        {/* 범례 */}
        <div style={{marginTop:32,paddingTop:24,borderTop:"1px solid #ede9e3"}}>
          <div style={{display:"flex",flexWrap:"wrap",gap:20,alignItems:"center",marginBottom:14}}>
            <span style={{fontSize:10,color:"#c0b8ae",fontFamily:"'IBM Plex Mono',monospace",letterSpacing:"0.12em",textTransform:"uppercase"}}>category</span>
            {CATS.map(c=>(
              <span key={c.label} style={{display:"inline-flex",alignItems:"center",gap:6}}>
                <span style={{width:5,height:5,borderRadius:"50%",background:c.dot}}/>
                <span style={{fontSize:11,color:"#8a7a6a"}}>{c.label}</span>
              </span>
            ))}
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6,alignItems:"center"}}>
            <span style={{fontSize:10,color:"#c0b8ae",fontFamily:"'IBM Plex Mono',monospace",letterSpacing:"0.12em",textTransform:"uppercase",marginRight:6}}>sources</span>
            {SOURCES.map(s=><span key={s.name} style={{fontSize:11,color:"#b0a89a",padding:"2px 9px",border:"1px solid #ede9e3",borderRadius:3,background:"#faf9f6"}}>{s.name}</span>)}
          </div>
        </div>
      </div>
    </div>
  );
}
