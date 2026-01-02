# Complete Deployment Checklist - V27 Marketplace

## 📦 Files Ready for Deployment

All necessary files have been created and are ready to deploy:

### Smart Contracts:
- ✅ `loan-protocol-v27-minimal.clar` - Core lending protocol with NFT transfer functions
- ✅ `marketplace-ready.clar` - Marketplace contract for trading positions
- ✅ `mock-usdt-v21.clar` - Your existing USDT token (already deployed)
- ✅ `mock-sbtc-v21.clar` - Your existing sBTC token (already deployed)

### Frontend:
- ✅ `App-v27.jsx` - Complete React app with marketplace integration

### Documentation:
- ✅ `APP-V27-CHANGELOG.md` - Complete list of changes
- ✅ `MARKETPLACE-INTEGRATION-GUIDE.md` - Step-by-step integration guide
- ✅ `MARKETPLACE-CALL-REFERENCE.md` - Contract call reference
- ✅ `DEPLOYMENT-SCRIPT.md` - Smart contract deployment guide
- ✅ `V27-MINIMAL-SUMMARY.md` - V27 protocol changes
- ✅ `DEPLOYMENT-FIX.md` - Troubleshooting guide

## 🚀 Deployment Steps

### Phase 1: Smart Contract Deployment

#### Step 1: Deploy Loan Protocol V27
```bash
stx deploy_contract loan-protocol-v27 loan-protocol-v27-minimal.clar --network testnet --fee 100000
```

**Expected:** Success ✅
**Save:** Contract address for frontend config

#### Step 2: Initialize Loan Protocol
```clarity
(contract-call? .loan-protocol-v27 initialize .loan-protocol-v27)
```

**Expected:** `(ok true)` ✅

#### Step 3: Authorize Token Contracts
```clarity
;; Authorize loan protocol to transfer USDT
(contract-call? .mock-usdt-v21 set-authorized-contract .loan-protocol-v27 true)

;; Authorize loan protocol to transfer sBTC
(contract-call? .mock-sbtc-v21 set-authorized-contract .loan-protocol-v27 true)
```

**Expected:** Both return `(ok true)` ✅

#### Step 4: Deploy Marketplace
```bash
stx deploy_contract marketplace marketplace-ready.clar --network testnet --fee 100000
```

**Expected:** Success ✅ (No more contract reference errors!)
**Save:** Contract address for frontend config

#### Step 5: Link Marketplace to Loan Protocol
```clarity
;; Set marketplace as authorized to transfer NFTs
(contract-call? .loan-protocol-v27 set-marketplace-contract .marketplace)

;; Allow marketplace to transfer USDT for trades
(contract-call? .mock-usdt-v21 set-authorized-contract .marketplace true)
```

**Expected:** Both return `(ok true)` ✅

#### Step 6: Verify Deployment
```clarity
;; Check loan protocol initialized
(contract-call? .loan-protocol-v27 is-initialized)
;; Expected: true

;; Check marketplace authorized
(contract-call? .loan-protocol-v27 get-marketplace-contract)
;; Expected: (some ST...marketplace)
```

**If all checks pass:** Smart contracts are ready! ✅

### Phase 2: Frontend Deployment

#### Step 1: Update Frontend Config

Open `App-v27.jsx` and update line 20 with your actual deployed addresses:

```javascript
const CONFIG = {
  CONTRACT_ADDRESS: 'YOUR_DEPLOYED_ADDRESS',  // Replace with your address
  LOAN_PROTOCOL: 'loan-protocol-v27',
  MARKETPLACE: 'marketplace',  // Or 'marketplace-contract-v1' if you renamed it
  MOCK_SBTC: 'mock-sbtc-v21',
  MOCK_USDT: 'mock-usdt-v21',
  NETWORK: new StacksTestnet()
};
```

#### Step 2: Deploy Frontend

Upload `App-v27.jsx` to your hosting:

**For React App:**
```bash
# Replace src/App.jsx with App-v27.jsx
cp App-v27.jsx src/App.jsx

# Build
npm run build

# Deploy
# (Vercel, Netlify, or your hosting platform)
```

#### Step 3: Test Frontend

1. **Connect Wallet** - Should show your testnet address
2. **Create Loan** - Test creating a loan auction
3. **Place Bid** - Test bidding on auction
4. **Finalize** - Test finalizing auction
5. **List Position** - Test listing lender position
6. **Make Offer** - Test making offer (different wallet)
7. **Accept Offer** - Test accepting offer
8. **Verify Transfer** - Check NFT ownership changed

### Phase 3: Production Checklist

Before going to mainnet:

#### Security:
- [ ] Audit smart contracts (consider professional audit)
- [ ] Test all edge cases on testnet
- [ ] Test with multiple wallets
- [ ] Test error handling
- [ ] Verify post-conditions work correctly

#### Smart Contracts:
- [ ] All contracts deployed and initialized
- [ ] All contracts authorized properly
- [ ] Marketplace linked to loan protocol
- [ ] Test complete loan lifecycle
- [ ] Test complete marketplace trade
- [ ] Verify NFT transfers work
- [ ] Verify USDT transfers work

#### Frontend:
- [ ] All contract addresses updated
- [ ] Network set to mainnet (when ready)
- [ ] Error messages user-friendly
- [ ] Loading states working
- [ ] Transaction confirmations showing
- [ ] Data refreshing after transactions

#### Testing Scenarios:
- [ ] Create loan with BTC collateral
- [ ] Place multiple bids on same loan
- [ ] Finalize auction
- [ ] List lender position with asking price
- [ ] List lender position without asking price
- [ ] Make offer below asking price
- [ ] Accept offer
- [ ] Verify USDT transferred correctly
- [ ] Verify NFT transferred correctly
- [ ] Verify loan record updated
- [ ] Cancel offer
- [ ] Unlist position
- [ ] Repay loan as new borrower (if position sold)
- [ ] Default scenario

## 🎯 Quick Start Commands

### Deploy Everything (Testnet):
```bash
# 1. Deploy loan protocol
stx deploy_contract loan-protocol-v27 loan-protocol-v27-minimal.clar --network testnet

# 2. Deploy marketplace
stx deploy_contract marketplace marketplace-ready.clar --network testnet
```

### Initialize Everything:
```clarity
;; Initialize loan protocol
(contract-call? .loan-protocol-v27 initialize .loan-protocol-v27)

;; Authorize tokens for loan protocol
(contract-call? .mock-usdt-v21 set-authorized-contract .loan-protocol-v27 true)
(contract-call? .mock-sbtc-v21 set-authorized-contract .loan-protocol-v27 true)

;; Link marketplace
(contract-call? .loan-protocol-v27 set-marketplace-contract .marketplace)
(contract-call? .mock-usdt-v21 set-authorized-contract .marketplace true)
```

### Verify Everything:
```clarity
;; Check loan protocol
(contract-call? .loan-protocol-v27 is-initialized)

;; Check marketplace link
(contract-call? .loan-protocol-v27 get-marketplace-contract)
```

## 🐛 Troubleshooting

### Issue: "Contract not found"
**Solution:** Check contract names in CONFIG match deployed names exactly

### Issue: "Transfer unauthorized"
**Solution:** Run authorization commands again:
```clarity
(contract-call? .mock-usdt-v21 set-authorized-contract .loan-protocol-v27 true)
(contract-call? .mock-usdt-v21 set-authorized-contract .marketplace true)
```

### Issue: "Marketplace cannot transfer NFT"
**Solution:** Run:
```clarity
(contract-call? .loan-protocol-v27 set-marketplace-contract .marketplace)
```

### Issue: "Transaction fails with no error"
**Solution:** 
1. Check you have enough STX for fees
2. Check you have enough USDT/sBTC for the operation
3. Check post-conditions aren't blocking the transaction

### Issue: "Data not loading in frontend"
**Solution:**
1. Open browser console (F12)
2. Check for API errors
3. Verify contract addresses in CONFIG
4. Try refreshing the page
5. Check you're connected to testnet

## ✅ Success Criteria

You'll know everything is working when:

1. ✅ You can create a loan auction
2. ✅ You can place bids
3. ✅ You can finalize auctions
4. ✅ You can list positions for sale
5. ✅ You can make offers
6. ✅ You can accept offers
7. ✅ USDT transfers correctly on trade
8. ✅ NFT ownership changes on trade
9. ✅ Listings show in Browse Market
10. ✅ Offers show in My Offers

## 📊 All Files Summary

**Smart Contracts (4):**
1. loan-protocol-v27-minimal.clar (386 lines)
2. marketplace-ready.clar (369 lines)
3. mock-usdt-v21.clar (your existing)
4. mock-sbtc-v21.clar (your existing)

**Frontend (1):**
1. App-v27.jsx (2,710 lines)

**Documentation (6):**
1. APP-V27-CHANGELOG.md
2. MARKETPLACE-INTEGRATION-GUIDE.md
3. MARKETPLACE-CALL-REFERENCE.md
4. DEPLOYMENT-SCRIPT.md
5. V27-MINIMAL-SUMMARY.md
6. DEPLOYMENT-FIX.md
7. This checklist

## 🎉 You're Ready!

All files are complete and ready for deployment. Follow the steps above and you'll have a fully functional Bitcoin lending marketplace with a secondary market for trading positions!

**Good luck! 🚀**

---

**Need help?** Check the documentation files or review the error troubleshooting section above.
