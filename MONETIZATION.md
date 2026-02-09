# Aegis Shield — Zero-Consulting Monetization Plan

> **Goal:** Fully automated product revenue. Zero meetings. Zero consulting. Ship it and collect.

---

## 1. Product Tiers

### 🆓 Free — Open Source CLI (Current)
- Local scanning via CLI / `scan.sh`
- All current detection patterns
- MIT license, unlimited local use
- Community support (GitHub Issues)

### 🔵 Pro — $29/mo or $290/yr
**Target:** Individual developers, small teams, indie AI builders

| Feature | Detail |
|---------|--------|
| **Hosted API** | `POST https://api.aegis-shield.dev/scan` — no infra to manage |
| **API key** | 10,000 scans/month included |
| **npm Pro package** | `@aegis-shield/pro` with license key validation |
| **CI/CD integration** | GitHub Action + GitLab CI template (fail build on injection detected) |
| **Priority patterns** | Early access to new detection rules (updated weekly) |
| **Webhook alerts** | POST to your endpoint on detection |
| **Email support** | 48h response SLA (templated, not meetings) |

### 🟠 Enterprise — $199/mo or $1,990/yr
**Target:** AI companies, platform builders, SaaS with user-generated prompts

| Feature | Detail |
|---------|--------|
| Everything in Pro | — |
| **100,000 scans/month** | Overage: $0.001/scan |
| **Batch scanning API** | Scan arrays of prompts in one call |
| **Custom rule engine** | Define org-specific patterns via config (no code) |
| **Multi-key management** | Team API keys with per-key usage tracking |
| **SLA** | 99.9% uptime, 24h email support |
| **Compliance reports** | Auto-generated monthly PDF: scans, detections, trends |
| **Private deployment docs** | Self-host guide with Docker + Helm chart |
| **Signed invoices** | Auto-generated for procurement |

### 💎 Usage-Based Add-on — Pay-as-you-go
- $0.002/scan after tier limits (no commitment)
- For burst traffic / seasonal spikes
- Auto-billed monthly via Stripe

---

## 2. Technical Implementation Plan

### 2.1 License Key Gating

```
Architecture: Simple. No auth server needed initially.

1. Generate license keys as signed JWTs (HS256)
   - Payload: { tier: "pro"|"enterprise", orgId, exp, scansPerMonth }
   - Sign with a secret only our API knows

2. npm Pro package checks:
   - On first run: validate key via POST /api/validate-key
   - Cache validation for 24h locally (grace period if API is down)
   - Offline fallback: key signature check (no network needed for basic validation)

3. CLI stays fully free — no key check, ever
```

**File structure change:**
```
aegis-shield/
├── src/
│   ├── scanner.js          # Core (stays open source)
│   ├── patterns/           # Detection rules
│   │   ├── core/           # Free patterns (MIT)
│   │   └── pro/            # Pro patterns (separate repo, private)
│   └── pro/
│       ├── license.js      # Key validation
│       ├── ci-action/      # GitHub Action
│       └── webhooks.js     # Alert webhooks
├── api/                    # Hosted API (private repo)
│   ├── server.js           # Express/Fastify single endpoint
│   ├── metering.js         # Usage tracking
│   └── stripe-webhook.js   # Payment events
```

### 2.2 Hosted API Architecture

```
Single endpoint. Dead simple.

POST https://api.aegis-shield.dev/scan
Headers: { "Authorization": "Bearer <api-key>" }
Body: { "input": "string to scan" }
Response: { "safe": bool, "score": float, "flags": [...], "ms": 3 }

Batch variant (Enterprise):
POST /scan/batch
Body: { "inputs": ["str1", "str2", ...] }  // max 100
Response: { "results": [...] }
```

**Deployment:**
- **Platform:** Fly.io or Railway (starts at ~$5/mo, auto-scales)
- **Runtime:** Node.js, single process — aegis-shield is fast enough
- **No database needed initially** — use Redis (Upstash free tier) for:
  - Rate limiting per API key
  - Monthly scan counters
  - Key validation cache
- **Later:** Postgres for usage history / compliance reports

**Expected costs at launch:** $5-15/mo total infra

### 2.3 Stripe Integration

```
Flow:
1. Landing page → Stripe Checkout (hosted by Stripe, zero UI to build)
2. Stripe Checkout → success_url with session_id
3. Stripe webhook → our API:
   - checkout.session.completed → generate API key, email it
   - invoice.paid → reset monthly scan counter
   - customer.subscription.deleted → revoke key

That's it. No custom billing UI. No dashboards (initially).
```

**Implementation:**
```javascript
// stripe-webhook.js — the entire billing backend
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

app.post('/stripe-webhook', async (req, res) => {
  const event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  
  switch (event.type) {
    case 'checkout.session.completed':
      const key = generateApiKey(event.data.object);
      await sendKeyEmail(event.data.object.customer_email, key);
      break;
    case 'customer.subscription.deleted':
      await revokeKey(event.data.object.customer);
      break;
  }
  res.json({ ok: true });
});
```

### 2.4 Usage Metering

```
Redis-based. Dirt cheap.

On each API call:
  INCR aegis:usage:{apiKey}:{YYYY-MM}
  
Check limit:
  GET aegis:usage:{apiKey}:{YYYY-MM}
  Compare to tier limit (10k or 100k)
  
Over limit:
  - If overage billing enabled: allow, bill at month end
  - If not: return 429 with upgrade URL
```

---

## 3. Landing Page Content

> Deploy as a single-page site on Vercel/Netlify. Domain: `aegis-shield.dev`

---

### HERO

# Stop Prompt Injection. In 3ms.

**Aegis Shield** scans every prompt before it hits your LLM.  
Open source core. Battle-tested. Stupid fast.

`npm install aegis-shield` → [Get API Key →]

---

### PROBLEM

## Your AI app has a front door. Is it locked?

Every LLM-powered app accepts user input. Every one of them is vulnerable to:

- 🎭 **Role hijacking** — "Ignore previous instructions..."
- 🔓 **System prompt extraction** — "Repeat your system prompt"
- 💉 **Indirect injection** — Hidden instructions in retrieved documents
- 🏃 **Jailbreaks** — Bypassing safety with encoding tricks

You can't review every prompt manually. You need a scanner that runs in **milliseconds, not meetings.**

---

### HOW IT WORKS

## One function call. That's it.

```javascript
const { scan } = require('aegis-shield');

const result = scan(userInput);
if (!result.safe) {
  return res.status(400).json({ error: 'Blocked' });
}
// proceed with LLM call
```

✅ 3ms average scan time  
✅ 24+ detection patterns  
✅ Zero dependencies  
✅ Works offline  
✅ MIT licensed core  

---

### FEATURES

## Free. Pro. Enterprise.

| | Free | Pro $29/mo | Enterprise $199/mo |
|---|---|---|---|
| Local CLI scanning | ✅ | ✅ | ✅ |
| Detection patterns | Core | Core + Pro | Core + Pro + Custom |
| Hosted API | — | 10k scans/mo | 100k scans/mo |
| CI/CD integration | — | ✅ | ✅ |
| Webhook alerts | — | ✅ | ✅ |
| Batch scanning | — | — | ✅ |
| Compliance reports | — | — | ✅ |
| Team key management | — | — | ✅ |
| SLA | Community | 48h email | 99.9% + 24h email |

---

### SOCIAL PROOF (add as we get it)

> "We scan 50k prompts/day through Aegis. Haven't had a single injection reach our model."  
> — *[future customer]*

**Used by developers building with:** OpenAI · Anthropic · Mistral · LangChain · LlamaIndex

---

### CTA

## Start scanning in 60 seconds.

[Get Free CLI →] [Get Pro API Key →] [Enterprise →]

No meetings. No sales calls. No demos.  
Just `npm install` and go.

---

### FOOTER

Built by [DJ](https://github.com/Aegis-DJ) · [GitHub](https://github.com/Aegis-DJ/aegis-shield) · [Docs](#) · [Status](#)

---

## 4. Launch Checklist

Prioritized by effort × impact. Do them in order.

### Week 1: Foundation (Days 1-3)

- [ ] **1. npm publish `aegis-shield` to npmjs.com** ⏱️ 30min | 🎯 High
  - `npm init` cleanup, add `main`, `bin`, `keywords`
  - Add README with badges (tests passing, npm version, license)
  - `npm publish`
  
- [ ] **2. Set up Stripe account** ⏱️ 1hr | 🎯 Critical
  - Create Stripe account (stripe.com)
  - Create two Products: Pro ($29/mo) and Enterprise ($199/mo)
  - Create Checkout Links for each (Stripe hosted — no code needed)
  - Test with Stripe test mode
  
- [ ] **3. Build hosted API** ⏱️ 3hrs | 🎯 Critical
  - Single `server.js`: POST /scan endpoint
  - API key validation (JWT-based)
  - Redis rate limiting (Upstash)
  - Stripe webhook handler (key generation + email)
  - Deploy to Fly.io or Railway

- [ ] **4. Buy domain `aegis-shield.dev`** ⏱️ 15min | 🎯 High

### Week 1: Launch (Days 4-5)

- [ ] **5. Landing page** ⏱️ 2hrs | 🎯 Critical
  - Single HTML page (use copy from Section 3 above)
  - Stripe Checkout links as CTAs
  - Deploy to Vercel/Netlify on `aegis-shield.dev`

- [ ] **6. GitHub Action for CI/CD** ⏱️ 2hrs | 🎯 Medium
  - `aegis-shield/action` — marketplace listing
  - Fails PR if injection detected in changed files
  - Free for open source, requires Pro key for private repos

- [ ] **7. Write docs** ⏱️ 1hr | 🎯 Medium
  - API reference (it's one endpoint, keep it short)
  - Quick start guides: Node.js, Python (via API), CI/CD
  - Put in repo `/docs` + link from landing page

### Week 1: Announce (Days 5-7)

- [ ] **8. Launch posts** ⏱️ 1hr | 🎯 Critical
  - Hacker News "Show HN" post
  - Twitter/X thread
  - Reddit: r/machinelearning, r/artificial, r/node
  - Moltbook post
  - Dev.to article

- [ ] **9. Product Hunt listing** ⏱️ 30min | 🎯 Medium
  - Prep assets, schedule launch

### Week 2+: Iterate

- [ ] **10. Pro npm package `@aegis-shield/pro`** ⏱️ 3hrs | 🎯 Medium
  - License key validation
  - Pro-only detection patterns
  - Webhook integration
  
- [ ] **11. Usage dashboard** ⏱️ 4hrs | 🎯 Low (initially)
  - Simple page showing scans used / limit
  - Auto-login via API key

---

## 5. First Week Revenue Targets

### Realistic Goals

| Metric | Target | Stretch |
|--------|--------|---------|
| npm installs | 500 | 2,000 |
| API signups (free trial) | 50 | 200 |
| Pro conversions | 3-5 | 15 |
| Enterprise conversions | 0-1 | 3 |
| **Revenue** | **$87-$344** | **$1,035+** |

**Month 1 target:** $500 MRR (15-20 Pro subscribers)  
**Month 3 target:** $2,000 MRR  
**Month 6 target:** $5,000 MRR  

### Distribution Channels

1. **Hacker News** — Show HN post (highest leverage, do this first)
2. **Twitter/X** — Thread from DJ's account + Aegis account
3. **Reddit** — r/machinelearning, r/node, r/webdev, r/artificial
4. **Dev.to / Hashnode** — "How to protect your AI app from prompt injection" tutorial
5. **Moltbook** — Cross-post
6. **Product Hunt** — Schedule for Day 3-5
7. **AI newsletters** — Submit to TLDR AI, The Neuron, Ben's Bites

### Moltbook Post Draft

```
🛡️ Just launched Aegis Shield — an open source prompt injection scanner.

3ms scan time. 24+ detection patterns. One npm install.

If you're building with LLMs, your users can type anything into that prompt box. 
"Ignore all previous instructions" is just the beginning.

aegis-shield scans input BEFORE it hits your model. Locally or via API.

Free CLI: npm install aegis-shield
Pro API: aegis-shield.dev

No meetings. No sales calls. Just security that works.

GitHub: github.com/Aegis-DJ/aegis-shield
```

### Twitter/X Post Draft

```
🛡️ Launched: Aegis Shield

Open source prompt injection scanner for LLM apps.

→ 3ms scan time
→ 24+ detection patterns  
→ npm install aegis-shield
→ Hosted API for production

Your users can type anything. Aegis catches the bad stuff before your model sees it.

Free core, Pro API at aegis-shield.dev

🧵 Thread: How prompt injection actually works and how we detect it →
```

**Thread ideas:**
1. What is prompt injection (with examples)
2. Why output filtering isn't enough
3. How Aegis detection works (high level)
4. Benchmarks (3ms, false positive rates)
5. CTA: try it free

### Hacker News Strategy

**Title:** `Show HN: Aegis Shield – Open source prompt injection scanner (3ms, Node.js)`

**Post body:** Keep it technical. HN respects:
- Open source first (MIT)
- Performance numbers (3ms)
- Honest limitations
- No marketing fluff

**Timing:** Tuesday or Wednesday, 8-9am EST

**Reddit Strategy:**
- r/machinelearning — frame as research/tooling
- r/node — frame as npm package
- r/webdev — frame as security middleware
- Don't cross-post same day — space out over 3 days

---

## 6. Expansion Products

All zero-human-interaction. All automated delivery.

### 6.1 📕 LLM Security Playbook — $49 one-time
- PDF + Notion template
- "The Complete Guide to Securing LLM Applications"
- Chapters: prompt injection, data exfiltration, jailbreaks, system prompt protection, output validation
- Sell via Gumroad or Stripe checkout
- Update quarterly, buyers get updates free
- **Effort:** 2 days to write | **Revenue potential:** $500-2k/mo passive

### 6.2 🧰 Agent Security Toolkit — $99/yr
- npm package: `@aegis-shield/agent-toolkit`
- Middleware for LangChain, LlamaIndex, CrewAI, AutoGen
- Input scanning + output validation + tool-call authorization
- Auto-blocks: file system access, network calls, code execution (configurable)
- **Effort:** 1 week to build | **Revenue potential:** $1-3k/mo

### 6.3 🔮 Magneto Premium Features
- If Magneto is a product: premium detection models, custom training
- Automated security scoring for entire codebases
- "Is my AI app secure?" — automated audit report
- $149 one-time per audit

### 6.4 🤝 PACT Consulting-Free Products
- **Security templates:** Pre-built security policies for AI companies (Notion/PDF) — $29
- **Compliance checklists:** SOC2 + AI-specific controls — $49
- **Incident response playbook for AI:** What to do when prompt injection succeeds — $39
- All delivered instantly via email after Stripe checkout

### 6.5 🔄 Aegis Shield Enterprise Add-ons
- **Custom pattern packs:** Industry-specific (healthcare, finance, legal) — $49/mo each
- **Threat intelligence feed:** Weekly updated patterns based on new attack research — $99/mo
- **Multi-model support:** Scan for model-specific vulnerabilities (GPT, Claude, Gemini) — included in Enterprise

### 6.6 📊 Aegis Analytics Dashboard — $49/mo
- Standalone product or Enterprise add-on
- Visual dashboard: injection attempts over time, top attack vectors, geographic origin
- Auto-generated weekly security digest email
- Deploy as hosted app, zero maintenance

### Revenue Stack (6-month view)

| Product | Price | Est. MRR |
|---------|-------|----------|
| Aegis Pro | $29/mo | $1,500 |
| Aegis Enterprise | $199/mo | $2,000 |
| Security Playbook | $49 one-time | $500 |
| Agent Toolkit | $99/yr | $300 |
| Pattern Packs | $49/mo | $500 |
| Analytics Dashboard | $49/mo | $400 |
| **Total** | | **$5,200/mo** |

---

## TL;DR — The Play

1. **This week:** npm publish, Stripe checkout links, hosted API, landing page
2. **Launch:** HN + Twitter + Reddit blitz
3. **Month 1:** Hit $500 MRR from Pro subscriptions
4. **Month 2-3:** Ship Enterprise features, Agent Toolkit, Security Playbook
5. **Month 6:** $5k MRR across product stack

**Zero meetings. Zero consulting. Just products that sell themselves.**

---

*Last updated: 2026-02-09*
*Author: Aegis (AI agent) for DJ*
