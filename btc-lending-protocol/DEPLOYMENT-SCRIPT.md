# Complete Deployment Script for Loan Protocol V27 + Marketplace

## 📦 Files Required

1. `loan-protocol-v27.clar` - Main lending protocol
2. `marketplace-contract.clar` - Secondary market for trading positions
3. `mock-usdt-v21.clar` - Your existing USDT token contract
4. `mock-sbtc-v21.clar` - Your existing sBTC token contract

## 🚀 Deployment Order

### Step 1: Deploy Token Contracts (If Not Already Deployed)

```bash
# Deploy USDT token
stx deploy_contract mock-usdt-v21 mock-usdt-v21.clar \
  --network testnet \
  --fee 50000

# Deploy sBTC token  
stx deploy_contract mock-sbtc-v21 mock-sbtc-v21.clar \
  --network testnet \
  --fee 50000
```

### Step 2: Deploy Loan Protocol V27

```bash
stx deploy_contract loan-protocol-v27 loan-protocol-v27.clar \
  --network testnet \
  --fee 100000
```

**Note the deployed contract address**:
Example: `ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.loan-protocol-v27`

### Step 3: Initialize Loan Protocol

```clarity
;; Call this from Clarinet console or via stacks.js
(contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.loan-protocol-v27 
  initialize 
  'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.loan-protocol-v27)
```

**Expected result**: `(ok true)`

### Step 4: Authorize Token Contracts

The loan protocol needs to be authorized to use transfer-from on both token contracts:

```clarity
;; Authorize loan protocol to transfer USDT
(contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.mock-usdt-v21 
  set-authorized-contract 
  'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.loan-protocol-v27 
  true)

;; Authorize loan protocol to transfer sBTC
(contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.mock-sbtc-v21 
  set-authorized-contract 
  'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.loan-protocol-v27 
  true)
```

**Expected result for both**: `(ok true)`

### Step 5: Deploy Marketplace Contract

```bash
stx deploy_contract marketplace marketplace-contract.clar \
  --network testnet \
  --fee 100000
```

**Note the deployed contract address**:
Example: `ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.marketplace`

### Step 6: Authorize Marketplace in Loan Protocol

```clarity
;; Set marketplace as authorized to transfer NFTs
(contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.loan-protocol-v27 
  set-marketplace-contract 
  'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.marketplace)
```

**Expected result**: `(ok true)`

### Step 7: Authorize Marketplace in Token Contracts

The marketplace needs to transfer USDT during trades:

```clarity
;; Authorize marketplace to transfer USDT
(contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.mock-usdt-v21 
  set-authorized-contract 
  'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.marketplace 
  true)
```

**Expected result**: `(ok true)`

## ✅ Verification Checklist

After deployment, verify everything is set up correctly:

### 1. Check Loan Protocol Initialization
```clarity
(contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.loan-protocol-v27 
  is-initialized)
```
**Expected**: `true`

### 2. Check Marketplace Authorization
```clarity
(contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.loan-protocol-v27 
  get-marketplace-contract)
```
**Expected**: `(some ST1...marketplace address)`

### 3. Test Token Authorization - USDT
```clarity
;; Try creating a small test loan
(contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.loan-protocol-v27 
  create-loan-auction 
  "BTC"           ;; collateral-asset
  u100000000      ;; collateral-amount (1 BTC)
  "USDT"          ;; borrow-asset
  u50000000000    ;; borrow-amount (50,000 USDT)
  u75000000000    ;; max-repayment (75,000 USDT)
  u10080          ;; loan-duration (70 days in blocks)
  u1440)          ;; auction-duration (10 days in blocks)
```
**Expected**: `(ok u1)` - Returns loan ID

### 4. Test Complete Flow

Create a test loan and verify the marketplace works:

```clarity
;; 1. Create loan (as borrower)
(contract-call? .loan-protocol-v27 create-loan-auction ...)

;; 2. Place bid (as lender)
(contract-call? .loan-protocol-v27 place-bid u1 u60000000000)

;; 3. Finalize auction (after auction ends)
(contract-call? .loan-protocol-v27 finalize-auction u1)

;; 4. List lender position (as lender)
(contract-call? .marketplace list-position u1 "lender" (some u62000000000))

;; 5. Make offer (as buyer)
(contract-call? .marketplace make-offer u1 u61000000000)

;; 6. Accept offer (as lender/seller)
(contract-call? .marketplace accept-offer u1 u1)

;; 7. Verify NFT transferred
(contract-call? .loan-protocol-v27 get-lender-position-owner u1)
;; Should show buyer's address
```

## 🔧 Using Clarinet (Alternative Method)

If you're using Clarinet for deployment:

### 1. Update Clarinet.toml

```toml
[project]
name = "bitcoin-lending"
authors = ["Your Name"]

[contracts.mock-usdt-v21]
path = "contracts/mock-usdt-v21.clar"

[contracts.mock-sbtc-v21]
path = "contracts/mock-sbtc-v21.clar"

[contracts.loan-protocol-v27]
path = "contracts/loan-protocol-v27.clar"
depends_on = ["mock-usdt-v21", "mock-sbtc-v21"]

[contracts.marketplace]
path = "contracts/marketplace-contract.clar"
depends_on = ["loan-protocol-v27", "mock-usdt-v21"]
```

### 2. Generate Deployment Plan

```bash
clarinet deployments generate --testnet
```

This creates `deployments/default.testnet-plan.yaml`

### 3. Deploy

```bash
clarinet deployments apply --testnet
```

### 4. Run Post-Deployment Setup

Create a file `scripts/setup.ts`:

```typescript
import { Cl } from "@stacks/transactions";

// Initialize loan protocol
await simnet.callPublicFn(
  "loan-protocol-v27",
  "initialize",
  [Cl.principal("ST1...loan-protocol-v27")],
  deployer
);

// Set marketplace contract
await simnet.callPublicFn(
  "loan-protocol-v27",
  "set-marketplace-contract",
  [Cl.principal("ST1...marketplace")],
  deployer
);

// Authorize contracts...
```

## 📝 Contract Addresses Template

Keep track of your deployed contracts:

```
Network: Testnet
Deployer: ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM

Deployed Contracts:
├── mock-usdt-v21: ST1...
├── mock-sbtc-v21: ST1...
├── loan-protocol-v27: ST1...
└── marketplace: ST1...

Authorizations:
├── USDT authorized: [loan-protocol-v27, marketplace]
├── sBTC authorized: [loan-protocol-v27]
└── Loan Protocol authorized marketplace: marketplace
```

## 🎯 Frontend Configuration

Update your `App.jsx` configuration:

```javascript
const CONFIG = {
  NETWORK: new StacksTestnet(),
  CONTRACT_ADDRESS: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
  LOAN_CONTRACT: 'loan-protocol-v27',
  MARKETPLACE_CONTRACT: 'marketplace',
  USDT_CONTRACT: 'mock-usdt-v21',
  SBTC_CONTRACT: 'mock-sbtc-v21'
};
```

## ⚠️ Common Issues & Solutions

### Issue 1: "Contract not initialized"
**Solution**: Run the initialize function with the contract's own principal

### Issue 2: "Transfer unauthorized"
**Solution**: Make sure you called set-authorized-contract on both token contracts

### Issue 3: "Marketplace cannot transfer NFT"
**Solution**: Call set-marketplace-contract in the loan protocol

### Issue 4: "Transaction fails with no error"
**Solution**: Check that you have enough STX for transaction fees and enough USDT/sBTC for the operation

## 🎉 Deployment Complete!

Once all steps are complete, you have:
- ✅ Loan protocol deployed and initialized
- ✅ Marketplace deployed and authorized
- ✅ Token contracts authorized
- ✅ Ready to create loans and trade positions

Next steps:
1. Update frontend to use new contract addresses
2. Test creating loans
3. Test placing bids
4. Test listing positions
5. Test making offers
6. Test executing trades

Good luck! 🚀
