'use strict';

/* ══════════════════════════════════════════
   STATE
══════════════════════════════════════════ */
let currentStep = 1;
const totalSteps = 6;

const formData = {
  goal: '',
  situation: [],   // NOW AN ARRAY for multi-select
  timeline: '',
  score: '',
  blocker: '',
  firstName: '',
  lastName: '',
  phone: '',
  email: '',
};

/* ══════════════════════════════════════════
   CONTEXT-AWARE MICRO FEEDBACK MESSAGES
══════════════════════════════════════════ */
function getMicroMessage() {
  const goal = formData.goal.toLowerCase();
  const issues = formData.situation.map(s => s.toLowerCase());
  const timeline = formData.timeline.toLowerCase();

  // Goal-based messages (Step 1 → 2)
  if (currentStep === 1) {
    if (goal.includes('home')) return pick([
      "Mapping your path to home approval…",
      "Analyzing mortgage qualification factors…",
      "Identifying home loan readiness signals…"
    ]);
    if (goal.includes('car')) return pick([
      "Analyzing auto financing factors…",
      "Evaluating rate qualification pathways…",
      "Mapping your auto approval profile…"
    ]);
    if (goal.includes('business')) return pick([
      "Assessing business funding readiness…",
      "Analyzing capital access factors…",
      "Evaluating SBA qualification signals…"
    ]);
    if (goal.includes('emergency')) return pick([
      "Prioritizing fast-track options…",
      "Scanning for fastest relief pathways…"
    ]);
    return pick([
      "Mapping your credit profile…",
      "Analyzing your qualification factors…",
      "Got it — building your profile…"
    ]);
  }

  // Issue-based messages (Step 2 → 3)
  if (currentStep === 2) {
    if (issues.some(i => i.includes('collection'))) return pick([
      "Identifying high-impact negative accounts…",
      "Analyzing collection impact on your score…",
      "Flagging potentially removable items…"
    ]);
    if (issues.some(i => i.includes('negative'))) return pick([
      "Scanning for reporting inaccuracies…",
      "Identifying disputable negative items…"
    ]);
    if (issues.some(i => i.includes('late'))) return pick([
      "Evaluating payment history impact…",
      "Analyzing late payment patterns…"
    ]);
    if (issues.some(i => i.includes('denial'))) return pick([
      "Identifying likely denial triggers…",
      "Cross-referencing common denial factors…"
    ]);
    return pick([
      "Noted — adjusting your analysis…",
      "Factoring that into your profile…",
      "Understood — updating your strategy…"
    ]);
  }

  // Timeline-based (Step 3 → 4)
  if (currentStep === 3) {
    if (timeline.includes('asap')) return pick([
      "Prioritizing fastest path to results…",
      "Activating fast-track analysis mode…"
    ]);
    if (timeline.includes('30')) return pick([
      "Setting 30-day strategy priority…",
      "Optimizing for quick turnaround…"
    ]);
    return pick([
      "Calibrating your timeline…",
      "Adjusting strategy to your schedule…"
    ]);
  }

  // Score-based (Step 4 → 5)
  if (currentStep === 4) {
    const score = formData.score.toLowerCase();
    if (score.includes('500')) return pick([
      "Identifying rebuild opportunities…",
      "Scanning for high-impact removable items…"
    ]);
    if (score.includes('600')) return pick([
      "You're closer than you think…",
      "Identifying targeted improvement areas…"
    ]);
    if (score.includes('700')) return pick([
      "Strong baseline detected — optimizing…",
      "Analyzing premium positioning options…"
    ]);
    return pick([
      "Estimating your score range…",
      "Analyzing profile patterns…"
    ]);
  }

  // Step 5 → 6
  return pick([
    "Almost there — preparing your strategy…",
    "Processing your details…",
    "Personalizing your analysis…"
  ]);
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/* ══════════════════════════════════════════
   FINAL LOADING SEQUENCE (3-5 seconds)
══════════════════════════════════════════ */
const finalLoadingPhases = [
  // Phase 1
  ["Analyzing your credit profile…", "Reviewing key factors affecting your score…"],
  // Phase 2
  ["Comparing your profile to thousands of similar cases…", "Identifying patterns in credit behavior…"],
  // Phase 3
  ["Determining your credit profile type…", "Calculating your fastest path to improvement…"],
  // Phase 4
  ["Building your personalized strategy…", "Preparing your results…"],
];
const finalMessage = "Your personalized plan is ready ✓";

/* ══════════════════════════════════════════
   DOM HELPERS
══════════════════════════════════════════ */
const $ = id => document.getElementById(id);

function updateProgress() {
  const pct = (currentStep / totalSteps) * 100;
  $('progress-fill').style.width = pct + '%';
  $('step-indicator').textContent = `Step ${currentStep} of ${totalSteps}`;
  const bar = $('progress-bar');
  if (bar) bar.setAttribute('aria-valuenow', currentStep);
}

/* ══════════════════════════════════════════
   SHOW/HIDE STEPS
══════════════════════════════════════════ */
function showStep(num) {
  document.querySelectorAll('.form-step').forEach(s => {
    s.classList.remove('active');
  });
  const step = $('step-' + num);
  if (step) {
    step.classList.remove('active');
    void step.offsetWidth;
    step.classList.add('active');
  }
  currentStep = num;
  updateProgress();
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Track step view for funnel analysis
  const stepNames = { 1:'goal', 2:'situation', 3:'timeline', 4:'score', 5:'blocker', 6:'contact' };
  if (window.trackQuizEvent) {
    window.trackQuizEvent('quiz_step_viewed', {
      step: num,
      step_name: stepNames[num] || 'unknown',
      total_steps: totalSteps,
    });
  }
}

/* ══════════════════════════════════════════
   AI FEEDBACK OVERLAY (context-aware)
══════════════════════════════════════════ */
function showMicroFeedback(callback) {
  const el = $('ai-feedback');
  const msg = $('ai-msg');
  msg.textContent = getMicroMessage();
  el.classList.add('show');
  setTimeout(() => {
    el.classList.remove('show');
    if (callback) callback();
  }, 1200);
}

/* ══════════════════════════════════════════
   FINAL AI ROTATING MESSAGES (before results)
══════════════════════════════════════════ */
function showFinalLoading(callback) {
  const el = $('ai-rotate');
  const textWrap = $('ai-rotate-text');

  // Build all phase messages dynamically
  const allMessages = [];
  finalLoadingPhases.forEach(phase => {
    const msg = pick(phase);
    allMessages.push(msg);
  });
  allMessages.push(finalMessage);

  // Build spans
  textWrap.innerHTML = allMessages.map((m, i) =>
    `<span${i === 0 ? ' class="on"' : ''}>${m}</span>`
  ).join('');

  el.classList.add('show');
  const spans = textWrap.querySelectorAll('span');
  let idx = 0;

  const iv = setInterval(() => {
    if (idx < spans.length) spans[idx].classList.remove('on');
    idx++;
    if (idx < spans.length) {
      spans[idx].classList.add('on');
    }
  }, 900);

  // Total duration: ~4.5 seconds
  setTimeout(() => {
    clearInterval(iv);
    el.classList.remove('show');
    if (callback) callback();
  }, 900 * allMessages.length);
}

/* ══════════════════════════════════════════
   CARD SELECTION LOGIC
══════════════════════════════════════════ */
function setupOptionCards() {
  /* Step 1 — Goal (single select, auto-advance) */
  bindCards('goal-options', val => {
    formData.goal = val;
    showMicroFeedback(() => showStep(2));
  }, false);

  /* Step 2 — Situation (MULTI-SELECT, manual advance) */
  bindCards('situation-options', null, true);

  /* Step 3 — Timeline (single select, show micro then advance) */
  bindCards('timeline-options', val => {
    formData.timeline = val;
    showMicroFeedback(() => showStep(4));
  }, false);

  /* Step 4 — Score (single select, show micro then advance) */
  bindCards('score-options', val => {
    formData.score = val;
    showMicroFeedback(() => showStep(5));
  }, false);
}

function bindCards(containerId, onSelect, isMulti) {
  const container = $(containerId);
  if (!container) return;
  const cards = container.querySelectorAll('.option-card');
  cards.forEach(card => {
    // Keyboard accessibility
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); card.click(); }
    });
    card.addEventListener('click', () => {
      if (isMulti) {
        // Toggle selection
        card.classList.toggle('selected');
        // Update situation array
        formData.situation = Array.from(container.querySelectorAll('.option-card.selected'))
          .map(c => c.getAttribute('data-value'));

        // If "Not sure" is selected, deselect others
        if (card.getAttribute('data-value') === 'Not sure' && card.classList.contains('selected')) {
          cards.forEach(c => {
            if (c !== card) c.classList.remove('selected');
          });
          formData.situation = ['Not sure'];
        } else if (card.getAttribute('data-value') !== 'Not sure') {
          // Deselect "Not sure" when picking specific items
          cards.forEach(c => {
            if (c.getAttribute('data-value') === 'Not sure') c.classList.remove('selected');
          });
          formData.situation = formData.situation.filter(v => v !== 'Not sure');
        }
      } else {
        // Single select — deselect siblings
        cards.forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        const val = card.getAttribute('data-value');
        setTimeout(() => onSelect(val), 250);
      }
    });
  });
}

/* Step 2 manual advance */
function advanceFromStep2() {
  if (formData.situation.length === 0) return; // require at least 1 selection
  showMicroFeedback(() => showStep(3));
}

/* ══════════════════════════════════════════
   NAVIGATION
══════════════════════════════════════════ */
function goNext() {
  if (currentStep === 5) {
    formData.blocker = $('blocker-input').value.trim();
    showMicroFeedback(() => showStep(6));
  }
}

function goBack() {
  if (currentStep > 1) {
    showStep(currentStep - 1);
  }
}

/* ══════════════════════════════════════════
   PHONE FORMATTING
══════════════════════════════════════════ */
function formatPhone(val) {
  const digits = val.replace(/\D/g, '');
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0,3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6,10)}`;
}

/* ══════════════════════════════════════════
   SCORING CONFIG — edit these values to tune
   lead classification and offer routing
══════════════════════════════════════════ */
const SCORING = {
  goals: {
    home:           { score: 15, path: 'home',              offerBias: 'mid'  },
    car:            { score: 10, path: 'auto',              offerBias: 'low'  },
    business:       { score: 12, path: 'business',          offerBias: 'high' },
    improve_credit: { score:  8, path: 'score-improvement', offerBias: 'low'  },
  },
  situations: {
    'recent denials':           { score: 20, urgency: 4, tags: ['denial'],         offerBias: 'high' },
    'collections':              { score: 18, urgency: 4, tags: ['collections'],    offerBias: 'high' },
    'low score':                { score: 15, urgency: 3, tags: ['low-score'],      offerBias: 'mid'  },
    'late payments':            { score: 15, urgency: 3, tags: ['late-payments'],  offerBias: 'mid'  },
    'negative items on report': { score: 12, urgency: 2, tags: ['negative-items'], offerBias: 'mid'  },
    'not sure':                 { score:  5, urgency: 0, tags: ['unsure'],         offerBias: 'low'  },
  },
  scores: {
    '500s':     { score: 28, urgency: 5, scoreTier: 'critical' },
    '600s':     { score: 18, urgency: 3, scoreTier: 'low'      },
    '700+':     { score:  5, urgency: 1, scoreTier: 'good'     },
    'not sure': { score: 15, urgency: 2, scoreTier: 'unknown'  },
  },
  timelines: {
    'asap':           { score: 20, urgency: 5 },
    'within 30 days': { score: 15, urgency: 4 },
    'within 60 days': { score: 10, urgency: 2 },
    'just exploring': { score:  2, urgency: 0 },
  },
  // Bonus when multiple serious issues are stacked
  stackBonus: { 3: 10, 4: 15, 5: 20 },
};

// Lead tier thresholds — adjust min values to tune offer routing
const LEAD_TIERS = [
  { min: 80, tier: 'priority', label: 'Priority',  recommendedOffer: 'executive'   },
  { min: 55, tier: 'hot',      label: 'Hot',       recommendedOffer: 'accelerated' },
  { min: 30, tier: 'warm',     label: 'Warm',      recommendedOffer: 'accelerated' },
  { min:  0, tier: 'cold',     label: 'Cold',      recommendedOffer: 'diy'         },
];

/* ══════════════════════════════════════════
   PROFILE CLASSIFICATION & LEAD SCORING
══════════════════════════════════════════ */
function classifyProfile() {
  const issues   = formData.situation.map(s => s.toLowerCase());
  const score    = formData.score.toLowerCase();
  const timeline = formData.timeline.toLowerCase();

  /* ── Compute lead score from config ── */
  let leadScore = 0;
  const blockerTags = [];

  // Goal
  const goalCfg = SCORING.goals[formData.goal.toLowerCase()];
  if (goalCfg) leadScore += goalCfg.score;

  // Situations
  issues.forEach(issue => {
    const key = Object.keys(SCORING.situations).find(k => issue.includes(k));
    if (key) {
      leadScore += SCORING.situations[key].score;
      blockerTags.push(...SCORING.situations[key].tags);
    }
  });

  // Stack bonus (3+ serious issues)
  const seriousCount = issues.filter(i => !i.includes('not sure')).length;
  if (SCORING.stackBonus[seriousCount]) leadScore += SCORING.stackBonus[seriousCount];

  // Credit score range — compare both sides lowercase, no whitespace stripping
  const scoreKey = Object.keys(SCORING.scores).find(k => score.includes(k));
  if (scoreKey) leadScore += SCORING.scores[scoreKey].score;

  // Timeline
  const timeKey = Object.keys(SCORING.timelines).find(k => timeline.includes(k));
  if (timeKey) leadScore += SCORING.timelines[timeKey].score;

  // Lead tier + recommended offer
  const tierObj = LEAD_TIERS.find(t => leadScore >= t.min) || LEAD_TIERS[LEAD_TIERS.length - 1];

  /* ── Legacy pain/profile fields (backwards compat) ── */
  const profile = score.includes('500') || issues.some(i => i.includes('collection') || i.includes('negative'))
    ? 'REBUILD'
    : score.includes('700') ? 'OPTIMIZATION' : 'RECOVERY';

  const weights = { 'collections': 3, 'negative items on report': 3, 'late payments': 2, 'low score': 2, 'recent denials': 2, 'not sure': 1 };
  let painScore = 0;
  issues.forEach(issue => {
    Object.keys(weights).forEach(k => { if (issue.includes(k) || k.includes(issue)) painScore += weights[k]; });
  });

  const painLevel = painScore >= 6 ? 'SEVERE' : painScore <= 2 ? 'LIGHT' : 'MODERATE';
  const urgency   = timeline.includes('asap') ? 'HIGH' : timeline.includes('30') ? 'MEDIUM' : timeline.includes('exploring') ? 'VERY_LOW' : 'LOW';

  return {
    profile, painLevel, painScore, urgency,
    leadScore,
    leadTier:      tierObj.tier,
    leadTierLabel: tierObj.label,
    recommendedOffer: tierObj.recommendedOffer,
    blockerTags,
  };
}

/* ══════════════════════════════════════════
   FORM VALIDATION + SUBMIT
══════════════════════════════════════════ */
function validateStep6() {
  let valid = true;
  const firstName = $('first-name').value.trim();
  const lastName  = $('last-name').value.trim();
  const phone     = $('phone').value.trim();
  const email     = $('email').value.trim();
  const consent   = $('consent').checked;

  // Reset errors
  ['first-name','last-name','phone','email'].forEach(id => {
    $(id).classList.remove('error');
    $('err-' + id.split('-')[0]).classList.remove('show');
  });
  $('consent-error').classList.remove('show');

  if (!firstName) {
    $('first-name').classList.add('error');
    $('err-first').classList.add('show');
    valid = false;
  }
  if (!lastName) {
    $('last-name').classList.add('error');
    $('err-last').classList.add('show');
    valid = false;
  }
  if (!phone || phone.replace(/\D/g,'').length < 10) {
    $('phone').classList.add('error');
    $('err-phone').classList.add('show');
    valid = false;
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    $('email').classList.add('error');
    $('err-email').classList.add('show');
    valid = false;
  }
  if (!consent) {
    $('consent-error').classList.add('show');
    valid = false;
  }

  return valid;
}

/**
 * Submit the lead to /api/submit and only advance to results on
 * confirmed 2xx + { success: true }. Prior version was fire-and-forget
 * — it redirected unconditionally, so failed Turnstile / CRM-down /
 * network errors silently dropped leads while the user saw a "you're
 * submitted" screen. Audit P0 fix.
 *
 *  - Awaits the fetch and inspects the response body.
 *  - On failure: re-enables the button, shows an inline error with
 *    retry copy, does NOT save creditData to localStorage, does NOT
 *    redirect. The form's in-memory `formData` is untouched so a retry
 *    re-sends the same payload.
 *  - On success: saves creditData, fires the analytics event, runs the
 *    AI loading animation, redirects.
 */
async function submitForm() {
  if (!validateStep6()) return;
  // C-4: if Turnstile is configured, require a valid token before submitting.
  // Without this check, a race condition lets a user click submit before the
  // async Turnstile challenge completes, backend rejects with 400, frontend
  // still redirects to results.html — silently losing the lead (Seer-flagged).
  if (window.TURNSTILE_SITE_KEY && !window.cpcTurnstileToken) {
    alert('Please wait for the security check to complete, then click submit again.');
    return;
  }

  // Capture button state for restore-on-failure.
  const btn = $('btn-submit');
  const btnOriginalHtml = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span class="ai-spinner" style="width:20px;height:20px;border-width:2px;margin-right:8px"></span> Processing…';

  // Hide any prior submit-error from a previous attempt.
  const submitErrEl = $('submit-error');
  if (submitErrEl) submitErrEl.classList.remove('show');

  formData.firstName = $('first-name').value.trim();
  formData.lastName  = $('last-name').value.trim();
  formData.phone     = $('phone').value.trim();
  formData.email     = $('email').value.trim();

  // Compute classification before saving
  const classification = classifyProfile();

  /* ── Build creditData object for results page ── */
  const creditData = {
    firstName: formData.firstName,
    lastName:  formData.lastName,
    name:      formData.firstName,
    email:     formData.email,
    phone:     formData.phone,
    goal:      formData.goal,          // canonical: 'home'|'car'|'business'|'improve_credit'
    situation: Array.isArray(formData.situation) ? formData.situation.join(', ') : formData.situation,
    situationArray: formData.situation,
    score:     formData.score,
    timeline:  formData.timeline,
    blocker:   formData.blocker,
    profile:   classification.profile,
    painLevel: classification.painLevel,
    painScore: classification.painScore,
    urgency:   classification.urgency,
    // Enhanced lead scoring fields
    leadScore:        classification.leadScore,
    leadTier:         classification.leadTier,
    leadTierLabel:    classification.leadTierLabel,
    recommendedOffer: classification.recommendedOffer,
    blockerTags:      classification.blockerTags,
  };

  /* ── Send lead data via serverless proxy (webhook URL hidden server-side) ── */
  let submitOk = false;
  try {
    const response = await fetch('/api/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        first_name: formData.firstName,
        last_name:  formData.lastName,
        full_name:  formData.firstName + ' ' + formData.lastName,
        email:      formData.email,
        phone:      formData.phone,
        goal:       formData.goal,
        situation:  creditData.situation,
        score:      formData.score,
        timeline:   formData.timeline,
        blocker:    formData.blocker,
        profile:          classification.profile,
        painLevel:        classification.painLevel,
        urgency:          classification.urgency,
        leadScore:        classification.leadScore,
        leadTier:         classification.leadTier,
        recommendedOffer: classification.recommendedOffer,
        // C-4 bot protection
        website:            (document.getElementById('cpc-website') || {}).value || '',
        cf_turnstile_token: window.cpcTurnstileToken || null,
      }),
    });
    // Successful submission requires HTTP 2xx AND a body that doesn't
    // explicitly say `{ success: false }`. The handler returns
    // `{ success: response.ok }` from the CRM call, so a CRM 502 is
    // surfaced here as a non-ok response.
    let body = {};
    try { body = await response.json(); } catch { /* tolerate empty body */ }
    submitOk = response.ok && body.success !== false;
    console.log('[CPC] Lead submission response:', response.status, submitOk);
  } catch (err) {
    console.warn('[CPC] Submit network error:', err);
    submitOk = false;
  }

  if (!submitOk) {
    // Restore the button so the user can retry. Do NOT save to
    // localStorage and do NOT redirect — we don't want the user
    // bookmarking results.html and thinking their lead was captured
    // when it wasn't.
    btn.disabled = false;
    btn.innerHTML = btnOriginalHtml;
    if (submitErrEl) submitErrEl.classList.add('show');
    if (window.trackQuizEvent) {
      window.trackQuizEvent('quiz_submit_failed', {
        goal:        formData.goal,
        score_range: formData.score,
        lead_tier:   classification.leadTier,
      });
    }
    return;
  }

  /* ⚠️ Store in localStorage for results page to read (only on success) */
  localStorage.setItem('creditData', JSON.stringify(creditData));

  /* Track conversion event (NO PII — only categorical lead attributes) */
  if (window.trackQuizEvent) {
    window.trackQuizEvent('quiz_submitted', {
      goal:             formData.goal,
      situation_count:  formData.situation.length,
      score_range:      formData.score,
      timeline:         formData.timeline,
      has_blocker_text: formData.blocker.length > 0,
      lead_tier:        classification.leadTier,
      recommended_offer: classification.recommendedOffer,
      profile:          classification.profile,
    });
  }

  console.log('[CPC] Form submitted');

  /* Show FINAL AI processing animation then redirect with URL params */
  showFinalLoading(() => {
    const goalParam = encodeURIComponent(formData.goal);
    const nameParam = encodeURIComponent(formData.firstName);
    window.location.href = `results.html?goal=${goalParam}&name=${nameParam}`;
  });
}

/* ══════════════════════════════════════════
   INIT
══════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  console.log('[CPC] Form initialized');
  setupOptionCards();
  updateProgress();

  /* Phone auto-format */
  const phoneInput = $('phone');
  if (phoneInput) {
    phoneInput.addEventListener('input', (e) => {
      const cursor = e.target.selectionStart;
      const before = e.target.value.length;
      e.target.value = formatPhone(e.target.value);
      const after = e.target.value.length;
      e.target.setSelectionRange(cursor + (after - before), cursor + (after - before));
    });
  }

  /* Clear error states on input focus */
  document.querySelectorAll('.form-input').forEach(inp => {
    inp.addEventListener('focus', () => {
      inp.classList.remove('error');
      const errId = 'err-' + inp.id.split('-')[0];
      const errEl = $(errId);
      if (errEl) errEl.classList.remove('show');
    });
  });

  /* Consent checkbox clears its error */
  const consentBox = $('consent');
  if (consentBox) {
    consentBox.addEventListener('change', () => {
      if (consentBox.checked) $('consent-error').classList.remove('show');
    });
  }
});
