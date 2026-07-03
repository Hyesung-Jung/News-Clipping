import { useState, useEffect, useCallback, useMemo } from "react";

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
  // HLB 계열
  "HLB","HLB이노베이션","HLB생명과학","HLB파나진","베리스모테라퓨틱스",
  // CGT 관련 중소·중견기업
  "엑셀세라퓨틱스","온코닉테라퓨틱스","에이프릴바이오","한올바이오파마",
  "지트리비앤티","아리바이오","셀바이오텍","오가노이드사이언스",
  "큐어버스","압타바이오","카나리아바이오","파로스아이바이오",
  "메드팩토","온코크로스","이뮤노바이옴","브렉소젠",
  // 일반 제약사 (CGT 파이프라인 보유)
  "일동제약","동아제약","광동제약","삼진제약","한국유나이티드제약","부광약품",
  // GlobalData CGT 기업 DB 추가 (2026.05.11)
  "GC녹십자바이오제약","녹십자바이오제약","SK케미칼","제일약품","한독",
  "레이온제약","삼양바이오팜","에스씨엠생명과학","SCM생명과학","에스바이오메딕스",
  "모아라이프플러스","인트론바이오","엔셀","티앤알바이오팹","인벤티지랩",
  "큐라티스","에피바이오텍","무진메디","카이노스메드","샤페론",
  "보령바이젠셀","바이젠셀","퍼스트바이오테라퓨틱스","아바타테라퓨틱스","씨디모젠",
  "큐어테라퓨틱스","큐리진","큐로젠","동아소시오홀딩스","EHL바이오",
  "엘피스셀테라퓨틱스","지아이셀","굿티셀즈","아이씨엠","이뮤니스바이오",
  "아이피에스바이오","JW크레아젠","엠디뮨","미래셀바이오","엠브릭스",
  "뉴라클제네틱스","노보셀바이오","뉴클릭스바이오","파에안바이오테크","파로스백신",
  "포카스템","바이로큐어","유영제약","백스온코","테라베스트",
  "분당차병원","차의과학대학교","전남대학교","동아대학교",
    "GC Therapeutics","GC Therapeutics Inc", // GC녹십자 미국법인,
  "SCM lifescience","T&R Biofab","JW CreaGene","iNtRON Biotechnology",
];

// 국내 정부·규제 기관 (가중치 +2)
const KR_AGENCIES = [
  "식약처","KFDA","식품의약품안전처","보건복지부","복지부","과기부","산자부","범부처",
  "심평원","건강보험심사평가원","건보공단","국민건강보험공단",
  "질병청","질병관리청","국가신약개발사업단","범부처재생의료기술개발사업단",
  "약평위","약제급여평가위원회","급여평가위원회","건강보험정책심의위원회","건정심",
  // 주요 병원
  "서울아산병원","아산의료원","삼성서울병원","세브란스병원","신촌세브란스",
  "서울대병원","분당서울대병원","서울성모병원","가톨릭대병원","고대병원",
  "고려대병원","순천향대병원","한양대병원","경희대병원","이화여대병원",
  "국립암센터","국립중앙의료원","건국대병원","인하대병원","아주대병원",
  // 대학·연구소
  "서울대학교","연세대학교","고려대학교","KAIST","카이스트","포스텍","POSTECH",
  "성균관대학교","한양대학교","경희대학교","이화여자대학교","중앙대학교",
  "KIST","한국생명공학연구원","KRIBB","한국화학연구원","한국과학기술연구원",
  "기초과학연구원","IBS",
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
  // GlobalData 해외 CGT DB — 한국어명
  "머크","애브비","브리스톨마이어스스큅","일라이릴리","릴리","암젠","사노피","GSK","글락소스미스클라인","바이엘","베링거인겔하임","바이오엔텍","다케다","아스텔라스","다이이찌산쿄","에자이","추가이제약","크리스퍼테라퓨틱스","레전드바이오텍","카스젠","그레이셀","어댑티뮨","오토러스","셀렉티스","제네톤","어피메드","이매틱스","빔테라퓨틱스","프라임메디신","센추리테라퓨틱스","셀룰래리티","가미다셀","알라우노스","포세이다","크리스탈바이오텍","패시지바이오","4D몰레큘러테라퓨틱스","라이엘이뮤노파마","머스탱바이오","쇼어라인","키메릭테라퓨틱스",
  // GlobalData 해외 CGT DB — 영문명
  "Merck & Co","Merck KGaA","AbbVie","Eli Lilly","Amgen","Sanofi","GSK","Boehringer Ingelheim","Daiichi Sankyo","Eisai","Chugai","Adaptimmune","Autolus","CRISPR Therapeutics","Legend Biotech","Caribou Biosciences","CARSGEN","Gracell","Century Therapeutics","Affimed","Immatics","Prime Medicine","Beam Therapeutics","Poseida","Vor Biopharma","Nkarta","4D Molecular Therapeutics","Adverum","Cellectis","Gamida Cell","Lyell Immunopharma","Selecta Biosciences","Precision BioSciences","ProQR","Atara Biotherapeutics","Zymeworks",
];

// 해외 규제기관 (가중치 +1 — 한국 기사에도 자주 등장하므로 낮게)
const GL_AGENCIES = [
  // 규제기관
  "FDA","EMA","NIH","NCI","PMDA","NMPA","MHRA","TGA",
  // 주요 바이오·제약 국가 (가중치 +1 — 국내기업명 +3에 눌리지 않는 보조 신호)
  "미국","일본","중국","영국","독일","프랑스","스위스","네덜란드",
  "벨기에","덴마크","스웨덴","핀란드","노르웨이","아일랜드","오스트리아",
  "이스라엘","싱가포르","호주","캐나다","인도","이탈리아","스페인",
  "대만","홍콩","브라질",
  // 지역·업계 표현
  "유럽연합","글로벌 빅파마","글로벌 제약",
];

const CATS = [
  { label: "임상",       dot: "#0071e3", keys: [
    "임상","phase","clinical","승인신청","ind ","투약 개시","first-in-human",
    "1상","2상","3상","phase 1","phase 2","phase 3","환자 모집","환자모집",
    "임상시험","임상연구","임상 진입","임상 개시",
  ]},
  { label: "허가",       dot: "#34c759", keys: ["허가","approved","approval","fda 승인","식약처 허가","breakthrough","rmat","fast track","희귀의약품","품목허가"] },
  { label: "사업",       dot: "#5e5ce6", keys: [
    // 투자·재무
    "투자","유치","funding","series","ipo","억원","million","billion","deal","인수",
    // 계약·파트너십
    "협약","계약","mou","파트너십","업무협약","공급계약","위탁","라이선스",
    // 위탁생산
    "cmo","cro","cdmo","위탁생산","위탁개발","수탁",
  ]},
  { label: "연구",       dot: "#ff9f0a", keys: ["연구","결과","논문","발표","study","data","result","전임상","preclinical","효능","비임상"] },
  { label: "파이프라인", dot: "#ff453a", keys: ["파이프라인","pipeline","candidate","착수","도입","initiates","후보물질"] },
  { label: "제품",       dot: "#32ade6", keys: ["제품","출시","상용화","product","launch","commercial","의료기기","급여","처방","판매"] },
  { label: "특허",       dot: "#bf5af2", keys: ["특허","patent","지식재산","기술이전","라이선스아웃","license out","독점권"] },
  { label: "규제",       dot: "#ff6961", keys: ["규제","가이드라인","정책","법안","고시","지침","regulation","guideline","policy","첨생법"] },
  { label: "기타",       dot: "#aeaeb2", keys: [] },
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

  // 국내>=해외면 국내, 해외가 더 높으면 해외 (둘 다 0이면 국내 기본값)
  return domesticScore >= globalScore ? "domestic" : "global";
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

// ── 편집 API ──────────────────────────────────────────────────────────────────
async function loadEdits() {
  try {
    const r = await fetch("/api/edits");
    if (!r.ok) return { hidden:[], moved:{}, domOrder:[], gloOrder:[] };
    return r.json();
  } catch { return { hidden:[], moved:{}, domOrder:[], gloOrder:[] }; }
}
async function saveEditsToServer(edits) {
  try {
    await fetch("/api/edits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(edits),
    });
  } catch(e) { console.error("edits save error:", e); }
}

// ── 편집 오버라이드 적용 ───────────────────────────────────────────────────────
function applyEdits(rawDom, rawGlo, edits) {
  const hiddenSet = new Set(edits.hidden || []);
  const movedMap  = edits.moved || {};

  let dom = rawDom.filter(a => !hiddenSet.has(a.link));
  let glo = rawGlo.filter(a => !hiddenSet.has(a.link));

  const fromGloToDom = glo.filter(a => movedMap[a.link] === "domestic");
  const fromDomToGlo = dom.filter(a => movedMap[a.link] === "global");
  dom = [...dom.filter(a => !movedMap[a.link] || movedMap[a.link] === "domestic"), ...fromGloToDom];
  glo = [...glo.filter(a => !movedMap[a.link] || movedMap[a.link] === "global"),   ...fromDomToGlo];

  if ((edits.domOrder || []).length > 0) {
    const om = Object.fromEntries(edits.domOrder.map((l,i)=>[l,i]));
    dom.sort((a,b) => (om[a.link]??999)-(om[b.link]??999));
  }
  if ((edits.gloOrder || []).length > 0) {
    const om = Object.fromEntries(edits.gloOrder.map((l,i)=>[l,i]));
    glo.sort((a,b) => (om[a.link]??999)-(om[b.link]??999));
  }
  return { domestic: dom.slice(0,10), global: glo.slice(0,10) };
}



async function crawlArticle(url) {
  try {
    const r = await fetch(`/api/crawl?url=${encodeURIComponent(url)}`);
    const data = await r.json();
    return data.body ? normalizeText(data.body) : null;
  } catch { return null; }
}


// ── 원문 뷰어 드로어 ──────────────────────────────────────────────────────────
function ArticleDrawer({ item, fullText, onClose }) {
  const [iframeOk, setIframeOk] = useState(true);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const cat = classify(item.title, item.desc);

  // ESC 닫기
  useEffect(() => {
    const handler = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // iframe 로드 실패 감지 (3초 후 체크)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!iframeLoaded) setIframeOk(false);
    }, 3500);
    return () => clearTimeout(timer);
  }, [iframeLoaded]);

  const paragraphs = fullText
    ? fullText.split(/\n\n+/).map(p => p.replace(/\n/g, " ").trim()).filter(Boolean)
    : [];

  return (
    <>
      {/* 딤 배경 */}
      <div onClick={onClose} style={{
        position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",
        backdropFilter:"blur(4px)",WebkitBackdropFilter:"blur(4px)",
        zIndex:200,animation:"dimIn .2s ease",
      }}/>
      {/* 드로어 */}
      <div style={{
        position:"fixed",left:0,right:0,bottom:0,
        height:"78vh",
        background:"var(--bg)",
        borderRadius:"16px 16px 0 0",
        zIndex:201,
        display:"flex",flexDirection:"column",
        boxShadow:"0 -8px 40px rgba(0,0,0,0.18)",
        animation:"drawerUp .28s cubic-bezier(0.32,0.72,0,1)",
      }}>
        {/* 핸들 */}
        <div style={{ display:"flex",justifyContent:"center",paddingTop:10,paddingBottom:6 }}>
          <div style={{ width:36,height:4,borderRadius:2,background:"var(--sep)" }}/>
        </div>

        {/* 헤더 */}
        <div style={{ padding:"0 24px 14px",borderBottom:"1px solid var(--sep2)",display:"flex",alignItems:"flex-start",gap:12 }}>
          <div style={{ flex:1,minWidth:0 }}>
            <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:8 }}>
              <span style={{ padding:"2px 9px",borderRadius:980,background:`${cat.dot}18`,color:cat.dot,fontSize:11,fontWeight:600,fontFamily:"var(--font)" }}>{cat.label}</span>
              <span style={{ fontSize:12,color:"var(--text3)",fontFamily:"var(--font)" }}>{item.source} · {fmtDate(item.date)}</span>
            </div>
            <h2 style={{ fontSize:16,fontWeight:600,color:"var(--text1)",fontFamily:"var(--font)",letterSpacing:"-0.02em",lineHeight:1.4,margin:0 }}>{item.title}</h2>
          </div>
          <div style={{ display:"flex",alignItems:"center",gap:8,flexShrink:0,paddingTop:4 }}>
            <a href={item.link} target="_blank" rel="noopener noreferrer"
              style={{ display:"inline-flex",alignItems:"center",gap:4,fontSize:13,color:"var(--accent)",textDecoration:"none",fontFamily:"var(--font)",fontWeight:500,padding:"6px 12px",background:"#0071e315",borderRadius:8 }}>
              새 탭에서 열기 ↗
            </a>
            <button onClick={onClose}
              style={{ width:30,height:30,borderRadius:"50%",border:"none",background:"var(--bg2)",cursor:"pointer",fontSize:16,color:"var(--text2)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
              ×
            </button>
          </div>
        </div>

        {/* 콘텐츠 */}
        <div style={{ flex:1,overflow:"hidden",position:"relative" }}>
          {/* iframe 시도 */}
          {iframeOk && (
            <iframe
              src={item.link}
              onLoad={() => setIframeLoaded(true)}
              onError={() => setIframeOk(false)}
              style={{
                width:"100%",height:"100%",border:"none",
                display:iframeLoaded?"block":"none",
              }}
              sandbox="allow-scripts allow-same-origin allow-popups"
            />
          )}

          {/* iframe 로드 중 */}
          {iframeOk && !iframeLoaded && (
            <div style={{ position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:12 }}>
              <div style={{ width:22,height:22,border:"2px solid var(--sep)",borderTopColor:"var(--accent)",borderRadius:"50%",animation:"spin .8s linear infinite" }}/>
              <p style={{ color:"var(--text3)",fontSize:13,fontFamily:"var(--font)" }}>페이지 로딩 중…</p>
            </div>
          )}

          {/* iframe 차단 시 → 크롤링 본문 표시 */}
          {!iframeOk && (
            <div style={{ height:"100%",overflowY:"auto",padding:"24px 28px",WebkitOverflowScrolling:"touch" }}>
              {paragraphs.length > 0 ? (
                <div style={{ maxWidth:680,margin:"0 auto" }}>
                  <p style={{ fontSize:13,color:"var(--text3)",fontFamily:"var(--font)",marginBottom:20,padding:"10px 14px",background:"var(--bg2)",borderRadius:8,lineHeight:1.5 }}>
                    ⓘ 이 사이트는 인앱 뷰를 지원하지 않아 수집된 본문을 표시합니다.
                  </p>
                  {paragraphs.map((p, i) => (
                    <p key={i} style={{ fontSize:16,lineHeight:1.85,color:"var(--text1)",fontFamily:"-apple-system, 'Malgun Gothic', sans-serif",marginBottom:18,letterSpacing:"-0.01em",wordBreak:"keep-all" }}>
                      {p}
                    </p>
                  ))}
                </div>
              ) : (
                <div style={{ display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100%",gap:16 }}>
                  <p style={{ color:"var(--text3)",fontSize:15,fontFamily:"var(--font)",textAlign:"center",lineHeight:1.6 }}>
                    본문을 불러올 수 없습니다.<br/>외부 브라우저에서 확인해주세요.
                  </p>
                  <a href={item.link} target="_blank" rel="noopener noreferrer"
                    style={{ padding:"10px 22px",background:"var(--accent)",color:"#fff",borderRadius:980,fontSize:14,fontWeight:600,fontFamily:"var(--font)",textDecoration:"none" }}>
                    원문 열기
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ── Row — isOpen/onToggle 으로 아코디언 제어 ──────────────────────────────────
function Row({ item, idx, isLast, isOpen, onToggle, onHide, onMove, sectionName,
               isDragOver, onDragStart, onDragOver, onDrop, onDragEnd }) {
  const [fullText,    setFullText]    = useState(null);
  const [crawling,    setCrawling]    = useState(false);
  const [hovered,     setHovered]     = useState(false);
  const [showDrawer,  setShowDrawer]  = useState(false);
  const cat = classify(item.title, item.desc);

  const handleClick = async (e) => {
    if (e.target.closest("[data-action]")) return; // 액션 버튼 클릭 시 무시
    onToggle();
    if (!isOpen && fullText === null && !crawling) {
      setCrawling(true);
      const body = await crawlArticle(item.link);
      setFullText(body ?? "");
      setCrawling(false);
    }
  };

  const paragraphs = (() => {
    const raw = (fullText && fullText.length > 50)
      ? fullText
      : normalizeText(item.desc || "본문을 불러올 수 없어요.");
    return raw.split(/\n\n+/).map(p => p.replace(/\n/g, " ").trim()).filter(Boolean);
  })();

  const contentKey = crawling ? "loading" : (fullText ? "full" : "snippet");

  return (
    <>
      <tr
        draggable
        onDragStart={e => { onDragStart(); e.dataTransfer.effectAllowed = "move"; }}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onDragEnd={onDragEnd}
        onClick={handleClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          borderBottom: isLast && !isOpen ? "none" : "1px solid var(--sep2)",
          cursor: "pointer",
          background: isDragOver ? "#e8f0fe" : isOpen ? "var(--bg3)" : hovered ? "var(--bg2)" : "var(--bg)",
          borderTop: isDragOver ? "2px solid var(--accent)" : undefined,
          transition: "background .12s",
          animation: `fi .25s ease ${idx*.03}s both`,
        }}
      >
        {/* 카테고리 */}
        <td style={{ padding:"15px 20px",width:88,whiteSpace:"nowrap" }}>
          <span style={{
            display:"inline-block",
            padding:"2px 9px",
            borderRadius:980,
            background:`${cat.dot}18`,
            color:cat.dot,
            fontSize:11,
            fontWeight:600,
            fontFamily:"var(--font)",
            letterSpacing:"-0.01em",
          }}>{cat.label}</span>
        </td>
        {/* 날짜 */}
        <td style={{ padding:"15px 12px",width:60,fontSize:12,color:"var(--text3)",fontFamily:"var(--font-mono)",whiteSpace:"nowrap" }}>
          {fmtDate(item.date)}
        </td>
        {/* 헤드라인 */}
        <td style={{ padding:"15px 20px",fontSize:14,color:"var(--text1)",fontWeight:500,lineHeight:1.5,fontFamily:"var(--font)",letterSpacing:"-0.01em" }}>
          {item.title}
        </td>
        {/* 출처 */}
        <td style={{ padding:"15px 20px",width:152,fontSize:12,color:"var(--text3)",whiteSpace:"nowrap",textAlign:"right",fontFamily:"var(--font)" }}>
          <span>{item.source}</span>
          {item.sourceCount>1 && (
            <span title={item.allSources.join(" · ")}
              style={{ marginLeft:6,padding:"1px 7px",background:"var(--bg2)",color:"var(--text2)",borderRadius:980,fontSize:11,fontWeight:500,cursor:"help",border:"1px solid var(--sep2)" }}>
              +{item.sourceCount-1}
            </span>
          )}
        </td>
        {/* 액션 */}
        <td style={{ padding:"0 16px",width:96,whiteSpace:"nowrap",textAlign:"right" }}>
          {hovered ? (
            <span data-action style={{ display:"inline-flex",alignItems:"center",gap:6 }}>
              <span style={{ color:"var(--text3)",fontSize:16,cursor:"grab",userSelect:"none",lineHeight:1 }} title="드래그로 순서 변경">⠿</span>
              <button data-action onClick={e=>{e.stopPropagation();onHide();}}
                title="목록에서 제거"
                style={{ border:"none",background:"none",cursor:"pointer",color:"var(--text3)",fontSize:18,lineHeight:1,padding:"1px 3px",borderRadius:6,transition:"color .15s" }}
                onMouseEnter={e=>e.currentTarget.style.color="#ff453a"}
                onMouseLeave={e=>e.currentTarget.style.color="var(--text3)"}>×</button>
              <button data-action onClick={e=>{e.stopPropagation();onMove();}}
                title={sectionName==="domestic"?"해외로 이동":"국내로 이동"}
                style={{ border:"1px solid var(--sep)",background:"var(--bg)",cursor:"pointer",color:"var(--text2)",fontSize:11,padding:"3px 8px",borderRadius:7,fontFamily:"var(--font)",fontWeight:500,transition:"all .15s",whiteSpace:"nowrap" }}
                onMouseEnter={e=>{e.currentTarget.style.background="var(--accent)";e.currentTarget.style.color="#fff";e.currentTarget.style.borderColor="var(--accent)";}}
                onMouseLeave={e=>{e.currentTarget.style.background="var(--bg)";e.currentTarget.style.color="var(--text2)";e.currentTarget.style.borderColor="var(--sep)";}}>
                {sectionName==="domestic"?"→해외":"←국내"}
              </button>
            </span>
          ) : (
            <span style={{ fontSize:11,color:"var(--text3)" }}>{isOpen?"▲":"▼"}</span>
          )}
        </td>
      </tr>

      {isOpen && (
        <tr style={{ borderBottom: isLast ? "none" : "1px solid var(--sep2)" }}>
          <td colSpan={5} style={{ padding:0 }}>
            <div style={{ padding:"24px 28px 28px 28px",background:"var(--bg3)",borderTop:`2px solid ${cat.dot}`,animation:"ed .18s ease" }}>
              {/* 메타 행 */}
              <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:16,flexWrap:"wrap" }}>
                <span style={{ padding:"3px 10px",borderRadius:980,background:`${cat.dot}18`,color:cat.dot,fontSize:11,fontWeight:600,fontFamily:"var(--font)" }}>{cat.label}</span>
                <span style={{ fontSize:13,color:"var(--text2)",fontFamily:"var(--font)",fontWeight:500 }}>{item.source}</span>
                <span style={{ fontSize:12,color:"var(--text3)",fontFamily:"var(--font-mono)" }}>{fmtDate(item.date)}</span>
                {item.sourceCount>1 && (
                  <span title={item.allSources.join(" · ")} style={{ fontSize:12,color:"var(--accent)",fontFamily:"var(--font)",cursor:"help" }}>
                    외 {item.sourceCount-1}개 매체
                  </span>
                )}
                {crawling && (
                  <span style={{ display:"inline-flex",alignItems:"center",gap:5,fontSize:12,color:"var(--text3)",fontFamily:"var(--font)" }}>
                    <span style={{ display:"inline-block",width:11,height:11,border:"1.5px solid var(--sep)",borderTopColor:"var(--accent)",borderRadius:"50%",animation:"spin .8s linear infinite" }}/>
                    불러오는 중
                  </span>
                )}
              </div>

              {/* 본문 */}
              <p key={contentKey} style={{
                margin:"0 0 22px",
                fontSize:15,
                lineHeight:1.8,
                color:"var(--text1)",
                fontFamily:"-apple-system, 'Malgun Gothic', '맑은 고딕', sans-serif",
                wordBreak:"break-word",
                overflowWrap:"break-word",
                whiteSpace:"pre-line",
                display:"-webkit-box",
                WebkitLineClamp:10,
                WebkitBoxOrient:"vertical",
                overflow:"hidden",
                animation:contentKey==="full"?"fadeIn .35s ease":"none",
                letterSpacing:"-0.01em",
              }}>
                {paragraphs.join("\n\n")}
              </p>

              <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                <button onClick={e=>{e.stopPropagation();setShowDrawer(true);}}
                  style={{ display:"inline-flex",alignItems:"center",gap:6,fontSize:14,fontWeight:500,color:"var(--accent)",background:"#0071e315",border:"none",borderRadius:8,padding:"7px 14px",cursor:"pointer",fontFamily:"var(--font)",letterSpacing:"-0.01em",transition:"background .15s" }}
                  onMouseEnter={e=>e.currentTarget.style.background="#0071e325"}
                  onMouseLeave={e=>e.currentTarget.style.background="#0071e315"}>
                  원문 보기
                </button>
                <a href={item.link} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize:13,color:"var(--text3)",fontFamily:"var(--font)",textDecoration:"none" }}
                  title="새 탭에서 열기">
                  ↗
                </a>
              </div>
              {showDrawer && <ArticleDrawer item={item} fullText={fullText} onClose={()=>setShowDrawer(false)}/>}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ── Section — openLink 상태로 아코디언 관리 ───────────────────────────────────
function Section({ label, no, items, loading, sectionName, onHide, onMove, onReorder }) {
  const [openLink,    setOpenLink]    = useState(null);
  const [dragIdx,     setDragIdx]     = useState(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);

  const toggle = link => setOpenLink(prev => prev === link ? null : link);

  const handleDragStart = i => setDragIdx(i);
  const handleDragOver  = (e, i) => { e.preventDefault(); setDragOverIdx(i); };
  const handleDrop      = (e, toIdx) => {
    e.preventDefault();
    if (dragIdx !== null && dragIdx !== toIdx) onReorder(sectionName, dragIdx, toIdx);
    setDragIdx(null); setDragOverIdx(null);
  };
  const handleDragEnd   = () => { setDragIdx(null); setDragOverIdx(null); };

  return (
    <div style={{ marginBottom:52 }}>
      <div style={{ display:"flex",alignItems:"baseline",gap:12,marginBottom:20 }}>
        <h2 style={{ fontSize:22,fontWeight:700,color:"var(--text1)",letterSpacing:"-0.025em",fontFamily:"var(--font)" }}>{label}</h2>
        {!loading && <span style={{ fontSize:13,color:"var(--text3)",fontFamily:"var(--font)",fontWeight:400 }}>{items.length}개</span>}
      </div>
      <div style={{ background:"var(--bg)",borderRadius:"var(--radius)",overflow:"hidden",border:"1px solid var(--sep2)",boxShadow:"0 1px 3px rgba(0,0,0,0.04),0 4px 16px rgba(0,0,0,0.04)" }}>
        <table style={{ width:"100%",borderCollapse:"collapse" }}>
          <thead>
            <tr style={{ borderBottom:"1px solid var(--sep2)" }}>
              {[["구분",90],["날짜",68],["헤드라인",null],["출처",160],["",96]].map(([h,w])=>(
                <th key={String(h)+String(w)} style={{ padding:"10px 20px",fontSize:11,fontWeight:500,color:"var(--text3)",letterSpacing:"0.03em",textAlign:h==="출처"?"right":"left",width:w||"auto",whiteSpace:"nowrap",background:"var(--bg3)",fontFamily:"var(--font)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={5} style={{ padding:"60px 0",textAlign:"center",background:"var(--bg)" }}>
              <div style={{ display:"inline-block",width:20,height:20,border:"2px solid var(--sep)",borderTopColor:"var(--accent)",borderRadius:"50%",animation:"spin .8s linear infinite" }}/>
            </td></tr>}
            {!loading && items.length===0 && <tr><td colSpan={5} style={{ padding:"52px 0",textAlign:"center",color:"var(--text3)",fontSize:13,background:"var(--bg)",fontFamily:"var(--font)" }}>기사가 없습니다</td></tr>}
            {!loading && items.map((item,i) => (
              <Row
                key={item.link+i}
                item={item} idx={i} isLast={i===items.length-1}
                isOpen={openLink===item.link}
                onToggle={() => toggle(item.link)}
                onHide={() => onHide(item.link)}
                onMove={() => onMove(item.link, sectionName==="domestic"?"global":"domestic")}
                sectionName={sectionName}
                isDragOver={dragOverIdx===i}
                onDragStart={() => handleDragStart(i)}
                onDragOver={e => handleDragOver(e, i)}
                onDrop={e => handleDrop(e, i)}
                onDragEnd={handleDragEnd}
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
  const [rawDomestic, setRawDomestic] = useState([]);
  const [rawGlobal,   setRawGlobal]   = useState([]);
  const [edits,       setEdits]       = useState({ hidden:[], moved:{}, domOrder:[], gloOrder:[] });
  const [loading,     setLoading]     = useState(true);
  const [updated,     setUpdated]     = useState(null);
  const [status,      setStatus]      = useState("");

  // 편집 오버라이드 적용 → 표시 목록
  const { domestic, global } = useMemo(
    () => applyEdits(rawDomestic, rawGlobal, edits),
    [rawDomestic, rawGlobal, edits]
  );

  // 편집 저장 (상태 + 서버)
  const updateEdits = useCallback(newEdits => {
    setEdits(newEdits);
    saveEditsToServer(newEdits);
  }, []);

  const onHide    = useCallback(link => updateEdits({ ...edits, hidden: [...(edits.hidden||[]), link] }), [edits, updateEdits]);
  const onMove    = useCallback((link, to) => updateEdits({ ...edits, moved: { ...(edits.moved||{}), [link]: to } }), [edits, updateEdits]);
  const onReorder = useCallback((section, fromIdx, toIdx) => {
    const items   = section === "domestic" ? domestic : global;
    const newOrder = items.map(i => i.link);
    const [moved]  = newOrder.splice(fromIdx, 1);
    newOrder.splice(toIdx, 0, moved);
    const key = section === "domestic" ? "domOrder" : "gloOrder";
    updateEdits({ ...edits, [key]: newOrder });
  }, [edits, domestic, global, updateEdits]);
  const onReset   = useCallback(() => updateEdits({ hidden:[], moved:{}, domOrder:[], gloOrder:[] }), [updateEdits]);

  const load = useCallback(async (force=false) => {
    setLoading(true);
    try {
      if (force) {
        setStatus("새로고침 중…");
        await triggerRefresh();
      }
      const [newsData, editsData] = await Promise.all([loadFromServer(), loadEdits()]);
      setRawDomestic(newsData.domestic || []);
      setRawGlobal(newsData.global || []);
      setEdits(editsData);
      setUpdated(newsData.updatedAt ? new Date(newsData.updatedAt) : null);
    } catch (e) { console.error("Load error:", e); }
    setStatus("");
    setLoading(false);
  }, []);

  useEffect(()=>{load();},[load]);

  return (
    <div style={{ minHeight:"100vh",background:"var(--bg)",fontFamily:"var(--font)" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;600&family=Noto+Serif+KR:wght@400;500&display=swap');
        :root {
          --bg: #ffffff;
          --bg2: #f5f5f7;
          --bg3: #fbfbfd;
          --text1: #1d1d1f;
          --text2: #6e6e73;
          --text3: #aeaeb2;
          --sep: #d2d2d7;
          --sep2: #e8e8ed;
          --accent: #0071e3;
          --radius: 12px;
          --font: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Noto Sans KR", sans-serif;
          --font-display: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Noto Serif KR", serif;
          --font-mono: "SF Mono", "Menlo", "Monaco", monospace;
        }
        * { box-sizing:border-box; margin:0; }
        body { background: var(--bg); }
        @keyframes fi { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
        @keyframes ed { from{opacity:0;transform:translateY(-4px)} to{opacity:1;transform:none} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes dimIn { from{opacity:0} to{opacity:1} }
        @keyframes drawerUp { from{transform:translateY(100%)} to{transform:translateY(0)} }
        a:hover { opacity:.7; transition:opacity .2s; }
        button { font-family: var(--font); }
        ::selection { background: #0071e315; }
      `}</style>

      <div style={{ borderBottom:"1px solid var(--sep2)",background:"rgba(255,255,255,0.85)",backdropFilter:"saturate(180%) blur(20px)",WebkitBackdropFilter:"saturate(180%) blur(20px)",position:"sticky",top:0,zIndex:100 }}>
        <div style={{ maxWidth:960,margin:"0 auto",padding:"0 40px",height:52,display:"flex",alignItems:"center",justifyContent:"space-between" }}>
          <div style={{ display:"flex",alignItems:"baseline",gap:12 }}>
            <h1 style={{ fontSize:22,fontWeight:700,color:"var(--text1)",fontFamily:"var(--font)",letterSpacing:"-0.025em",lineHeight:1 }}>
              CGT 뉴스 브리핑
            </h1>
            {updated && (
              <span style={{ fontSize:12,color:"var(--text3)",fontFamily:"var(--font-mono)",letterSpacing:"-0.01em" }}>
                {updated.toLocaleDateString("ko-KR",{year:"numeric",month:"long",day:"numeric"})}
                {" "}
                {updated.toLocaleTimeString("ko-KR",{hour:"2-digit",minute:"2-digit",hour12:false})} 기준
              </span>
            )}
          </div>
          <div style={{ display:"flex",alignItems:"center",gap:12 }}>
            {null /* spacer */}
            {((edits.hidden||[]).length > 0 || Object.keys(edits.moved||{}).length > 0 || (edits.domOrder||[]).length > 0 || (edits.gloOrder||[]).length > 0) && (
              <button onClick={onReset}
                style={{ background:"none",border:"none",color:"var(--accent)",fontSize:13,fontWeight:500,cursor:"pointer",padding:"4px 8px",borderRadius:6,transition:"background .15s" }}
                onMouseEnter={e=>e.currentTarget.style.background="#0071e315"}
                onMouseLeave={e=>e.currentTarget.style.background="none"}>
                초기화
              </button>
            )}
            <button onClick={()=>load(true)} disabled={loading}
              style={{ background:"var(--bg2)",border:"none",color:"var(--text1)",borderRadius:980,padding:"6px 14px",fontSize:13,fontWeight:500,cursor:loading?"not-allowed":"pointer",opacity:loading?0.4:1,transition:"all .2s",fontFamily:"var(--font)",letterSpacing:"-0.01em",display:"inline-flex",alignItems:"center",gap:6 }}>
              <span style={{ display:"inline-block",animation:loading?"spin .9s linear infinite":"none",fontSize:14 }}>↻</span>
              {loading?"로딩 중":"새로고침"}
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth:960,margin:"0 auto",padding:"40px 40px 24px" }}>
        <Section label="국내 뉴스" no={1} items={domestic} loading={loading} sectionName="domestic" onHide={onHide} onMove={onMove} onReorder={onReorder}/>
        <Section label="해외 뉴스" no={2} items={global}   loading={loading} sectionName="global"   onHide={onHide} onMove={onMove} onReorder={onReorder}/>
        {/* 카테고리 범례 */}
        <div style={{ paddingTop:28,borderTop:"1px solid var(--sep2)",display:"flex",flexWrap:"wrap",gap:6,alignItems:"center" }}>
          {CATS.map(cat=>(
            <span key={cat.label} style={{ display:"inline-flex",alignItems:"center",gap:5,padding:"4px 11px",borderRadius:980,background:`${cat.dot}12`,fontSize:12,color:cat.dot,fontWeight:500,fontFamily:"var(--font)" }}>
              {cat.label}
            </span>
          ))}
        </div>
        <p style={{ marginTop:20,fontSize:12,color:"var(--text3)",fontFamily:"var(--font)",textAlign:"center",paddingBottom:24 }}>
          최근 7일 · 네이버 뉴스 · 국내·해외 자동 분류
        </p>
      </div>
    </div>
  );
}
