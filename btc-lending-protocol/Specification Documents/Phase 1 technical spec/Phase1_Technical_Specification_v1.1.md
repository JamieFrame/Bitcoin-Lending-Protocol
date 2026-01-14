# Bitcoin Lending Protocol
## Technical Specification Document
### Phase 1: Stacks Mainnet Implementation

**Version:** 1.1 (Corrected Auction Mechanism)  
**Date:** January 2026  
**Status:** Draft for Development  
**Author:** Technical Team

---

## Document Overview

**CRITICAL UPDATE**: This version corrects the auction mechanism from the incorrect "descending rate auction" to the actual "competitive bidding auction" implemented in loan-protocol-v35.clar.

**Key Change**: Lenders place bids on **total repayment amounts** (not interest rates), and the **lowest bid wins** when the auction ends (not first bid wins immediately).

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Smart Contract Specifications](#2-smart-contract-specifications)
3. [Data Structures](#3-data-structures)
4. [Core Functions](#4-core-functions)
5. [Auction Mechanism](#5-auction-mechanism)
6. [NFT Implementation](#6-nft-implementation)
7. [Marketplace Contracts](#7-marketplace-contracts)
8. [Frontend Architecture](#8-frontend-architecture)
9. [API Specifications](#9-api-specifications)
10. [Security Considerations](#10-security-considerations)
11. [Testing Strategy](#11-testing-strategy)
12. [Deployment Plan](#12-deployment-plan)
13. [Monitoring & Maintenance](#13-monitoring-maintenance)

---

## 1. Architecture Overview

### 1.1 System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend Layer                           │
│  ┌────────────────┐  ┌──────────────────┐  ┌─────────────────┐ │
│  │  React Web App │  │  Wallet Connector │  │  Analytics SDK  │ │
│  │  - Next.js     │  │  - Stacks.js     │  │  - Mixpanel     │ │
│  │  - TailwindCSS │  │  - Hiro/Leather  │  │  - Sentry       │ │
│  └────────┬───────┘  └────────┬─────────┘  └────────┬────────┘ │
└───────────┼────────────────────┼─────────────────────┼──────────┘
            │                    │                     │
            │                    │                     │
┌───────────▼────────────────────▼─────────────────────▼──────────┐
│                      API & Indexing Layer                        │
│  ┌────────────────┐  ┌──────────────────┐  ┌─────────────────┐ │
│  │  Stacks API    │  │  Custom Indexer  │  │  IPFS Gateway   │ │
│  │  (Hiro API)    │  │  (Event Parser)  │  │  (Metadata)     │ │
│  └────────────────┘  └──────────────────┘  └─────────────────┘ │
└──────────────────────────────┬───────────────────────────────────┘
                               │
┌──────────────────────────────▼───────────────────────────────────┐
│                    Stacks Blockchain Layer                        │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │         loan-protocol.clar (Single Contract)             │   │
│  │                                                            │   │
│  │  ┌──────────────────────────────────────────────────┐   │   │
│  │  │  Collateral Management                           │   │   │
│  │  │  - Lock sBTC/USDT collateral                     │   │   │
│  │  │  - Release on repayment or default               │   │   │
│  │  └──────────────────────────────────────────────────┘   │   │
│  │                                                            │   │
│  │  ┌──────────────────────────────────────────────────┐   │   │
│  │  │  Competitive Bidding Auction                     │   │   │
│  │  │  - Borrower sets max repayment                   │   │   │
│  │  │  - Lenders bid lower amounts                     │   │   │
│  │  │  - Lowest bid wins at auction end                │   │   │
│  │  └──────────────────────────────────────────────────┘   │   │
│  │                                                            │   │
│  │  ┌──────────────────────────────────────────────────┐   │   │
│  │  │  Loan Lifecycle                                  │   │   │
│  │  │  - Create auction                                │   │   │
│  │  │  - Accept bids                                   │   │   │
│  │  │  - Finalize (transfer funds)                     │   │   │
│  │  │  - Repayment processing                          │   │   │
│  │  └──────────────────────────────────────────────────┘   │   │
│  │                                                            │   │
│  │  ┌──────────────────────────────────────────────────┐   │   │
│  │  │  NFT Positions (SIP-009)                         │   │   │
│  │  │  - Borrower position NFTs                        │   │   │
│  │  │  - Lender position NFTs                          │   │   │
│  │  │  - Transferable ownership                        │   │   │
│  │  └──────────────────────────────────────────────────┘   │   │
│  │                                                            │   │
│  │  ┌──────────────────────────────────────────────────┐   │   │
│  │  │  Secondary Marketplace                           │   │   │
│  │  │  - List positions for sale                       │   │   │
│  │  │  - Purchase positions                            │   │   │
│  │  │  - Atomic transfer + payment                     │   │   │
│  │  └──────────────────────────────────────────────────┘   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │            External Token Contracts                       │   │
│  │  ┌──────────────┐              ┌──────────────────┐     │   │
│  │  │ sBTC Token   │              │ USDT Token       │     │   │
│  │  │ (SIP-010)    │              │ (SIP-010)        │     │   │
│  │  └──────────────┘              └──────────────────┘     │   │
│  └──────────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────────────┘
                               │
                               │ Proof of Transfer
                               │
┌──────────────────────────────▼───────────────────────────────────┐
│                      Bitcoin Blockchain                           │
│  - Provides finality for Stacks transactions                     │
│  - Anchors protocol state to Bitcoin security                    │
└───────────────────────────────────────────────────────────────────┘
```

### 1.2 Technology Stack

**Blockchain Layer**:
- Stacks Blockchain (Nakamoto release)
- Clarity smart contract language
- SIP-009 (NFT Standard)
- SIP-010 (Fungible Token Standard)

**Frontend Layer**:
- Next.js 14 (React framework)
- TypeScript (type safety)
- TailwindCSS (styling)
- @stacks/connect (wallet integration)
- @stacks/transactions (transaction building)
- SWR (data fetching and caching)

**Infrastructure**:
- Vercel (frontend hosting)
- Hiro API (Stacks blockchain access)
- IPFS (metadata storage)
- Sentry (error tracking)
- Mixpanel (analytics)

### 1.3 Design Principles

1. **Security First**: All contract logic favors security over gas optimization
2. **Immutability**: Core loan terms cannot be modified after finalization
3. **Transparency**: All bids and state changes emit events for off-chain tracking
4. **Simplicity**: Avoid unnecessary complexity; readable code over clever code
5. **Gas Efficiency**: Optimize for reasonable gas costs without sacrificing security
6. **Fail-Safe**: Operations fail safely; no partial state updates
7. **Oracle-Free**: Zero dependency on external price feeds - all pricing from competitive bids

---

## 2. Smart Contract Specifications

### 2.1 Contract Architecture

Phase 1 uses a **single unified contract** approach for simplicity:

**Primary Contract**:
- `loan-protocol.clar` - All functionality in one contract

**External Dependencies**:
- `sbtc-token.clar` - sBTC fungible token (SIP-010)
- `usdt-token.clar` - USDT fungible token (SIP-010)

### 2.2 Contract: loan-protocol.clar

**Purpose**: Manages the complete loan lifecycle including collateral, auctions, bidding, NFTs, and marketplace.

#### 2.2.1 Contract Constants

```clarity
;; Asset types
(define-constant ASSET_BTC "BTC")
(define-constant ASSET_USDT "USDT")

;; Minimum durations (in blocks)
(define-constant MIN_DURATION u1008)          ;; ~7 days
(define-constant MIN_AUCTION_DURATION u144)   ;; ~1 day

;; Error codes
(define-constant ERR_INVALID_ASSET (err u401))
(define-constant ERR_SAME_ASSET (err u402))
(define-constant ERR_NO_INTEREST (err u403))
(define-constant ERR_INVALID_DURATION (err u404))
(define-constant ERR_LOAN_NOT_FOUND (err u405))
(define-constant ERR_AUCTION_ENDED (err u406))
(define-constant ERR_AUCTION_ACTIVE (err u407))
(define-constant ERR_BID_TOO_HIGH (err u408))        ;; NEW BID MUST BE LOWER
(define-constant ERR_BID_TOO_LOW (err u409))
(define-constant ERR_NOT_LOWEST_BID (err u410))      ;; AUCTION FINALIZATION
(define-constant ERR_LOAN_NOT_ACTIVE (err u411))
(define-constant ERR_NOT_BORROWER (err u412))
(define-constant ERR_NOT_LENDER (err u413))
(define-constant ERR_NOT_MATURED (err u414))
(define-constant ERR_NOT_INITIALIZED (err u415))
(define-constant ERR_ALREADY_INITIALIZED (err u416))
(define-constant ERR_OWNER_ONLY (err u417))
(define-constant ERR_UNAUTHORIZED (err u418))
(define-constant ERR_NOT_POSITION_OWNER (err u419))

;; Contract references (updated for mainnet)
(define-constant SBTC_CONTRACT .sbtc-token)
(define-constant USDT_CONTRACT .usdt-token)
```

#### 2.2.2 Data Variables

```clarity
;; Counter for loan IDs
(define-data-var loan-nonce uint u0)

;; Contract self-reference (must be initialized)
(define-data-var contract-address (optional principal) none)

;; Contract owner (for admin functions)
(define-data-var contract-owner principal tx-sender)

;; Optional marketplace contract authorization
(define-data-var marketplace-contract (optional principal) none)
```

#### 2.2.3 Data Maps

```clarity
;; CRITICAL: Loan data structure with REPAYMENT AMOUNT
(define-map loans 
  {loan-id: uint} 
  {
    borrower: principal,
    collateral-asset: (string-ascii 10),
    collateral-amount: uint,
    borrow-asset: (string-ascii 10),
    borrow-amount: uint,
    max-repayment: uint,              ;; BORROWER'S MAXIMUM
    auction-end-block: uint,
    maturity-block: uint,
    status: (string-ascii 20),        ;; "auction", "active", "repaid", "defaulted"
    lender: (optional principal),
    repayment-amount: uint            ;; WINNING BID AMOUNT (set when finalized)
  })

;; CRITICAL: Track current LOWEST bid during auction
(define-map current-bids
  {loan-id: uint}
  {
    bidder: principal,
    amount: uint                      ;; TOTAL REPAYMENT AMOUNT (not a rate!)
  })

;; Track number of bids per loan (for transparency)
(define-map bid-counts
  {loan-id: uint}
  {count: uint})

;; NFT positions
(define-non-fungible-token borrower-position uint)
(define-non-fungible-token lender-position uint)
```

#### 2.2.4 Core Functions

**Function: create-loan-auction**

```clarity
(define-public (create-loan-auction
    (collateral-asset (string-ascii 10))
    (collateral-amount uint)
    (borrow-asset (string-ascii 10))
    (borrow-amount uint)
    (max-repayment uint)                 ;; CRITICAL: MAX TOTAL REPAYMENT
    (loan-duration-blocks uint)
    (auction-duration-blocks uint))
  (let 
    (
      (loan-id (+ (var-get loan-nonce) u1))
      (auction-end (+ burn-block-height auction-duration-blocks))
      (maturity (+ burn-block-height loan-duration-blocks))
      (contract-addr (unwrap-panic (var-get contract-address)))
    )
    
    ;; Validation
    (asserts! (is-some (var-get contract-address)) ERR_NOT_INITIALIZED)
    (asserts! (is-valid-asset collateral-asset) ERR_INVALID_ASSET)
    (asserts! (is-valid-asset borrow-asset) ERR_INVALID_ASSET)
    (asserts! (not (is-eq collateral-asset borrow-asset)) ERR_SAME_ASSET)
    (asserts! (> max-repayment borrow-amount) ERR_NO_INTEREST)  ;; MUST HAVE POSITIVE INTEREST
    (asserts! (>= loan-duration-blocks MIN_DURATION) ERR_INVALID_DURATION)
    (asserts! (>= auction-duration-blocks MIN_AUCTION_DURATION) ERR_INVALID_DURATION)
    
    ;; Transfer collateral from borrower to contract
    (if (is-eq collateral-asset ASSET_BTC)
      (try! (contract-call? SBTC_CONTRACT transfer 
        collateral-amount tx-sender contract-addr none))
      (try! (contract-call? USDT_CONTRACT transfer 
        collateral-amount tx-sender contract-addr none)))
    
    ;; Create loan record with status "auction"
    (map-set loans {loan-id: loan-id} {
      borrower: tx-sender,
      collateral-asset: collateral-asset,
      collateral-amount: collateral-amount,
      borrow-asset: borrow-asset,
      borrow-amount: borrow-amount,
      max-repayment: max-repayment,
      auction-end-block: auction-end,
      maturity-block: maturity,
      status: "auction",
      lender: none,
      repayment-amount: u0               ;; SET WHEN AUCTION FINALIZES
    })
    
    ;; Mint borrower NFT
    (try! (nft-mint? borrower-position loan-id tx-sender))
    
    ;; Initialize bid count
    (map-set bid-counts {loan-id: loan-id} {count: u0})
    
    ;; Increment loan nonce
    (var-set loan-nonce loan-id)
    
    ;; Emit event
    (print {
      event: "loan-created",
      loan-id: loan-id,
      borrower: tx-sender,
      collateral-amount: collateral-amount,
      borrow-amount: borrow-amount,
      max-repayment: max-repayment,
      auction-end-block: auction-end
    })
    
    (ok loan-id)
  )
)
```

**Function: place-bid**

```clarity
(define-public (place-bid (loan-id uint) (amount uint))
  (let 
    (
      (loan (unwrap! (map-get? loans {loan-id: loan-id}) ERR_LOAN_NOT_FOUND))
      (current-bid (map-get? current-bids {loan-id: loan-id}))
      (bid-count (default-to u0 (get count (map-get? bid-counts {loan-id: loan-id}))))
    )
    
    ;; Verify auction is still active
    (asserts! (is-eq (get status loan) "auction") ERR_AUCTION_ENDED)
    (asserts! (< burn-block-height (get auction-end-block loan)) ERR_AUCTION_ENDED)
    
    ;; CRITICAL: Validate bid amount
    (match current-bid
      ;; If there's a current bid, new bid must be LOWER
      bid (asserts! (< amount (get amount bid)) ERR_BID_TOO_HIGH)
      ;; If no current bid, must be <= max-repayment
      (asserts! (<= amount (get max-repayment loan)) ERR_BID_TOO_HIGH)
    )
    
    ;; Update current lowest bid
    (map-set current-bids {loan-id: loan-id} {
      bidder: tx-sender,
      amount: amount
    })
    
    ;; Increment bid count
    (map-set bid-counts {loan-id: loan-id} {count: (+ bid-count u1)})
    
    ;; Emit event
    (print {
      event: "bid-placed",
      loan-id: loan-id,
      bidder: tx-sender,
      amount: amount,
      bid-number: (+ bid-count u1)
    })
    
    (ok true)
  )
)
```

**Function: finalize-auction**

```clarity
(define-public (finalize-auction (loan-id uint))
  (let 
    (
      (loan (unwrap! (map-get? loans {loan-id: loan-id}) ERR_LOAN_NOT_FOUND))
      (winning-bid (unwrap! (map-get? current-bids {loan-id: loan-id}) ERR_NOT_LOWEST_BID))
      (contract-addr (unwrap-panic (var-get contract-address)))
    )
    
    ;; Verify auction has ended
    (asserts! (>= burn-block-height (get auction-end-block loan)) ERR_AUCTION_ACTIVE)
    (asserts! (is-eq (get status loan) "auction") ERR_AUCTION_ENDED)
    
    ;; Transfer borrow-amount from winner to borrower
    (if (is-eq (get borrow-asset loan) ASSET_BTC)
      (try! (contract-call? SBTC_CONTRACT transfer
        (get borrow-amount loan)
        (get bidder winning-bid)
        (get borrower loan)
        none))
      (try! (contract-call? USDT_CONTRACT transfer
        (get borrow-amount loan)
        (get bidder winning-bid)
        (get borrower loan)
        none)))
    
    ;; Update loan status to "active" with winning bid details
    (map-set loans {loan-id: loan-id} (merge loan {
      status: "active",
      lender: (some (get bidder winning-bid)),
      repayment-amount: (get amount winning-bid)    ;; CRITICAL: STORE WINNING BID
    }))
    
    ;; Mint lender NFT
    (try! (nft-mint? lender-position loan-id (get bidder winning-bid)))
    
    ;; Emit event
    (print {
      event: "auction-finalized",
      loan-id: loan-id,
      winner: (get bidder winning-bid),
      winning-bid: (get amount winning-bid),
      borrow-amount: (get borrow-amount loan)
    })
    
    (ok true)
  )
)
```

**Function: repay-loan**

```clarity
(define-public (repay-loan (loan-id uint))
  (let 
    (
      (loan (unwrap! (map-get? loans {loan-id: loan-id}) ERR_LOAN_NOT_FOUND))
      (borrower-nft-owner (unwrap! (nft-get-owner? borrower-position loan-id) ERR_NOT_BORROWER))
      (lender-nft-owner (unwrap! (nft-get-owner? lender-position loan-id) ERR_NOT_LENDER))
      (contract-addr (unwrap-panic (var-get contract-address)))
    )
    
    ;; Verify loan is active
    (asserts! (is-eq (get status loan) "active") ERR_LOAN_NOT_ACTIVE)
    
    ;; Verify caller is current borrower NFT owner
    (asserts! (is-eq tx-sender borrower-nft-owner) ERR_NOT_BORROWER)
    
    ;; CRITICAL: Transfer FIXED repayment-amount (from winning bid)
    (if (is-eq (get borrow-asset loan) ASSET_BTC)
      (try! (contract-call? SBTC_CONTRACT transfer
        (get repayment-amount loan)              ;; FIXED AMOUNT FROM AUCTION
        tx-sender
        lender-nft-owner                         ;; TO CURRENT LENDER NFT OWNER
        none))
      (try! (contract-call? USDT_CONTRACT transfer
        (get repayment-amount loan)
        tx-sender
        lender-nft-owner
        none)))
    
    ;; Return collateral to current borrower NFT owner
    (if (is-eq (get collateral-asset loan) ASSET_BTC)
      (try! (as-contract (contract-call? SBTC_CONTRACT transfer
        (get collateral-amount loan)
        contract-addr
        borrower-nft-owner
        none)))
      (try! (as-contract (contract-call? USDT_CONTRACT transfer
        (get collateral-amount loan)
        contract-addr
        borrower-nft-owner
        none))))
    
    ;; Burn NFTs
    (try! (nft-burn? borrower-position loan-id borrower-nft-owner))
    (try! (nft-burn? lender-position loan-id lender-nft-owner))
    
    ;; Update loan status
    (map-set loans {loan-id: loan-id} (merge loan {status: "repaid"}))
    
    ;; Emit event
    (print {
      event: "loan-repaid",
      loan-id: loan-id,
      borrower: borrower-nft-owner,
      lender: lender-nft-owner,
      repayment-amount: (get repayment-amount loan)
    })
    
    (ok true)
  )
)
```

**Function: claim-collateral** (for defaults)

```clarity
(define-public (claim-collateral (loan-id uint))
  (let 
    (
      (loan (unwrap! (map-get? loans {loan-id: loan-id}) ERR_LOAN_NOT_FOUND))
      (lender-nft-owner (unwrap! (nft-get-owner? lender-position loan-id) ERR_NOT_LENDER))
      (borrower-nft-owner (unwrap! (nft-get-owner? borrower-position loan-id) ERR_NOT_BORROWER))
      (contract-addr (unwrap-panic (var-get contract-address)))
    )
    
    ;; Verify loan is active
    (asserts! (is-eq (get status loan) "active") ERR_LOAN_NOT_ACTIVE)
    
    ;; Verify caller is current lender NFT owner
    (asserts! (is-eq tx-sender lender-nft-owner) ERR_NOT_LENDER)
    
    ;; Verify loan has matured (past due date)
    (asserts! (>= burn-block-height (get maturity-block loan)) ERR_NOT_MATURED)
    
    ;; Transfer collateral to lender
    (if (is-eq (get collateral-asset loan) ASSET_BTC)
      (try! (as-contract (contract-call? SBTC_CONTRACT transfer
        (get collateral-amount loan)
        contract-addr
        lender-nft-owner
        none)))
      (try! (as-contract (contract-call? USDT_CONTRACT transfer
        (get collateral-amount loan)
        contract-addr
        lender-nft-owner
        none))))
    
    ;; Burn NFTs
    (try! (nft-burn? lender-position loan-id lender-nft-owner))
    (try! (nft-burn? borrower-position loan-id borrower-nft-owner))
    
    ;; Update loan status
    (map-set loans {loan-id: loan-id} (merge loan {status: "defaulted"}))
    
    ;; Emit event
    (print {
      event: "collateral-claimed",
      loan-id: loan-id,
      lender: lender-nft-owner
    })
    
    (ok true)
  )
)
```

#### 2.2.5 NFT Transfer Functions

```clarity
;; Transfer lender position NFT
(define-public (transfer-lender-position 
  (loan-id uint) 
  (sender principal) 
  (recipient principal))
  (let
    (
      (loan (unwrap! (map-get? loans {loan-id: loan-id}) ERR_LOAN_NOT_FOUND))
      (nft-owner (unwrap! (nft-get-owner? lender-position loan-id) ERR_NOT_LENDER))
    )
    ;; Verify sender owns the NFT
    (asserts! (is-eq sender nft-owner) ERR_NOT_POSITION_OWNER)
    
    ;; Verify caller is owner OR authorized marketplace
    (asserts! 
      (or 
        (is-eq tx-sender sender)
        (match (var-get marketplace-contract)
          marketplace (is-eq tx-sender marketplace)
          false)
      )
      ERR_UNAUTHORIZED)
    
    ;; Transfer NFT
    (try! (nft-transfer? lender-position loan-id sender recipient))
    
    ;; Update loan record with new lender
    (ok (map-set loans {loan-id: loan-id} (merge loan {lender: (some recipient)})))
  )
)

;; Transfer borrower position NFT
(define-public (transfer-borrower-position 
  (loan-id uint) 
  (sender principal) 
  (recipient principal))
  (let
    (
      (loan (unwrap! (map-get? loans {loan-id: loan-id}) ERR_LOAN_NOT_FOUND))
      (nft-owner (unwrap! (nft-get-owner? borrower-position loan-id) ERR_NOT_BORROWER))
    )
    ;; Verify sender owns the NFT
    (asserts! (is-eq sender nft-owner) ERR_NOT_POSITION_OWNER)
    
    ;; Verify caller is owner OR authorized marketplace
    (asserts! 
      (or 
        (is-eq tx-sender sender)
        (match (var-get marketplace-contract)
          marketplace (is-eq tx-sender marketplace)
          false)
      )
      ERR_UNAUTHORIZED)
    
    ;; Transfer NFT
    (try! (nft-transfer? borrower-position loan-id sender recipient))
    
    ;; Update loan record with new borrower
    (ok (map-set loans {loan-id: loan-id} (merge loan {borrower: recipient})))
  )
)
```

#### 2.2.6 Read-Only Functions

```clarity
;; Get loan details
(define-read-only (get-loan (loan-id uint))
  (map-get? loans {loan-id: loan-id}))

;; Get current lowest bid
(define-read-only (get-current-bid (loan-id uint))
  (map-get? current-bids {loan-id: loan-id}))

;; Get bid count
(define-read-only (get-bid-count (loan-id uint))
  (ok (default-to u0 (get count (map-get? bid-counts {loan-id: loan-id})))))

;; Get loan nonce
(define-read-only (get-loan-nonce)
  (var-get loan-nonce))

;; Get borrower position owner
(define-read-only (get-borrower-position-owner (loan-id uint))
  (nft-get-owner? borrower-position loan-id))

;; Get lender position owner
(define-read-only (get-lender-position-owner (loan-id uint))
  (nft-get-owner? lender-position loan-id))

;; Check if initialized
(define-read-only (is-initialized)
  (is-some (var-get contract-address)))
```

---

## 3. Data Structures

### 3.1 Loan Data Structure

```typescript
interface Loan {
  loanId: number;
  borrower: string;                // Stacks address
  collateralAsset: 'BTC' | 'USDT';
  collateralAmount: bigint;        // 8 or 6 decimals depending on asset
  borrowAsset: 'BTC' | 'USDT';
  borrowAmount: bigint;
  maxRepayment: bigint;            // BORROWER'S MAXIMUM (auction ceiling)
  auctionEndBlock: number;
  maturityBlock: number;
  status: 'auction' | 'active' | 'repaid' | 'defaulted';
  lender: string | null;           // Set when auction finalizes
  repaymentAmount: bigint;         // WINNING BID AMOUNT (set when finalized)
}
```

### 3.2 Bid Data Structure

```typescript
interface Bid {
  loanId: number;
  bidder: string;                  // Stacks address of lender
  amount: bigint;                  // TOTAL REPAYMENT AMOUNT (not a rate!)
  timestamp: number;               // Block height when bid placed
}

interface CurrentBid {
  bidder: string;
  amount: bigint;                  // Current LOWEST bid
}
```

### 3.3 NFT Metadata Structure

```typescript
interface BorrowerNFTMetadata {
  tokenId: number;
  loanId: number;
  collateralAmount: bigint;
  borrowAmount: bigint;
  repaymentAmount: bigint;         // What they owe (from winning bid)
  maturityBlock: number;
  uri: string;                     // IPFS link
}

interface LenderNFTMetadata {
  tokenId: number;
  loanId: number;
  lentAmount: bigint;
  repaymentAmount: bigint;         // What they'll receive (from winning bid)
  impliedAPR: number;              // Calculated off-chain
  maturityBlock: number;
  uri: string;
}
```

---

## 4. Core Functions

### 4.1 Implied APR Calculation

Since the auction determines a **fixed repayment amount** (not a rate), we calculate the implied APR off-chain for display:

**Formula**:
```
interest = repayment_amount - borrow_amount
rate = interest / borrow_amount
annualized_rate = rate * (blocks_per_year / loan_duration_blocks)
APR = annualized_rate * 100
```

**Implementation**:
```typescript
const BLOCKS_PER_YEAR = 52560; // ~365.25 days * 144 blocks/day

function calculateImpliedAPR(
  borrowAmount: bigint,
  repaymentAmount: bigint,
  durationBlocks: number
): number {
  // Calculate interest
  const interest = Number(repaymentAmount - borrowAmount);
  const principal = Number(borrowAmount);
  
  // Calculate rate for this duration
  const rate = interest / principal;
  
  // Annualize
  const annualizedRate = rate * (BLOCKS_PER_YEAR / durationBlocks);
  
  // Convert to percentage
  return annualizedRate * 100;
}

// Example:
// Borrow: $50,000
// Repayment: $50,500
// Duration: 60 days (8,640 blocks)
// Interest: $500
// Rate: 500/50,000 = 0.01 (1%)
// Annualized: 0.01 * (52,560/8,640) = 0.0608 (6.08%)
// APR: 6.08%
```

### 4.2 Bid Validation

```typescript
function validateBid(
  loanId: number,
  bidAmount: bigint,
  currentBlock: number
): Promise<{ valid: boolean; error?: string }> {
  // Get loan and current bid
  const loan = await getLoan(loanId);
  const currentBid = await getCurrentBid(loanId);
  
  // Check auction is active
  if (loan.status !== 'auction') {
    return { valid: false, error: 'Auction not active' };
  }
  
  if (currentBlock >= loan.auctionEndBlock) {
    return { valid: false, error: 'Auction has ended' };
  }
  
  // Validate bid amount
  if (currentBid) {
    // Must be LOWER than current bid
    if (bidAmount >= currentBid.amount) {
      return { 
        valid: false, 
        error: `Bid must be lower than current bid of ${currentBid.amount}` 
      };
    }
  } else {
    // First bid - must be <= max repayment
    if (bidAmount > loan.maxRepayment) {
      return { 
        valid: false, 
        error: `First bid cannot exceed max repayment of ${loan.maxRepayment}` 
      };
    }
  }
  
  return { valid: true };
}
```

### 4.3 Collateral Ratio Calculation

For display purposes (not enforced by contract in Phase 1):

```typescript
function calculateCollateralRatio(
  collateralAmount: bigint,
  borrowAmount: bigint,
  btcPriceUSD: number,    // External price for display only
  usdtPriceUSD: number = 1.0
): number {
  // Assuming collateral is BTC and borrow is USDT (Phase 1 primary case)
  const collateralValueUSD = Number(collateralAmount) * btcPriceUSD / 100000000; // 8 decimals
  const borrowValueUSD = Number(borrowAmount) * usdtPriceUSD / 1000000; // 6 decimals
  
  const ratio = (collateralValueUSD / borrowValueUSD) * 100;
  
  return ratio; // e.g., 150 = 150% collateralization
}
```

---

## 5. Auction Mechanism

### 5.1 Competitive Bidding Process

**Key Characteristics**:
- **Borrower-initiated**: Borrower sets maximum repayment they'll accept
- **Lender-competitive**: Lenders bid to offer better terms
- **Time-bounded**: Fixed auction duration (e.g., 24 hours / 144 blocks)
- **Lowest wins**: Best bid (lowest repayment) wins at auction end
- **Transparent**: All bids visible on-chain
- **No time-based descent**: Rate does not automatically decrease

### 5.2 Auction State Machine

```
┌─────────────┐
│   Create    │
│   Auction   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   AUCTION   │◄─── Multiple bids can be placed
│   (active)  │     Each must be lower than current
└──────┬──────┘
       │
       │ auction-end-block reached
       │
       ▼
┌─────────────┐
│  Finalize   │
│   Auction   │
└──────┬──────┘
       │
       ├─── Has bids? ─── Yes ──► ACTIVE (loan funded)
       │
       └─── No bids? ────► CANCELLED (collateral returned)
```

### 5.3 Auction Timeline Example

**Parameters**:
- Borrow Amount: $50,000 USDT
- Borrower's Max Repayment: $53,500 (implied 7% APR over 60 days)
- Collateral: 1.5 sBTC
- Loan Duration: 60 days (8,640 blocks)
- Auction Duration: 24 hours (144 blocks)

**Bidding Activity**:

| Block | Time | Lender | Bid Amount | Implied APR | Status | Action |
|-------|------|--------|------------|-------------|---------|---------|
| 0 | 0:00 | — | $53,500 (max) | 7.00% | Starting | Auction created |
| 20 | 2:20 | Alice | $53,200 | 6.40% | Alice leads | First bid |
| 45 | 5:15 | Bob | $52,500 | 5.00% | Bob leads | Bob underbids Alice |
| 78 | 9:06 | Carol | $51,800 | 3.60% | Carol leads | Carol underbids Bob |
| 102 | 11:54 | Dave | $51,200 | 2.40% | Dave leads | Dave underbids Carol |
| 125 | 14:35 | Eve | $50,800 | 1.60% | Eve leads | Eve underbids Dave |
| 144 | 16:48 | — | $50,800 | 1.60% | **Eve wins** | Auction ends |
| 145+ | 16:58+ | Anyone | — | — | Ready to finalize | Call finalize-auction |

**After Finalization**:
- Eve (winner) transfers $50,000 USDT to borrower
- Loan status: "active"
- Eve's repayment: $50,800 (profit: $800)
- Borrower's effective cost: 1.60% APR (much better than 7% max!)

**Key Observations**:
- 5 total bids placed over 14.6 hours
- Competition drove rate from 7.0% down to 1.60%
- Borrower saved $2,700 vs. their maximum
- All bids transparent and on-chain
- No oracle needed - pure market competition

### 5.4 Bid Processing Logic

```typescript
async function placeBid(
  loanId: number, 
  bidAmount: bigint,
  walletAddress: string
) {
  // 1. Get current state
  const loan = await getLoan(loanId);
  const currentBid = await getCurrentBid(loanId);
  const currentBlock = await getCurrentBlock();
  
  // 2. Validate auction status
  if (loan.status !== 'auction') {
    throw new Error('Auction not active');
  }
  
  if (currentBlock >= loan.auctionEndBlock) {
    throw new Error('Auction has ended');
  }
  
  // 3. Validate bid amount
  if (currentBid) {
    // Must beat current lowest bid
    if (bidAmount >= currentBid.amount) {
      throw new Error(
        `Bid too high. Current lowest is ${formatUSDT(currentBid.amount)}. ` +
        `Your bid must be lower.`
      );
    }
  } else {
    // First bid - must be at or below max
    if (bidAmount > loan.maxRepayment) {
      throw new Error(
        `First bid cannot exceed borrower's max of ${formatUSDT(loan.maxRepayment)}`
      );
    }
  }
  
  // 4. Calculate implied APR to show user
  const impliedAPR = calculateImpliedAPR(
    loan.borrowAmount,
    bidAmount,
    loan.maturityBlock - loan.auctionEndBlock
  );
  
  console.log(`Your bid of ${formatUSDT(bidAmount)} implies ${impliedAPR.toFixed(2)}% APR`);
  
  // 5. Build and submit transaction
  const tx = await makeContractCall({
    contractAddress: PROTOCOL_CONTRACT_ADDRESS.split('.')[0],
    contractName: 'loan-protocol',
    functionName: 'place-bid',
    functionArgs: [
      uintCV(loanId),
      uintCV(Number(bidAmount))
    ],
    senderKey: walletPrivateKey,
    network: stacksNetwork
  });
  
  // 6. Broadcast transaction
  const broadcastResponse = await broadcastTransaction(tx, stacksNetwork);
  
  return {
    txid: broadcastResponse.txid,
    bidAmount,
    impliedAPR
  };
}

// After auction ends, anyone can finalize
async function finalizeAuction(loanId: number) {
  const loan = await getLoan(loanId);
  const currentBlock = await getCurrentBlock();
  
  // Verify auction has ended
  if (currentBlock < loan.auctionEndBlock) {
    throw new Error(`Auction still active. Ends at block ${loan.auctionEndBlock}`);
  }
  
  if (loan.status !== 'auction') {
    throw new Error('Loan not in auction state');
  }
  
  // Check if there are any bids
  const winningBid = await getCurrentBid(loanId);
  if (!winningBid) {
    throw new Error('No bids placed. Auction cannot be finalized.');
  }
  
  // Build finalization transaction
  const tx = await makeContractCall({
    contractAddress: PROTOCOL_CONTRACT_ADDRESS.split('.')[0],
    contractName: 'loan-protocol',
    functionName: 'finalize-auction',
    functionArgs: [uintCV(loanId)],
    network: stacksNetwork
  });
  
  const broadcastResponse = await broadcastTransaction(tx, stacksNetwork);
  
  return {
    txid: broadcastResponse.txid,
    winner: winningBid.bidder,
    winningAmount: winningBid.amount
  };
}
```

### 5.5 Why This Design Works

**Advantages**:

1. **True Price Discovery**: Lenders reveal their true minimum acceptable return through competitive bidding
2. **Borrower-Friendly**: Competition drives costs down for borrowers
3. **Fair**: Everyone can see all bids and compete equally
4. **Simple**: No complex time-based calculations
5. **Gas-Efficient**: Only stores current lowest bid, not full bid history
6. **Oracle-Free**: No dependency on external price feeds whatsoever
7. **Manipulation-Resistant**: Transparent bidding, lowest wins objectively

**Comparison to Other Designs**:

| Design Aspect | Our Approach | Traditional DeFi |
|---------------|--------------|------------------|
| **Price Movement** | Lender-driven (active bids) | Algorithm-driven (oracle prices) |
| **Winner Selection** | Lowest bid at end | First come, or automated matching |
| **Competition** | Multiple lenders compete | Usually automated |
| **Transparency** | All bids visible on-chain | Opaque rate curves |
| **Borrower Outcome** | Best possible rate from competition | Pre-determined algorithmic rate |
| **Oracle Dependency** | Zero | Required for all pricing |

---

## 6. NFT Implementation

### 6.1 SIP-009 NFT Standard

Both borrower and lender positions are represented as SIP-009 compliant NFTs.

**Benefits**:
- Tradeable on any SIP-009 compatible marketplace
- Visible in Stacks wallets
- Transferable ownership of loan positions
- Composable with other DeFi protocols

**Implementation**:

```clarity
;; Define NFT tokens
(define-non-fungible-token borrower-position uint)
(define-non-fungible-token lender-position uint)

;; SIP-009 trait implementation (simplified)
(define-public (get-last-token-id-borrower)
  (ok (var-get loan-nonce)))

(define-public (get-last-token-id-lender)
  (ok (var-get loan-nonce)))

(define-public (get-owner-borrower (token-id uint))
  (ok (nft-get-owner? borrower-position token-id)))

(define-public (get-owner-lender (token-id uint))
  (ok (nft-get-owner? lender-position token-id)))

(define-public (get-token-uri-borrower (token-id uint))
  ;; Return IPFS URI for metadata
  (ok (some "ipfs://...")))

(define-public (get-token-uri-lender (token-id uint))
  ;; Return IPFS URI for metadata
  (ok (some "ipfs://...")))
```

### 6.2 NFT Metadata (IPFS)

**Borrower NFT Metadata JSON**:
```json
{
  "name": "Bitcoin Loan #42 - Borrower Position",
  "description": "Borrower position for loan #42. Holder owes $50,500 USDT (from winning bid) and has right to reclaim 1.5 BTC collateral upon repayment.",
  "image": "ipfs://QmXx.../borrower-badge.png",
  "attributes": [
    {
      "trait_type": "Loan ID",
      "value": 42
    },
    {
      "trait_type": "Collateral",
      "value": "1.5 BTC"
    },
    {
      "trait_type": "Borrowed",
      "value": "$50,000 USDT"
    },
    {
      "trait_type": "Owe",
      "value": "$50,500 USDT"
    },
    {
      "trait_type": "Implied APR",
      "value": "6.08%"
    },
    {
      "trait_type": "Duration",
      "value": "60 days"
    },
    {
      "trait_type": "Status",
      "value": "Active"
    },
    {
      "trait_type": "Maturity Block",
      "value": 132096
    }
  ]
}
```

**Lender NFT Metadata JSON**:
```json
{
  "name": "Bitcoin Loan #42 - Lender Position",
  "description": "Lender position for loan #42. Holder will receive $50,500 USDT upon repayment or can claim 1.5 BTC collateral if borrower defaults.",
  "image": "ipfs://QmXx.../lender-badge.png",
  "attributes": [
    {
      "trait_type": "Loan ID",
      "value": 42
    },
    {
      "trait_type": "Lent",
      "value": "$50,000 USDT"
    },
    {
      "trait_type": "Will Receive",
      "value": "$50,500 USDT"
    },
    {
      "trait_type": "Expected Profit",
      "value": "$500"
    },
    {
      "trait_type": "Implied APR",
      "value": "6.08%"
    },
    {
      "trait_type": "Collateral Backing",
      "value": "1.5 BTC"
    },
    {
      "trait_type": "Duration",
      "value": "60 days"
    },
    {
      "trait_type": "Status",
      "value": "Active"
    },
    {
      "trait_type": "Maturity Block",
      "value": 132096
    }
  ]
}
```

### 6.3 NFT Transfer Tracking

When NFTs transfer, the protocol must update loan ownership to ensure repayments and collateral releases go to the correct addresses.

**Transfer Flow**:
1. User initiates NFT transfer (via wallet or marketplace)
2. Contract verifies caller is current owner
3. NFT ownership transfers
4. Loan record updated with new owner
5. Future transactions (repayment, collateral claim) automatically route to new owner

**Security**: Only the current NFT owner can transfer. Marketplace contracts can be authorized to facilitate atomic swap+payment transactions.

---

## 7. Marketplace Contracts

### 7.1 Marketplace Functionality

The marketplace allows NFT position holders to list and sell their positions before loan maturity.

**Use Cases**:
- **Lender early exit**: Lender needs liquidity before loan matures
- **Borrower debt transfer**: Borrower wants to exit debt obligation
- **Arbitrage**: Traders buy undervalued positions

### 7.2 Listing Creation

```typescript
interface Listing {
  tokenId: number;
  positionType: 'borrower' | 'lender';
  seller: string;
  price: bigint;              // USDT asking price
  listedAt: number;           // Block height
  active: boolean;
}

async function createListing(
  loanId: number,
  positionType: 'borrower' | 'lender',
  askingPrice: bigint
): Promise<string> {
  // Verify ownership
  const owner = positionType === 'borrower'
    ? await getBorrowerPositionOwner(loanId)
    : await getLenderPositionOwner(loanId);
    
  if (owner !== currentUserAddress) {
    throw new Error('You do not own this position');
  }
  
  // Create listing on-chain or off-chain marketplace
  // (Implementation depends on marketplace design)
  
  return listingId;
}
```

### 7.3 Purchase Execution

```typescript
async function purchasePosition(
  loanId: number,
  positionType: 'borrower' | 'lender',
  listing: Listing
): Promise<string> {
  // Atomic transaction:
  // 1. Transfer USDT from buyer to seller
  // 2. Transfer NFT from seller to buyer
  
  const tx = await makeContractCall({
    contractAddress: MARKETPLACE_ADDRESS,
    contractName: 'marketplace',
    functionName: 'purchase-position',
    functionArgs: [
      uintCV(loanId),
      stringAsciiCV(positionType),
      uintCV(Number(listing.price))
    ],
    // Post-conditions to ensure atomicity
    postConditions: [
      makeStandardFungiblePostCondition(
        currentUserAddress,
        FungibleConditionCode.Equal,
        Number(listing.price),
        USDT_ASSET_ID
      ),
      makeStandardNFTPostCondition(
        listing.seller,
        NFTPostConditionCode.DoesNotOwn,
        position NFT_ASSET_ID,
        uintCV(loanId)
      )
    ],
    network: stacksNetwork
  });
  
  return tx.txid;
}
```

### 7.4 Price Suggestions

```typescript
function suggestLenderListingPrice(
  loan: Loan,
  currentBlock: number
): bigint {
  const blocksRemaining = loan.maturityBlock - currentBlock;
  
  // Expected return is the repayment amount (fixed from auction)
  const expectedReturn = loan.repaymentAmount;
  
  // Suggest 3-5% discount for quick sale
  const discountPercent = 3;
  const discount = (expectedReturn * BigInt(discountPercent)) / 100n;
  
  return expectedReturn - discount;
}

function suggestBorrowerListingPrice(
  loan: Loan,
  currentBlock: number,
  btcPrice: number
): bigint {
  // Amount owed (fixed from auction)
  const debt = loan.repaymentAmount;
  
  // Collateral value (informational only)
  const collateralValue = loan.collateralAmount * BigInt(Math.floor(btcPrice * 100)) / 100000000n;
  
  // Suggest price = debt + small premium (2%)
  const premiumPercent = 2;
  const premium = (debt * BigInt(premiumPercent)) / 100n;
  
  return debt + premium;
}
```

---

*[Due to length constraints, continuing in next part...]*

## 8. Frontend Architecture

### 8.1 Technology Stack

**Framework**: Next.js 14 with App Router
**Language**: TypeScript
**Styling**: TailwindCSS
**State Management**: React Context + SWR for data fetching
**Wallet Integration**: @stacks/connect
**Blockchain Interaction**: @stacks/transactions

### 8.2 Application Structure

```
src/
├── app/
│   ├── page.tsx                 # Landing page
│   ├── borrow/
│   │   ├── page.tsx            # Create loan request
│   │   └── [loanId]/page.tsx   # Loan details
│   ├── lend/
│   │   ├── page.tsx            # Browse auctions
│   │   └── [loanId]/page.tsx   # Auction details & bidding
│   ├── portfolio/
│   │   ├── borrower/page.tsx   # Borrower dashboard
│   │   └── lender/page.tsx     # Lender dashboard
│   ├── marketplace/
│   │   └── page.tsx            # NFT marketplace
│   └── layout.tsx              # Root layout
├── components/
│   ├── wallet/
│   │   ├── ConnectButton.tsx
│   │   └── WalletProvider.tsx
│   ├── loans/
│   │   ├── LoanCard.tsx
│   │   ├── AuctionCard.tsx
│   │   ├── BidForm.tsx
│   │   └── LoanTimeline.tsx
│   ├── auctions/
│   │   ├── AuctionList.tsx
│   │   ├── BidHistory.tsx
│   │   └── CountdownTimer.tsx
│   └── shared/
│       ├── Button.tsx
│       ├── Input.tsx
│       └── Modal.tsx
├── hooks/
│   ├── useContract.ts          # Contract interaction
│   ├── useLoans.ts             # Loan data fetching
│   ├── useAuctions.ts          # Auction data
│   └── useWallet.ts            # Wallet state
├── lib/
│   ├── contracts.ts            # Contract addresses & ABIs
│   ├── calculations.ts         # APR, LTV calculations
│   └── formatting.ts           # Number formatting
└── types/
    ├── loan.ts
    ├── auction.ts
    └── nft.ts
```

### 8.3 Key React Components

**BidForm Component**:

```typescript
import { useState, useEffect } from 'react';
import { useContract } from '@/hooks/useContract';
import { calculateImpliedAPR } from '@/lib/calculations';

interface BidFormProps {
  loanId: number;
  currentBid: bigint | null;
  maxRepayment: bigint;
  borrowAmount: bigint;
  durationBlocks: number;
  onSuccess: () => void;
}

export function BidForm({ 
  loanId, 
  currentBid, 
  maxRepayment, 
  borrowAmount,
  durationBlocks,
  onSuccess 
}: BidFormProps) {
  const [bidAmount, setBidAmount] = useState('');
  const [impliedAPR, setImpliedAPR] = useState(0);
  const { placeBid, isLoading } = useContract();
  
  // Calculate implied APR as user types
  useEffect(() => {
    if (bidAmount) {
      const amount = BigInt(Math.floor(parseFloat(bidAmount) * 1000000)); // USDT has 6 decimals
      const apr = calculateImpliedAPR(borrowAmount, amount, durationBlocks);
      setImpliedAPR(apr);
    }
  }, [bidAmount, borrowAmount, durationBlocks]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const amount = BigInt(Math.floor(parseFloat(bidAmount) * 1000000));
    
    // Validate bid
    if (currentBid && amount >= currentBid) {
      alert(`Bid must be lower than current bid of ${formatUSDT(currentBid)}`);
      return;
    }
    
    if (!currentBid && amount > maxRepayment) {
      alert(`First bid cannot exceed max repayment of ${formatUSDT(maxRepayment)}`);
      return;
    }
    
    try {
      await placeBid(loanId, amount);
      onSuccess();
    } catch (error) {
      console.error('Bid failed:', error);
      alert(`Failed to place bid: ${error.message}`);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">
          Your Bid (Total Repayment Amount)
        </label>
        <div className="relative">
          <span className="absolute left-3 top-3 text-gray-500">$</span>
          <input
            type="number"
            step="0.01"
            value={bidAmount}
            onChange={(e) => setBidAmount(e.target.value)}
            className="w-full pl-8 pr-4 py-3 border rounded-lg"
            placeholder="Enter amount"
            required
          />
        </div>
        <div className="mt-2 text-sm text-gray-600">
          {currentBid ? (
            <p>Current lowest bid: ${formatUSDT(currentBid)}</p>
          ) : (
            <p>Borrower's max: ${formatUSDT(maxRepayment)}</p>
          )}
        </div>
      </div>
      
      {bidAmount && (
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-medium mb-2">Bid Preview</h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Implied APR:</span>
              <span className="font-medium">{impliedAPR.toFixed(2)}%</span>
            </div>
            <div className="flex justify-between">
              <span>Your profit:</span>
              <span className="font-medium">
                ${((parseFloat(bidAmount) - Number(borrowAmount) / 1000000).toFixed(2))}
              </span>
            </div>
          </div>
        </div>
      )}
      
      <button
        type="submit"
        disabled={isLoading || !bidAmount}
        className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        {isLoading ? 'Placing Bid...' : 'Place Bid'}
      </button>
    </form>
  );
}
```

**AuctionCard Component**:

```typescript
interface AuctionCardProps {
  loan: Loan;
  currentBid: Bid | null;
  bidCount: number;
  onBidClick: () => void;
}

export function AuctionCard({ loan, currentBid, bidCount, onBidClick }: AuctionCardProps) {
  const blocksRemaining = loan.auctionEndBlock - currentBlock;
  const hoursRemaining = (blocksRemaining * 10) / 60; // ~10 min per block
  
  const currentAmount = currentBid ? currentBid.amount : loan.maxRepayment;
  const impliedAPR = calculateImpliedAPR(
    loan.borrowAmount,
    currentAmount,
    loan.maturityBlock - loan.auctionEndBlock
  );
  
  return (
    <div className="border rounded-lg p-6 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold">Loan #{loan.loanId}</h3>
          <p className="text-sm text-gray-600">
            {hoursRemaining.toFixed(1)}h remaining
          </p>
        </div>
        <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
          {bidCount} bids
        </span>
      </div>
      
      <div className="space-y-3 mb-4">
        <div>
          <span className="text-sm text-gray-600">Borrow Amount</span>
          <p className="text-xl font-semibold">${formatUSDT(loan.borrowAmount)}</p>
        </div>
        
        <div>
          <span className="text-sm text-gray-600">
            {currentBid ? 'Current Lowest Bid' : 'Borrower\'s Max'}
          </span>
          <p className="text-lg font-medium text-blue-600">
            ${formatUSDT(currentAmount)} ({impliedAPR.toFixed(2)}% APR)
          </p>
        </div>
        
        <div>
          <span className="text-sm text-gray-600">Collateral</span>
          <p className="font-medium">
            {formatBTC(loan.collateralAmount)} BTC
          </p>
        </div>
      </div>
      
      <button
        onClick={onBidClick}
        className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
      >
        Place Bid
      </button>
    </div>
  );
}
```

### 8.4 State Management

**useContract Hook**:

```typescript
import { useConnect } from '@stacks/connect-react';
import { makeContractCall, broadcastTransaction } from '@stacks/transactions';

export function useContract() {
  const { doContractCall } = useConnect();
  
  const placeBid = async (loanId: number, amount: bigint) => {
    return doContractCall({
      contractAddress: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS!,
      contractName: 'loan-protocol',
      functionName: 'place-bid',
      functionArgs: [
        uintCV(loanId),
        uintCV(Number(amount))
      ],
      onFinish: (data) => {
        console.log('Bid placed:', data.txId);
      },
      onCancel: () => {
        console.log('Bid cancelled');
      }
    });
  };
  
  const finalize Auction = async (loanId: number) => {
    return doContractCall({
      contractAddress: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS!,
      contractName: 'loan-protocol',
      functionName: 'finalize-auction',
      functionArgs: [uintCV(loanId)],
      onFinish: (data) => {
        console.log('Auction finalized:', data.txId);
      }
    });
  };
  
  const repayLoan = async (loanId: number) => {
    return doContractCall({
      contractAddress: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS!,
      contractName: 'loan-protocol',
      functionName: 'repay-loan',
      functionArgs: [uintCV(loanId)],
      onFinish: (data) => {
        console.log('Loan repaid:', data.txId);
      }
    });
  };
  
  return { placeBid, finalizeAuction, repayLoan };
}
```

---

## 9. API Specifications

### 9.1 REST Endpoints (Custom Backend)

While the blockchain is the source of truth, a custom indexer provides optimized read queries:

**GET /api/loans**
- Returns all loans with current status
- Supports filtering by status, borrower, lender

**GET /api/loans/:id**
- Returns detailed loan information
- Includes bid history
- Current owners of NFTs

**GET /api/auctions**
- Returns active auctions
- Sorted by various criteria (time remaining, current bid APR, etc.)

**GET /api/auctions/:id/bids**
- Returns complete bid history for an auction
- Includes bidder addresses, amounts, timestamps

**GET /api/portfolio/:address**
- Returns all positions (borrower + lender) for an address
- Includes NFT ownership status

### 9.2 WebSocket Events

Real-time updates for auction activity:

```typescript
// Subscribe to auction updates
socket.on('auction:bid', (data) => {
  console.log(`New bid on loan ${data.loanId}: ${data.amount}`);
  // Update UI with new lowest bid
});

socket.on('auction:finalized', (data) => {
  console.log(`Auction ${data.loanId} finalized. Winner: ${data.winner}`);
  // Redirect or update status
});

socket.on('loan:repaid', (data) => {
  console.log(`Loan ${data.loanId} repaid`);
  // Update portfolio
});
```

---

## 10. Security Considerations

### 10.1 Smart Contract Security

**Access Control**:
- No admin custody of user funds (trustless design)
- Only NFT owner can manage their position
- Marketplace authorization explicitly granted

**Economic Security**:
- Bid validation prevents manipulation (bids must be strictly lower)
- Auction cannot finalize before end block
- Repayment amount is fixed at auction (no variable calculation vulnerabilities)
- Collateral release only after repayment or default

**Clarity Safety Features**:
- No reentrancy (Clarity design prevents this)
- No integer overflow (Clarity has safe math)
- No floating point (all integer math)
- Decidable contract (no infinite loops possible)

### 10.2 Audit Requirements

**Pre-Audit Checklist**:
- [ ] All functions have explicit error handling
- [ ] Access control on all state-changing functions
- [ ] Post-conditions tested for all token transfers
- [ ] Edge cases documented (no bids, ties, timing)
- [ ] Gas costs optimized
- [ ] Comprehensive unit test coverage (>95%)

**Audit Focus Areas**:
1. Auction mechanism (bid validation, finalization)
2. NFT transfer accounting
3. Collateral handling
4. Repayment logic
5. Economic attack vectors

### 10.3 Frontend Security

**User Protection**:
- Transaction previews before signing
- Clear warnings for irreversible actions
- Post-conditions on all transactions
- Balance checks before operations
- Rate limiting on API calls

**Example Transaction Post-Conditions**:

```typescript
import { makeStandardSTXPostCondition, FungibleConditionCode } from '@stacks/transactions';

// When placing bid, ensure user has sufficient USDT
const postConditions = [
  makeStandardFungiblePostCondition(
    userAddress,
    FungibleConditionCode.LessEqual,
    Number(bidAmount),
    USDT_ASSET_ID
  )
];
```

---

## 11. Testing Strategy

### 11.1 Smart Contract Testing

**Unit Tests** (Clarinet):

```clarity
;; Test: First bid must be <= max repayment
(define-public (test-first-bid-validation)
  (let 
    (
      (loan-id (try! (create-test-auction u50000000000 u53500000000)))
    )
    ;; Valid first bid
    (try! (place-bid loan-id u53000000000))
    
    ;; Invalid first bid (too high)
    (assert-eq
      (place-bid loan-id u54000000000)
      (err u408))  ;; ERR_BID_TOO_HIGH
    
    (ok true)
  )
)

;; Test: Subsequent bids must be lower
(define-public (test-competitive-bidding)
  (let 
    (
      (loan-id (try! (create-test-auction u50000000000 u53500000000)))
    )
    ;; First bid
    (try! (place-bid loan-id u53000000000))
    
    ;; Lower bid should succeed
    (try! (place-bid loan-id u52000000000))
    
    ;; Higher bid should fail
    (assert-eq
      (place-bid loan-id u52500000000)
      (err u408))  ;; ERR_BID_TOO_HIGH
    
    (ok true)
  )
)

;; Test: Auction finalization
(define-public (test-finalize-lowest-wins)
  (let 
    (
      (loan-id (try! (create-test-auction u50000000000 u53500000000)))
    )
    ;; Multiple bids
    (try! (place-bid loan-id u53000000000))
    (try! (place-bid loan-id u52000000000))
    (try! (place-bid loan-id u51000000000))
    
    ;; Advance to auction end
    (advance-blocks u144)
    
    ;; Finalize
    (try! (finalize-auction loan-id))
    
    ;; Verify winning bid is lowest
    (let ((loan (unwrap! (get-loan loan-id) (err u1))))
      (assert-eq (get repayment-amount loan) u51000000000)
      (ok true)
    )
  )
)
```

**Integration Tests**:
- Complete loan lifecycle (create → bid → finalize → repay)
- NFT transfers during active loans
- Marketplace purchases
- Default scenario (claim collateral)

**Test Coverage Goals**:
- Unit tests: >95% line coverage
- Integration tests: All user flows
- Edge cases: No bids, single bid, many bids, auction expiry

### 11.2 Frontend Testing

**Component Tests** (Jest + React Testing Library):

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BidForm } from '@/components/auctions/BidForm';

describe('BidForm', () => {
  it('calculates implied APR correctly', () => {
    render(
      <BidForm
        loanId={1}
        currentBid={null}
        maxRepayment={BigInt(53500000000)}
        borrowAmount={BigInt(50000000000)}
        durationBlocks={8640}
        onSuccess={() => {}}
      />
    );
    
    const input = screen.getByPlaceholderText('Enter amount');
    fireEvent.change(input, { target: { value: '51000' } });
    
    expect(screen.getByText(/Implied APR:/)).toHaveTextContent('2.40%');
  });
  
  it('validates bid against current lowest', () => {
    render(
      <BidForm
        loanId={1}
        currentBid={BigInt(52000000000)}
        maxRepayment={BigInt(53500000000)}
        borrowAmount={BigInt(50000000000)}
        durationBlocks={8640}
        onSuccess={() => {}}
      />
    );
    
    const input = screen.getByPlaceholderText('Enter amount');
    fireEvent.change(input, { target: { value: '53000' } });
    
    const button = screen.getByText('Place Bid');
    fireEvent.click(button);
    
    expect(screen.getByText(/must be lower than current bid/)).toBeInTheDocument();
  });
});
```

**E2E Tests** (Playwright):

```typescript
test('complete loan flow', async ({ page }) => {
  // Connect wallet
  await page.goto('/');
  await page.click('text=Connect Wallet');
  
  // Create loan
  await page.goto('/borrow');
  await page.fill('[name="collateral"]', '1.5');
  await page.fill('[name="borrow"]', '50000');
  await page.fill('[name="maxRepayment"]', '53500');
  await page.click('text=Create Loan Auction');
  await page.waitForSelector('text=Auction Created');
  
  // Place bid (as lender)
  await switchWallet(page, 'lender');
  await page.goto('/lend');
  await page.click('text=Loan #1');
  await page.fill('[name="bidAmount"]', '51000');
  await page.click('text=Place Bid');
  await page.waitForSelector('text=Bid Placed');
  
  // Finalize auction
  await advanceBlocks(144);
  await page.click('text=Finalize Auction');
  await page.waitForSelector('text=Auction Finalized');
  
  // Repay loan
  await switchWallet(page, 'borrower');
  await page.goto('/portfolio/borrower');
  await page.click('text=Repay Now');
  await page.waitForSelector('text=Loan Repaid');
});
```

### 11.3 Security Testing

**Audit Preparation**:
1. Static analysis with Clarinet check
2. Dependency scanning for frontend
3. Manual code review checklist
4. Economic attack scenario testing

**Manual Test Cases**:
- Attempt to bid after auction ends
- Attempt to finalize before auction ends
- Attempt to bid higher than current (should fail)
- Attempt to repay with insufficient balance
- Transfer NFT and verify repayment routing
- Attempt to claim collateral before maturity

---

## 12. Deployment Plan

### 12.1 Deployment Phases

**Phase 1: Testnet Deployment** (Weeks 1-2)
1. Deploy to Stacks testnet
2. Mint test sBTC and USDT tokens
3. Initialize contract with self-reference
4. Deploy frontend to staging environment
5. Internal testing (team)

**Phase 2: Public Testnet** (Weeks 3-4)
1. Open to public testing
2. Distribute test tokens via faucet
3. Gather user feedback
4. Monitor for bugs
5. Iterate on UI/UX

**Phase 3: Security Audit** (Weeks 5-6)
1. Submit contracts to audit firm
2. Address audit findings
3. Re-audit if critical issues found
4. Publish final audit report

**Phase 4: Mainnet Deployment** (Week 7)
1. Deploy audited contracts to mainnet
2. Initialize contracts
3. Deploy production frontend
4. Monitor closely for first 48 hours
5. Gradual rollout (limited participants first)

### 12.2 Deployment Checklist

**Pre-Deployment**:
- [ ] All tests passing (unit, integration, E2E)
- [ ] Audit complete with no critical issues
- [ ] Deployment scripts tested on testnet
- [ ] Contract addresses documented
- [ ] Frontend environment variables set
- [ ] Monitoring tools configured
- [ ] Incident response plan ready
- [ ] Rollback procedure documented

**Deployment Day**:
- [ ] Deploy contracts at planned time
- [ ] Verify contract on Stacks Explorer
- [ ] Initialize contract with proper parameters
- [ ] Test basic operations (create loan, bid)
- [ ] Deploy frontend
- [ ] Smoke test full user flows
- [ ] Announce launch
- [ ] Monitor continuously for first 24 hours

**Post-Deployment**:
- [ ] Daily monitoring for first week
- [ ] User support channel active (Discord)
- [ ] Collect user feedback
- [ ] Track key metrics (volume, users, success rate)
- [ ] Iterate on UI based on feedback

### 12.3 Rollback Procedures

**If Critical Bug Found**:
1. Pause new loan creation (emergency function)
2. Allow existing loans to complete normally
3. Communicate with users transparently
4. Fix bug in new contract version
5. Re-audit if necessary
6. Deploy fixed version

**Contract Upgrade Path**:
- Phase 1 contracts are immutable (no upgrade mechanism)
- If changes needed, deploy new contract version
- Migrate users gradually (both versions coexist)
- Old contracts remain functional for existing loans

---

## 13. Monitoring & Maintenance

### 13.1 Operational Monitoring

**Key Metrics to Track**:

| Metric | Target | Alert Threshold |
|--------|--------|----------------|
| Transaction success rate | >99% | <95% |
| Average bid count per auction | 3-5 | <2 |
| Auction completion rate | >70% | <50% |
| Contract uptime | 100% | N/A (blockchain) |
| Frontend uptime | 99.9% | <99% |
| API response time | <500ms | >2s |
| Error rate | <1% | >5% |

**Monitoring Tools**:
- **Sentry**: Error tracking and alerting
- **Datadog/Grafana**: Custom metrics dashboards
- **Stacks Explorer**: On-chain activity monitoring
- **Mixpanel**: User behavior analytics

### 13.2 Alerting System

**P0 Alerts** (Immediate Response Required):
- Contract appears paused or inaccessible
- Security incident detected
- Critical frontend error (>10% users affected)
- Large value transaction failed

**P1 Alerts** (Response within 4 hours):
- Transaction success rate drops below 95%
- Unusual bid activity (potential manipulation)
- API downtime
- High error rate on specific user flow

**P2 Alerts** (Response within 24 hours):
- Slow frontend performance
- Low auction completion rate
- User feedback indicates confusion
- Minor UI bugs reported

### 13.3 Incident Response

**Incident Response Process**:
1. **Detect**: Alert fires or user reports issue
2. **Assess**: Determine severity and impact
3. **Respond**: Execute response plan
4. **Communicate**: Update users on status
5. **Resolve**: Fix issue and verify
6. **Post-Mortem**: Document and improve

**Example Incident Response**:

```
INCIDENT: Transaction Failure Rate Spike
Time: 2026-03-15 14:32 UTC
Severity: P1

TIMELINE:
14:32 - Alert fired: Transaction success rate dropped to 87%
14:35 - Team notified via PagerDuty
14:40 - Investigation began
14:45 - Root cause identified: Stacks API rate limiting
14:50 - Implemented API request caching
15:00 - Success rate recovered to 98%
15:15 - Monitoring confirmed stable
15:30 - Post-mortem scheduled

ACTIONS TAKEN:
- Implemented response caching for read operations
- Added fallback API endpoints
- Increased API rate limit subscription

FOLLOW-UP:
- Update monitoring to alert on API latency
- Document API failover procedures
```

### 13.4 Maintenance Schedule

**Daily**:
- Review error logs
- Check key metrics dashboard
- Monitor social media for user issues

**Weekly**:
- Review user feedback
- Analyze auction performance
- Check for security advisories (dependencies)
- Review and respond to GitHub issues

**Monthly**:
- Comprehensive security review
- Dependency updates
- Performance optimization review
- User satisfaction survey

**Quarterly**:
- Major feature releases
- Security audit (if significant changes)
- Competitive analysis
- Roadmap review

---

## Appendix A: Calculation Formulas

### A.1 Implied APR Calculation

```
Given:
  P = borrow_amount (principal)
  R = repayment_amount (from winning bid)
  D = loan_duration_blocks
  Y = 52,560 (blocks per year, ~365.25 days)

Calculate:
  I = R - P (interest)
  r = I / P (rate for this duration)
  APR = (r * Y / D) * 100

Example:
  P = 50,000 USDT
  R = 50,500 USDT (winning bid)
  D = 8,640 blocks (60 days)
  
  I = 50,500 - 50,000 = 500
  r = 500 / 50,000 = 0.01
  APR = (0.01 * 52,560 / 8,640) * 100 = 6.08%
```

### A.2 LTV Calculation (for display only)

```
Given:
  C_btc = collateral_amount (in satoshis)
  B_usdt = borrow_amount (in micro-USDT)
  P_btc = btc_price_usd (external price for reference)

Calculate:
  C_usd = C_btc / 100,000,000 * P_btc
  B_usd = B_usdt / 1,000,000
  LTV = (B_usd / C_usd) * 100

Example:
  C_btc = 150,000,000 satoshis (1.5 BTC)
  B_usdt = 50,000,000,000 micro-USDT ($50,000)
  P_btc = $100,000
  
  C_usd = 1.5 * 100,000 = $150,000
  B_usd = $50,000
  LTV = (50,000 / 150,000) * 100 = 33.33%
```

### A.3 Expected Profit for Lenders

```
Given:
  R = repayment_amount (from bid)
  P = borrow_amount (principal lent)

Calculate:
  Profit = R - P

Example:
  R = 50,500 USDT
  P = 50,000 USDT
  Profit = 500 USDT
```

---

## Appendix B: Error Codes Reference

| Code | Constant | Meaning | Resolution |
|------|----------|---------|------------|
| 401 | ERR_INVALID_ASSET | Asset not BTC or USDT | Use valid asset type |
| 402 | ERR_SAME_ASSET | Collateral = borrow asset | Use different assets |
| 403 | ERR_NO_INTEREST | Max repayment ≤ borrow amount | Increase max repayment |
| 404 | ERR_INVALID_DURATION | Duration too short | Min 7 days (1,008 blocks) |
| 405 | ERR_LOAN_NOT_FOUND | Loan ID doesn't exist | Check loan ID |
| 406 | ERR_AUCTION_ENDED | Auction already ended | Cannot bid anymore |
| 407 | ERR_AUCTION_ACTIVE | Auction still running | Wait for auction end |
| 408 | ERR_BID_TOO_HIGH | Bid ≥ current lowest | Bid lower amount |
| 409 | ERR_BID_TOO_LOW | Bid unreasonably low | Increase bid |
| 410 | ERR_NOT_LOWEST_BID | No bids to finalize | Wait for at least one bid |
| 411 | ERR_LOAN_NOT_ACTIVE | Loan not in active status | Check loan status |
| 412 | ERR_NOT_BORROWER | Caller not borrower NFT owner | Must own borrower NFT |
| 413 | ERR_NOT_LENDER | Caller not lender NFT owner | Must own lender NFT |
| 414 | ERR_NOT_MATURED | Loan not yet due | Wait until maturity |
| 415 | ERR_NOT_INITIALIZED | Contract not initialized | Initialize first |
| 416 | ERR_ALREADY_INITIALIZED | Contract already set up | Skip initialization |
| 417 | ERR_OWNER_ONLY | Caller not contract owner | Admin function only |
| 418 | ERR_UNAUTHORIZED | Not authorized for action | Check permissions |
| 419 | ERR_NOT_POSITION_OWNER | Not NFT owner | Must own NFT to transfer |

---

## Appendix C: Contract Addresses

**Testnet** (for development):
```
loan-protocol: ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.loan-protocol
sbtc-token: ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.mock-sbtc
usdt-token: ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.mock-usdt
```

**Mainnet** (to be deployed):
```
loan-protocol: [TBD]
sbtc-token: [Official sBTC contract]
usdt-token: [Official USDT contract]
```

---

## Appendix D: Glossary

**Auction**: The bidding period where lenders compete by offering lower repayment amounts

**Bid**: A lender's offer to provide a loan at a specific total repayment amount (not a rate)

**Borrower Position NFT**: SIP-009 NFT representing borrower's rights and obligations

**Collateral**: sBTC locked by borrower to secure the loan

**Competitive Bidding**: Auction mechanism where lenders compete by bidding lower amounts

**Current Lowest Bid**: The best (lowest) bid placed so far in an auction

**Finalization**: The process of transferring funds and activating a loan after auction ends

**Implied APR**: The annualized interest rate calculated from repayment amount and duration

**Lender Position NFT**: SIP-009 NFT representing lender's rights to repayment

**LTV (Loan-to-Value)**: Ratio of loan amount to collateral value

**Max Repayment**: The maximum total amount borrower will pay back (auction ceiling)

**Repayment Amount**: The fixed total amount owed (set by winning bid)

**SIP-009**: Stacks Improvement Proposal defining NFT standard

**SIP-010**: Stacks Improvement Proposal defining fungible token standard

**Winning Bid**: The lowest bid when auction ends (winner provides the loan)

---

**End of Technical Specification Document - Phase 1**

**Document Version**: 1.1 (Corrected Auction Mechanism)  
**Last Updated**: January 12, 2026

---

*This technical specification provides complete implementation details for Phase 1 of the Bitcoin Lending Protocol with the correct competitive bidding auction mechanism.*
