# Business Model & Monetization Strategy

**Document Version:** 1.0
**Last Updated:** January 2026
**Status:** Draft for Review

---

## 1. Executive Summary

[Platform Name] is a comprehensive SaaS platform for physiological testing, training program generation, and athlete management. The platform serves individual coaches, testing labs, sports clubs, national federations, and individual fitness enthusiasts across 17+ sports.

**Core Value Proposition:**
- Professional-grade physiological testing (VO2max, lactate thresholds, training zones)
- AI-powered training program generation with multiple methodologies
- Multi-sport support with sport-specific protocols
- Complete athlete management ecosystem
- Fast program capture via photo, audio, screenshot, text, or forms

---

## 2. Target Customer Segments

### 2.1 Individual Coaches & Personal Trainers
- Running coaches, cycling coaches, triathlon coaches
- Personal trainers with endurance athletes
- Sport-specific coaches (football, hockey, tennis, etc.)
- **Estimated market:** 10,000+ in Scandinavia alone

### 2.2 Testing Labs & Sports Medicine Clinics
- Physiological testing facilities
- Sports medicine practices
- University exercise science departments
- Rehabilitation centers
- **Estimated market:** 500-1,000 in Scandinavia

### 2.3 Sports Clubs & Teams
- Professional and semi-professional sports teams
- Youth academies
- Multi-sport clubs
- **Estimated market:** 5,000+ clubs in Scandinavia

### 2.4 National Federations & Elite Programs
- National sports federations
- Olympic/Paralympic programs
- Elite training centers
- **Estimated market:** 100+ federations, customized enterprise deals

### 2.5 Individual Users (B2C)
Direct-to-consumer athletes and fitness enthusiasts:

- **Runners** - Marathon, ultra, trail, recreational runners wanting structured training
- **CrossFitters** - Athletes seeking periodized strength + conditioning
- **HYROX Athletes** - Hybrid fitness competitors needing specialized programming
- **Strength Training** - Powerlifters, bodybuilders, general strength enthusiasts
- **Weight Loss** - Individuals wanting AI-guided fitness and nutrition plans
- **General Fitness** - Health-conscious individuals wanting professional guidance

**Key differentiator for B2C:** AI creates personalized workouts and programs on-the-fly, adapting to user feedback, schedule changes, and progress. Fast program capture allows users to input existing programs via:
- Photo (snap a workout from a whiteboard or magazine)
- Audio (dictate a workout verbally)
- Screenshot (import from social media or other apps)
- Text (paste workout descriptions)
- Forms (structured input)

**Estimated market:** 500,000+ fitness-active individuals in Scandinavia

---

## 3. Revenue Streams

### 3.1 Primary Revenue: Coach/Business Subscriptions

| Tier | Monthly | Yearly | Athletes | Target Segment |
|------|---------|--------|----------|----------------|
| **FREE** | 0 kr | 0 kr | 1 | Trial users, hobbyists |
| **BASIC** | 499 kr | 4,990 kr | 20 | Individual coaches |
| **PRO** | 1,499 kr | 14,990 kr | 100 | Small clinics, multi-coach businesses |
| **ENTERPRISE** | Custom | Custom | Unlimited | Federations, large organizations |

**Yearly discount:** ~17% (approximately 2 months free)

### 3.2 Secondary Revenue: Athlete Subscriptions

Athletes can subscribe directly or be managed through their coach's account.

| Tier | Monthly | Yearly | Key Features |
|------|---------|--------|--------------|
| **FREE** | 0 kr | 0 kr | View programs, basic access |
| **STANDARD** | 199 kr | 1,990 kr | AI chat (50 msg/mo), Strava/Garmin sync, workout logging, daily check-ins |
| **PRO** | 399 kr | 3,990 kr | AI chat (500 msg/mo), video analysis, full integration sync |

### 3.3 Revenue Sharing Model

When coaches/businesses onboard athletes who pay subscriptions:

| Coach Tier | Coach Share | Platform Share | Notes |
|------------|-------------|----------------|-------|
| **BASIC** | 70% | 30% | Fixed rate |
| **PRO** | 70% | 30% | Fixed rate |
| **ENTERPRISE** | 75-85% | 15-25% | Negotiated per contract |

**Payment Flow:**
1. Athlete pays subscription via Stripe
2. Platform processes payment (Stripe fee ~2.9% + 3 kr)
3. Coach share transferred via Stripe Connect
4. Platform retains platform share

**Example (STANDARD athlete at 199 kr/mo via BASIC coach):**
- Gross: 199 kr
- Stripe fee: ~9 kr
- Net: ~190 kr
- Coach receives: 133 kr (70%)
- Platform receives: 57 kr (30%)

### 3.4 Direct Athlete Revenue

Athletes who register directly on the platform (not via a coach):
- 100% of subscription revenue goes to platform
- Platform provides AI services using platform API keys
- Higher margin but requires direct marketing investment

---

## 4. AI Cost Structure & Regulation

### 4.1 BYOK (Bring Your Own Key) Model for Coaches

Coaches/businesses provide their own API keys for:
- OpenAI (GPT models)
- Anthropic (Claude models)
- Google (Gemini models)

**Benefits:**
- Coaches control their AI costs
- No platform liability for AI usage
- Coaches can choose preferred providers
- Enterprise clients often have negotiated API rates

**Implementation:**
- API keys stored encrypted in database
- Per-coach/business key configuration
- Fallback to platform keys if coach keys not configured

### 4.2 Platform-Provided AI for Direct Athletes

For athletes registered directly (not via coach):
- Platform provides AI services using platform API keys
- Costs must stay within subscription margin

**Usage Limits (to ensure profitability):**

| Tier | AI Messages/Month | Estimated Max Cost | Subscription | Margin |
|------|-------------------|-------------------|--------------|--------|
| STANDARD | 50 | ~1 kr ($0.10) | 199 kr | 198 kr |
| PRO | 500 | ~10 kr ($1.00) | 399 kr | 389 kr |

**Cost calculation assumptions:**
- Average message: ~1,000 input tokens + 500 output tokens
- **Default model: Gemini 3 Flash** ($0.075/$0.30 per M tokens)
- Per message cost: ~$0.0002-0.0005
- 500 messages × $0.002 = ~$1 typical cost

**Smart Model Routing:**
| Task | Model | Why |
|------|-------|-----|
| Daily chat, quick questions | Gemini 3 Flash | Ultra-low cost, fast |
| Workout adjustments | Gemini 3 Flash | Simple logic |
| Program generation | Claude Sonnet 4.5 | Complex reasoning needed |
| Deep research, analysis | Claude Opus 4.5 | Maximum capability |
| Video analysis | Claude Sonnet/Opus | Multimodal understanding |

This routing strategy keeps costs minimal for 90%+ of interactions while reserving expensive models for high-value tasks.

**Safety mechanisms:**
- Hard limits enforced at tier boundaries
- Automatic switch to cheaper models (Haiku) when approaching limits
- Usage alerts at 80% of monthly allowance
- Graceful degradation (reduced response length) near limits

### 4.3 AI Model Pricing Reference (January 2026)

**Anthropic Claude Models:**

| Model | Input (per 1M tokens) | Output (per 1M tokens) | Best For |
|-------|----------------------|------------------------|----------|
| Claude Opus 4.5 | $5.00 | $25.00 | Complex analysis, research |
| Claude Sonnet 4.5 | $3.00 | $15.00 | General use, balanced |
| Claude Haiku 4.5 | $1.00 | $5.00 | Fast responses, simple tasks |

**Cost-Saving Options:**
- **Prompt Caching:** 90% savings on repeated prompts ($0.50/M for cache reads)
- **Batch Processing:** 50% discount for async bulk operations

**OpenAI Models:**

| Model | Input (per 1M tokens) | Output (per 1M tokens) |
|-------|----------------------|------------------------|
| GPT-5-mini | $0.25 | $2.00 |
| GPT-5.2 | $1.75 | $14.00 |

**Google Gemini Models:**

| Model | Input (per 1M tokens) | Output (per 1M tokens) |
|-------|----------------------|------------------------|
| Gemini 3 Pro | $1.25 | $5.00 |
| Gemini 3 Flash | $0.075 | $0.30 |

### 4.4 AI Budget Management System

The platform includes comprehensive AI cost tracking:
- Monthly budget limits per user (USD)
- Per-category limits (research, chat, embedding)
- Usage logging by provider and model
- Alert thresholds (default: 80% of budget)
- Monthly automatic reset

---

## 5. Feature Matrix by Tier

### 5.1 Coach Subscription Features

| Feature | FREE | BASIC | PRO | ENTERPRISE |
|---------|------|-------|-----|------------|
| Lactate tests & reports | ✓ | ✓ | ✓ | ✓ |
| Training zones | ✓ | ✓ | ✓ | ✓ |
| Basic training programs | ✓ | ✓ | ✓ | ✓ |
| Email support | ✓ | ✓ | ✓ | ✓ |
| AI program generation | - | Basic | Full | Full |
| AI Studio | - | - | ✓ | ✓ |
| Video analysis | - | - | ✓ | ✓ |
| White-label reports | - | - | ✓ | ✓ |
| Multiple coaches | - | - | ✓ | ✓ |
| Team management | - | - | ✓ | ✓ |
| Custom branding | - | - | ✓ | ✓ |
| API access | - | - | ✓ | ✓ |
| Priority support | - | ✓ | ✓ | ✓ |
| Dedicated account manager | - | - | - | ✓ |
| Custom integrations | - | - | - | ✓ |
| SLA guarantee | - | - | - | ✓ |
| On-premise option | - | - | - | ✓ |

### 5.2 Athlete Subscription Features

| Feature | FREE | STANDARD | PRO |
|---------|------|----------|-----|
| View training programs | ✓ | ✓ | ✓ |
| AI chat support | - | 50 msg/mo | 500 msg/mo |
| AI workout generation | - | ✓ | ✓ |
| Video analysis | - | - | ✓ |
| Strava sync | - | Basic | Full |
| Garmin sync | - | Basic | Full |
| Workout logging | - | ✓ | ✓ |
| Daily check-ins | - | ✓ | ✓ |
| Program capture (photo/audio) | - | ✓ | ✓ |

---

## 6. Unique Selling Points (USPs)

### 6.1 Comprehensive Physiological Testing Suite
- **VO2max testing** with professional-grade reports
- **Lactate threshold detection** (anaerobic threshold = 2nd crossing of 4 mmol/L)
- **D-max threshold calculation** for advanced analysis
- **Multi-sport support:** Running (speed), Cycling (power), Skiing (pace)
- **11+ ergometer protocols:** 4x4 intervals, CP tests, 2K TT, MAP ramp, etc.

### 6.2 Multi-Methodology Training Engine
Four science-backed training approaches:
- **Polarized (80/20):** High-low intensity distribution
- **Norwegian Method:** Double-threshold sessions, singles protocol
- **Canova Method:** Special block periodization
- **Pyramidal:** Traditional progressive approach

### 6.3 AI-Powered Programming
- **On-the-fly workout generation** - AI creates personalized workouts instantly
- **Claude & Gemini integration** for intelligent program generation
- **Document RAG:** Upload research papers, training manuals for contextual AI responses
- **AI Coach:** Athlete-facing chat support for training questions
- **AI Studio:** Coach interface for complex program creation

### 6.4 Fast Program Capture
Multiple ways to input programs quickly:
- **Photo capture** - Snap a workout from whiteboard, book, or screen
- **Audio input** - Dictate workouts verbally
- **Screenshot import** - Grab workouts from social media or other apps
- **Text paste** - Copy/paste workout descriptions
- **Structured forms** - Traditional input with validation

### 6.5 Video Analysis with AI
- **Running gait analysis** with MediaPipe + Gemini
- **Skiing technique evaluation**
- **HYROX station analysis**
- **Automated feedback generation**

### 6.6 17-Sport Support
**Endurance:** Running, Cycling, Triathlon, Swimming, Cross-country skiing, Rowing
**Team Sports:** Football, Handball, Hockey, Basketball, Volleyball, Floorball
**Racket Sports:** Tennis, Padel, Badminton
**Hybrid:** HYROX, CrossFit-style training

### 6.7 Complete Ecosystem
- Coach dashboard with client management
- Athlete portal with workout logging
- External integrations (Strava, Garmin, Concept2, VBT devices)
- Calendar system with race events and altitude camps
- Injury management with Delaware pain rules
- HRV/RHR monitoring and readiness assessment

---

## 7. Competitive Positioning

### 7.1 Competitors

| Competitor | Strength | Weakness vs. Us |
|------------|----------|-----------------|
| TrainingPeaks | Established, large user base | No physiological testing, limited AI |
| Today's Plan | Good analytics | No lab testing integration |
| Final Surge | Budget-friendly | Limited features |
| Lactate.com | Good lactate analysis | Single-purpose, no training programs |
| Volt Athletics | Good strength programming | No endurance focus |
| Custom spreadsheets | Flexible | No automation, no AI, error-prone |

### 7.2 Our Differentiation

1. **All-in-one platform:** Testing + Programming + Management + AI
2. **Science-backed:** Proper threshold calculations, multiple methodologies
3. **AI-native:** Not bolted on - designed from ground up with AI
4. **Multi-sport:** Not just endurance - team sports, racket sports, HYROX
5. **Fast capture:** Photo, audio, screenshot input for rapid program entry
6. **Scandinavian focus:** Swedish/Norwegian language, local market understanding
7. **Modern tech stack:** Next.js 15, real-time updates, mobile-responsive

---

## 8. Pricing Strategy

### 8.1 Freemium Model
- FREE tier allows trial without commitment
- Limited to 1 athlete to encourage upgrade
- Full testing functionality to demonstrate value

### 8.2 Value-Based Pricing
- BASIC (499 kr/mo) ≈ cost of 1-2 hours of coaching time
- PRO (1,499 kr/mo) ≈ revenue from 3-4 athlete subscriptions
- ROI is clear: platform pays for itself with minimal athlete base

### 8.3 Yearly Discount
- 17% discount (~2 months free) for annual commitment
- Improves cash flow predictability
- Reduces churn through longer commitment

### 8.4 Enterprise Custom Pricing

Factors for enterprise pricing:
- Number of athletes/coaches
- Custom integration requirements
- Support level (dedicated manager, SLA)
- White-labeling depth
- On-premise vs. cloud deployment
- Revenue sharing negotiation

**Typical enterprise range:** 10,000 - 100,000+ kr/month depending on scale

---

## 9. Payment Infrastructure

### 9.1 Stripe Integration
- **Stripe Checkout:** For subscription sign-ups
- **Stripe Billing Portal:** Self-service subscription management
- **Stripe Connect:** Revenue sharing with coaches/businesses
- **Stripe Webhooks:** Real-time payment event processing

### 9.2 Supported Events
- `checkout.session.completed` - New subscription
- `customer.subscription.updated` - Plan changes
- `customer.subscription.deleted` - Cancellation
- `invoice.payment_succeeded` - Successful renewal
- `invoice.payment_failed` - Failed payment (triggers email)

### 9.3 Multi-Currency (Future)
- Current: SEK only
- Planned: EUR, NOK, DKK for Nordic expansion
- Stripe handles currency conversion

---

## 10. Referral System

### 10.1 Coach Referral Program
- Unique referral codes per coach
- Reward types: subscription discount, cash bonus, extended trial
- Tracking: pending → completed → reward granted

### 10.2 Referral Incentives (Proposed)
- **Referrer:** 1 month free or 500 kr credit
- **Referred:** Extended 30-day trial (vs. standard 14-day)
- **Volume bonus:** Extra rewards at 5, 10, 25 referrals

---

## 11. Key Metrics to Track

### 11.1 Revenue Metrics
- MRR (Monthly Recurring Revenue)
- ARR (Annual Recurring Revenue)
- ARPU (Average Revenue Per User)
- Revenue by tier breakdown
- Revenue share payouts to coaches

### 11.2 Growth Metrics
- New sign-ups (coach & athlete)
- Conversion rate (FREE → paid)
- Tier upgrade rate
- Churn rate by tier

### 11.3 Engagement Metrics
- Daily/Monthly active users
- Tests created per coach
- Programs generated
- AI chat messages
- Video analyses performed

### 11.4 AI Cost Metrics
- Total AI spend (platform keys)
- Average AI cost per athlete
- AI usage by feature (chat, research, video)
- Cost per tier vs. revenue per tier

---

## 12. Legal & Compliance

### 12.1 GDPR Compliance
- Data processing agreements with customers
- Right to data portability
- Right to erasure
- Privacy policy and terms of service

### 12.2 Data Security
- Encrypted API key storage
- Secure authentication (Supabase Auth)
- Regular security audits
- SOC 2 compliance (enterprise requirement)

### 12.3 Health Data Considerations
- Physiological test data is health-related
- May require additional consent mechanisms
- Consider HIPAA-like safeguards for US expansion

---

## 13. Roadmap Considerations

### 13.1 Near-term (0-6 months)
- Finalize platform branding/name
- Launch beta with Star by Thomson
- Refine pricing based on feedback
- Build case studies

### 13.2 Medium-term (6-18 months)
- Nordic expansion (Norway, Denmark, Finland)
- Mobile app (React Native)
- Additional integrations (Wahoo, Polar, Whoop)
- Enterprise sales motion
- B2C marketing for individual users

### 13.3 Long-term (18+ months)
- European expansion
- API marketplace for third-party integrations
- Certification/education programs for coaches
- Acquisition or partnership opportunities

---

## 14. Open Questions

1. **Platform name** - needs to be decided
2. **Exact enterprise pricing tiers** - needs market research
3. **International payment methods** - Swish, Klarna, iDEAL?
4. **Insurance/liability** - for AI-generated training advice
5. **Certification program** - revenue opportunity?
6. **B2C marketing strategy** - channels for reaching individual users

---

## Appendix A: Database Models

Key subscription-related models in `prisma/schema.prisma`:
- `Subscription` - Coach subscriptions
- `AthleteSubscription` - Athlete subscriptions
- `Business` - Business entities for revenue sharing
- `BusinessMember` - Multi-user business accounts
- `AIUsageBudget` - AI cost tracking per user
- `AIUsageLog` - Detailed AI usage logging
- `ReferralCode`, `Referral`, `ReferralReward` - Referral system

## Appendix B: Key Code Files

| Purpose | Location |
|---------|----------|
| Coach Stripe integration | `lib/payments/coach-stripe.ts` |
| Athlete Stripe integration | `lib/payments/stripe.ts` |
| Revenue sharing | `lib/payments/revenue-share.ts` |
| Tier utilities | `lib/auth/tier-utils.ts` |
| AI budget management | `lib/ai/deep-research/budget-manager.ts` |
| Pricing page | `app/pricing/page.tsx` |

---

*This document should be reviewed and updated as the business model evolves.*

**Sources:**
- [Anthropic Claude Pricing](https://platform.claude.com/docs/en/about-claude/pricing)
- [Claude Opus 4.5 Announcement](https://www.anthropic.com/news/claude-opus-4-5)
