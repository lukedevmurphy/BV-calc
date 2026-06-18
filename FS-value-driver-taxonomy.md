# Financial-Services Value-Driver Taxonomy

For upload to Claude Code. This defines the **value-driver layer** that sits between use
cases and financial outcomes — the McKinsey-style value tree. Use cases roll up into value
drivers; value drivers roll up into a financial outcome. A single use case MAY feed multiple
drivers.

This is illustrative scaffolding, not sourced benchmarks. Any percentage here is a starting
prior to be flagged "conservative/base/optimistic — user to verify," never presented as a
cited fact.

---

## The five core value drivers (apply across all FS sub-industries)

Each driver maps to a financial outcome and a default reinvestment posture. The
reinvestment toggle (capacity vs. offset) re-routes which outcome the value lands in.

| Driver | Financial outcome | If "reinvest as capacity" | If "offset / cost-out" |
|---|---|---|---|
| **Productivity / efficiency** | Operating margin | freed hours → more output, same cost | freed hours → headcount offset |
| **Revenue growth** | Top-line revenue | more advisor/banker capacity → more production | n/a (growth is inherently capacity) |
| **Cross-sell / up-sell** | Revenue per customer | better insight → higher attach rate | n/a |
| **Customer onboarding / speed** | Revenue (faster) + margin | faster onboarding → faster revenue recognition | fewer FTEs per onboard |
| **Risk / compliance cost avoidance** | Operating margin + loss avoidance | analysts redeployed to higher-value work | reduced compliance headcount / fewer fines |

---

## Sub-industry → which drivers dominate + sector vocabulary

The taxonomy already has sub-industry labels for the top-down model. This extends it with
the **driver weighting** (which drivers matter most for that sector) and the sector-specific
name for each driver.

### Diversified bank
- Dominant drivers: productivity (back/middle office), risk/compliance avoidance, cross-sell
- Vocabulary: "cost-to-serve", "efficiency ratio", "fee income per customer", "loss-given-default avoidance"
- Top financial outcome: efficiency ratio improvement → operating income

### Investment bank
- Dominant drivers: productivity (deal teams, research), revenue growth (deal throughput)
- Vocabulary: "deal team hours", "pitch/coverage throughput", "research analyst capacity"
- Top outcome: revenue per banker / deals per team

### Brokerage / wealth platform
- Dominant drivers: productivity (advisor support), cross-sell, onboarding speed
- Vocabulary: "advisor productivity", "households per advisor", "time-to-fund", "share of wallet"
- Top outcome: AUM growth + cost-to-serve

### Credit union
- Dominant drivers: productivity (member servicing), onboarding speed, risk/compliance
- Vocabulary: "cost-to-serve per member", "members per FTE", "loan-decision time", "non-interest expense ratio"
- Top outcome: non-interest expense ratio → member value returned
- NOTE: member-owned, not-for-profit — frame value as "returned to members / lower fees", not "profit"

### Asset / wealth manager
- Dominant drivers: productivity (research, client reporting), cross-sell, onboarding
- Vocabulary: "research analyst capacity", "client-reporting hours", "AUM per employee", "net new assets"
- Top outcome: operating margin + net new assets

### Card / payments network
- Dominant drivers: productivity (ops, dispute handling), risk/fraud avoidance, onboarding (merchant)
- Vocabulary: "payments volume", "take-rate", "dispute-resolution cost", "merchant onboarding time", "fraud-loss avoidance"
- Top outcome: net revenue (volume × take-rate) + fraud-loss avoidance
- NOTE: value is volume-driven, NOT headcount-driven — productivity here is ops efficiency on a fixed transaction base

### Insurance (carrier) — add if you want broader FS coverage
- Dominant drivers: productivity (underwriting, claims), risk (loss-ratio), onboarding (policy issuance)
- Vocabulary: "underwriting cycle time", "claims-handling cost", "combined ratio", "policy-issuance time"
- Top outcome: combined ratio improvement

### Payments fintech / neobank — add if you want broader coverage
- Dominant drivers: onboarding speed, productivity (support), risk/fraud
- Vocabulary: "cost-to-acquire", "support-ticket deflection", "KYC/onboarding time", "fraud-loss rate"
- Top outcome: cost-to-serve + activation rate

---

## Use-case → driver mapping (the matrix to surface in the UI)

Each existing use case feeds one or more drivers. This is the middle layer to make visible.
(Illustrative; refine per engagement.)

| Use case | Feeds driver(s) |
|---|---|
| Client meeting prep & briefing books | productivity, cross-sell |
| RFP / DDQ response drafting | productivity, revenue growth (win rate) |
| Investment research summarization | productivity, cross-sell (better advice) |
| Portfolio commentary & client letters | productivity, onboarding/retention |
| KYC / onboarding document review | onboarding speed, risk/compliance, productivity |
| Regulatory change monitoring | risk/compliance, productivity |
| Pitch book / proposal generation | productivity, revenue growth |
| Fund performance & attribution Q&A | productivity, cross-sell |
| Credit memo / underwriting draft | productivity, onboarding speed, risk |
| Dispute / fraud triage (payments) | productivity, risk/fraud avoidance |

---

## The reinvestment assumption (the key Settings toggle)

Single most important and most-contested assumption. Surface it explicitly:

**"How is freed time realized?"**
- **Capacity (reinvest):** freed hours become additional output at the same cost. Value flows
  to revenue growth / production. The optimistic, growth-oriented framing. CHRO-friendly.
- **Offset (cost-out):** freed hours reduce required headcount or avoid future hiring. Value
  flows to operating margin / cost reduction. The conservative, CFO-friendly framing.
- **Blend:** a user-set split (e.g. 60% capacity / 40% offset).

This toggle must RE-ROUTE value to a different financial outcome, not merely scale it. Two
firms with identical use cases and identical hours saved will show different driver mixes
depending on this single setting — and that is correct, defensible modeling. Default to a
blend, and show the user how the headline value and its *composition* shift when they move it.
