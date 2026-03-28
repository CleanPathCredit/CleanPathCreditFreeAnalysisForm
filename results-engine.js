'use strict';

/* ════════════════════════════════════════════
   DEMO MODE TOGGLE
════════════════════════════════════════════ */
const DEMO_MODE = false;

const DEMO_USER = {
  firstName : 'Alex',
  lastName  : 'Johnson',
  email     : 'alex@example.com',
  phone     : '',
  goal      : 'Home',
  score     : '600s',
  timeline  : 'ASAP',
  blocker   : 'I have some collections and a few late payments on my report',
  situationArray: ['Collections', 'Late payments', 'Low score'],
  profile   : 'REBUILD',
  painLevel : 'SEVERE',
  painScore : 7,
  urgency   : 'HIGH',
};

/* ════════════════════════════════════════════
   1. LOAD USER DATA
════════════════════════════════════════════ */
function loadUser() {
  if (DEMO_MODE) { console.log('[CPC] DEMO_MODE active:', DEMO_USER); return DEMO_USER; }
  try {
    const raw = localStorage.getItem('creditData');
    if (!raw) { console.warn('[CPC] No creditData — using fallbacks.'); return {}; }
    const parsed = JSON.parse(raw);
    console.log('[CPC] Loaded from localStorage:', parsed);
    return parsed;
  } catch(e) {
    console.error('[CPC] Failed to parse creditData:', e);
    return {};
  }
}

const RAW = loadUser();

const D = {
  firstName : String(RAW.firstName || RAW.name || 'there').trim(),
  lastName  : String(RAW.lastName  || '').trim(),
  email     : String(RAW.email     || ''),
  phone     : String(RAW.phone     || ''),
  goal      : String(RAW.goal      || '').toLowerCase().trim(),
  score     : String(RAW.score     || '').toLowerCase().trim(),
  timeline  : String(RAW.timeline  || '').toLowerCase().trim(),
  blocker   : String(RAW.blocker   || '').toLowerCase().trim(),
  situation : String(RAW.situation  || '').toLowerCase().trim(),
  situationArray: (RAW.situationArray || []).map(s => s.toLowerCase()),
  profile   : String(RAW.profile   || 'RECOVERY').toUpperCase(),
  painLevel : String(RAW.painLevel || 'MODERATE').toUpperCase(),
  painScore : Number(RAW.painScore || 3),
  urgency   : String(RAW.urgency   || 'LOW').toUpperCase(),
};

console.log('[CPC] D (normalised):', D);

const goalIs  = (...k) => k.some(v => D.goal.includes(v.toLowerCase()));
const scoreIs = (...k) => k.some(v => D.score.includes(v.toLowerCase()));
const timeIs  = (...k) => k.some(v => D.timeline.includes(v.toLowerCase()));
const has     = (...k) => k.some(v => D.blocker.includes(v.toLowerCase()) || D.situation.includes(v.toLowerCase()));
const issueIs = (...k) => k.some(v => D.situationArray.some(s => s.includes(v.toLowerCase())));
const NAME    = D.firstName !== 'there' ? D.firstName : null;

/* ════════════════════════════════════════════
   2. PERSONALIZATION FUNCTIONS
════════════════════════════════════════════ */

function getHeadline() {
  // Pain-level based headlines (as specified)
  if (D.painLevel === 'SEVERE')
    return "You're closer to fixing your credit than you think — here's what's really going on…";
  if (D.painLevel === 'LIGHT')
    return "You're in a strong position — here's how to optimize your credit…";
  // MODERATE (default)
  return "A few key issues may be holding your credit back…";
}

function getSubheadline() {
  const n = NAME ? `<strong>${NAME}</strong>, based` : 'Based';
  if (goalIs('home'))     return `${n} on your responses, we identified key factors likely affecting your mortgage approval odds — and mapped out your smartest next steps.`;
  if (goalIs('business')) return `${n} on your profile, we found factors that may be limiting your access to capital — and a clear path to address them.`;
  if (goalIs('emergency'))return `${n} on what you've shared, we've prioritized your fastest available options and identified what needs to move first.`;
  return `${n} on your responses, we identified likely approval blockers, optimization opportunities, and the fastest path to stronger qualification.`;
}

function getProfileBadge() {
  if (D.profile === 'REBUILD') return {
    cls: 'rebuild',
    label: '🔴 Rebuild Phase',
    desc: 'Your profile has significant items that need to be addressed before approvals become realistic. The good news: many of these items are commonly disputable and removable.'
  };
  if (D.profile === 'OPTIMIZATION') return {
    cls: 'optimization',
    label: '🟢 Optimization Phase',
    desc: 'Your baseline is strong. The focus shifts from repair to strategic positioning — aligning your profile for the best rates and highest eligibility.'
  };
  return {
    cls: 'recovery',
    label: '🟡 Recovery Phase',
    desc: 'You\'re closer to approval than you might think. A few targeted actions could close the gap between where you are and where you need to be.'
  };
}

function getAIScore() {
  const heavyBlocker = has('collection','bankruptcy','judgment','charge-off','charged off');
  const midBlocker   = has('late','missed','balance','utiliz','denied','denial');
  if (scoreIs('500')) return { label:'Recoverable', sub:'High improvement potential', pct:0.28 };
  if (scoreIs('600')) {
    if (heavyBlocker) return { label:'Emerging', sub:'Approval blockers identified', pct:0.48 };
    if (midBlocker)   return { label:'Emerging', sub:'Targeted action needed', pct:0.52 };
    return { label:'Emerging', sub:'Close to approval threshold', pct:0.56 };
  }
  if (scoreIs('700')) {
    if (heavyBlocker||midBlocker) return { label:'Strong · Under-Optimized', sub:'Optimization opportunity detected', pct:0.74 };
    return { label:'Approval-Ready', sub:'Positioning refinement needed', pct:0.82 };
  }
  return { label:'Analysis Pending', sub:'Profile risk factors detected', pct:0.42 };
}

function getSummaryCards() {
  let items='3–7 likely factors', improve='High', time='30–60 Days';
  if (scoreIs('500')) { items='5–12 likely blockers'; improve='Very High'; time=timeIs('asap')?'Fast-Track Priority':'45–90 Days'; }
  else if (scoreIs('600')) { items='3–8 likely factors'; improve='High'; time=timeIs('asap','30')?'30–60 Days':'45–75 Days'; }
  else if (scoreIs('700')) { items='1–4 optimization gaps'; improve='Moderate–High'; time='15–45 Days'; }
  else { items='Several likely factors'; time=timeIs('asap')?'Fast-Track Priority':'30–90 Days'; }
  return [
    { icon:'⚠️', val:items,   label:'Estimated Impact\nRange' },
    { icon:'📈', val:improve, label:'Improvement\nPotential' },
    { icon:'⏱️', val:time,    label:'Estimated Time\nto Results' },
  ];
}

function getDiagnosis() {
  const items = [];
  if (scoreIs('500')) {
    items.push({ sev:'error', icon:'🚨', title:'Major Derogatory Items Likely Present',
      desc:'Profiles in the 500s typically carry collections, charge-offs, or public records that create outsized drag on approval odds. These must be addressed before meaningful approval becomes possible.'});
    items.push({ sev:'error', icon:'📉', title:'Rebuild Strategy Is the Priority',
      desc:'Getting from the 500s to approval range requires a sequenced plan: strategic removals, positive account positioning, and utilization control — in the right order for your specific goal.'});
  } else if (scoreIs('600')) {
    items.push({ sev:'warn', icon:'⚡',
      title: NAME ? `${NAME}, You're Close — But Specifically Blocked` : "You're Close — But Specifically Blocked",
      desc:'Scores in the 600s are often just a handful of targeted items away from qualifying. The gap usually isn\'t massive — it\'s precise. A focused strategy can close it faster than most people expect.'});
    items.push({ sev:'warn', icon:'🧩', title:'A Few Key Items Are Likely Holding You Back',
      desc:'One or two lingering derogatory items — or a high utilization ratio — can be the only thing between you and approval. These are directly addressable with the right approach.'});
  } else if (scoreIs('700')) {
    items.push({ sev:'ok', icon:'✅', title:'Strong Baseline — Focus Shifts to Optimization',
      desc:'You\'re in a solid position. The work shifts from repair to positioning — aligning your profile for the lowest rates and highest eligibility on the products you\'re targeting.'});
    items.push({ sev:'warn', icon:'🔍', title:'Hidden Gaps May Still Be Limiting You',
      desc:'Even 700+ profiles often carry reporting inconsistencies or utilization patterns that cap eligibility for premium products. A targeted audit surfaces and fixes these quickly.'});
  } else {
    items.push({ sev:'warn', icon:'🔍', title:'Profile Estimation In Progress',
      desc:'Our AI is running a pattern-based analysis from your inputs. A full audit will confirm the precise picture and unlock the specific actions with the highest impact for your goal.'});
  }

  if (has('collect') || issueIs('collection'))
    items.push({ sev:'error', icon:'💸', title:'Collections on File — Often Removable',
      desc:'Collection accounts are among the most commonly disputable items under the FCRA. Many can be challenged and removed entirely if reporting doesn\'t meet strict legal accuracy standards.'});
  if (has('late','missed','behind') || issueIs('late'))
    items.push({ sev:'warn', icon:'📅', title:'Payment History Pattern Detected',
      desc:'Payment history carries 35% of your score weight. Even a few late marks can significantly suppress lender confidence — and many can be addressed through goodwill strategies or accuracy challenges.'});
  if (has('balance','utiliz','maxed','high card'))
    items.push({ sev:'warn', icon:'💳', title:'High Utilization Suppressing Your Profile',
      desc:'Utilization above 30% signals risk to lenders across all bureaus. Strategic balance restructuring can produce fast, measurable score improvement — often within a single billing cycle.'});
  if (has('bankrupt','chapter'))
    items.push({ sev:'error', icon:'⚖️', title:'Bankruptcy History — Specific Strategy Required',
      desc:'Post-bankruptcy rebuilding requires a very specific sequence. Strong approval pathways still exist — they just need the right lenders and positioning to navigate correctly.'});
  if (has('denied','denial','declined','rejected') || issueIs('denial'))
    items.push({ sev:'warn', icon:'🚪', title:'Recent Denial Pattern Detected',
      desc:'Recent denials often signal a specific threshold failure — not a general problem. Identifying and addressing the exact trigger can significantly strengthen any re-application.'});
  if (has('fraud','identity','error','mistake','incorrect','inaccurate'))
    items.push({ sev:'error', icon:'🛡️', title:'Potential Reporting Error or Dispute Opportunity',
      desc:'Reporting errors are more common than most people realize. Our 3-bureau audit routinely uncovers items that are inaccurate, outdated, or legally challengeable.'});
  if (issueIs('negative'))
    items.push({ sev:'error', icon:'📊', title:'Negative Items Dragging Your Score Down',
      desc:'Negative marks on your report act as anchors that suppress your score and signal risk to lenders. Many of these items have specific legal requirements for how they must be reported — and frequently don\'t meet them.'});
  if (issueIs('low score'))
    items.push({ sev:'warn', icon:'⬇️', title:'Low Score Reducing Your Options',
      desc:'A lower credit score limits which lenders will work with you and dramatically increases the cost of borrowing. Identifying the root causes is the first step to turning this around.'});

  if (items.length < 3)
    items.push({ sev:'ok', icon:'📋', title:'Full Audit Will Surface Hidden Items',
      desc:'Even profiles that appear relatively clean often have under-the-radar issues. Our 3-bureau audit routinely finds items clients had no idea existed.'});

  return items.slice(0,4);
}

function getDiagIntro() {
  if (scoreIs('500')) return 'Based on your score range and what you described, here are the priority issues our AI flagged as most likely in your profile.';
  if (scoreIs('600')) return "Your profile is closer to approval than you might think. Here's what our AI identified as your most important blockers.";
  if (scoreIs('700')) return "Your baseline is strong. Here's where our AI found the most impactful optimization opportunities.";
  return "Based on your inputs, here's what our AI identified as the most likely factors affecting your credit profile.";
}

function getGoodNews() {
  if (D.profile === 'REBUILD') return 'Despite the severity of what we found, <strong>many of these items are commonly disputed and removed</strong>. Clients in similar situations have seen 50–100+ point improvements within 60–90 days when the right strategy is applied in the right sequence.';
  if (D.profile === 'OPTIMIZATION') return 'You\'re already in a strong position. <strong>Small, targeted adjustments</strong> — like optimizing utilization ratios and removing minor reporting inconsistencies — can unlock premium rates and higher approval tiers quickly.';
  return 'The gap between where you are and where you need to be is <strong>often much smaller than it feels</strong>. Most clients in your situation are just a few targeted actions away from a meaningful jump in their approval odds.';
}

function getUserQuoteResponse() {
  if (has('denied','denial')) return "This is something we help clients overcome every day. Denials often come from one specific threshold failure — not a broken profile. Once we identify that trigger, the path forward becomes very clear.";
  if (has('collect')) return "Collections are one of the most common — and most disputable — items on a credit report. Many don't meet the strict legal reporting standards required under the FCRA, which means they can often be challenged and removed.";
  if (has('late','missed')) return "Late payment marks are frustrating, but they're far from permanent. Between goodwill adjustments and accuracy challenges, there are proven strategies to address these — and the impact on your score can be dramatic.";
  if (has('bankrupt')) return "Bankruptcy feels like the end of the road, but it's actually a defined starting point. Specific rebuild strategies exist for every post-bankruptcy stage, and strong approval pathways open up sooner than most people realize.";
  if (has('frustrat','confus','stress','overwhelm','lost','stuck','scared','worried')) return "We hear this from clients every day — and we want you to know that feeling stuck doesn't mean you are stuck. Once you can see the specific issues and the specific path forward, everything changes.";
  return "This is exactly the kind of situation our team specializes in. Once we do a full audit, we can map out the precise actions that will have the biggest impact on your specific goal.";
}

function getOpportunity() {
  if (goalIs('home')) return {
    title:'Your Path to Home Loan Approval',
    banner:'With targeted profile improvement, <strong>mortgage approval becomes significantly more realistic</strong> — and at a materially better rate. A 40-point improvement can mean the difference between approval and denial, and <strong>thousands saved</strong> in interest over the life of a loan.',
    list:['Lower mortgage rate — 1–2% difference = $40K–$100K saved over 30 years','Stronger pre-approval odds with lenders requiring 640+, 660+, or 680+','Access to conventional loan programs currently out of reach','Reduced required down payment thresholds with an improved profile'],
    stats:[{val:'↑40–80 pts',label:'Avg Score Lift'},{val:'$200–$500',label:'Monthly Savings'},{val:'45–90 days',label:'To Mortgage-Ready'}],
  };
  if (goalIs('car')) return {
    title:'Your Path to Better Auto Financing',
    banner:'A repaired credit profile stops you from overpaying on rates that don\'t reflect your actual risk. <strong>Reducing your APR by 3–5%</strong> can mean hundreds less per month — and the difference between subprime and prime financing terms.',
    list:['Lower APR — 3–6% reduction is common after targeted improvement','Access to prime lenders instead of subprime or buy-here-pay-here','Lower monthly payment — often $100–$300+ per month in savings','Potential refinance opportunity on an existing loan at a better rate'],
    stats:[{val:'↑35–70 pts',label:'Avg Score Lift'},{val:'3–6%',label:'APR Reduction'},{val:'$100–$300',label:'Monthly Saved'}],
  };
  if (goalIs('business')) return {
    title:'Your Path to Business Funding Access',
    banner:'Business lenders evaluate personal credit heavily — often requiring 650–700+ for most products. A stronger profile unlocks <strong>SBA loans, business lines of credit, and private capital</strong> that may currently be entirely out of reach.',
    list:['SBA 7(a) and 504 loans — personal credit is a primary qualifier','Business line of credit — typically requires 650+ personal score','Better terms and lower personal guarantee exposure','Reduced collateral requirements with a stronger credit position'],
    stats:[{val:'$25K–$500K',label:'Potential Funding'},{val:'↑40–80 pts',label:'Score Lift'},{val:'60–90 days',label:'To Funding-Ready'}],
  };
  if (goalIs('credit card')) return {
    title:'Your Path to Better Credit Products',
    banner:'Premium credit cards require specific score thresholds and profile signals that go beyond just a number. We\'ll position your profile to meet the exact criteria for <strong>the products you actually want</strong>.',
    list:['Access to 0% APR introductory offers for balance transfers or purchases','Higher credit limits — strengthening your overall utilization ratio','Cash-back and rewards cards requiring 680+ or 720+','Stronger revolving profile for future loan qualification'],
    stats:[{val:'↑30–60 pts',label:'Avg Score Lift'},{val:'30–60 days',label:'Timeline'},{val:'3–5x',label:'Approval Odds Lift'}],
  };
  if (goalIs('apartment')) return {
    title:'Your Path to Rental Approval',
    banner:'Landlords use specific credit thresholds you may not be aware of — and many won\'t tell you exactly why you were denied. <strong>Removing key negative items</strong> can make the difference between denied and approved.',
    list:['Pass standard landlord credit screening (typically 580–650+)','Avoid co-signer or additional deposit requirements','Access higher-quality properties currently screening you out','Stronger rental application confidence and negotiating position'],
    stats:[{val:'↑30–60 pts',label:'Score Lift'},{val:'30–60 days',label:'Timeline'},{val:'High',label:'Approval Impact'}],
  };
  if (goalIs('personal loan')) return {
    title:'Your Path to Better Loan Terms',
    banner:'The rate difference between a poor-credit and good-credit personal loan can be 10–15% APR — which on a $10,000 loan means thousands in unnecessary interest. <strong>Improving your profile before applying</strong> has a direct, measurable dollar impact.',
    list:['Lower interest rate — often 8–15% APR difference','Higher approved loan amounts with a stronger profile','Access to reputable lenders vs. high-fee subprime alternatives','Reduced origination fees and better overall loan structure'],
    stats:[{val:'↑35–65 pts',label:'Avg Score Lift'},{val:'8–15%',label:'Rate Reduction'},{val:'30–60 days',label:'Timeline'}],
  };
  if (goalIs('emergency')) return {
    title:'Your Fastest Path Forward',
    banner:'When you need access to funds quickly, every item that can be addressed <em>is</em> a lever. <strong>Fast-track strategies</strong> exist for profiles at every stage — the goal is identifying which moves produce the most impact in the shortest window.',
    list:['Identify highest-impact items that can be addressed in 30 days or less','Rapid utilization optimization for fastest score lift','Emergency lender strategies for profiles in active repair','Priority sequencing to maximize credit access speed'],
    stats:[{val:'Fast-Track',label:'Priority Mode'},{val:'30 Days',label:'First Results'},{val:'Highest',label:'Urgency Level'}],
  };
  return {
    title:'What a Stronger Profile Unlocks',
    banner:'A repaired credit profile opens access to <strong>better rates, higher limits, and more approvals</strong> across every financial product. The gap between where you are and where you want to be is often far smaller than it feels.',
    list:['Better interest rates across all loan types','Higher approval odds with more — and better — lenders','Stronger overall financial positioning and flexibility','Access to products currently out of reach'],
    stats:[{val:'↑40–80 pts',label:'Avg Score Lift'},{val:'60–90 days',label:'To Results'},{val:'3x',label:'Approval Rate Lift'}],
  };
}

function getWhyMatters() {
  if (goalIs('home')) return {
    title:"For Home Buyers, Credit Score Is the Most Expensive Decision You Make",
    body:'A mortgage is likely the largest financial commitment you\'ll make. The difference between a 620 and a 700 credit score on a $250,000 loan can easily be <strong>$150–$200 per month in interest</strong> — and over $50,000 over the life of the loan.<br><br>More importantly: many lenders won\'t approve below 640, 660, or even 680 for conventional loans. <strong>Getting into the approval window is the first step.</strong>',
  };
  if (goalIs('car')) return {
    title:"For Auto Buyers, Credit Score Determines How Much You Actually Pay",
    body:'On a $25,000 auto loan, the difference between a 580 and a 680 credit score can mean <strong>an extra $100–$200 per month</strong> — and thousands in total interest paid over the loan term.<br><br><strong>The car isn\'t the only thing you\'re financing — you\'re financing the cost of your credit position.</strong>',
  };
  if (goalIs('business')) return {
    title:"For Business Owners, Personal Credit Is Still the Gateway to Capital",
    body:'Most small business lenders — including SBA programs — require a personal credit check. A 650 is often the floor for consideration; <strong>680+ opens significantly better terms and higher amounts.</strong><br><br>Every month that passes is a month your business may be underperforming due to capital access — not capability.',
  };
  if (goalIs('emergency')) return {
    title:"In an Urgent Situation, Strategy Moves Faster Than Desperation",
    body:'When you need credit access quickly, the instinct is to apply broadly and hope something gets approved. That strategy typically backfires — multiple inquiries and denials.<br><br><strong>A targeted approach is faster in practice.</strong> Identifying the one or two moves that produce the most leverage in the next 30 days produces better results.',
  };
  return {
    title:"Your Credit Profile Affects Every Financial Decision You Make",
    body:'Every loan, every approval, every interest rate you\'re quoted is filtered through your credit profile. A profile with unresolved issues compounds across every financial decision you make.<br><br>The fastest path is always to understand exactly what\'s there and what the highest-leverage moves are for <strong>your specific situation</strong>.',
  };
}

function getUrgency() {
  if (D.urgency === 'HIGH' || timeIs('asap')) return {
    title:'⚠️ Your Timeline Is Tight — Every Day Costs You',
    desc:'The strategies that produce results in 30 days need to start now. Waiting even one week narrows your options and may push your target past reach. This is the most important moment to act.',
  };
  if (D.urgency === 'MEDIUM' || timeIs('30 day','30days','30-day')) return {
    title:'📊 Your 30-Day Window Is Already Open',
    desc:'A 30-day credit improvement sprint requires immediate action. Bureau response cycles take 30 days — meaning every week of delay is a week of results you won\'t get.',
  };
  if (timeIs('60 day','60days','60-day')) return {
    title:'📅 60 Days Is Enough — But Only If You Start Now',
    desc:'You likely have enough runway to make meaningful moves before your target date. That window closes as you wait. Starting this week keeps your options open.',
  };
  if (timeIs('exploring','just exploring')) return {
    title:'⏳ The Best Time to Know Your Options Is Before You Need Them',
    desc:'Most people find out their credit is a problem when they\'re already in the middle of an application. Understanding where you stand now puts you in a far stronger position.',
  };
  return {
    title:'⏳ Inaction Has a Real Cost',
    desc:'Negative items continue aging into your report. Interest accrues. Approval windows tighten. There\'s no benefit to waiting — and real, measurable cost to doing so.',
  };
}

function getBookingSection() {
  if (goalIs('home'))     return { title:'Book Your Home Approval Strategy Session',     sub:"We'll walk through exactly what's blocking approval and map out the fastest path to getting mortgage-ready." };
  if (goalIs('car'))      return { title:'Book Your Rate Reduction Strategy Session',    sub:"We'll show you what may be costing you better terms and where to focus first to lower your effective APR." };
  if (goalIs('business')) return { title:'Book Your Funding Readiness Strategy Session', sub:"We'll identify what's limiting your funding access and build the strongest path to capital." };
  if (goalIs('credit card')) return { title:'Book Your Credit Optimization Session',    sub:"We'll review your profile and show you the fastest path to the products you're targeting." };
  if (goalIs('emergency')) return { title:'Get Your Fast-Track Strategy Session',       sub:"Given your urgency, we'll prioritize the highest-leverage moves and get you moving immediately." };
  return { title:'Book Your 30-Minute Credit Strategy Session', sub:"We'll walk through your profile, identify your highest-impact actions, and map out a clear, sequenced plan — no cost, no obligation." };
}

function getOnCallTitle() {
  if (goalIs('home'))     return "What We'll Cover In Your 30-Minute Home Approval Session";
  if (goalIs('business')) return "What We'll Cover In Your Funding Readiness Session";
  if (goalIs('emergency')) return "What We'll Cover In Your Fast-Track Strategy Session";
  return "What We'll Cover In Your Free 30-Minute Session";
}

/* ════════════════════════════════════════════
   3. SAFE DOM HELPERS
════════════════════════════════════════════ */
const $       = id      => document.getElementById(id);
const setText = (id, v) => { const el=$(id); if(el) el.textContent = v; };
const setHTML = (id, v) => { const el=$(id); if(el) el.innerHTML   = v; };
const setHref = (id, v) => { const el=$(id); if(el) el.href        = v; };

/* ════════════════════════════════════════════
   4. RENDER
════════════════════════════════════════════ */
function render() {
  console.log('[CPC] render() start');

  /* Hero */
  setHTML('hero-headline', getHeadline());
  setHTML('hero-sub',      getSubheadline());

  /* Ring */
  const ai = getAIScore();
  const circumf = 2 * Math.PI * 48;
  setText('ring-val', ai.label);
  setText('ring-sub', ai.sub);
  setTimeout(() => {
    const rf = $('ring-fill');
    if (rf) rf.style.strokeDashoffset = circumf - (circumf * ai.pct);
  }, 900);

  /* Profile badge */
  const badge = getProfileBadge();
  const bw = $('profile-badge-wrap');
  if (bw) {
    bw.innerHTML = `<div class="profile-badge ${badge.cls}">
      <div class="pb-dot"></div>
      <div><div class="pb-text">${badge.label}</div><div class="pb-desc">${badge.desc}</div></div>
    </div>`;
  }

  /* Summary cards */
  const fg = $('findings-grid');
  if (fg) {
    fg.innerHTML = '';
    getSummaryCards().forEach((f, i) => {
      const d = document.createElement('div');
      d.className = 'finding-item';
      d.innerHTML = `<div class="fi-icon">${f.icon}</div>
        <div class="fi-val grad-text">${f.val}</div>
        <div class="fi-label">${f.label.replace('\n','<br>')}</div>`;
      fg.appendChild(d);
      setTimeout(() => d.classList.add('on'), 500 + i * 220);
    });
  }

  /* Diagnosis */
  setHTML('diag-intro', getDiagIntro());
  const di = $('diag-items');
  if (di) {
    di.innerHTML = '';
    getDiagnosis().forEach((d, i) => {
      const cls = d.sev === 'error' ? '' : d.sev;
      const el  = document.createElement('div');
      el.className = `diag-item ${cls}`;
      el.innerHTML = `<div class="di-icon">${d.icon}</div>
        <div><div class="di-title">${d.title}</div>
             <div class="di-desc">${d.desc}</div></div>`;
      di.appendChild(el);
      setTimeout(() => el.classList.add('on'), 300 + i * 160);
    });
  }

  /* Good news block */
  const gnEl = $('good-news');
  if (gnEl) {
    gnEl.style.display = 'block';
    setHTML('gn-body', getGoodNews());
  }

  /* User input quote */
  if (D.blocker && D.blocker.length > 5) {
    const quoteCard = $('user-quote-card');
    if (quoteCard) {
      quoteCard.style.display = 'block';
      // Show original text (capitalize first letter)
      const originalBlocker = String(RAW.blocker || '').trim();
      setHTML('uq-text', '"' + originalBlocker + '"');
      setHTML('uq-response', getUserQuoteResponse());
    }
  }

  /* Opportunity */
  const opp = getOpportunity();
  setHTML('opp-title',  opp.title);
  setHTML('opp-banner', opp.banner);
  const ol = $('opp-list');
  if (ol) ol.innerHTML = opp.list.map(item => `<li>${item}</li>`).join('');
  const os = $('opp-stats');
  if (os) os.innerHTML = opp.stats.map(s =>
    `<div class="opp-stat"><div class="os-val grad-text">${s.val}</div><div class="os-label">${s.label}</div></div>`
  ).join('');

  /* Why It Matters */
  const wm = getWhyMatters();
  setHTML('wm-title', wm.title);
  setHTML('wm-body',  wm.body);

  /* Urgency */
  const urg = getUrgency();
  setText('urgency-title', urg.title);
  setText('urgency-desc',  urg.desc);

  /* Booking section */
  const bk = getBookingSection();
  setHTML('booking-title', bk.title);
  setText('booking-sub',   bk.sub);

  /* On-call title */
  setText('oncall-title', getOnCallTitle());

  /* Calendar stub links */
  const evT = encodeURIComponent('Credit Strategy Session — Clean Path Credit');
  const evD = encodeURIComponent('Personalized credit strategy session with Clean Path Credit');
  setHref('cal-google',  `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${evT}&details=${evD}`);
  setHref('cal-outlook', `https://outlook.live.com/calendar/0/deeplink/compose?subject=${evT}&body=${evD}`);
  setHref('cal-apple',
    'data:text/calendar;charset=utf8,' + encodeURIComponent(
      'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\n' +
      'SUMMARY:Credit Strategy Session\r\n' +
      'DESCRIPTION:Personalized credit strategy session with Clean Path Credit\r\n' +
      'END:VEVENT\r\nEND:VCALENDAR'));

  console.log('[CPC] render() complete');
}

/* ════════════════════════════════════════════
   5. SCROLL REVEAL + SCROLL INDICATOR
════════════════════════════════════════════ */
function initReveal() {
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => { if(e.isIntersecting){ e.target.classList.add('on'); obs.unobserve(e.target); }});
  }, { threshold: 0.06 });
  document.querySelectorAll('.reveal').forEach(el => obs.observe(el));
}

function initScrollIndicator() {
  const indicator = $('scroll-indicator');
  if (!indicator) return;
  let hidden = false;
  window.addEventListener('scroll', () => {
    if (window.scrollY > 200 && !hidden) {
      indicator.classList.add('hidden');
      hidden = true;
    } else if (window.scrollY <= 200 && hidden) {
      indicator.classList.remove('hidden');
      hidden = false;
    }
  }, { passive: true });
}

/* ════════════════════════════════════════════
   6. PAGE LOADER
════════════════════════════════════════════ */
function runLoader() {
  const loader = $('page-loader');
  const msgs   = $('loader-msgs');
  if (!loader || !msgs) return;
  const spans = msgs.querySelectorAll('span');
  if (!spans.length) return;
  let idx = 0;
  const iv = setInterval(() => {
    spans[idx].classList.remove('on');
    idx = (idx + 1) % spans.length;
    spans[idx].classList.add('on');
  }, 560);
  setTimeout(() => {
    clearInterval(iv);
    loader.classList.add('out');
    setTimeout(() => { if(loader.parentNode) loader.remove(); }, 700);
  }, 2200);
}

/* ════════════════════════════════════════════
   7. BOOT
════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  console.log('[CPC] DOMContentLoaded — booting results page');
  runLoader();
  render();
  initReveal();
  initScrollIndicator();
});
