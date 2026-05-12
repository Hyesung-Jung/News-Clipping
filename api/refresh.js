// /api/refresh.js
// Naver 뉴스 수집 → 처리 → Supabase 저장
// Vercel Cron: 매일 23:00 UTC (= 08:00 KST) 자동 실행
// 수동: POST /api/refresh (refresh 버튼)

// ── 쿼리 ──────────────────────────────────────────────────────────────────────
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

const KR_COMPANIES = [
  "지씨셀","GC셀","GC녹십자셀","메디포스트","테고사이언스","바이오솔루션",
  "코아스템","코아스템켐온","파미셀","안트로젠",
  "코오롱","코오롱생명과학","코오롱티슈진",
  "알지노믹스","툴젠","제넥신","헬릭스미스",
  "큐로셀","박셀바이오","엔케이맥스","유틸렉스",
  "이뮨온시아","오름테라퓨틱","오름테라퓨틱스",
  "지아이이노베이션","다안바이오테라퓨틱스","에이비엘바이오",
  "차바이오텍","차바이오그룹","마티카바이오렙스","차바이오렙스","마티카","네이처셀",
  "이엔셀","강스템바이오텍","입셀","인투셀",
  "에스티팜","올리패스","셀리버리","삼성바이오","삼성바이오로직스",
  "바이넥스","셀트리온","한미약품","종근당","대웅제약","유한양행",
  "JW중외제약","SK바이오팜","SK팜테코","SK바이오사이언스","LG화학",
  "보령","동아ST","동아에스티","HK이노엔","진원생명과학","녹십자","GC녹십자",
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
const KR_INDICATORS = [
  "한국법인","한국지사","국내 임상","국내 진출","국산","국내 최초","국내 허가",
  "국내 개발","한국 시장","코리아",
];
const GL_COMPANIES = [
  "노바티스","길리어드","블루버드","로슈","아스트라제네카","화이자","얀센","BMS",
  "바이오젠","리제네론","사렙타","스파크","유니큐어","크리스퍼","인텔리아","빔",
  "알로진","페이트","아이오반스","에디타스","버텍스","모더나","레오파마",
  "Novartis","Gilead","Pfizer","Roche","AstraZeneca","Biogen",
  "Regeneron","Sarepta","Spark","UniQure","Intellia","Beam","Bluebird",
  "Allogene","Fate Therapeutics","Iovance","Editas","Vertex","Moderna",
  "Bristol","BMS","Janssen","Bayer","Takeda","Astellas",
  "LEO Pharma","Replicate","Krystal Biotech","Passage Bio","INOVIO","이노비오",
  // GlobalData 해외 CGT DB 추가 (2026.05.11)
  // 한국어명
  "머크","애브비","브리스톨마이어스스큅","일라이릴리","릴리","암젠","사노피","GSK","글락소스미스클라인","바이엘","베링거인겔하임","바이오엔텍","다케다","아스텔라스","다이이찌산쿄","에자이","추가이제약","크리스퍼테라퓨틱스","레전드바이오텍","카스젠","그레이셀","어댑티뮨","오토러스","셀렉티스","제네톤","어피메드","이매틱스","빔테라퓨틱스","프라임메디신","센추리테라퓨틱스","셀룰래리티","가미다셀","알라우노스","포세이다","크리스탈바이오텍","패시지바이오","4D몰레큘러테라퓨틱스","라이엘이뮤노파마","머스탱바이오","쇼어라인","키메릭테라퓨틱스",
  // 영문명 (한국 뉴스에서 영문 표기)
  "Merck & Co","Merck KGaA","AbbVie","Eli Lilly","Amgen","Sanofi","GSK","Boehringer Ingelheim","Daiichi Sankyo","Eisai","Chugai","Adaptimmune","Autolus","CRISPR Therapeutics","Legend Biotech","Caribou Biosciences","CARSGEN","Gracell","Century Therapeutics","Affimed","Immatics","Prime Medicine","Beam Therapeutics","Poseida","Vor Biopharma","Nkarta","4D Molecular Therapeutics","Adverum","Cellectis","Gamida Cell","Lyell Immunopharma","Selecta Biosciences","Precision BioSciences","ProQR","Atara Biotherapeutics","Zymeworks",
];
const GL_AGENCIES = [
  // 규제기관
  "FDA","EMA","NIH","NCI","PMDA","NMPA","MHRA","TGA","ANVISA",
  // 주요 바이오·제약 국가 (가중치 +1 — 국내기업명 +3에 눌리지 않는 보조 신호)
  "미국","일본","중국","영국","독일","프랑스","스위스","네덜란드",
  "벨기에","덴마크","스웨덴","핀란드","노르웨이","아일랜드","오스트리아",
  "이스라엘","싱가포르","호주","캐나다","인도","이탈리아","스페인",
  "대만","홍콩","브라질","멕시코","아르헨티나",
  // 지역
  "유럽연합","유럽의회","EU ","글로벌 빅파마","글로벌 제약",
];

const CATS = [
  { label:"임상", keys:["임상","phase","clinical","승인신청","ind ","투약 개시","first-in-human","1상","2상","3상","phase 1","phase 2","phase 3","환자 모집","환자모집","임상시험","임상연구","임상 진입","임상 개시"] },
  { label:"허가", keys:["허가","approved","approval","fda 승인","식약처 허가","breakthrough","rmat","fast track","희귀의약품","품목허가"] },
  { label:"사업", keys:["투자","유치","funding","series","ipo","억원","million","billion","deal","인수","협약","계약","mou","파트너십","업무협약","공급계약","위탁","cmo","cro","cdmo","위탁생산","위탁개발","수탁","라이선스"] },
  { label:"연구", keys:["연구","결과","논문","발표","study","data","result","전임상","preclinical","효능","비임상"] },
  { label:"파이프라인", keys:["파이프라인","pipeline","candidate","착수","도입","initiates","후보물질"] },
  { label:"제품", keys:["제품","출시","상용화","product","launch","commercial","의료기기","급여","처방","판매"] },
  { label:"특허", keys:["특허","patent","지식재산","기술이전","라이선스아웃","license out","독점권"] },
  { label:"규제", keys:["규제","가이드라인","정책","법안","고시","지침","regulation","guideline","policy","첨생법"] },
  { label:"기타", keys:[] },
];

const SOURCE_MAP = {
  "biospectator.com":"바이오스펙테이터","hitnews.co.kr":"히트뉴스",
  "medipana.com":"메디파나","yakup.com":"약업신문",
  "biotimes.co.kr":"바이오타임즈","pharmnews.com":"팜뉴스",
  "bosa.co.kr":"의학신문","dailypharm.com":"데일리팜",
  "medigatenews.com":"메디게이트","medicaltimes.com":"메디칼타임즈",
  "mdtoday.co.kr":"메디컬투데이","monews.co.kr":"의사신문",
  "doctorsnews.co.kr":"의협신문","rapportian.com":"라포르시안",
  "docdocdoc.co.kr":"청년의사","kmedinfo.co.kr":"한국의학신문",
  "paxnetnews.com":"팍스넷뉴스","thebionews.net":"더바이오",
  "kormedi.com":"코메디닷컴","healthchosun.com":"헬스조선",
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
  "chosun.com":"조선일보","joongang.co.kr":"중앙일보",
  "donga.com":"동아일보","hani.co.kr":"한겨레",
  "hankookilbo.com":"한국일보","kmib.co.kr":"국민일보",
  "munhwa.com":"문화일보","seoul.co.kr":"서울신문",
  "yonhapnews.co.kr":"연합뉴스","yna.co.kr":"연합뉴스",
  "newsis.com":"뉴시스","news1.kr":"뉴스1",
  "nocutnews.co.kr":"노컷뉴스","ohmynews.com":"오마이뉴스",
  "ytn.co.kr":"YTN","sbs.co.kr":"SBS","kbs.co.kr":"KBS",
  "mbc.co.kr":"MBC","jtbc.co.kr":"JTBC","tvchosun.com":"TV조선","mbn.co.kr":"MBN",
  "etnews.com":"전자신문","zdnet.co.kr":"ZDNet코리아","dt.co.kr":"디지털타임스",
  "venturesquare.net":"벤처스퀘어","platum.kr":"플래텀",
  "newsworks.co.kr":"뉴스웍스","newsway.co.kr":"뉴스웨이",
  "sisajournal.com":"시사저널","n.news.naver.com":"네이버뉴스","news.naver.com":"네이버뉴스",
};

// ── 유틸 ──────────────────────────────────────────────────────────────────────
const noSp = s => s.replace(/\s+/g, "");
const stripHTML = s => s ? s.replace(/<[^>]+>/g,"").replace(/&[^;]+;/g," ").replace(/\s+/g," ").trim() : "";
const sleep = ms => new Promise(r => setTimeout(r, ms));

function srcFromUrl(url) {
  try {
    const h = new URL(url).hostname.replace("www.","");
    if (SOURCE_MAP[h]) return SOURCE_MAP[h];
    const base = h.split(".").slice(-2).join(".");
    return SOURCE_MAP[base] || h.split(".")[0];
  } catch { return "기타"; }
}

function isCGT(title, desc) {
  const t  = title.toLowerCase(), tn = noSp(t);
  const ds = `${title} ${desc}`.toLowerCase(), dn = noSp(ds);
  const match = k => { const kl = k.toLowerCase(); return ds.includes(kl) || dn.includes(noSp(kl)); };
  const titleMatch = kl => t.includes(kl) || tn.includes(noSp(kl));
  if (CGT_KW.some(k => titleMatch(k.toLowerCase()))) return true;
  return CGT_KW.filter(k => match(k)).length >= 2;
}

function region(title, desc) {
  const t  = title.toLowerCase(), tn = noSp(t);
  const ds = `${title} ${desc}`.toLowerCase(), dn = noSp(ds);
  const hit = (text, ntext, kws) => kws.some(k => { const kl=k.toLowerCase(); return text.includes(kl)||ntext.includes(noSp(kl)); });
  const DEFINITIVE_KR = ["국산","국내 최초","국내 첫","국내 허가","식약처 허가","국내 개발","식약처 승인","국내 임상 1","국내 임상 2","국내 임상 3","K바이오","K-바이오"];
  if (hit(t, tn, DEFINITIVE_KR)) return "domestic";
  const sc = (text, ntext, kws, w) => kws.reduce((sum,k) => { const kl=k.toLowerCase(); return sum+(text.includes(kl)||ntext.includes(noSp(kl))?w:0); }, 0);
  const domesticScore = sc(t,tn,KR_COMPANIES,6)+sc(t,tn,KR_AGENCIES,4)+sc(t,tn,KR_INDICATORS,2)+sc(ds,dn,KR_COMPANIES,3)+sc(ds,dn,KR_AGENCIES,2)+sc(ds,dn,KR_INDICATORS,1);
  const globalScore   = sc(t,tn,GL_COMPANIES,6)+sc(t,tn,GL_AGENCIES,2)+sc(ds,dn,GL_COMPANIES,3)+sc(ds,dn,GL_AGENCIES,1);
  // 국내>=해외면 국내, 해외가 더 높으면 해외 (둘 다 0이면 국내 기본값)
  return domesticScore >= globalScore ? "domestic" : "global";
}

function classify(title, desc) {
  const s = `${title} ${desc}`.toLowerCase();
  const scored = CATS.slice(0,-1).map(cat => ({ cat, score: cat.keys.reduce((sum,k)=>sum+(s.includes(k)?1:0),0) })).filter(x=>x.score>0);
  if (!scored.length) return CATS.at(-1);
  return scored.sort((a,b)=>b.score-a.score)[0].cat;
}

// ── 클러스터링 ────────────────────────────────────────────────────────────────
const SW = new Set(["그리고","하지만","또한","위해","대해","위한","대한","통해","따라","관련","기자","뉴스","속보","단독","오늘","최근","이번","지난","현재","발표","공개","the","and","for","with","from","this","that","will","new","said"]);
const tokenize = t => t.replace(/[^\w가-힣\s]/g," ").split(/\s+/).filter(w=>w.length>=2&&!SW.has(w.toLowerCase())).map(w=>w.toLowerCase());
function isSame(a,b) { const ta=new Set(a.tokens),tb=new Set(b.tokens); let s=0; ta.forEach(x=>{if(tb.has(x))s++;}); if(s>=3)return true; const u=new Set([...ta,...tb]).size; return u>0&&s/u>=0.4; }
function cluster(items) { const cs=[]; for(const it of items){let ok=false;for(const c of cs){if(c.some(x=>isSame(x,it))){c.push(it);ok=true;break;}}if(!ok)cs.push([it]);}return cs; }

const SOURCE_PRIORITY = {
  "바이오스펙테이터":1,"히트뉴스":2,"바이오타임즈":3,"더바이오":4,
  "메디파나":10,"데일리팜":11,"팜뉴스":12,"약업신문":13,"의학신문":14,"메디게이트":15,
  "이데일리":20,"머니투데이":21,"한국경제":22,"매일경제":23,"더벨":24,
};

function pickTop(items, n) {
  return cluster(items)
    .map(c => {
      const sorted = [...c].sort((a,b) => { const pa=SOURCE_PRIORITY[a.source]??50,pb=SOURCE_PRIORITY[b.source]??50; return pa!==pb?pa-pb:new Date(b.date)-new Date(a.date); });
      const srcs = new Set(c.map(x=>x.source));
      return { ...sorted[0], sourceCount:srcs.size, allSources:[...srcs] };
    })
    .sort((a,b) => b.sourceCount!==a.sourceCount?b.sourceCount-a.sourceCount:new Date(b.date)-new Date(a.date))
    .slice(0,n);
}

// ── Naver API 호출 ────────────────────────────────────────────────────────────
async function fetchNaverQuery(query) {
  const url = `https://openapi.naver.com/v1/search/news.json?query=${encodeURIComponent(query)}&display=100&sort=date`;
  const r = await fetch(url, {
    headers: {
      "X-Naver-Client-Id":     process.env.NAVER_CLIENT_ID,
      "X-Naver-Client-Secret": process.env.NAVER_CLIENT_SECRET,
    }
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const data = await r.json();
  if (!data.items) return [];

  const weekAgo = Date.now() - 7*24*60*60*1000;
  return data.items.flatMap(it => {
    const title = stripHTML(it.title);
    const desc  = stripHTML(it.description);
    if (!isCGT(title, desc)) return [];
    const t = new Date(it.pubDate).getTime();
    if (!isNaN(t) && t < weekAgo) return [];
    const link = it.originallink || it.link || "#";
    return [{ title, link, date:it.pubDate||"", source:srcFromUrl(link), desc }];
  });
}

// ── 전체 수집 + 처리 ──────────────────────────────────────────────────────────
async function buildNews() {
  const allItems = [];
  for (const query of NAVER_QUERIES) {
    try {
      const items = await fetchNaverQuery(query);
      allItems.push(...items);
    } catch (e) {
      console.error(`Query failed [${query}]:`, e.message);
    }
    await sleep(350); // 429 방지
  }

  const deduped = [...new Map(allItems.map(i=>[i.link,i])).values()];
  deduped.forEach(it => { it.tokens = tokenize(it.title); });

  return {
    domestic: pickTop(deduped.filter(i=>region(i.title,i.desc)==="domestic"), 20),
    global:   pickTop(deduped.filter(i=>region(i.title,i.desc)==="global"),   20),
  };
}

// ── Supabase 저장 ─────────────────────────────────────────────────────────────
async function saveToSupabase(data) {
  const r = await fetch(`${process.env.SUPABASE_URL}/rest/v1/news_cache`, {
    method: "POST",
    headers: {
      "apikey":        process.env.SUPABASE_SERVICE_KEY,
      "Authorization": `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
      "Content-Type":  "application/json",
      "Prefer":        "resolution=merge-duplicates",
    },
    body: JSON.stringify({
      key:        "latest",
      data:       data,
      updated_at: new Date().toISOString(),
    }),
  });
  if (!r.ok) throw new Error(`Supabase write failed: ${r.status}`);
}

// ── Handler ───────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") { res.status(200).end(); return; }

  try {
    console.log("🔄 News refresh started");
    const data = await buildNews();
    await saveToSupabase(data);
    console.log(`✅ Saved: domestic=${data.domestic.length}, global=${data.global.length}`);
    res.json({ ok:true, domestic:data.domestic.length, global:data.global.length });
  } catch (e) {
    console.error("Refresh error:", e);
    res.status(500).json({ error: e.message });
  }
}
