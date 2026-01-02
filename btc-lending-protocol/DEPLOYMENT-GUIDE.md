# Secondary Market Smart Contract - Deployment Guide

## 📋 **Overview**

The secondary market consists of two parts:
1. **marketplace-contract.clar** - The new secondary market contract
2. **NFT transfer functions** - To be added to your existing loan-protocol-v26.clar

## 🔧 **Step 1: Update Existing Loan Protocol**

Add the NFT transfer functions from `loan-protocol-nft-transfers.clar` to your existing `loan-protocol-v26.clar`:

```clarity
;; Add these functions to loan-protocol-v26.clar

(define-public (transfer-lender-position (loan-id uint) (sender principal) (recipient principal))
  ;; ... code from loan-protocol-nft-transfers.clar
)

(define-public (transfer-borrower-position (loan-id uint) (sender principal) (recipient principal))
  ;; ... code from loan-protocol-nft-transfers.clar
)

(define-read-only (is-lender-owner (loan-id uint) (principal-to-check principal))
  ;; ... code from loan-protocol-nft-transfers.clar
)

(define-read-only (is-borrower-owner (loan-id uint) (principal-to-check principal))
  ;; ... code from loan-protocol-nft-transfers.clar
)
```

## 📦 **Step 2: Deploy Marketplace Contract**

### Using Clarinet:

1. Add the contract to your Clarinet.toml:
```toml
[contracts.marketplace]
path = "contracts/marketplace.clar"
depends_on = ["loan-protocol-v26"]
```

2. Deploy to testnet:
```bash
clarinet integrate
clarinet deployments generate --testnet
clarinet deployments apply --testnet
```

### Using Stacks CLI:

```bash
# Deploy the marketplace contract
stx deploy_contract marketplace marketplace-contract.clar \
  --network testnet \
  --fee 100000
```

## ⚙️ **Step 3: Configure the Marketplace**

After deployment, you need to:

1. **Set the loan protocol address** (if different from default):
```clarity
(contract-call? .marketplace set-loan-protocol-contract .loan-protocol-v26)
```

2. **Note the contract addresses** for frontend integration:
   - Loan Protocol: `ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.loan-protocol-v26`
   - Marketplace: `ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.marketplace`

## 🧪 **Step 4: Testing Flow**

### Test 1: List a Lender Position

```clarity
;; Alice lists her lender position for 53,000 USDT
(contract-call? .marketplace list-position 
  u1                    ;; loan-id
  "lender"              ;; position-type
  (some u53000000000))  ;; asking-price (53k USDT in micro-units)

;; Expected: (ok true)
;; Check listing:
(contract-call? .marketplace get-listing u1)
```

### Test 2: Make an Offer

```clarity
;; Bob makes an offer of 52,000 USDT
(contract-call? .marketplace make-offer 
  u1           ;; loan-id
  u52000000000) ;; offer-amount (52k USDT in micro-units)

;; Expected: (ok u1) - returns offer-id
;; Check offer:
(contract-call? .marketplace get-offer u1 u1)
```

### Test 3: Counter Offer

```clarity
;; Alice counters with 52,500 USDT
(contract-call? .marketplace counter-offer 
  u1           ;; loan-id
  u1           ;; offer-id
  u52500000000) ;; counter-amount (52.5k USDT)

;; Expected: (ok true)
;; Check updated offer:
(contract-call? .marketplace get-offer u1 u1)
;; Should show status: "countered", counter-amount: 52500000000
```

### Test 4: Accept Counter Offer

```clarity
;; Bob accepts the counter offer
(contract-call? .marketplace accept-counter-offer u1 u1)

;; Expected: (ok true)
;; This will:
;; 1. Transfer 52,500 USDT from Bob to Alice
;; 2. Transfer lender NFT from Alice to Bob
;; 3. Remove the listing
;; 4. Update offer status to "accepted"
```

### Test 5: Reject Offer

```clarity
;; Alice rejects an offer
(contract-call? .marketplace reject-offer u1 u2)

;; Expected: (ok true)
```

### Test 6: Cancel Offer

```clarity
;; Bob cancels his offer
(contract-call? .marketplace cancel-offer u1 u1)

;; Expected: (ok true)
```

### Test 7: Unlist Position

```clarity
;; Alice unlists her position
(contract-call? .marketplace unlist-position u1)

;; Expected: (ok true)
```

## ⚠️ **Important TODOs in the Contract**

Before going to mainnet, you need to complete these:

### 1. Implement USDT Transfer in `execute-trade`

Replace the TODO comment with actual USDT transfer:

```clarity
;; In execute-trade function:
(try! (contract-call? .usdt-token transfer 
  price 
  buyer 
  seller 
  (some 0x00))) ;; memo
```

### 2. Implement NFT Transfer in `execute-trade`

Replace the TODO comment with actual NFT transfer calls:

```clarity
;; In execute-trade function:
(if (is-eq position-type "lender")
  (try! (contract-call? .loan-protocol-v26 transfer-lender-position 
    loan-id 
    seller 
    buyer))
  (try! (contract-call? .loan-protocol-v26 transfer-borrower-position 
    loan-id 
    seller 
    buyer))
)
```

### 3. Add Ownership Verification in `list-position`

Replace the TODO comment with actual ownership check:

```clarity
;; In list-position function:
(if (is-eq position-type "lender")
  (asserts! (contract-call? .loan-protocol-v26 is-lender-owner loan-id sender) err-unauthorized)
  (asserts! (contract-call? .loan-protocol-v26 is-borrower-owner loan-id sender) err-unauthorized)
)
```

## 🔒 **Security Considerations**

1. **Authorization**: The marketplace contract must be authorized to transfer NFTs
2. **Payment atomicity**: USDT transfer and NFT transfer happen in same transaction
3. **Reentrancy**: Clarity's design prevents reentrancy attacks
4. **Access control**: Only position owners can list, only sellers can accept offers

## 📊 **Error Codes**

- `u100` - Owner only
- `u101` - Not found
- `u102` - Unauthorized
- `u103` - Already listed
- `u104` - Not listed
- `u105` - Invalid offer
- `u106` - Offer not found
- `u107` - Invalid status
- `u108` - Cannot accept own offer

## 🚀 **Next Steps After Deployment**

1. **Integrate with Frontend**:
   - Update `fetchOpenAuctions` to also fetch listings
   - Add functions to call marketplace contract
   - Replace mock data with real contract calls

2. **Test on Testnet**:
   - Create test loans
   - List positions
   - Make/accept/reject offers
   - Verify NFT and USDT transfers

3. **Deploy to Mainnet**:
   - Complete all TODOs
   - Security audit (recommended)
   - Deploy both updated loan protocol and marketplace

## 📝 **Frontend Integration Preview**

Here's what you'll need to add to App.jsx:

```javascript
// List a position
const listPosition = async (loanId, positionType, askingPrice) => {
  await openContractCall({
    network: CONFIG.NETWORK,
    contractAddress: CONFIG.CONTRACT_ADDRESS,
    contractName: 'marketplace',
    functionName: 'list-position',
    functionArgs: [
      uintCV(loanId),
      stringAsciiCV(positionType),
      askingPrice ? someCV(uintCV(askingPrice * 1000000)) : noneCV()
    ],
    onFinish: () => {
      showMessage('Position listed!', 'success');
      fetchMarketplaceData();
    }
  });
};

// Make an offer
const makeOffer = async (loanId, offerAmount) => {
  await openContractCall({
    network: CONFIG.NETWORK,
    contractAddress: CONFIG.CONTRACT_ADDRESS,
    contractName: 'marketplace',
    functionName: 'make-offer',
    functionArgs: [
      uintCV(loanId),
      uintCV(offerAmount * 1000000)
    ],
    onFinish: () => {
      showMessage('Offer submitted!', 'success');
      fetchMarketplaceData();
    }
  });
};
```

Ready to deploy? Let me know if you need help with any step!
