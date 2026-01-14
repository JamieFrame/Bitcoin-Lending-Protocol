# Phase 1 Multi-Stablecoin Support - Update Summary

**Version:** 1.2  
**Date:** January 12, 2026

## Overview of Changes

Phase 1 now supports **multiple stablecoins** (USDA, USDC, xUSD) instead of just USDT. This gives users flexibility to borrow in their preferred stablecoin while maintaining the oracle-free competitive bidding mechanism.

---

## Key Changes

### **1. Supported Stablecoins**

**Primary: USDA** (Arkadiko)
- Native Stacks stablecoin
- Highest liquidity on Stacks DEXes
- Decentralized, STX-collateralized
- Recommended for most users

**Secondary: USDC** (Bridged)
- Institutional standard  
- 1:1 USD reserves (Circle)
- Familiar to traditional finance
- Requires bridging from Ethereum/other chains

**Tertiary: xUSD** (Various)
- Additional stablecoin options
- Diversification
- Ecosystem flexibility

---

## Architecture Changes

### Smart Contract Updates

**Before (v1.1):**
```clarity
(define-constant USDT_CONTRACT .usdt-token)

(define-public (create-loan-auction
    (borrow-amount uint)
    ...
```

**After (v1.2):**
```clarity
;; Whitelist of approved stablecoins
(define-constant USDA_CONTRACT .usda-token)
(define-constant USDC_CONTRACT .usdc-token)
(define-constant XUSD_CONTRACT .xusd-token)

(define-map stablecoin-whitelist
  principal  ;; stablecoin contract address
  bool)      ;; approved?

(define-public (create-loan-auction
    (borrow-asset principal)        ;; Which stablecoin (USDA/USDC/xUSD)
    (borrow-amount uint)
    ...
```

### Loan Data Structure

**Before:**
```clarity
{
  borrow-amount: uint,
  repayment-amount: uint,
  // implicit: always USDT
}
```

**After:**
```clarity
{
  borrow-asset: principal,          ;; NEW: USDA, USDC, or xUSD contract
  borrow-amount: uint,
  repayment-amount: uint,
  // Explicit stablecoin tracking
}
```

---

## User Experience Changes

### Borrower Flow

**1. Create Loan Request**
```
Old: "I want to borrow $50,000" (always USDT)
New: "I want to borrow $50,000 in [USDA ▾]" (dropdown)
```

**2. Stablecoin Selection UI**
```
┌────────────────────────────────────┐
│  Choose Stablecoin                 │
├────────────────────────────────────┤
│  ○ USDA (Recommended) 💵           │
│    Native Stacks, Best liquidity   │
│    Balance: 125,000 USDA          │
│                                    │
│  ○ USDC 💵                         │
│    Institutional standard          │
│    Balance: 50,000 USDC           │
│                                    │
│  ○ xUSD 💵                         │
│    Alternative option              │
│    Balance: 10,000 xUSD           │
└────────────────────────────────────┘
```

**3. Auction Display**
```
Loan #42 (USDA Loan) 💵
━━━━━━━━━━━━━━━━━━━━━━
Borrow: $50,000 USDA
Max Repayment: $53,500 USDA
Current Bid: $51,200 USDA (4.8% APR)
```

### Lender Flow

**1. Browse Auctions with Filter**
```
Filter: [All] [USDA] [USDC] [xUSD]
```

**2. Auction Cards Show Stablecoin**
```
┌─────────────────────────────┐
│ 💵 USDA Loan #42            │
│ Borrow: $50,000 USDA       │
│ Bid: $51,200 USDA (4.8%)   │
│ [Place Bid in USDA]        │
└─────────────────────────────┘

┌─────────────────────────────┐
│ 💵 USDC Loan #43            │
│ Borrow: $100,000 USDC      │
│ Bid: $107,500 USDC (9.2%)  │
│ [Place Bid in USDC]        │
└─────────────────────────────┘
```

**3. Balance Validation**
```
⚠️  This loan requires USDA
Your USDA balance: $0

You have: $50,000 USDC

[Swap USDC → USDA] [Find USDC Loans]
```

---

## Technical Implementation

### Contract Function Updates

**create-loan-auction:**
```clarity
(define-public (create-loan-auction
    (collateral-asset principal)     ;; sBTC
    (collateral-amount uint)
    (borrow-asset principal)         ;; NEW: USDA/USDC/xUSD contract
    (borrow-amount uint)
    (max-repayment uint)
    (loan-duration-blocks uint)
    (auction-duration-blocks uint))
  (begin
    ;; Validate stablecoin is whitelisted
    (asserts! (is-stablecoin-approved borrow-asset) ERR_INVALID_STABLECOIN)
    
    ;; Store loan with specific stablecoin
    (map-set loans {loan-id: loan-id} {
      borrow-asset: borrow-asset,    ;; Store which stablecoin
      borrow-amount: borrow-amount,
      max-repayment: max-repayment,
      ...
    })
    
    (ok loan-id)
  )
)
```

**place-bid:**
```clarity
(define-public (place-bid (loan-id uint) (amount uint))
  (let ((loan (unwrap! (map-get? loans {loan-id: loan-id}) ERR_LOAN_NOT_FOUND)))
    
    ;; Verify bidder has sufficient balance in correct stablecoin
    (let ((bidder-balance (contract-call? (get borrow-asset loan) get-balance tx-sender)))
      (asserts! (>= bidder-balance amount) ERR_INSUFFICIENT_BALANCE)
    )
    
    ;; Standard bid validation
    (asserts! (< amount current-bid-amount) ERR_BID_TOO_HIGH)
    
    ;; Store bid
    (map-set current-bids {loan-id: loan-id} {
      bidder: tx-sender,
      amount: amount
    })
    
    (ok true)
  )
)
```

**finalize-auction:**
```clarity
(define-public (finalize-auction (loan-id uint))
  (let (
    (loan (unwrap! (map-get? loans {loan-id: loan-id}) ERR_LOAN_NOT_FOUND))
    (winning-bid (unwrap! (map-get? current-bids {loan-id: loan-id}) ERR_NO_BIDS))
  )
    ;; Transfer in correct stablecoin (dynamic contract call)
    (try! (contract-call? (get borrow-asset loan) transfer
      (get borrow-amount loan)
      (get bidder winning-bid)    ;; From winner
      (get borrower loan)         ;; To borrower
      none))
    
    ;; Update loan status
    (map-set loans {loan-id: loan-id} (merge loan {
      status: "active",
      lender: (some (get bidder winning-bid)),
      repayment-amount: (get amount winning-bid)
    }))
    
    (ok true)
  )
)
```

**repay-loan:**
```clarity
(define-public (repay-loan (loan-id uint))
  (let ((loan (unwrap! (map-get? loans {loan-id: loan-id}) ERR_LOAN_NOT_FOUND)))
    
    ;; Transfer repayment in correct stablecoin
    (try! (contract-call? (get borrow-asset loan) transfer
      (get repayment-amount loan)
      tx-sender                   ;; From borrower
      (unwrap! (get lender loan) ERR_NOT_LENDER)  ;; To lender
      none))
    
    ;; Release collateral
    (try! (release-collateral loan-id))
    
    ;; Burn NFTs
    (try! (burn-positions loan-id))
    
    (ok true)
  )
)
```

---

## Frontend Changes

### TypeScript Interfaces

```typescript
interface Stablecoin {
  symbol: 'USDA' | 'USDC' | 'xUSD';
  name: string;
  contractAddress: string;
  decimals: number;
  icon: string;
  description: string;
}

interface Loan {
  loanId: number;
  borrower: string;
  collateralAsset: string;        // sBTC contract
  collateralAmount: bigint;
  borrowAsset: string;            // NEW: USDA/USDC/xUSD contract
  borrowAmount: bigint;
  maxRepayment: bigint;
  // ... rest of fields
}

const SUPPORTED_STABLECOINS: Stablecoin[] = [
  {
    symbol: 'USDA',
    name: 'Arkadiko USD',
    contractAddress: 'SP2C2YFP12AJZB4MABJBAJ55XECVS7E4PMMZ89YZR.usda-token',
    decimals: 6,
    icon: '/icons/usda.svg',
    description: 'Native Stacks stablecoin, best liquidity'
  },
  {
    symbol: 'USDC',
    name: 'USD Coin',
    contractAddress: 'SP3DX3H4FEYZJZ586MFBS25ZW3HZDMEW92260R2PR.usdc-token',
    decimals: 6,
    icon: '/icons/usdc.svg',
    description: 'Institutional standard, bridged'
  },
  {
    symbol: 'xUSD',
    name: 'xUSD Stablecoin',
    contractAddress: 'SPXUSD1234567890ABCDEF.xusd-token',
    decimals: 6,
    icon: '/icons/xusd.svg',
    description: 'Alternative stablecoin option'
  }
];
```

### React Components

**StablecoinSelector:**
```tsx
function StablecoinSelector({ 
  value, 
  onChange, 
  userBalances 
}: StablecoinSelectorProps) {
  return (
    <div className="stablecoin-selector">
      <label>Choose Stablecoin</label>
      {SUPPORTED_STABLECOINS.map(coin => (
        <div 
          key={coin.symbol}
          className={`coin-option ${value === coin.symbol ? 'selected' : ''}`}
          onClick={() => onChange(coin.symbol)}
        >
          <img src={coin.icon} alt={coin.symbol} />
          <div>
            <h4>{coin.symbol} {value === coin.symbol && '✓'}</h4>
            <p>{coin.description}</p>
            <p className="balance">
              Balance: {formatAmount(userBalances[coin.symbol])} {coin.symbol}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
```

**AuctionCard with Stablecoin:**
```tsx
function AuctionCard({ loan, currentBid }: AuctionCardProps) {
  const stablecoin = SUPPORTED_STABLECOINS.find(
    c => c.contractAddress === loan.borrowAsset
  );
  
  return (
    <div className="auction-card">
      <div className="stablecoin-badge">
        <img src={stablecoin.icon} alt={stablecoin.symbol} />
        {stablecoin.symbol}
      </div>
      
      <h3>Loan #{loan.loanId}</h3>
      <div className="amounts">
        <p>Borrow: {formatAmount(loan.borrowAmount)} {stablecoin.symbol}</p>
        <p>Current Bid: {formatAmount(currentBid.amount)} {stablecoin.symbol}</p>
      </div>
      
      <button onClick={() => handleBid(loan)}>
        Place Bid in {stablecoin.symbol}
      </button>
    </div>
  );
}
```

---

## Benefits

### For Borrowers
- ✅ Choose preferred stablecoin based on holdings
- ✅ No forced conversion to specific stablecoin
- ✅ Match existing treasury management
- ✅ Flexibility as ecosystem evolves

### For Lenders
- ✅ Deploy capital in stablecoin they hold
- ✅ Filter loans by stablecoin preference
- ✅ Institutional users can use USDC
- ✅ DeFi natives can use USDA
- ✅ Diversify across stablecoins

### For Protocol
- ✅ Market determines popular stablecoins
- ✅ Not dependent on single stablecoin success
- ✅ Adaptable to ecosystem changes
- ✅ Competitive advantage (flexibility)
- ✅ Future-proof design

---

## Migration from v1.1 (USDT-only)

**No Migration Needed**: This is Phase 1 design update before launch

**If v1.1 Already Deployed**:
1. Deploy new contract version with multi-stablecoin support
2. Allow old contracts to finish naturally
3. New loans use new contract
4. Gradual migration over time

---

## Testing Requirements

### Unit Tests
- [ ] Whitelist management (add/remove stablecoins)
- [ ] Loan creation with each stablecoin
- [ ] Bidding in correct stablecoin
- [ ] Rejection of wrong stablecoin bids
- [ ] Repayment in correct stablecoin
- [ ] Balance checks for each stablecoin

### Integration Tests
- [ ] Full loan cycle with USDA
- [ ] Full loan cycle with USDC
- [ ] Full loan cycle with xUSD
- [ ] Mixed portfolio (multiple stablecoins)
- [ ] Marketplace with multi-stablecoin positions

### UI Tests
- [ ] Stablecoin selection component
- [ ] Filter by stablecoin
- [ ] Balance display for all coins
- [ ] Warning when insufficient balance
- [ ] Proper labeling throughout

---

## Documentation Updates

### User Guides
- [ ] "Which Stablecoin Should I Choose?"
- [ ] "How to Get USDA/USDC/xUSD on Stacks"
- [ ] "Understanding Stablecoin Differences"
- [ ] "Swapping Between Stablecoins"

### Developer Docs
- [ ] Smart contract stablecoin whitelisting
- [ ] Frontend stablecoin integration
- [ ] Testing multi-stablecoin flows
- [ ] Adding new stablecoins (future)

### Marketing
- [ ] "Flexible Stablecoin Support" feature highlight
- [ ] Comparison charts (USDA vs USDC vs xUSD)
- [ ] Target different user segments per stablecoin

---

## Success Metrics

Track adoption by stablecoin:

| Metric | USDA Target | USDC Target | xUSD Target |
|--------|-------------|-------------|-------------|
| **Loan Volume** | $600K (60%) | $300K (30%) | $100K (10%) |
| **Active Loans** | 15 | 8 | 3 |
| **Avg Loan Size** | $40K | $75K | $30K |

**Hypothesis**: USDA will dominate due to native liquidity, USDC will attract institutional users with larger loans, xUSD will be niche.

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| **Fragmented liquidity** across stablecoins | Initially focus marketing on USDA, allow market to choose |
| **Low adoption of secondary stablecoins** | That's fine - flexibility is the point |
| **Complexity for users** | Clear UI/UX, guidance on which to choose |
| **Smart contract bugs** with dynamic calls | Thorough testing, audit focus on this |
| **One stablecoin depegs** | Diversification is actually protective |

---

## Future Enhancements

**Phase 1.5** (Optional):
- [ ] Stablecoin swap integration (DEX aggregator)
- [ ] Multi-stablecoin portfolios (borrow in mix)
- [ ] Cross-stablecoin lending (lend USDA, get USDC)

**Phase 2**:
- Multi-stablecoin support continues with native BTC
- Same flexibility with threshold custody

**Phase 3**:
- Cross-chain stablecoins (Ethereum USDC → Stacks)
- Unified liquidity across chains

---

**Document Version**: 1.0  
**Last Updated**: January 12, 2026

*This summary captures all key changes for multi-stablecoin support in Phase 1*
