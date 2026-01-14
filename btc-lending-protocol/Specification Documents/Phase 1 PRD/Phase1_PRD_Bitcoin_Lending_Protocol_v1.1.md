# Bitcoin Lending Protocol
## Product Requirements Document
### Phase 1: Stacks Mainnet Launch

**Version:** 1.1 (Corrected Auction Mechanism)  
**Date:** January 2026  
**Status:** Draft for Review  
**Author:** Jamie (Project Lead)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Solution Overview](#3-solution-overview)
4. [User Personas](#4-user-personas)
5. [Feature Requirements](#5-feature-requirements)
6. [User Interface Requirements](#6-user-interface-requirements)
7. [Non-Functional Requirements](#7-non-functional-requirements)
8. [Success Metrics](#8-success-metrics)
9. [Phase 1 Deliverables](#9-phase-1-deliverables)
10. [Technical Constraints](#10-technical-constraints)
11. [Out of Scope](#11-out-of-scope)
12. [Risk Assessment](#12-risk-assessment)
13. [Timeline and Budget](#13-timeline-and-budget)

---

## 1. Executive Summary

The Bitcoin Lending Protocol is an open-source, decentralized lending platform that enables Bitcoin holders to borrow against their BTC collateral without selling, while providing stablecoin holders with attractive yield opportunities. Phase 1 delivers a production-ready protocol on Stacks using sBTC collateral, featuring an innovative oracle-free **competitive bidding auction** mechanism that eliminates price manipulation risks inherent in traditional DeFi lending.

### Key Innovation

**Competitive bidding auctions** where lenders compete by bidding lower total repayment amounts, ensuring transparent market-driven pricing without requiring external price oracles. Borrowers set their maximum repayment, and lenders compete to offer better terms - the lowest bid wins when the auction ends.

### Phase 1 Targets

| Metric | Target |
|--------|--------|
| **Launch Timeline** | Q2 2026 (6 months) |
| **Initial Loan Volume** | $1M+ in first 3 months |
| **Target Users** | Bitcoin miners (borrowers) + DeFi lenders |
| **Active Borrowers** | 10+ miners in first quarter |
| **Active Lenders** | 50+ lenders providing liquidity |
| **Average Bids per Auction** | 3-5 competitive bids |
| **Total Budget** | $254,000 |
| **Security Audit** | Complete before mainnet launch |

### Strategic Positioning

Phase 1 establishes the protocol on Stacks as the first Bitcoin-native lending platform with oracle-free competitive bidding. This foundation enables future phases to add native Bitcoin custody (Phase 2) and multi-chain liquidity (Phase 3), positioning the protocol as the definitive solution for Bitcoin-backed lending.

---

## 2. Problem Statement

### 2.1 The Bitcoin Liquidity Challenge

Bitcoin represents over $2 trillion in market capitalization, yet this capital remains largely idle. Bitcoin holders face an impossible choice: sell their appreciating asset to access liquidity, or hold while missing out on capital deployment opportunities.

This is particularly acute for **Bitcoin miners** who need working capital for:
- Monthly electricity bills ($20,000-$100,000+)
- Equipment purchases and upgrades
- Facility expansion
- Operational reserves during price downturns

**Current borrowing options force miners to:**
- Sell BTC at potentially unfavorable prices, crystallizing losses
- Use traditional banks (lengthy approval, extensive KYC, no BTC collateral accepted)
- Risk custody with centralized lending platforms (Celsius, BlockFi bankruptcies)
- Accept unfavorable terms from specialized crypto lenders

### 2.2 Limitations of Existing DeFi Solutions

Current DeFi lending protocols suffer from critical limitations:

#### Centralized Wrapped Bitcoin
- **WBTC dependency**: Platforms like Aave and Compound require wrapped BTC
- **Custody risk**: BitGo holds underlying Bitcoin (single point of failure)
- **Regulatory vulnerability**: Centralized custodian subject to seizure/freeze
- **Trust requirement**: Users must trust BitGo won't be compromised

#### Oracle Dependency
Traditional DeFi lending relies on price oracles (Chainlink, Band, etc.) to determine:
- Collateral ratios
- Liquidation thresholds  
- Interest rate curves

**Oracle risks:**
- Manipulation during low liquidity periods
- Flash loan attacks exploiting price feeds
- Centralization through oracle provider dependency
- Additional protocol complexity and attack surface
- Ongoing costs for oracle subscriptions

#### Geographic and Regulatory Barriers
- Centralized platforms (BlockFi, Celsius, Genesis) require KYC
- Jurisdictional exclusions (US, China, others)
- Regulatory pressure on centralized entities
- Systemic risks demonstrated by 2022-2023 collapses

### 2.3 Market Gap

No protocol currently offers:
- ✅ Bitcoin collateral without wrapped tokens
- ✅ Oracle-free interest rate discovery
- ✅ Permissionless, trustless operation
- ✅ Tradeable loan positions for liquidity
- ✅ Competitive market-driven rates

**This gap represents our opportunity.**

---

## 3. Solution Overview

### 3.1 Core Innovation: Oracle-Free Competitive Bidding

The Bitcoin Lending Protocol eliminates oracle dependency through a **competitive bidding auction mechanism**. Rather than using external price feeds to set interest rates, we let the market discover rates through lenders competing to offer the best terms to borrowers.

#### How It Works

1. **Borrower** locks sBTC collateral and specifies:
   - Requested loan amount (in USDT)
   - **Maximum total repayment amount** they're willing to pay
   - Loan duration (e.g., 30, 60, 90 days)
   - Auction duration (e.g., 24 hours for bidding period)

2. **Auction begins** with borrower's maximum repayment as the starting point
   - Example: Borrow $50,000, max repayment $53,500
   - Implied maximum rate: ~7% APR over 60 days

3. **Lenders compete** by placing bids during the auction period
   - Each bid is a **total repayment amount** (not an interest rate)
   - New bids must be **lower** than the current lowest bid
   - Multiple lenders can bid during the auction window
   - Example bid progression: $53,500 → $52,800 → $51,200 → $50,500
   - Competition drives the borrower's cost down

4. **Auction ends** after the specified duration (e.g., 24 hours)
   - **Lowest bid wins** the auction
   - Winning lender provides the loan amount to borrower
   - Effective interest rate calculated from winning bid
   - Example: $50,500 repayment on $50,000 loan over 60 days = 6.17% APR annualized

5. **Loan finalizes** when auction ends with at least one valid bid
   - USDT transfers from winning lender to borrower
   - Collateral remains locked in smart contract
   - NFTs minted for both parties (tradeable positions)
   - If no bids received: collateral returns to borrower, auction cancelled

#### Why This Auction Design Works

**Market-Driven Pricing:**
- Lenders reveal their true minimum acceptable return through competitive bidding
- No artificial rate curves or pre-determined pricing
- Borrowers benefit from genuine competition among lenders
- Transparent price discovery visible on-chain

**Oracle-Free:**
- No external price feeds required for any part of the system
- Interest rates emerge organically from supply and demand
- No manipulation vectors through price feeds
- No dependency on off-chain data sources

**Fair for Both Sides:**
- Borrowers set their maximum acceptable cost (ceiling)
- Lenders compete to win the loan at attractive rates
- No one forced to accept unfavorable terms
- Either party can walk away (borrower cancels if no bids, lender doesn't bid if rate too low)

**Simple and Secure:**
- No complex liquidation mechanisms needed
- No need for real-time price oracles
- Straightforward time-based auctions
- Lowest bid wins = simple, understandable rule

#### Example Auction

**Borrower Creates Loan Request:**
- Locks: 1.5 sBTC (worth ~$150,000 at current prices)
- Requests: $50,000 USDT
- Max repayment: $53,500 (7% APR equivalent over 60 days)
- Loan duration: 60 days (8,640 blocks)
- Auction duration: 24 hours (144 blocks)

**Lenders Bid During 24-Hour Window:**

| Time | Lender | Bid (Total Repayment) | Implied APR | Status |
|------|--------|----------------------|-------------|---------|
| Hour 2 | Alice | $53,500 | 7.00% | Leading |
| Hour 8 | Bob | $52,800 | 5.60% | Leading |
| Hour 14 | Carol | $51,200 | 2.40% | Leading |
| Hour 20 | Dave | $50,500 | 1.00% | **Winner** |

**After 24 Hours:**
- Dave's bid of $50,500 is the lowest
- Dave wins and provides $50,000 USDT to borrower
- Borrower owes $50,500 at maturity (60 days)
- Effective rate: **1.00% APR** (borrower got excellent terms!)
- Dave will earn $500 profit ($50,500 - $50,000)

**At Maturity (60 days later):**
- Borrower repays $50,500 to Dave
- Borrower reclaims 1.5 sBTC collateral
- Both NFTs burned, loan complete

#### Benefits vs Traditional Lending

| Traditional DeFi | Our Protocol |
|------------------|--------------|
| Oracle determines rate | Market competition determines rate |
| Fixed rate curves | Auction-based price discovery |
| Oracle manipulation risk | No oracle to manipulate |
| Complex liquidation logic | Simple time-based repayment |
| Flash loan vulnerabilities | No flash loan attack surface |
| Ongoing oracle costs | Zero oracle costs |
| First-come-first-served | Competitive bidding for best rates |
| Opaque pricing | Transparent bid history |

### 3.2 Technical Architecture

Phase 1 deploys on **Stacks**, Bitcoin's smart contract layer, using **sBTC** (1:1 Bitcoin-backed asset) as collateral.

#### Why Stacks?

- **Bitcoin finality**: Proof of Transfer consensus anchors to Bitcoin
- **Clarity language**: Decidable smart contracts with no reentrancy
- **sBTC integration**: Native 1:1 BTC representation
- **Lower costs**: ~$1-5 per transaction vs Ethereum's $10-100
- **Growing ecosystem**: Mature developer tools and infrastructure

#### Core Components

```
┌─────────────────────────────────────────────────────┐
│                  Frontend (React)                    │
│  - Wallet connection (Hiro, Leather, Xverse)        │
│  - Auction browsing and bidding interface           │
│  - Portfolio management dashboard                   │
│  - NFT marketplace for trading positions            │
└─────────────────┬───────────────────────────────────┘
                  │
                  │ Stacks.js SDK
                  │
┌─────────────────▼───────────────────────────────────┐
│           Clarity Smart Contracts (Stacks)          │
│                                                      │
│  ┌────────────────┐  ┌──────────────────┐          │
│  │ Loan Contract  │  │  Auction Logic   │          │
│  │ - Collateral   │  │  - Competitive   │          │
│  │ - Escrow       │  │  - Bid handling  │          │
│  │ - Repayment    │  │  - Finalization  │          │
│  └────────────────┘  └──────────────────┘          │
│                                                      │
│  ┌────────────────┐  ┌──────────────────┐          │
│  │  NFT Contract  │  │ Marketplace      │          │
│  │ - Borrower NFT │  │ - List positions │          │
│  │ - Lender NFT   │  │ - Purchase       │          │
│  │ - Transfer     │  │ - Price discovery│          │
│  └────────────────┘  └──────────────────┘          │
└──────────────────────────────────────────────────────┘
```

#### Smart Contract Architecture

**Core Contract: loan-protocol.clar** (all-in-one design)
- Collateral locking (sBTC)
- Auction creation and management
- Competitive bidding logic
- Loan finalization
- Repayment processing
- NFT minting (borrower and lender positions)
- Marketplace functions

**Asset Contracts:**
- **sBTC**: Collateral (provided by Stacks ecosystem)
- **USDT**: Loan denomination (stablecoin)

### 3.3 Oracle-Free Guarantees

By eliminating oracles, we achieve:

✅ **No price manipulation**: No external feed to attack  
✅ **No flash loan risk**: Bids are explicit amounts, not calculated from oracle prices  
✅ **Predictable execution**: Clarity guarantees prevent surprises  
✅ **Lower costs**: No oracle subscription fees  
✅ **Simpler architecture**: Fewer dependencies = less attack surface  
✅ **Transparent pricing**: Anyone can see all bids on-chain  
✅ **True competition**: Lenders compete on actual terms, not algorithmic curves  

---

## 4. User Personas

### 4.1 Primary Persona: Bitcoin Miners (Borrowers)

#### Demographics
- **Operation size**: 5-500 ASICs (small to medium miners)
- **Geography**: USA (40%), Canada (20%), Latin America (20%), Europe (15%), Other (5%)
- **Technical level**: High - comfortable with wallets, smart contracts, DeFi
- **Bitcoin philosophy**: Long-term holders, accumulate don't sell
- **Monthly revenue**: $10,000 - $500,000 depending on scale

#### Needs and Goals
- **Primary**: Access working capital without selling BTC
- **Secondary**: Preserve BTC holdings for long-term appreciation
- **Tertiary**: Quick, permissionless access to liquidity
- **Financial**: Competitive repayment terms (looking for 5-10% APR range)

#### Pain Points with Current Solutions
- ❌ Traditional banks don't accept BTC as collateral
- ❌ Bank loans require weeks of approval and extensive documentation
- ❌ Selling BTC during downturns crystallizes losses
- ❌ Centralized crypto lenders have custody risk (Celsius, BlockFi failures)
- ❌ Geographic restrictions (many platforms exclude US users)
- ❌ KYC requirements compromise privacy
- ❌ High interest rates from specialized crypto lenders (15%+ APR)

#### User Story

> *"I'm a Bitcoin miner in Texas running 50 ASICs. My electricity bill is $30,000/month. When BTC price drops, I need working capital but I refuse to sell at a loss. I've been mining since 2020 and believe BTC will be worth much more in the future.*
>
> *Traditional banks don't understand Bitcoin mining or accept BTC as collateral. I tried BlockFi before it collapsed - that was a wake-up call about custody risk.*
> 
> *I need a trustless protocol where I can borrow against my BTC holdings, get funds in 24-48 hours, and avoid centralized custody. I'm willing to pay reasonable rates (5-10% APR) if I can access $50,000 quickly without selling my Bitcoin."*

**— Marcus, 34, Bitcoin Miner, Austin TX**

#### How Our Protocol Solves This

- ✅ Create loan request in 5 minutes
- ✅ Lenders compete to offer best terms
- ✅ Get funded within 24 hours after auction
- ✅ No KYC, fully permissionless
- ✅ Trustless collateral custody in smart contract
- ✅ Competitive rates from auction (often better than borrower's max)
- ✅ Can trade borrower NFT if wants to exit debt obligation

#### Success Metrics for This Persona
- Get first 10 miners using protocol in Month 3-4
- Average loan size: $25,000 - $100,000
- Typical loan duration: 30-60 days
- Average winning bids: 5-10% APR (below borrower maximums)
- Repeat borrower rate: >50% (miners come back for additional loans)

---

### 4.2 Primary Persona: DeFi Lenders (Liquidity Providers)

#### Demographics
- **Profile**: DeFi-native users with stablecoin holdings
- **Experience level**: Intermediate to advanced DeFi users
- **Capital**: $10,000 to $10M+ (wide range)
- **Investment thesis**: Yield farming, passive income strategies
- **Risk tolerance**: Medium - accept smart contract risk for 6-12% yields

#### Sub-Personas

**A. Retail Yield Farmers**
- $10,000 - $100,000 in stablecoins
- Actively manage positions across protocols
- Compare yields daily
- Want high APR but will accept 6-10% for overcollateralized Bitcoin lending

**B. Crypto Hedge Funds**
- $1M - $50M+ in capital
- Institutional approach to risk management
- Prefer overcollateralized lending over riskier strategies
- Will deploy significant capital at 7-10% APR

**C. Family Offices**
- $5M - $100M+ in crypto allocation
- Conservative, seeking "safer" DeFi yields
- Bitcoin collateral particularly attractive (understand BTC value)
- Target 6-8% APR with minimal risk

#### Needs and Goals
- **Primary**: Attractive yield on stablecoin holdings (target 6-12% APR)
- **Secondary**: Overcollateralized loans with minimal liquidation risk
- **Tertiary**: Ability to exit positions via secondary market if needed
- **Trust**: Transparent, audited smart contracts with no admin keys

#### Pain Points with Current Solutions
- ❌ Aave/Compound stablecoin yields are too low (2-4% APR)
- ❌ Liquidity pool farming has impermanent loss risk
- ❌ Complex protocols have higher smart contract risk
- ❌ Capital locked for full loan term (no early exit)
- ❌ Centralized platforms have custody and counterparty risk

#### User Story

> *"I have $500,000 in USDT that I want to put to work. Aave yields are pathetic (2-3%). I've been burned by impermanent loss in liquidity pools.*
>
> *I want exposure to Bitcoin-backed lending with competitive rates. Bitcoin is the safest crypto collateral, and I'm comfortable lending at 7-9% APR if loans are overcollateralized.*
>
> *I love the auction format - I can bid aggressively when I have excess capital, or bid conservatively when rates are already good. If I need liquidity before loan matures, I can sell my lender NFT on the marketplace.*
>
> *Most importantly: I want a protocol with no admin keys and a professional security audit. After FTX, Celsius, and BlockFi, I only trust trustless smart contracts."*

**— Sarah, 41, Crypto Fund Manager, Singapore**

#### How Our Protocol Solves This

- ✅ Competitive bidding lets lenders set their own minimum returns
- ✅ Bitcoin overcollateralization (150%+) minimizes default risk
- ✅ Tradeable lender NFTs enable early exit
- ✅ Transparent auction process - see all competition
- ✅ Professional security audit before mainnet
- ✅ No admin keys, fully trustless
- ✅ Simple lending model (no impermanent loss complexity)

#### Success Metrics for This Persona
- Attract 50+ unique lenders in Month 3-6
- Total lending capital: $1M+ by Month 6
- Average lending position: $20,000
- Repeat lender rate: >60% (lenders re-deploy capital)
- Secondary market activity: 10%+ of positions traded
- Average winning bid: 6-9% APR

---

### 4.3 Secondary Persona: NFT Position Traders

#### Demographics
- **Profile**: Sophisticated DeFi traders and arbitrageurs
- **Capital**: $50,000 - $5M+
- **Strategy**: Buy discounted positions, sell for profit
- **Market role**: Provide liquidity for position sellers

#### Needs and Goals
- **Primary**: Buy undervalued lending positions at discount
- **Secondary**: Provide exit liquidity for lenders who need capital
- **Tertiary**: Arbitrage opportunities between auctions and secondary market

#### User Story

> *"I trade DeFi positions and look for mispriced assets. If a lender needs liquidity and lists their position at a 5% discount to expected return, I'll buy it and hold to maturity for the yield.*
>
> *I also buy borrower positions when miners want to exit their debt obligation. If a miner owes $50,000 but BTC has appreciated significantly, they might prefer to sell their borrower NFT at a premium rather than repay the loan."*

**— Alex, 29, DeFi Trader, London**

#### How Our Protocol Solves This

- ✅ Fully tradeable NFT positions (both borrower and lender)
- ✅ Transparent loan terms visible on-chain
- ✅ Marketplace with price suggestions
- ✅ Atomic purchases (no custody risk)
- ✅ Active auction marketplace creates opportunities

---

### 4.4 User Persona Summary Table

| Persona | Primary Goal | Pain Point Solved | Success Metric |
|---------|--------------|-------------------|----------------|
| **Bitcoin Miners** | Borrow without selling BTC | No BTC-accepting lenders | 10+ active borrowers |
| **DeFi Lenders** | Earn 6-12% on stables | Low yields elsewhere | $1M+ in lending capital |
| **Position Traders** | Buy discounted positions | Illiquid loan positions | 10%+ positions traded |

---

## 5. Feature Requirements

### 5.1 Core Lending Features (Must Have - P0)

#### FR1.1: Collateral Locking

**Description**: Borrowers must be able to lock sBTC as collateral through smart contract.

**Functional Requirements**:
- Accept sBTC deposits from connected Stacks wallet
- Verify collateral is genuinely locked in protocol contract
- Emit blockchain event confirming collateral lock with amount and timestamp
- Prevent collateral withdrawal until loan is fully repaid or defaults
- Support partial collateral returns if borrower wants to reduce loan amount
- Display locked collateral amount in user interface

**Acceptance Criteria**:
- [ ] User can deposit sBTC from wallet with one transaction
- [ ] Contract verifies sBTC balance before allowing loan creation
- [ ] Locked collateral cannot be withdrawn by user or admin
- [ ] Event emission includes: borrower address, amount, timestamp, loan ID
- [ ] UI reflects locked status within 2 seconds of confirmation

**Technical Notes**:
- Use Clarity's `transfer` function for sBTC (SIP-010 fungible token)
- Store locked amounts in map: `{loan-id: uint} -> {collateral-amount: uint, ...}`
- Implement `get-loan` read-only function for UI queries

---

#### FR1.2: Competitive Bidding Auction

**Description**: Implement oracle-free competitive bidding auctions for price discovery.

**Functional Requirements**:
- Borrower specifies **maximum total repayment amount** they'll accept
- Auction duration configurable (default: 24 hours / 144 blocks)
- Lenders place bids as **total repayment amounts**
- Each new bid must be **lower** than current lowest bid
- Multiple bids allowed during auction period
- Track current lowest bid in smart contract
- **Lowest bid wins** when auction ends (anyone can call `finalize-auction`)
- If no bids received: collateral returns to borrower, auction fails

**Bid Validation Rules**:
```
First bid:
  - bid_amount <= max_repayment

Subsequent bids:
  - bid_amount < current_lowest_bid.amount
  
Time validation:
  - current_block < auction_end_block
```

**Acceptance Criteria**:
- [ ] Auction accepts bids for full duration
- [ ] Each bid must be lower than previous (contract enforces)
- [ ] Anyone can query current lowest bid at any time
- [ ] Finalize-auction can only be called after auction-end-block
- [ ] Expired auctions with no bids return collateral automatically
- [ ] Bid placement is gas-efficient (<1000 gas units)

**Technical Notes**:
```clarity
;; Store current lowest bid
(define-map current-bids
  {loan-id: uint}
  {bidder: principal, amount: uint})

;; Validate new bid
(asserts! (< new-bid-amount current-bid-amount) ERR_BID_TOO_HIGH)
```

---

#### FR1.3: Bidding Interface

**Description**: Lenders must be able to submit competitive bids on active auctions.

**Functional Requirements**:
- View all active auctions with current lowest bids
- See borrower's maximum repayment (ceiling for first bid)
- See time remaining in auction (countdown timer)
- Calculate implied APR from any bid amount in real-time
- Submit bid with total repayment amount
- See bid history for auction (transparency)
- Receive notification if outbid by another lender
- Clear indication of current leading bidder
- Know that auction runs for full duration and lowest wins

**User Flow**:
1. Lender connects wallet
2. Views auction marketplace
3. Clicks auction to see details
4. Sees:
   - Current lowest bid: $51,200 (implied 4.8% APR)
   - Borrower's max: $53,500
   - Time remaining: 8 hours 23 minutes
   - Bid history: 3 bids placed
5. Enters bid amount: e.g., $50,800
6. Sees calculated implied APR: 3.2% APR
7. Submits bid transaction
8. Confirmation: "Bid placed! You're currently winning."
9. If outbid later: "You've been outbid. New lowest: $50,500"
10. After auction ends:
    - If lowest bid: "You won! Finalize auction to provide loan."
    - If outbid: "Auction ended. Winning bid was $50,500"

**Acceptance Criteria**:
- [ ] Lender can see all active auctions in dashboard
- [ ] Current lowest bid visible and updates in real-time
- [ ] Countdown shows hours:minutes:seconds remaining
- [ ] Implied APR calculation accurate and updates as user types
- [ ] Bid amount input validates (must be < current bid)
- [ ] Transaction confirmation appears within 5 seconds
- [ ] Notification system for being outbid
- [ ] Clear winner indication after auction ends

---

#### FR1.4: Loan Finalization

**Description**: When auction ends with valid bids, anyone can finalize to activate the loan.

**Functional Requirements**:
- Can only finalize after auction-end-block reached
- Identifies winner as lowest bidder
- Transfers loan amount (borrow-amount) from winner to borrower
- Sets repayment amount to winning bid
- Mints borrower position NFT
- Mints lender position NFT
- Changes loan status from "auction" to "active"
- Records loan start time for maturity tracking
- Emits loan-finalized event with all terms

**Acceptance Criteria**:
- [ ] Finalization fails if auction still active
- [ ] Winner correctly identified as lowest bidder
- [ ] USDT transfer completes atomically
- [ ] Both NFTs minted in same transaction
- [ ] Loan status updated correctly
- [ ] Event includes: loan ID, winner, borrower, amount, repayment
- [ ] UI updates within 10 seconds showing active loan

**Technical Notes**:
- Use `as-contract` for protocol-initiated transfers
- NFT IDs match loan IDs for tracking
- Store complete loan data for later queries
- Implement read-only functions for UI to fetch details

---

#### FR1.5: Repayment Processing

**Description**: Borrowers must be able to repay loans to reclaim collateral.

**Functional Requirements**:
- Calculate current amount owed (winning bid amount)
- Accept USDT payment from borrower (or current NFT holder)
- Transfer repayment to lender (or current NFT holder)
- Release collateral to borrower (or current NFT holder)
- Burn or mark NFTs as completed
- Update loan status to "repaid"
- Emit repayment-complete event
- Support early repayment (before maturity)
- Support late repayment (after maturity, but before collateral claim)

**Amount Calculation**:
```
amount_owed = repayment_amount (set by winning bid)
// No variable interest - fixed repayment amount from auction
```

**Acceptance Criteria**:
- [ ] UI shows exact amount owed
- [ ] Repayment amount never changes (fixed from auction)
- [ ] Early repayment allowed (borrower can repay anytime)
- [ ] Late repayment allowed (until lender claims collateral)
- [ ] USDT transfer to correct lender (original or NFT buyer)
- [ ] Collateral released to correct borrower (original or NFT buyer)
- [ ] Both NFTs burned atomically
- [ ] Event emission includes final amounts and participants

**Edge Cases**:
- Borrower transferred NFT? → Repayment by new owner, collateral to new owner
- Lender transferred NFT? → Repayment goes to new owner
- Both NFTs traded? → System tracks current owners, pays correctly
- Repayment fails (insufficient USDT)? → Transaction reverts, loan remains active

---

### 5.2 NFT Position Features (Must Have - P0)

#### FR2.1: Borrower Position NFT

**Description**: Mint SIP-009 compliant NFT representing borrower's rights and obligations.

**NFT Attributes**:
- Loan ID (unique identifier)
- Collateral amount (sBTC)
- Loan amount (USDT borrowed)
- Repayment amount (from winning bid)
- Start block (when loan activated)
- Maturity block (when loan due)
- Borrower address (current owner)
- Status (active, repaid, defaulted)

**Rights**:
- Right to reclaim collateral upon full repayment
- Right to repay early (anytime before maturity)
- Right to transfer NFT (sells debt obligation to another party)

**Obligations**:
- Must repay repayment_amount to reclaim collateral
- If NFT transferred, new owner has same obligations

**Acceptance Criteria**:
- [ ] NFT minted upon loan finalization
- [ ] Contains all loan metadata on-chain
- [ ] Conforms to SIP-009 standard (Stacks NFT standard)
- [ ] Transferable via standard NFT transfer function
- [ ] Ownership tracked accurately
- [ ] Viewable in Stacks NFT explorers

---

#### FR2.2: Lender Position NFT

**Description**: Mint SIP-009 compliant NFT representing lender's rights.

**NFT Attributes**:
- Loan ID (matching borrower NFT)
- Loan amount (USDT lent)
- Repayment amount (from winning bid)
- Expected profit (repayment - loan amount)
- Implied APR (calculated from winning bid)
- Start block (when loan activated)
- Maturity block (when repayment expected)
- Lender address (current owner)
- Status (active, repaid, defaulted)

**Rights**:
- Right to receive repayment amount when borrower repays
- Right to collateral if loan defaults (after maturity)
- Right to transfer NFT (sells future repayment stream)

**Acceptance Criteria**:
- [ ] NFT minted upon loan finalization
- [ ] Contains all loan metadata matching borrower NFT
- [ ] Conforms to SIP-009 standard
- [ ] Transferable via standard NFT transfer
- [ ] Ownership tracked accurately
- [ ] Repayments automatically route to current owner

---

#### FR2.3: NFT Transfer Mechanism

**Description**: Enable seamless transfer of position NFTs with proper accounting.

**Functional Requirements**:
- Standard SIP-009 `transfer` function
- Update protocol's internal ownership tracking
- Emit transfer event
- UI reflects new ownership immediately
- Repayments/collateral automatically route to new owners
- Transfer can happen at any point during active loan

**Acceptance Criteria**:
- [ ] NFT transfer succeeds via wallet or marketplace
- [ ] Protocol recognizes new owner immediately
- [ ] Repayment goes to new lender owner
- [ ] Collateral release goes to new borrower owner
- [ ] Transfer event includes: NFT ID, from, to, timestamp

**Example Flow**:
1. Alice lends $50,000 to Bob (receives lender NFT)
2. Alice sells her lender NFT to Charlie for $51,000 (locks in profit early)
3. Bob repays loan → repayment goes to Charlie (current NFT owner)
4. System tracks Charlie as current lender via NFT ownership

---

### 5.3 Secondary Marketplace (Should Have - P1)

#### FR3.1: List Positions for Sale

**Description**: NFT holders can list their positions for sale on integrated marketplace.

**Functional Requirements**:
- Borrower can list borrower NFT with asking price
- Lender can list lender NFT with asking price
- Seller sets price in USDT
- UI suggests "fair" price based on:
  - For lenders: expected repayment minus discount (e.g., 3% discount for quick sale)
  - For borrowers: amount owed plus premium (e.g., 2% premium to transfer debt)
- Listing can be canceled anytime before purchase
- No fees for listing (only marketplace fee upon sale, if any)

**Acceptance Criteria**:
- [ ] User can list NFT with custom price
- [ ] UI shows suggested pricing based on loan terms
- [ ] Active listings visible in marketplace
- [ ] Seller can cancel listing anytime
- [ ] Listing shows key details (repayment amount, time left, expected return)

---

#### FR3.2: Purchase Listed Positions

**Description**: Buyers can acquire listed NFT positions with one transaction.

**Functional Requirements**:
- Browse all active listings
- Filter by position type (borrower/lender)
- Sort by yield, price, time remaining
- See detailed position information
- One-click purchase with USDT payment
- NFT transfers atomically with payment
- Buyer immediately inherits all rights and obligations

**Acceptance Criteria**:
- [ ] All listings visible in marketplace interface
- [ ] Filtering and sorting works smoothly
- [ ] Purchase requires USDT approval
- [ ] NFT transfer and payment happen atomically
- [ ] Buyer sees position in their dashboard immediately

---

#### FR3.3: Price Discovery Tools

**Description**: Help users price positions fairly using market data.

**Functional Requirements**:
- Display "expected return" for lender positions
  - Formula: `repayment_amount` (fixed from auction)
- Display "amount owed" for borrower positions
  - Formula: `repayment_amount` (fixed from auction)
- Show historical sales for comparable positions
- Suggest listing price based on typical discount/premium
- Show implied yield for lender positions at different prices

**Acceptance Criteria**:
- [ ] Expected return displayed accurately
- [ ] Amount owed updated in real-time (always same - fixed repayment)
- [ ] Historical data shown when available
- [ ] Price suggestions help users understand fair value
- [ ] Implied yield calculation helps buyers evaluate opportunities

---

## 6. User Interface Requirements

### 6.1 Wallet Integration (Must Have - P0)

#### FR4.1: Stacks Wallet Connection

**Support Major Wallets**:
- Hiro Wallet (browser extension + mobile)
- Leather Wallet (formerly Hiro Web Wallet)
- Xverse Wallet

**Functional Requirements**:
- One-click wallet connection
- Show wallet address (truncated) after connection
- Display sBTC and USDT balances
- Disconnect button
- Auto-reconnect on page refresh (session persistence)
- Handle wallet switching gracefully
- Show network status (mainnet/testnet)

**Acceptance Criteria**:
- [ ] User can connect wallet in <3 seconds
- [ ] Balances update within 5 seconds
- [ ] Disconnection clears session properly
- [ ] Wallet switching detected and UI updates
- [ ] Works on mobile and desktop
- [ ] Clear error messages for connection failures

---

### 6.2 Borrower Interface (Must Have - P0)

#### FR4.2: Create Loan Request

**Simple Loan Creation Form**:
- Input collateral amount (sBTC) with balance display
- Input desired loan amount (USDT)
- Input for **maximum repayment amount** (what borrower will pay back)
- Dropdown for loan duration (30, 60, 90 days)
- Dropdown for auction duration (12, 24, 48 hours)
- Real-time LTV (Loan-to-Value) calculation
- Real-time implied maximum APR calculation
- Preview of:
  - Collateral locked: X sBTC
  - Loan amount: $X USDT
  - Maximum you'll repay: $X USDT
  - Implied max APR: X.XX%
  - Best case (if lenders bid lower): $X repayment, X.XX% APR
- Gas fee estimation
- One-click "Create Loan" button

**Example UI Flow**:
```
Collateral: [1.5] sBTC (Balance: 2.0 sBTC)
Loan Amount: [$50,000] USDT
Max Repayment: [$53,500] USDT
Duration: [60 days ▾]
Auction: [24 hours ▾]

Preview:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
You lock:       1.5 sBTC
You receive:    $50,000 USDT
You owe (max):  $53,500 USDT
Implied max APR: 7.0%

💡 Lenders will compete to offer you better rates!
   If winning bid is $51,000, your rate is just 2.0% APR

[Create Loan Auction]
```

**Validation**:
- Collateral amount ≤ user's sBTC balance
- Loan amount reasonable relative to collateral (suggest 50-70% LTV)
- Maximum repayment must be > loan amount (need positive interest)
- Duration must be 7-365 days

**Acceptance Criteria**:
- [ ] Form validates input in real-time
- [ ] LTV calculation accurate and updates live
- [ ] Implied max APR calculation correct
- [ ] Preview shows clear expectations
- [ ] Gas fees estimated before transaction
- [ ] Success message shows auction ID and countdown

---

#### FR4.3: Monitor Active Auctions

**Auction Dashboard** for borrowers:
- Show user's active auctions
- Display current lowest bid (updates in real-time)
- Display borrower's maximum repayment (ceiling)
- Show number of bids placed
- Countdown timer (time remaining)
- Bid history (all bids with timestamps)
- Current leader indication
- Option to cancel (only if no bids placed yet)
- Link to public auction page

**Real-Time Updates**:
- Lowest bid updates every block (~10 seconds on Stacks)
- Countdown updates every second
- Flash notification when new bid arrives
- Show "X bids placed" counter
- Auto-refresh when auction completes

**Example Display**:
```
🔴 AUCTION LIVE - Ends in 14h 23m

Loan #42
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Your max repayment: $53,500
Current winning bid: $51,200 (4.8% APR)
Bids placed: 3

Bid History:
• $53,200 by 0xABC... (2 hours ago)
• $52,100 by 0xDEF... (6 hours ago) 
• $51,200 by 0xGHI... (9 hours ago) ⭐ WINNING

💰 Great news! Lenders are competing.
   You're getting better than your max rate!

[View Full Auction] [Cancel Auction]
```

**Acceptance Criteria**:
- [ ] Dashboard shows all user's auctions
- [ ] Bid amount updates visibly in real-time
- [ ] Timer counts down smoothly
- [ ] New bid triggers notification
- [ ] Cancel works only before any bids
- [ ] Clean transition to "Active Loan" after auction ends

---

#### FR4.4: Manage Active Loans

**Loan Management Dashboard**:
- List all active loans
- For each loan show:
  - Loan amount and repayment amount (fixed)
  - Days elapsed and days remaining
  - Implied APR (calculated from repayment amount)
  - Collateral locked
  - Due date with countdown
  - Current NFT owner (if transferred)
- One-click repayment button
- Option to list borrower NFT for sale
- Transaction history (creation, bids, finalization, any NFT transfers)

**Repayment Flow**:
```
Loan #42
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Borrowed:     $50,000 USDT
Owe:          $50,500 USDT (fixed)
Interest:     $500 (1.0% APR)
Due in:       32 days
Collateral:   1.5 sBTC

[Repay Now: $50,500]
```

1. Click "Repay Now"
2. See exact amount: $50,500 USDT
3. Approve USDT transfer
4. Confirm repayment transaction
5. See success: "Loan repaid! Your 1.5 sBTC collateral has been returned."

**Acceptance Criteria**:
- [ ] All active loans visible in dashboard
- [ ] Repayment amount always shown (fixed, never changes)
- [ ] Repayment button prominently displayed
- [ ] Repayment succeeds in one transaction
- [ ] Collateral release confirmed visually

---

### 6.3 Lender Interface (Must Have - P0)

#### FR4.5: Browse Active Auctions

**Marketplace Interface**:
- Grid or list view of active auctions
- Each auction card shows:
  - Loan amount
  - Current lowest bid (repayment amount)
  - Borrower's maximum repayment
  - Implied APR from current bid
  - Collateral amount and LTV
  - Time remaining (countdown)
  - Number of bids placed
  - Expected profit at current bid
  - Borrower's loan history (if available)
- Filters:
  - Loan amount range
  - Current bid APR range
  - LTV range
  - Time remaining
  - Number of bids (competition level)
- Sorting:
  - Best APR (highest first)
  - Largest loan
  - Ending soon
  - Most bids (most competitive)
  - Newest

**Example Auction Card**:
```
┌────────────────────────────────────┐
│ Loan #42 • 14h 23m remaining      │
│                                    │
│ Borrow: $50,000 USDT              │
│ Current: $51,200 (4.8% APR) ⭐    │
│ Max: $53,500 (7.0% APR)           │
│ Collateral: 1.5 sBTC (LTV: 67%)   │
│                                    │
│ 💰 Your profit: $1,200 if you win │
│ 📊 3 bids placed                  │
│                                    │
│ [Place Bid]                       │
└────────────────────────────────────┘
```

**Acceptance Criteria**:
- [ ] All active auctions load within 2 seconds
- [ ] Filters work instantly (client-side)
- [ ] Sorting applies correctly
- [ ] Countdowns update in real-time
- [ ] Empty state shows "No active auctions" message
- [ ] Bid count updates when new bids placed

---

#### FR4.6: Place Bids

**Streamlined Bidding**:
1. Click auction card to expand details
2. See:
   - Full loan terms
   - Current lowest bid: $51,200 (implied 4.8% APR)
   - Your bid must be < $51,200
   - Borrower's max: $53,500
   - Time remaining: 8 hours 23 minutes
   - Bid history (transparency)
   - Expected profit calculation
3. Enter bid amount (total repayment): e.g., $50,800
4. See calculated:
   - Implied APR: 3.2%
   - Your profit if you win: $800
   - Chance to win: "Good - underbids current by $400"
5. Submit bid transaction
6. Immediate feedback: "Bid placed! You're currently winning."
7. If outbid later: "You've been outbid by $50,600. Bid again?"
8. After auction ends:
   - If won: "Congratulations! You won. Click to finalize and provide $50,000 USDT."
   - If outbid: "Auction ended. Winning bid was $50,500. Try another auction!"

**Bid Input UI**:
```
Place Your Bid
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Current lowest: $51,200 (4.8% APR)
Borrower's max: $53,500 (7.0% APR)

Your bid: [$50,800]
          ↓
Implied APR: 3.2%
Your profit: $800
Status: ✅ Valid (beats current by $400)

💡 Tip: Lower bids have better chance to win!

[Submit Bid]
```

**Acceptance Criteria**:
- [ ] Current lowest bid always visible and accurate
- [ ] Implied APR calculation updates as user types
- [ ] Expected profit calculation correct
- [ ] Validation prevents bids ≥ current lowest
- [ ] One-click bidding works smoothly
- [ ] Win/loss feedback is immediate and clear
- [ ] Notification if outbid by another lender

---

#### FR4.7: Portfolio Management

**Lender Dashboard**:
- Overview metrics:
  - Total deployed capital
  - Active loans count
  - Expected returns (sum of all repayment amounts)
  - Average APR across portfolio
  - Next maturity date
  - Total profit earned (from repaid loans)
- Active loans section:
  - Loan cards showing:
    - Borrower (address)
    - Amount lent
    - Repayment amount (fixed)
    - Implied APR
    - Days remaining
    - Expected profit
    - Current value if listed on marketplace
  - Action buttons per loan:
    - List on marketplace
    - View transaction history
- Completed loans section:
  - Historical performance
  - Profit earned
  - Effective APR achieved
- Auctions where you're currently winning:
  - Countdown to auction end
  - Option to increase bid (bid lower)

**Example Dashboard**:
```
📊 Portfolio Overview
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Deployed:        $150,000
Active Loans:    5
Expected Return: $158,200
Average APR:     7.2%
Total Profit Earned: $2,100

🟢 Active Lending Positions

Loan #42
Lent: $50,000 → Repay: $50,800
APR: 3.2% • Due in 32 days
Profit: $800
[List for Sale] [Details]

Loan #38
Lent: $25,000 → Repay: $26,100  
APR: 8.8% • Due in 18 days
Profit: $1,100
[List for Sale] [Details]

...

🔵 Pending Auctions (You're Winning)

Auction #45 • Ends in 3h 12m
Your bid: $40,200 (5.1% APR)
Status: ⭐ Winning
[Update Bid]
```

**Acceptance Criteria**:
- [ ] Overview metrics accurate and live
- [ ] All active lending positions visible
- [ ] Historical completed loans tracked
- [ ] Easy navigation to marketplace to list positions
- [ ] Export/download portfolio data (CSV)
- [ ] Pending auction wins shown prominently

---

### 6.4 Marketplace Interface (Should Have - P1)

#### FR4.8: NFT Marketplace

**Browse Listings**:
- Tabs for "Lender Positions" and "Borrower Positions"
- Each listing shows:
  - Position type
  - Loan amount
  - Repayment amount (fixed)
  - Implied APR
  - Time remaining until maturity
  - Asking price
  - Implied yield if purchased (for lender positions)
  - Discount/premium vs expected value
- Filters:
  - Position type
  - Price range
  - Yield range
  - Time remaining
  - Discount percentage
- Sorting:
  - Best yield
  - Lowest price
  - Ending soonest
  - Biggest discount

**Purchase Flow**:
```
Lender Position #42 FOR SALE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Expected Return: $50,800
Time to Maturity: 32 days
Asking Price: $49,500

💰 Your profit if you buy: $1,300
📈 Implied yield: 26.3% annualized
💎 Discount: 2.6% below expected value

[Buy Position for $49,500]
```

1. Browse marketplace listings
2. Click position to see full details
3. Review:
   - Complete loan terms
   - Expected return (repayment amount)
   - Asking price
   - Implied yield at purchase price
   - Time remaining
4. Click "Buy Position"
5. Approve USDT payment
6. NFT transfers immediately
7. Position appears in user's portfolio

**Listing Flow**:
1. From portfolio, click "List for Sale"
2. See suggested price:
   - Lenders: Repayment amount minus 3-5% discount for quick sale
   - Borrowers: Amount owed plus 2% premium
3. Enter custom price or accept suggestion
4. Click "Create Listing"
5. Listing appears in marketplace
6. Can cancel anytime before sale

**Acceptance Criteria**:
- [ ] Listings load quickly (<2 seconds)
- [ ] Filters and sorting work smoothly
- [ ] Purchase completes in one atomic transaction
- [ ] Listing creation is simple and fast
- [ ] Price suggestions are helpful and reasonable
- [ ] Implied yield calculations accurate

---

## 7. Non-Functional Requirements

### 7.1 Security (Critical - P0)

#### NFR1.1: Smart Contract Security

**Requirements**:
- Professional security audit by reputable firm (budgeted: $78,000)
- Audit must cover:
  - Reentrancy vulnerabilities (Clarity prevents this, but verify)
  - Integer overflow/underflow
  - Access control logic
  - Economic attacks (auction manipulation, gaming)
  - Edge cases in auction mechanism
  - NFT transfer security
  - Bid validation logic
- Zero critical or high-severity vulnerabilities before mainnet
- All medium vulnerabilities addressed or documented with mitigation
- Audit report published publicly

**Acceptance Criteria**:
- [ ] Audit completed by recognized firm (e.g., Trail of Bits, Zellic, Certik)
- [ ] No critical or high vulnerabilities in final report
- [ ] All recommendations addressed or justified
- [ ] Audit report published on website and GitHub

#### NFR1.2: Access Control

**Requirements**:
- No admin keys with custody of user funds
- No ability to pause individual loans (only global emergency pause, if needed)
- Emergency pause requires time-lock (24-48 hours) if implemented
- Protocol upgrades use Stacks trait system (non-destructive)
- Only NFT holder can manage their position
- No backdoors or special access functions

**Acceptance Criteria**:
- [ ] Code review confirms no admin custody functions
- [ ] Emergency pause tested and time-locked (if implemented)
- [ ] All privileged functions explicitly documented
- [ ] Access control tests pass 100%

#### NFR1.3: Oracle-Free Guarantee

**Requirements**:
- Zero dependency on external price feeds
- No Chainlink, Band, or any oracle integration
- Repayment amounts determined purely by auction bids
- Collateral value irrelevant to protocol operation (no liquidations in Phase 1)
- System operates identically regardless of BTC/USD price

**Acceptance Criteria**:
- [ ] Code contains no oracle contract calls
- [ ] Repayment calculation uses only stored bid amounts
- [ ] No price-dependent logic anywhere in contracts
- [ ] Protocol functions normally if BTC price 10x or 0.1x

---

### 7.2 Performance (High Priority - P0)

#### NFR2.1: Transaction Costs

**Gas Optimization Targets**:
- Loan creation: <$5 USD equivalent in STX
- Bid placement: <$2 USD equivalent in STX
- Auction finalization: <$3 USD equivalent in STX
- Loan repayment: <$3 USD equivalent in STX
- NFT transfer: <$1 USD equivalent in STX

**Optimization Techniques**:
- Minimize storage reads/writes
- Use efficient Clarity built-ins
- Batch operations where possible
- Store only current lowest bid (not all bids)

**Acceptance Criteria**:
- [ ] Gas costs measured on testnet
- [ ] All operations within target costs
- [ ] Costs documented in user FAQ

#### NFR2.2: User Interface Responsiveness

**Performance Targets**:
- Initial page load: <2 seconds
- Auction list refresh: <500ms
- Wallet connection: <3 seconds
- Bid updates: <100ms latency from blockchain
- Smooth animations: 60fps

**Technical Requirements**:
- Lazy load non-critical components
- Optimize bundle size (<500KB JS)
- Use React.memo for expensive components
- Implement virtual scrolling for long lists
- Cache blockchain data appropriately

**Acceptance Criteria**:
- [ ] Lighthouse performance score >90
- [ ] Time to Interactive <3 seconds
- [ ] Smooth 60fps scrolling
- [ ] No layout shifts (CLS <0.1)

---

### 7.3 Reliability (High Priority - P0)

#### NFR3.1: System Uptime

**Targets**:
- Smart contracts: 100% uptime (guaranteed by Stacks blockchain)
- Frontend hosting: 99.9% uptime
- Backend services (if any): 99.5% uptime
- Blockchain node access: 99.5% uptime

**Resilience Strategies**:
- Multiple Stacks API endpoints
- Fallback RPC nodes
- Static site hosting (CDN)
- Graceful degradation if services unavailable

**Acceptance Criteria**:
- [ ] Frontend accessible even if API endpoint down
- [ ] Users can still interact via direct contract calls
- [ ] Clear error messages when services degraded
- [ ] No single point of failure

#### NFR3.2: Data Consistency

**Requirements**:
- Blockchain state is source of truth
- Frontend never shows stale data >30 seconds old
- Real-time updates for auction bids
- Transaction status tracked accurately
- No race conditions in UI state

**Acceptance Criteria**:
- [ ] Auction bids update every block
- [ ] Transaction confirmations appear within 10 seconds
- [ ] Multiple tabs show consistent state
- [ ] Blockchain data refreshes on focus

---

### 7.4 Scalability (Medium Priority - P1)

#### NFR4.1: Concurrent Users

**Targets**:
- Support 100+ simultaneous users
- Handle 10+ concurrent auctions
- Process 50+ bids per hour
- Serve 1000+ page views per hour

**Technical Approach**:
- Stateless frontend (scales horizontally)
- Blockchain handles state (Stacks scales)
- CDN for static assets
- Efficient API queries

**Acceptance Criteria**:
- [ ] Load testing shows no degradation at target concurrency
- [ ] No rate limiting from blockchain API
- [ ] Page load times consistent under load

---

### 7.5 Usability (High Priority - P0)

#### NFR5.1: Intuitive Interface

**Requirements**:
- First-time borrowers can create loan in <3 minutes
- First-time lenders can place bid in <2 minutes
- No tutorial required for basic operations
- Clear labels and helpful tooltips
- Mobile-responsive design
- Implied APR calculations shown everywhere

**Acceptance Criteria**:
- [ ] User testing shows >80% task completion
- [ ] Average time-to-first-loan <5 minutes
- [ ] Mobile users can complete all tasks
- [ ] Accessibility score >90 (WCAG AA compliant)

#### NFR5.2: Error Handling

**Requirements**:
- Clear error messages in plain English
- Specific guidance on how to fix errors
- Graceful degradation when services fail
- No generic "Something went wrong" messages
- Transaction failures explained with next steps

**Examples**:
- ❌ "Transaction failed"
- ✅ "Bid too high. Current lowest bid is $51,200. Your bid must be less than $51,200."

- ❌ "Invalid amount"
- ✅ "Maximum repayment must be greater than loan amount. You're borrowing $50,000 but max repayment is $49,000."

**Acceptance Criteria**:
- [ ] All error states have specific messages
- [ ] Users understand what went wrong
- [ ] Recovery path provided in error message
- [ ] Errors logged for debugging

---

## 8. Success Metrics

### 8.1 Primary Success Metrics (Phase 1)

| Metric | Target (Month 3) | Target (Month 6) | Measurement Method |
|--------|------------------|------------------|-------------------|
| **Total Loan Volume** | $500,000 | $1,000,000+ | Sum of all finalized loans |
| **Active Borrowers** | 5 unique | 10+ unique | Count of unique addresses that created loans |
| **Active Lenders** | 20 unique | 50+ unique | Count of unique addresses that placed winning bids |
| **Average Loan Size** | $25,000 | $50,000 | Total volume / number of loans |
| **Average Winning Bid APR** | 7-9% | 6-8% | Average implied APR from winning bids |
| **Average Bids per Auction** | 2-3 | 3-5 | Total bids / total auctions |
| **Auction Completion Rate** | >60% | >70% | (Loans finalized / Auctions created) * 100 |
| **Average Bid Discount** | 10-15% | 15-20% | (Max repayment - winning bid) / max repayment |
| **Secondary Market Activity** | 5% | 10% | (Positions traded / Total positions) * 100 |
| **Repeat User Rate** | >30% | >50% | Users with 2+ loans or bids |

### 8.2 Secondary Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Smart Contract Security** | Zero critical bugs post-audit | Audit report + bug reports |
| **Transaction Success Rate** | >99% | Successful txs / Total attempted txs |
| **Average Auction Duration Until First Bid** | <8 hours | Time from creation to first bid |
| **User Satisfaction** | >4.0/5.0 stars | User feedback surveys |
| **Protocol Fees Collected** | $1,000+ | 0.1% protocol fee * volume (if applicable) |
| **Website Traffic** | 5,000+ visits/month | Google Analytics |
| **Social Media Following** | 1,000+ followers | Twitter/Discord |

### 8.3 Key Performance Indicators (KPIs) by User Type

**For Borrowers (Miners)**:
- ✅ 10+ unique mining operations using protocol
- ✅ Average time-to-funding: <30 hours from auction creation (24h auction + 6h finalization)
- ✅ Repeat borrowing rate: >50%
- ✅ Average winning bid: 15-20% below borrower's maximum
- ✅ Average collateral ratio: 150%+ (conservative)

**For Lenders**:
- ✅ $1M+ total capital deployed
- ✅ Average yield achieved: 6-9% APR
- ✅ Zero defaults (overcollateralized lending)
- ✅ Repeat lending rate: >60%
- ✅ Average profit per position: $500-2,000

**For Protocol**:
- ✅ Zero security incidents
- ✅ 99%+ uptime
- ✅ Average 3-4 bids per auction (healthy competition)
- ✅ Community engagement: Active Discord/Twitter

### 8.4 Qualitative Success Indicators

**Product-Market Fit Signals**:
- [ ] Organic word-of-mouth growth (no paid marketing)
- [ ] Miners discussing protocol on Twitter/Reddit
- [ ] Lenders comparing protocol favorably to Aave/Compound
- [ ] Requests for features/improvements from active users
- [ ] Other protocols asking to integrate
- [ ] Media coverage (blog posts, podcasts)

**Ecosystem Impact**:
- [ ] Increased sBTC adoption on Stacks
- [ ] Other projects building on top of protocol
- [ ] Academic interest (DeFi researchers)
- [ ] Integration requests from wallets/platforms
- [ ] Open-source contributions from community

---

## 9. Phase 1 Deliverables

### 9.1 Deliverable Timeline

| Code | Deliverable | Timeline | Budget | Status |
|------|-------------|----------|--------|--------|
| **D1.1** | Security Audit Complete | Month 1.5 | $78,000 | Planned |
| **D1.2** | Stacks Mainnet Deploy | Month 0.7 | $34,000 | Planned |
| **D1.3** | sBTC Collateral Live | Month 0.6 | $23,000 | Planned |
| **D1.4** | Competitive Bidding Auctions | Month 0.6 | $23,000 | Planned |
| **D1.5** | NFT Positions Trading | Month 0.6 | $23,000 | Planned |
| **D1.5a** | Lending/Borrowing UI | Month 1.5 | $18,000 | Planned |
| **D1.5b** | NFT Marketplace UI | Month 1.2 | $15,000 | Planned |
| **D1.6** | First Miner Borrowers | Month 0.8 | $17,000 | Planned |
| **D1.7** | $1M Volume Milestone | Month 1.2 | $23,000 | Planned |

**Total Phase 1 Budget**: $254,000  
**Total Phase 1 Duration**: 6 months

### 9.2 Detailed Deliverable Descriptions

#### D1.1: Security Audit Complete ($78,000)

**Scope**:
- Comprehensive audit by professional firm (Trail of Bits, Zellic, or Certik)
- Coverage: All smart contracts (lending, auction, NFT, marketplace)
- Focus areas:
  - Economic attack vectors (auction gaming, bid manipulation)
  - Access control vulnerabilities
  - Integer math safety
  - Auction mechanism edge cases (no bids, ties, timing)
  - NFT transfer security
  - Bid validation logic
  - Reentrancy (Clarity prevents, but verify)

**Deliverables**:
- Full audit report (PDF)
- List of findings with severity ratings
- Remediation recommendations
- Follow-up audit after fixes
- Public disclosure of final report

**Success Criteria**:
- Zero critical or high-severity issues
- All medium issues resolved or mitigated
- Public audit report published

---

#### D1.2: Stacks Mainnet Deploy ($34,000)

**Scope**:
- Deploy loan protocol contract to Stacks mainnet
- Configure protocol parameters (fees, durations, etc.)
- Verify contract functionality post-deployment
- Set up monitoring and alerting
- Initialize contract with self-reference

**Deliverables**:
- Contract deployed and verified on Stacks Explorer
- Deployment documentation
- Mainnet contract address published
- Monitoring dashboard operational

**Success Criteria**:
- Contract deployed successfully
- No deployment issues or reverts
- Contract matches audited code exactly
- Monitoring confirms contract operational

---

#### D1.3: sBTC Collateral Live ($23,000)

**Scope**:
- Integrate sBTC token contract
- Implement collateral locking mechanism
- Test sBTC deposits and withdrawals
- Verify sBTC balance tracking

**Deliverables**:
- sBTC integration complete
- Collateral locking tested on mainnet
- Documentation for sBTC handling
- User guide for depositing sBTC

**Success Criteria**:
- Users can deposit sBTC successfully
- Collateral locks immutably
- Withdrawals work after repayment
- No sBTC loss or lock-up bugs

---

#### D1.4: Competitive Bidding Auctions ($23,000)

**Scope**:
- Implement competitive bidding mechanism
- Deploy auction logic within loan contract
- Test bid validation (must be lower than current)
- Verify lowest-bid-wins finalization
- Test edge cases (no bids, single bid, ties)

**Deliverables**:
- Auction functions deployed
- Bid validation algorithm implemented
- Bid tracking functional
- Finalization logic tested

**Success Criteria**:
- Auctions accept multiple bids during duration
- Each bid must be lower than previous
- Lowest bid wins when auction ends
- Edge cases handled (expired auctions, no bids)

---

#### D1.5: NFT Positions Trading ($23,000)

**Scope**:
- Implement SIP-009 NFT standard
- Create borrower and lender NFT functionality
- Enable transfers with proper accounting
- Test ownership tracking

**Deliverables**:
- NFT functionality deployed (borrower + lender)
- SIP-009 compliance verified
- Transfer mechanism functional
- NFTs visible in Stacks wallets/explorers

**Success Criteria**:
- NFTs mint upon loan finalization
- Transfers update protocol accounting
- Repayments route to current NFT owner
- NFTs display correctly in wallets

---

#### D1.5a: Lending/Borrowing UI ($18,000)

**Scope**:
- Build borrower interface (loan creation, monitoring)
- Build lender interface (auction browsing, bidding)
- Implement wallet connection
- Create dashboards for both user types
- Show real-time bid updates

**Deliverables**:
- React frontend deployed
- Borrower can create loans
- Lender can browse and bid on auctions
- Dashboards show active positions
- Real-time bid tracking

**Success Criteria**:
- Users can complete full loan cycle via UI
- Mobile responsive
- <2 second load times
- Clear error messages
- Implied APR calculations accurate

---

#### D1.5b: NFT Marketplace UI ($15,000)

**Scope**:
- Build marketplace interface
- Enable listing creation
- Implement purchase flow
- Display analytics (price, yield, discount)

**Deliverables**:
- Marketplace page functional
- Users can list positions
- Users can buy positions
- Price suggestions implemented

**Success Criteria**:
- Listings appear immediately
- Purchases complete atomically
- Price calculations accurate
- Filter and sort work smoothly

---

#### D1.6: First Miner Borrowers ($17,000)

**Scope**:
- Business development to onboard miners
- Attend mining conferences (Mining Disrupt Miami, BTC Prague)
- Direct outreach to mining operations
- Create miner-specific documentation
- Provide white-glove support for first users

**Deliverables**:
- 5+ miners actively using protocol
- At least 3 completed loan cycles
- Miner feedback collected
- Case studies published

**Success Criteria**:
- 5+ unique mining operations onboarded
- $100,000+ in loan volume from miners
- Positive feedback from miners
- Repeat borrowing from at least 2 miners

---

#### D1.7: $1M Volume Milestone ($23,000)

**Scope**:
- Marketing and user acquisition
- Liquidity incentives if needed
- Partnership outreach
- Community building
- Social media presence

**Deliverables**:
- $1M+ cumulative loan volume
- Marketing materials created
- Social media presence established
- Analytics dashboard showing volume

**Success Criteria**:
- $1M+ total loan volume
- 10+ active borrowers
- 50+ active lenders
- Organic growth trajectory established
- Average 3+ bids per auction

---

## 10. Technical Constraints

### 10.1 Blockchain Constraints

**Stacks Blockchain Limitations**:
- Block time: ~10 minutes (inherited from Bitcoin)
- Transaction finality: ~15-20 minutes (multiple Bitcoin blocks)
- Gas costs: ~0.001-0.01 STX per transaction ($0.50-$5 USD equivalent)
- Clarity limitations:
  - No floating-point math (use integer math with scaling factors)
  - No external API calls (oracle-free is enforced by design)
  - Limited string handling

**Mitigation Strategies**:
- Use integer math for all calculations
- Store repayment amounts as integers (USDT has 6 decimals)
- Calculate implied APR off-chain in frontend
- Design UI to mask blockchain delays (optimistic updates)
- Batch operations where possible to reduce gas costs

### 10.2 sBTC Constraints

**Current sBTC Status** (as of January 2026):
- sBTC is in beta/testnet phase (mainnet launch expected Q1-Q2 2026)
- Peg mechanism: 1:1 with Bitcoin via decentralized signers
- Trust assumptions: Multi-sig federation (improving toward full decentralization)

**Protocol Dependency**:
- Phase 1 **requires sBTC mainnet launch** to proceed
- Contingency: Delay Phase 1 if sBTC delayed, OR
- Alternative: Use different BTC representation (e.g., xBTC) temporarily

**Action Item**: Monitor sBTC roadmap closely; adjust Phase 1 timeline if needed

### 10.3 Frontend Constraints

**Browser Compatibility**:
- Support: Chrome, Firefox, Safari, Brave (latest 2 versions)
- Mobile: iOS Safari, Android Chrome
- No IE11 support

**Wallet Compatibility**:
- Must support: Hiro, Leather, Xverse
- Nice to have: Other Stacks wallets as they emerge

**Bundle Size**:
- Target: <500KB JS bundle
- Strategy: Code splitting, lazy loading, tree shaking

---

## 11. Out of Scope (Phase 1)

The following features are **explicitly not included** in Phase 1 and are deferred to future phases:

### 11.1 Deferred to Phase 2

- ❌ Native Bitcoin custody (Phase 2 focus)
- ❌ Threshold signature validators
- ❌ Direct Bitcoin blockchain integration
- ❌ Removal of sBTC dependency

### 11.2 Deferred to Phase 3

- ❌ Cross-chain liquidity (Ethereum, Solana, etc.)
- ❌ Bridge integrations
- ❌ Multi-chain borrower destination options
- ❌ Support for non-Stacks lenders

### 11.3 Future Enhancements (No Specific Phase)

- ❌ Liquidation mechanisms (Phase 1 is overcollateralized, no liquidations)
- ❌ Under-collateralized lending (too risky for Phase 1)
- ❌ Credit scoring system
- ❌ Reputation system for borrowers
- ❌ Variable rate loans (fixed repayment only in Phase 1)
- ❌ Loan extensions or refinancing
- ❌ Partial repayments (must repay in full)
- ❌ Auto-compounding interest
- ❌ Governance token or DAO
- ❌ Protocol-owned liquidity
- ❌ Insurance fund for defaults
- ❌ Mobile app (web only in Phase 1)
- ❌ Fiat on/off ramps

### 11.4 Intentionally Not Supported

These features will **never** be added (by design):

- ❌ Oracle integration (defeats core innovation)
- ❌ Admin custody of user funds (trustless protocol)
- ❌ KYC or identity requirements (permissionless)
- ❌ Geographic restrictions (censorship-resistant)
- ❌ Ability to freeze individual user funds
- ❌ Upgradeable contracts without time-lock or governance

---

## 12. Risk Assessment

### 12.1 Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|---------|------------|
| **Smart contract bug** | Medium | Critical | Professional audit, extensive testing, bug bounty |
| **sBTC launch delay** | Medium | High | Monitor roadmap, have contingency plan (alternative collateral) |
| **Stacks network congestion** | Low | Medium | Optimize gas usage, batch operations |
| **Frontend bug causes fund loss** | Low | Critical | Thorough testing, user confirmations before tx |
| **Auction mechanism exploited** | Low | High | Formal verification, edge case testing, audit focus |
| **Bid manipulation** | Low | Medium | Multiple bids allowed, transparent history, lowest wins |

### 12.2 Market Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|---------|------------|
| **Insufficient lender interest** | Medium | High | Strong marketing, competitive auction format, security emphasis |
| **Insufficient borrower demand** | Medium | High | Target miners specifically, conference outreach |
| **Competing protocol launches** | Medium | Medium | First-mover advantage, superior UX, oracle-free USP |
| **Bear market reduces activity** | High | Medium | Protocol works in any market, miners need capital in bear |
| **Regulatory pressure on Stacks** | Low | High | Decentralized design, no admin keys, geographic diversity |

### 12.3 Operational Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|---------|------------|
| **Team capacity insufficient** | Medium | High | Clear scope, hire specialists, realistic timeline |
| **Funding shortfall** | Low | Critical | Pursue multiple grant sources, phased funding |
| **Key person risk** | Medium | High | Documentation, knowledge sharing, contingency planning |
| **Vendor failure (auditor)** | Low | High | Pre-vet audit firms, have backup options |

### 12.4 Adoption Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|---------|------------|
| **Poor user experience** | Medium | High | Extensive user testing, iterate based on feedback |
| **Lack of trust in protocol** | Medium | High | Transparency, open source, audit, community building |
| **High transaction costs deter users** | Low | Medium | Optimize gas, consider subsidies for early users |
| **Miners prefer traditional loans** | Low | Medium | Education, demonstrate benefits, showcase speed |
| **Lenders find auctions confusing** | Medium | Medium | Simple UX, clear implied APR display, educational content |

### 12.5 Risk Mitigation Summary

**Overall Risk Posture**: Medium

**Key Mitigations**:
1. Professional security audit (addresses technical risks)
2. Testnet deployment and testing (validates functionality)
3. Phased rollout (limits exposure)
4. Conservative collateral ratios (reduces default risk)
5. Clear documentation (improves user trust)
6. Community engagement (builds adoption)
7. Multiple grant applications (ensures funding)
8. Simple auction mechanism (reduces confusion)

---

## 13. Timeline and Budget

### 13.1 Phase 1 Gantt Chart (6 months)

```
Month 1: Foundation & Security
├─ D1.2: Stacks Mainnet Deploy ████ (Week 1-3)
├─ D1.3: sBTC Collateral Live ███ (Week 2-3)
├─ D1.4: Competitive Bidding Auctions ███ (Week 2-3)
├─ D1.5: NFT Positions Trading ███ (Week 2-3)
└─ D1.1: Security Audit Start ████████████ (Week 3 - Month 2)

Month 2: Development & Audit
├─ D1.1: Security Audit Complete ████ (Weeks 1-2)
├─ D1.5a: Lending/Borrowing UI ████████████ (All month + Month 3)
└─ D1.5b: NFT Marketplace UI ████████ (Weeks 2-4 + Month 3)

Month 3: Polish & Launch Prep
├─ D1.5a: UI Completion ████ (Weeks 1-2)
├─ D1.5b: Marketplace Completion ████ (Week 1)
├─ Testnet user testing ████████ (Weeks 2-4)
└─ D1.6: Miner Outreach Begins ████████████ (All month)

Month 4: Launch & Early Adoption
├─ Mainnet launch ██ (Week 1)
├─ D1.6: First Miner Borrowers ████████████ (All month)
├─ Community building ████████████ (Ongoing)
└─ Marketing campaign ████████████ (Ongoing)

Month 5: Growth & Optimization
├─ D1.7: Volume Growth ████████████ (All month)
├─ Feature iteration based on feedback ████████████
└─ Bug fixes and optimizations ████████████

Month 6: Scaling & Maturation
├─ D1.7: $1M Volume Milestone Hit ████ (By end of month)
├─ Prepare Phase 2 specs ████████
└─ Community governance discussions ████████
```

### 13.2 Budget Breakdown

#### Development Costs: $156,000 (61%)

| Item | Cost | Description |
|------|------|-------------|
| Lead Developer (6 months) | $72,000 | Full-time Clarity + React development |
| Frontend Developer (4 months) | $48,000 | React specialist for UI/UX |
| Backend/Deployment (2 months) | $24,000 | Infrastructure, deployment, monitoring |
| Testing & QA (1 month) | $12,000 | Comprehensive testing before launch |

#### Security & Audit: $78,000 (31%)

| Item | Cost | Description |
|------|------|-------------|
| Smart Contract Audit | $68,000 | Professional audit (Trail of Bits, Zellic, Certik) |
| Follow-up Audit | $10,000 | Re-audit after fixes |

#### Marketing & Business Development: $17,000 (7%)

| Item | Cost | Description |
|------|------|-------------|
| Conference Attendance | $8,000 | Mining Disrupt Miami, BTC Prague (travel, booth) |
| Marketing Materials | $3,000 | Website, documentation, graphics |
| Community Building | $3,000 | Discord management, social media |
| Miner Outreach | $3,000 | Direct sales efforts, case studies |

#### Infrastructure & Operations: $3,000 (1%)

| Item | Cost | Description |
|------|------|-------------|
| Hosting & CDN | $1,000 | Vercel/Netlify + CloudFlare |
| Stacks Node Access | $1,000 | RPC endpoints, API subscriptions |
| Monitoring & Analytics | $1,000 | Sentry, Datadog, Mixpanel |

**Total Phase 1 Budget**: $254,000

### 13.3 Funding Strategy

**Target Funders**:
1. **Stacks Foundation** ($254,000) - Primary target
   - Pitch: First oracle-free competitive bidding lending on Stacks, drives sBTC adoption
   - Fit: Excellent - directly advances Stacks ecosystem

2. **HRF Bitcoin Development Fund** ($100,000) - Alternative/co-funding
   - Pitch: Bitcoin-native censorship-resistant lending
   - Fit: Good - aligns with Bitcoin freedom values

3. **OpenSats** ($154,000) - Alternative for technical work
   - Pitch: Open-source Bitcoin lending infrastructure
   - Fit: Good - open source, Bitcoin-focused

**Approach**: Apply to Stacks Foundation first (best fit). If partial funding, pursue HRF or OpenSats for remaining amount.

### 13.4 Success Criteria for Phase 1 Completion

Phase 1 is considered **complete and successful** when:

✅ All 9 deliverables shipped and verified  
✅ Security audit completed with no critical issues  
✅ $1M+ cumulative loan volume achieved  
✅ 10+ active borrowers (miners)  
✅ 50+ active lenders  
✅ Zero security incidents or fund losses  
✅ Average winning bid: 6-10% APR (competitive rates)  
✅ Average 3+ bids per auction (healthy competition)  
✅ Positive user feedback (>4/5 stars)  
✅ Open-source code published on GitHub  
✅ Community established (Discord, Twitter)  

**Upon Phase 1 success**, proceed to **Phase 2: Bitcoin-Native Custody** with threshold signatures and validator infrastructure.

---

## Appendix A: Glossary

**APR**: Annual Percentage Rate - the yearly interest rate on a loan

**Competitive Bidding Auction**: An auction where lenders place bids on total repayment amounts, with the lowest bid winning

**Implied APR**: The annualized interest rate calculated from a bid amount, loan amount, and loan duration

**DeFi**: Decentralized Finance - financial applications built on blockchain without intermediaries

**LTV (Loan-to-Value)**: Ratio of loan amount to collateral value, expressed as percentage

**NFT**: Non-Fungible Token - unique digital asset representing ownership

**Oracle**: External data feed providing off-chain information (e.g., prices) to smart contracts

**Repayment Amount**: Total amount (principal + interest) that borrower must pay to lender

**sBTC**: A 1:1 Bitcoin-backed asset on the Stacks blockchain

**SIP-009**: Stacks Improvement Proposal defining the NFT standard on Stacks

**Stacks**: A Bitcoin layer for smart contracts using Proof of Transfer consensus

**USDT**: Tether, a stablecoin pegged 1:1 to the US Dollar

**Winning Bid**: The lowest bid placed during an auction, which wins when the auction ends

---

## Appendix B: References

**Stacks Documentation**:
- https://docs.stacks.co
- https://book.clarity-lang.org

**sBTC Documentation**:
- https://sbtc.tech
- https://github.com/stacks-network/sbtc

**Competitive Analysis**:
- Aave: https://aave.com
- Compound: https://compound.finance
- MakerDAO: https://makerdao.com

**Security Best Practices**:
- Trail of Bits: https://github.com/crytic/building-secure-contracts
- Clarity Security Guide: https://docs.stacks.co/clarity/security

---

## Appendix C: Contact & Feedback

**Project Lead**: Jamie  
**Organization**: Bitcoin Lending Protocol Foundation (planned)  
**Website**: [To be launched]  
**GitHub**: [To be published]  
**Discord**: [To be created]  
**Twitter**: [To be launched]

**Feedback**: This PRD is a living document. Please provide feedback on:
- Missing requirements
- Unclear specifications
- Unrealistic timelines
- Budget concerns
- Technical feasibility

---

**Document Version History**:
- v1.0 (January 2026) - Initial draft with incorrect descending auction
- v1.1 (January 2026) - **CORRECTED**: Competitive bidding auction mechanism

---

*End of Product Requirements Document - Phase 1*
