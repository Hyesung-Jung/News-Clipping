import { useState, useEffect, useCallback } from "react";

// 뉴스 fetch는 서버(api/refresh.js)에서 처리 → Supabase 저장
// 클라이언트는 api/news.js에서 읽기만 함

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

// ── 국내/해외 분류 — 가중치 기반 (점수 합산) ────────────────────────────────
// 예시: "알지노믹스 FDA 허가" → 국내기업(+3) vs FDA기관(+1) → domestic 3:1 ✓
//       "Novartis CAR-T 승인" → 해외기업(+3) vs 없음 → global ✓
//       "Novartis 한국법인 진출" → 해외기업(+3) vs 국내지표(+1) → global ✓

// 국내 기업 (가중치 +3)
const KR_COMPANIES = [
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
  "JW중외제약","SK바이오팜","SK팜테코","SK바이오사이언스","LG화학",
  "보령","동아ST","동아에스티","HK이노엔","진원생명과학","녹십자","GC녹십자",
  // 차바이오텍 계열
  "마티카바이오렙스","차바이오렙스","마티카",
];

// 국내 정부·규제 기관 (가중치 +2)
const KR_AGENCIES = [
  "식약처","KFDA","식품의약품안전처","보건복지부","복지부","과기부","산자부","범부처",
  "심평원","건강보험심사평가원","건보공단","국민건강보험공단",
  "질병청","질병관리청","국가신약개발사업단","범부처재생의료기술개발사업단",
  "약평위","약제급여평가위원회","급여평가위원회","건강보험정책심의위원회","건정심",
];

// 국내 맥락 지표 (가중치 +1 — 보조 신호)
const KR_INDICATORS = [
  "한국법인","한국지사","국내 임상","국내 진출","국산","국내 최초","국내 허가",
  "국내 개발","한국 시장","코리아",
];

// 해외 기업 (가중치 +3)
const GL_COMPANIES = [
  "노바티스","길리어드","블루버드","로슈","아스트라제네카","화이자","얀센","BMS",
  "바이오젠","리제네론","사렙타","스파크","유니큐어","크리스퍼","인텔리아","빔",
  "알로진","페이트","아이오반스","에디타스","버텍스","모더나","레오파마",
  "Novartis","Gilead","Pfizer","Roche","AstraZeneca","Biogen",
  "Regeneron","Sarepta","Spark","UniQure","Intellia","Beam","Bluebird",
  "Allogene","Fate Therapeutics","Iovance","Editas","Vertex","Moderna",
  "Bristol","BMS","Janssen","Bayer","Takeda","Astellas",
  "LEO Pharma","Replicate","Krystal Biotech","Passage Bio",
];

// 해외 규제기관 (가중치 +1 — 한국 기사에도 자주 등장하므로 낮게)
const GL_AGENCIES = [
  "FDA","EMA","NIH","NCI",
  "프랑스","독일","영국","스위스","네덜란드","벨기에","덴마크","스웨덴","핀란드","이스라엘","싱가포르","호주","캐나다",
];

const CATS = [
  { label: "임상",       dot: "#2563eb", keys: [
    "임상","phase","clinical","승인신청","ind ","투약 개시","first-in-human",
    "1상","2상","3상","phase 1","phase 2","phase 3","환자 모집","환자모집",
    "임상시험","임상연구","임상 진입","임상 개시",
  ]},
  { label: "허가",       dot: "#16a34a", keys: ["허가","approved","approval","fda 승인","식약처 허가","breakthrough","rmat","fast track","희귀의약품","품목허가"] },
  { label: "사업",       dot: "#7c3aed", keys: [
    // 투자·재무
    "투자","유치","funding","series","ipo","억원","million","billion","deal","인수",
    // 계약·파트너십
    "협약","계약","mou","파트너십","업무협약","공급계약","위탁","라이선스",
    // 위탁생산
    "cmo","cro","cdmo","위탁생산","위탁개발","수탁",
  ]},
  { label: "연구",       dot: "#d97706", keys: ["연구","결과","논문","발표","study","data","result","전임상","preclinical","효능","비임상"] },
  { label: "파이프라인", dot: "#dc2626", keys: ["파이프라인","pipeline","candidate","착수","도입","initiates","후보물질"] },
  { label: "제품",       dot: "#0891b2", keys: ["제품","출시","상용화","product","launch","commercial","의료기기","급여","처방","판매"] },
  { label: "특허",       dot: "#be185d", keys: ["특허","patent","지식재산","기술이전","라이선스아웃","license out","독점권"] },
  { label: "규제",       dot: "#b45309", keys: ["규제","가이드라인","정책","법안","고시","지침","regulation","guideline","policy","첨생법"] },
  { label: "기타",       dot: "#6b7280", keys: [] },
];


// 소스 우선순위 — 낮을수록 높은 우선순위 (대표 기사 선정 기준)
const SOURCE_PRIORITY = {
  // 1순위: 바이오 순수 전문
  "바이오스펙테이터": 1,
  "히트뉴스":         2,
  "바이오타임즈":     3,
  "더바이오":         4,
  // 2순위: 제약바이오 전문
  "메디파나":         10,
  "데일리팜":         11,
  "팜뉴스":           12,
  "약업신문":         13,
  "의학신문":         14,
  "메디게이트":       15,
  // 3순위: 종합경제지·더벨
  "이데일리":         20,
  "머니투데이":       21,
  "한국경제":         22,
  "매일경제":         23,
  "더벨":             24,
};

// ── 유틸 ──────────────────────────────────────────────────────────────────────
const noSp = s => s.replace(/\s+/g, "");

function isCGT(title, desc) {
  const t  = title.toLowerCase(), tn = noSp(t);
  const ds = `${title} ${desc}`.toLowerCase(), dn = noSp(ds);
  const match = k => { const kl = k.toLowerCase(); return ds.includes(kl) || dn.includes(noSp(kl)); };
  const titleMatch = kl => t.includes(kl) || tn.includes(noSp(kl));

  // 제목에 CGT 키워드 있으면 바로 통과 (고신뢰)
  if (CGT_KW.some(k => titleMatch(k.toLowerCase()))) return true;

  // 설명에만 있을 경우 → 2개 이상이어야 통과 (노이즈 방지)
  return CGT_KW.filter(k => match(k)).length >= 2;
}
function region(title, desc) {
  const t  = title.toLowerCase(), tn = noSp(t);
  const ds = `${title} ${desc}`.toLowerCase(), dn = noSp(ds);
  const hit = (text, ntext, kws) => kws.some(k => {
    const kl = k.toLowerCase(); return text.includes(kl) || ntext.includes(noSp(kl));
  });

  // ── 제목에 확실한 국내 신호 → 즉시 domestic ──────────────────────────────
  // "국산", "국내 최초", "식약처 허가" 등이 제목에 있으면 국내 기사 확정
  const DEFINITIVE_KR_TITLE = [
    "국산","국내 최초","국내 첫","국내 허가","식약처 허가","국산 치료제","국내 개발",
    "식약처 승인","국내 임상 1","국내 임상 2","국내 임상 3","K바이오","K-바이오",
  ];
  if (hit(t, tn, DEFINITIVE_KR_TITLE)) return "domestic";

  // ── 가중치 점수 — 제목 매칭은 2배 ───────────────────────────────────────
  const sc = (text, ntext, kws, w) => kws.reduce((sum, k) => {
    const kl = k.toLowerCase();
    return sum + (text.includes(kl) || ntext.includes(noSp(kl)) ? w : 0);
  }, 0);

  const domesticScore =
    sc(t,  tn, KR_COMPANIES,  6) + sc(t,  tn, KR_AGENCIES,   4) + sc(t,  tn, KR_INDICATORS, 2) +
    sc(ds, dn, KR_COMPANIES,  3) + sc(ds, dn, KR_AGENCIES,   2) + sc(ds, dn, KR_INDICATORS, 1);

  const globalScore =
    sc(t,  tn, GL_COMPANIES, 6) + sc(t,  tn, GL_AGENCIES, 2) +
    sc(ds, dn, GL_COMPANIES, 3) + sc(ds, dn, GL_AGENCIES, 1);

  // 국내 점수가 있어야만 국내, 없으면 해외
  return domesticScore > 0 && domesticScore >= globalScore ? "domestic" : "global";
}
function classify(title, desc) {
  const s = `${title} ${desc}`.toLowerCase();
  // 각 카테고리 점수 합산 → 최고점 선택 (동점이면 배열 앞쪽 우선)
  const scored = CATS.slice(0, -1).map(cat => ({
    cat,
    score: cat.keys.reduce((sum, k) => sum + (s.includes(k) ? 1 : 0), 0),
  })).filter(x => x.score > 0);
  if (!scored.length) return CATS.at(-1);
  return scored.sort((a, b) => b.score - a.score)[0].cat;
}
function stripHTML(s) { return s ? s.replace(/<[^>]+>/g, "").replace(/&[^;]+;/g, " ").replace(/\s+/g, " ").trim() : ""; }
function fmtDate(d) {
  if (!d) return "—";
  const dt = new Date(d);
  return isNaN(dt) ? "—" : `${String(dt.getMonth()+1).padStart(2,"0")}.${String(dt.getDate()).padStart(2,"0")}`;
}

// 문단 과도한 공백 정리
function normalizeText(t) {
  if (!t) return "";
  return t.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").replace(/[ \t]{2,}/g, " ").trim();
}

const SOURCE_MAP = {
  // 바이오·제약 전문
  "biospectator.com":"바이오스펙테이터","hitnews.co.kr":"히트뉴스",
  "medipana.com":"메디파나","yakup.com":"약업신문",
  "biotimes.co.kr":"바이오타임즈","pharmnews.com":"팜뉴스",
  "bosa.co.kr":"의학신문","dailypharm.com":"데일리팜",
  "medigatenews.com":"메디게이트","medicaltimes.com":"메디칼타임즈",
  "mdtoday.co.kr":"메디컬투데이","monews.co.kr":"의사신문",
  "doctorsnews.co.kr":"의협신문","rapportian.com":"라포르시안",
  "docdocdoc.co.kr":"청년의사","kmedinfo.co.kr":"한국의학신문",
  "paxnetnews.com":"팍스넷뉴스","k-health.com":"코리아헬스로그",
  "biopharma-kr.com":"바이오파마","medifonews.com":"메디포뉴스",
  "thebionews.net":"더바이오","kormedi.com":"코메디닷컴",
  "healthchosun.com":"헬스조선","health.chosun.com":"헬스조선",
  // 경제·금융
  "thebell.co.kr":"더벨","edaily.co.kr":"이데일리",
  "mt.co.kr":"머니투데이","hankyung.com":"한국경제",
  "mk.co.kr":"매일경제","sedaily.com":"서울경제",
  "fnnews.com":"파이낸셜뉴스","heraldcorp.com":"헤럴드경제",
  "asiae.co.kr":"아시아경제","inews24.com":"아이뉴스24",
  "viva100.com":"브릿지경제","getnews.co.kr":"글로벌경제",
  "financialpost.co.kr":"파이낸셜포스트","econovill.com":"이코노빌",
  "biztribune.co.kr":"비즈트리뷴","cnbizm.com":"이코노믹리뷰",
  "ebn.co.kr":"EBN산업뉴스","newdaily.co.kr":"뉴데일리",
  "megaeconomy.co.kr":"메가경제","tokenpost.co.kr":"토큰포스트",
  // 종합일간지
  "chosun.com":"조선일보","joongang.co.kr":"중앙일보",
  "donga.com":"동아일보","hani.co.kr":"한겨레",
  "khan.co.kr":"경향신문","hankookilbo.com":"한국일보",
  "kmib.co.kr":"국민일보","munhwa.com":"문화일보",
  "seoul.co.kr":"서울신문",
  // 통신·방송
  "yonhapnews.co.kr":"연합뉴스","yna.co.kr":"연합뉴스",
  "newsis.com":"뉴시스","news1.kr":"뉴스1",
  "nocutnews.co.kr":"노컷뉴스","ohmynews.com":"오마이뉴스",
  "ytn.co.kr":"YTN","sbs.co.kr":"SBS","kbs.co.kr":"KBS",
  "mbc.co.kr":"MBC","jtbc.co.kr":"JTBC",
  "tvchosun.com":"TV조선","mbn.co.kr":"MBN",
  // IT·기타
  "etnews.com":"전자신문","zdnet.co.kr":"ZDNet코리아",
  "dt.co.kr":"디지털타임스","itchosun.com":"IT조선",
  "venturesquare.net":"벤처스퀘어","platum.kr":"플래텀",
  "newsworks.co.kr":"뉴스웍스","newsway.co.kr":"뉴스웨이",
  "sisajournal.com":"시사저널","pressian.com":"프레시안",
  "n.news.naver.com":"네이버뉴스","news.naver.com":"네이버뉴스",
};
function srcFromUrl(url) {
  try {
    const h = new URL(url).hostname.replace("www.", "");
    if (SOURCE_MAP[h]) return SOURCE_MAP[h];
    // 서브도메인 포함 도메인도 체크
    const base = h.split(".").slice(-2).join(".");
    return SOURCE_MAP[base] || h.split(".")[0];
  } catch { return "기타"; }
}

// ── 서버에서 뉴스 가져오기 (처리는 api/refresh.js에서) ────────────────────────
async function loadFromServer() {
  const r = await fetch('/api/news');
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}
async function triggerRefresh() {
  const r = await fetch('/api/refresh', { method: 'POST' });
  if (!r.ok) throw new Error(`Refresh failed: ${r.status}`);
  return r.json();
}


async function crawlArticle(url) {
  try {
    const r = await fetch(`/api/crawl?url=${encodeURIComponent(url)}`);
    const data = await r.json();
    return data.body ? normalizeText(data.body) : null;
  } catch { return null; }
}

// ── Row — isOpen/onToggle 으로 아코디언 제어 ──────────────────────────────────
function Row({ item, idx, isLast, isOpen, onToggle }) {
  const [fullText, setFullText] = useState(null);
  const [crawling, setCrawling] = useState(false);
  const cat = classify(item.title, item.desc);

  const handleClick = async () => {
    onToggle();
    if (!isOpen && fullText === null && !crawling) {
      setCrawling(true);
      const body = await crawlArticle(item.link);
      setFullText(body ?? "");
      setCrawling(false);
    }
  };

  // 문단 분리: \n\n 기준으로 나누어 각각 <p> 렌더링
  const paragraphs = (() => {
    const raw = (fullText && fullText.length > 50)
      ? fullText
      : normalizeText(item.desc || "본문을 불러올 수 없어요.");
    return raw.split(/\n\n+/).map(p => p.replace(/\n/g, " ").trim()).filter(Boolean);
  })();

  // 표시 콘텐츠 key — 변경 시 fadeIn 트리거
  const contentKey = crawling ? "loading" : (fullText ? "full" : "snippet");


  return (
    <>
      <tr
        onClick={handleClick}
        style={{ borderBottom: isLast && !isOpen ? "none" : "1px solid #f0ede8", cursor: "pointer", background: isOpen ? "#fafaf8" : "transparent", transition: "background .15s", animation: `fi .3s ease ${idx*.04}s both` }}
        onMouseEnter={e => { if (!isOpen) e.currentTarget.style.background = "#fdfcfb"; }}
        onMouseLeave={e => { e.currentTarget.style.background = isOpen ? "#fafaf8" : "transparent"; }}
      >
        <td style={{ padding:"14px 18px",width:90,whiteSpace:"nowrap" }}>
          <span style={{ display:"inline-flex",alignItems:"center",gap:6 }}>
            <span style={{ width:5,height:5,borderRadius:"50%",background:cat.dot,flexShrink:0 }}/>
            <span style={{ fontSize:11,color:cat.dot,fontWeight:600,letterSpacing:"0.03em" }}>{cat.label}</span>
          </span>
        </td>
        <td style={{ padding:"14px 12px",width:68,minWidth:68,fontSize:11.5,color:"#b0a89a",fontFamily:"'IBM Plex Mono',monospace",whiteSpace:"nowrap",letterSpacing:"0.04em" }}>
          {fmtDate(item.date)}
        </td>
        <td style={{ padding:"14px 18px",fontSize:13.5,color:"#1a1612",fontWeight:500,lineHeight:1.55 }}>
          {item.title}
        </td>
        <td style={{ padding:"14px 18px",width:160,fontSize:11,color:"#c0b8ae",whiteSpace:"nowrap",textAlign:"right" }}>
          <span>{item.source}</span>
          {item.sourceCount>1 && <span title={item.allSources.join(" · ")} style={{ marginLeft:6,padding:"1px 6px",background:"#fef3c7",color:"#92400e",borderRadius:3,fontSize:9.5,fontWeight:700,fontFamily:"'IBM Plex Mono',monospace",border:"1px solid #fde68a",cursor:"help" }}>+{item.sourceCount-1}</span>}
        </td>
        <td style={{ padding:"14px 16px",width:24,fontSize:9,color:"#d0c8be",textAlign:"center" }}>{isOpen?"▲":"▼"}</td>
      </tr>

      {isOpen && (
        <tr style={{ borderBottom: isLast ? "none" : "1px solid #f0ede8" }}>
          <td colSpan={5} style={{ padding:0 }}>
            <div style={{ padding:"24px 32px 24px 86px",background:"linear-gradient(160deg,#faf9f7 0%,#f5f3ef 100%)",borderLeft:`3px solid ${cat.dot}`,animation:"ed .2s ease" }}>

              {/* 메타 */}
              <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:16 }}>
                <span style={{ fontSize:9.5,fontWeight:700,color:"#fff",background:cat.dot,letterSpacing:"0.1em",textTransform:"uppercase",padding:"2px 8px",borderRadius:3,fontFamily:"'IBM Plex Mono',monospace",transition:"background .3s" }}>{cat.label}</span>
                <span style={{ fontSize:11,color:"#a09890",fontFamily:"'IBM Plex Mono',monospace" }}>{item.source}</span>
                <span style={{ fontSize:10,color:"#c0b8b0",fontFamily:"'IBM Plex Mono',monospace" }}>{fmtDate(item.date)}</span>
                {item.sourceCount>1 && <span title={item.allSources.join(" · ")} style={{ fontSize:10,color:"#92400e",fontFamily:"'IBM Plex Mono',monospace",cursor:"help" }}>외 {item.sourceCount-1}개 매체</span>}
                {crawling && (
                  <span style={{ display:"inline-flex",alignItems:"center",gap:5,fontSize:10,color:"#b0a89a",fontFamily:"'IBM Plex Mono',monospace" }}>
                    <span style={{ display:"inline-block",width:10,height:10,border:"1.5px solid #e0dbd4",borderTopColor:"#8a7a6a",borderRadius:"50%",animation:"spin .8s linear infinite" }}/>
                    본문 로딩 중…
                  </span>
                )}
              </div>

              {/* 본문 — 단일 <p> + pre-line으로 문단 표현, 10줄 clamp */}
              <p
                key={contentKey}
                style={{
                  margin: "0 0 20px",
                  fontSize: 14,
                  lineHeight: 1.85,
                  color: "#28231f",
                  fontFamily: "'Malgun Gothic', '맑은 고딕', sans-serif",
                  wordBreak: "break-word",
                  overflowWrap: "break-word",
                  whiteSpace: "pre-line",
                  display: "-webkit-box",
                  WebkitLineClamp: 10,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                  animation: contentKey === "full" ? "fadeIn .45s ease" : "none",
                }}
              >
                {paragraphs.join("\n\n")}
              </p>

              <a href={item.link} target="_blank" rel="noopener noreferrer"
                style={{ display:"inline-flex",alignItems:"center",gap:6,fontSize:10.5,fontWeight:700,color:cat.dot,textDecoration:"none",letterSpacing:"0.09em",textTransform:"uppercase",padding:"6px 16px",border:`1px solid ${cat.dot}55`,borderRadius:4,fontFamily:"'IBM Plex Mono',monospace",background:"#fff",boxShadow:"0 1px 4px rgba(0,0,0,0.06)" }}>
                원문 보기 →
              </a>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ── Section — openLink 상태로 아코디언 관리 ───────────────────────────────────
function Section({ label, no, items, loading }) {
  const [openLink, setOpenLink] = useState(null); // 현재 열린 기사 link

  const toggle = link => setOpenLink(prev => prev === link ? null : link);

  return (
    <div style={{ marginBottom:44 }}>
      <div style={{ display:"flex",alignItems:"center",gap:16,marginBottom:16,paddingBottom:14,borderBottom:"2px solid #1a1612" }}>
        <span style={{ fontSize:10,fontWeight:700,color:"#c0b8ae",fontFamily:"'IBM Plex Mono',monospace",letterSpacing:"0.14em" }}>{String(no).padStart(2,"0")}</span>
        <h2 style={{ margin:0,fontSize:16,fontWeight:700,color:"#1a1612",letterSpacing:"-0.01em" }}>{label}</h2>
        {!loading && <span style={{ marginLeft:"auto",fontSize:11,color:"#b0a89a",fontFamily:"'IBM Plex Mono',monospace" }}>{items.length} articles</span>}
      </div>
      <div style={{ border:"1px solid #ede9e3",borderRadius:8,overflow:"hidden" }}>
        <table style={{ width:"100%",borderCollapse:"collapse" }}>
          <thead>
            <tr style={{ background:"#faf9f6",borderBottom:"1px solid #ede9e3" }}>
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
            {!loading && items.map((item,i) => (
              <Row
                key={item.link+i}
                item={item}
                idx={i}
                isLast={i===items.length-1}
                isOpen={openLink===item.link}
                onToggle={() => toggle(item.link)}
              />
            ))}
          </tbody>
        </table>
      </div>
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
  const [status,   setStatus]   = useState("");

  const load = useCallback(async (force=false) => {
    setLoading(true);
    try {
      if (force) {
        // 서버에서 Naver 새로 수집 → Supabase 업데이트
        setStatus("새로고침 중…");
        await triggerRefresh();
      }
      // Supabase에서 공유 캐시 읽기
      const data = await loadFromServer();
      setDomestic(data.domestic || []);
      setGlobal(data.global || []);
      setUpdated(data.updatedAt ? new Date(data.updatedAt) : null);
      setFromCache(!force);
    } catch (e) {
      console.error("Load error:", e);
    }
    setStatus("");
    setLoading(false);
  },[]);

  useEffect(()=>{load();},[load]);

  return (
    <div style={{ minHeight:"100vh",background:"#fff",fontFamily:"'Noto Sans KR',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&family=Noto+Sans+KR:wght@400;500;600;700&family=Noto+Serif+KR:wght@400;500;700&display=swap');
        @keyframes fi{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}
        @keyframes ed{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
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
                  {" "}
                  <span style={{ color:"#c0b8ae",fontFamily:"'IBM Plex Mono',monospace" }}>
                    {updated.toLocaleTimeString("ko-KR",{hour:"2-digit",minute:"2-digit",hour12:false})} 기준
                  </span>
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
