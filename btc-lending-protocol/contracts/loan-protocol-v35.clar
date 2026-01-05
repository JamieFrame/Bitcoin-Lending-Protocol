;; Bitcoin-USDT Lending Protocol v35
;; Descending auction system with tradeable NFT positions  
;; 
;; CHANGES FROM V34:
;; - Added support for USDT collateral loans (borrow BTC with USDT collateral)
;; - New functions: create-loan-auction-usdt, place-bid-btc, finalize-auction-usdt
;; - New functions: repay-loan-usdt, claim-collateral-usdt
;; - Separate functions per asset type to avoid Clarity type inference issues
;; 
;; FUNCTIONALITY:
;; - BTC collateral / USDT borrow: Use original functions (backward compatible with v34)
;; - USDT collateral / BTC borrow: Use new -usdt/-btc suffixed functions


;; ============================================================================
;; CONSTANTS
;; ============================================================================

(define-constant ASSET_BTC "BTC")
(define-constant ASSET_USDT "USDT")
(define-constant MIN_DURATION u1008)
(define-constant MIN_AUCTION_DURATION u144)

;; Errors
(define-constant ERR_INVALID_ASSET (err u401))
(define-constant ERR_SAME_ASSET (err u402))
(define-constant ERR_NO_INTEREST (err u403))
(define-constant ERR_INVALID_DURATION (err u404))
(define-constant ERR_LOAN_NOT_FOUND (err u405))
(define-constant ERR_AUCTION_ENDED (err u406))
(define-constant ERR_AUCTION_ACTIVE (err u407))
(define-constant ERR_BID_TOO_HIGH (err u408))
(define-constant ERR_BID_TOO_LOW (err u409))
(define-constant ERR_NOT_LOWEST_BID (err u410))
(define-constant ERR_LOAN_NOT_ACTIVE (err u411))
(define-constant ERR_NOT_BORROWER (err u412))
(define-constant ERR_NOT_LENDER (err u413))
(define-constant ERR_NOT_MATURED (err u414))
(define-constant ERR_NOT_INITIALIZED (err u415))
(define-constant ERR_ALREADY_INITIALIZED (err u416))
(define-constant ERR_OWNER_ONLY (err u417))
(define-constant ERR_UNAUTHORIZED (err u418))       ;; NEW in v27
(define-constant ERR_NOT_POSITION_OWNER (err u419)) ;; NEW in v27

;; Contract references
(define-constant SBTC_CONTRACT .mock-sbtc-v21)
(define-constant USDT_CONTRACT .mock-usdt-v21)

;; ============================================================================
;; DATA VARIABLES
;; ============================================================================

(define-data-var loan-nonce uint u0)
(define-data-var contract-address (optional principal) none)
(define-data-var contract-owner principal tx-sender)
(define-data-var marketplace-contract (optional principal) none) ;; NEW in v27

;; ============================================================================
;; DATA MAPS
;; ============================================================================

(define-map loans 
  {loan-id: uint} 
  {
    borrower: principal,
    collateral-asset: (string-ascii 10),
    collateral-amount: uint,
    borrow-asset: (string-ascii 10),
    borrow-amount: uint,
    max-repayment: uint,
    auction-end-block: uint,
    maturity-block: uint,
    status: (string-ascii 20),
    lender: (optional principal),
    repayment-amount: uint
  })

(define-map current-bids
  {loan-id: uint}
  {
    bidder: principal,
    amount: uint
  })

;; NEW in v28: Track bid count per loan
(define-map bid-counts
  {loan-id: uint}
  {count: uint})

;; NFT positions
(define-non-fungible-token borrower-position uint)
(define-non-fungible-token lender-position uint)

;; ============================================================================
;; INITIALIZATION
;; ============================================================================

(define-public (initialize (self principal))
  (begin
    (asserts! (is-eq tx-sender (var-get contract-owner)) ERR_OWNER_ONLY)
    (asserts! (is-none (var-get contract-address)) ERR_ALREADY_INITIALIZED)
    (var-set contract-address (some self))
    (ok true)))

;; NEW in v27: Authorize marketplace to call transfer functions
(define-public (set-marketplace-contract (marketplace principal))
  (begin
    (asserts! (is-eq tx-sender (var-get contract-owner)) ERR_OWNER_ONLY)
    (var-set marketplace-contract (some marketplace))
    (ok true)))

;; ============================================================================
;; PRIVATE FUNCTIONS
;; ============================================================================

(define-private (is-valid-asset (asset (string-ascii 10)))
  (or (is-eq asset ASSET_BTC) (is-eq asset ASSET_USDT)))

(define-private (get-contract-address)
  (unwrap-panic (var-get contract-address)))

;; NEW in v27: Check if caller is authorized marketplace
(define-private (is-marketplace-authorized)
  (match (var-get marketplace-contract)
    marketplace (is-eq tx-sender marketplace)
    false))

;; NEW in v28: Increment bid count
(define-private (increment-bid-count (loan-id uint))
  (let 
    (
      (current-count (default-to u0 (get count (map-get? bid-counts {loan-id: loan-id}))))
    )
    (map-set bid-counts {loan-id: loan-id} {count: (+ current-count u1)})
    true))

;; ============================================================================
;; CREATE LOAN AUCTION (UNCHANGED FROM V26)
;; ============================================================================

(define-public (create-loan-auction
    (collateral-asset (string-ascii 10))
    (collateral-amount uint)
    (borrow-asset (string-ascii 10))
    (borrow-amount uint)
    (max-repayment uint)
    (loan-duration-blocks uint)
    (auction-duration-blocks uint))
  (let 
    (
      (loan-id (+ (var-get loan-nonce) u1))
      (auction-end (+ burn-block-height auction-duration-blocks))
      (maturity (+ burn-block-height loan-duration-blocks))
    )
    
    (asserts! (is-some (var-get contract-address)) ERR_NOT_INITIALIZED)
    (asserts! (is-valid-asset collateral-asset) ERR_INVALID_ASSET)
    (asserts! (is-valid-asset borrow-asset) ERR_INVALID_ASSET)
    (asserts! (not (is-eq collateral-asset borrow-asset)) ERR_SAME_ASSET)
    (asserts! (> max-repayment borrow-amount) ERR_NO_INTEREST)
    (asserts! (>= loan-duration-blocks MIN_DURATION) ERR_INVALID_DURATION)
    (asserts! (>= auction-duration-blocks MIN_AUCTION_DURATION) ERR_INVALID_DURATION)
    
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
      repayment-amount: u0
    })
    
    (try! (nft-mint? borrower-position loan-id tx-sender))
    
    ;; NEW in v28: Initialize bid count to 0
    (map-set bid-counts {loan-id: loan-id} {count: u0})
    
    (var-set loan-nonce loan-id)
    (print {event: "loan-created", loan-id: loan-id})
    (ok loan-id)))

;; ============================================================================
;; CREATE LOAN AUCTION - USDT COLLATERAL (NEW IN V35)
;; ============================================================================

(define-public (create-loan-auction-usdt
    (collateral-amount uint)
    (borrow-amount uint)
    (max-repayment uint)
    (loan-duration-blocks uint)
    (auction-duration-blocks uint))
  (let 
    (
      (loan-id (+ (var-get loan-nonce) u1))
      (auction-end (+ burn-block-height auction-duration-blocks))
      (maturity (+ burn-block-height loan-duration-blocks))
      (contract-addr (get-contract-address))
    )
    
    (asserts! (is-some (var-get contract-address)) ERR_NOT_INITIALIZED)
    (asserts! (> max-repayment borrow-amount) ERR_NO_INTEREST)
    (asserts! (>= loan-duration-blocks MIN_DURATION) ERR_INVALID_DURATION)
    (asserts! (>= auction-duration-blocks MIN_AUCTION_DURATION) ERR_INVALID_DURATION)
    
    ;; Transfer USDT collateral from borrower to contract
    (try! (contract-call? .mock-usdt-v21 transfer 
      collateral-amount tx-sender contract-addr none))
    
    (map-set loans {loan-id: loan-id} {
      borrower: tx-sender,
      collateral-asset: ASSET_USDT,
      collateral-amount: collateral-amount,
      borrow-asset: ASSET_BTC,
      borrow-amount: borrow-amount,
      max-repayment: max-repayment,
      auction-end-block: auction-end,
      maturity-block: maturity,
      status: "auction",
      lender: none,
      repayment-amount: u0
    })
    
    (try! (nft-mint? borrower-position loan-id tx-sender))
    (map-set bid-counts {loan-id: loan-id} {count: u0})
    (var-set loan-nonce loan-id)
    (print {event: "loan-created", loan-id: loan-id, collateral-asset: ASSET_USDT, borrow-asset: ASSET_BTC})
    (ok loan-id)))

;; ============================================================================
;; PLACE BID (UNCHANGED FROM V26)
;; ============================================================================

(define-public (place-bid (loan-id uint) (bid-amount uint))
  (let 
    (
      (loan (unwrap! (map-get? loans {loan-id: loan-id}) ERR_LOAN_NOT_FOUND))
      (current-bid (map-get? current-bids {loan-id: loan-id}))
      (contract-addr (get-contract-address))
    )
    
    (asserts! (is-eq (get status loan) "auction") ERR_LOAN_NOT_ACTIVE)
    (asserts! (<= burn-block-height (get auction-end-block loan)) ERR_AUCTION_ENDED)
    (asserts! (>= bid-amount (get borrow-amount loan)) ERR_BID_TOO_LOW)
    (asserts! (<= bid-amount (get max-repayment loan)) ERR_BID_TOO_HIGH)
    (asserts! 
      (match current-bid
        prev-bid (< bid-amount (get amount prev-bid))
        true)
      ERR_NOT_LOWEST_BID)
    
    ;; Transfer USDT from bidder to contract
    (try! (contract-call? .mock-usdt-v21 transfer 
      bid-amount tx-sender contract-addr none))
    
    ;; Refund previous bidder if exists
    (match current-bid
      prev-bid 
        (try! (contract-call? .mock-usdt-v21 transfer-from
          (get amount prev-bid) contract-addr (get bidder prev-bid)))
      true)
    
    (map-set current-bids {loan-id: loan-id} {
      bidder: tx-sender,
      amount: bid-amount
    })
    
    ;; NEW in v28: Increment bid count
    (increment-bid-count loan-id)
    
    (print {event: "bid-placed", loan-id: loan-id, bidder: tx-sender, amount: bid-amount})
    (ok true)))

;; ============================================================================
;; PLACE BID - BTC (NEW IN V35, for USDT collateral loans)
;; ============================================================================

(define-public (place-bid-btc (loan-id uint) (bid-amount uint))
  (let 
    (
      (loan (unwrap! (map-get? loans {loan-id: loan-id}) ERR_LOAN_NOT_FOUND))
      (current-bid (map-get? current-bids {loan-id: loan-id}))
      (contract-addr (get-contract-address))
    )
    
    (asserts! (is-eq (get status loan) "auction") ERR_LOAN_NOT_ACTIVE)
    (asserts! (<= burn-block-height (get auction-end-block loan)) ERR_AUCTION_ENDED)
    (asserts! (>= bid-amount (get borrow-amount loan)) ERR_BID_TOO_LOW)
    (asserts! (<= bid-amount (get max-repayment loan)) ERR_BID_TOO_HIGH)
    (asserts! 
      (match current-bid
        prev-bid (< bid-amount (get amount prev-bid))
        true)
      ERR_NOT_LOWEST_BID)
    
    ;; Transfer BTC from bidder to contract
    (try! (contract-call? .mock-sbtc-v21 transfer 
      bid-amount tx-sender contract-addr none))
    
    ;; Refund previous bidder if exists
    (match current-bid
      prev-bid 
        (try! (contract-call? .mock-sbtc-v21 transfer-from
          (get amount prev-bid) contract-addr (get bidder prev-bid)))
      true)
    
    (map-set current-bids {loan-id: loan-id} {
      bidder: tx-sender,
      amount: bid-amount
    })
    
    (increment-bid-count loan-id)
    
    (print {event: "bid-placed-btc", loan-id: loan-id, bidder: tx-sender, amount: bid-amount})
    (ok true)))

;; ============================================================================
;; FINALIZE AUCTION (UNCHANGED FROM V26)
;; ============================================================================

(define-public (finalize-auction (loan-id uint))
  (let 
    (
      (loan (unwrap! (map-get? loans {loan-id: loan-id}) ERR_LOAN_NOT_FOUND))
      (winning-bid (map-get? current-bids {loan-id: loan-id}))
      (contract-addr (get-contract-address))
    )
    
    (asserts! (is-eq (get status loan) "auction") ERR_LOAN_NOT_ACTIVE)
    (asserts! (> burn-block-height (get auction-end-block loan)) ERR_AUCTION_ACTIVE)
    
    (match winning-bid
      bid-data
        (begin
          ;; Transfer USDT to borrower
          (try! (contract-call? .mock-usdt-v21 transfer-from
            (get amount bid-data) contract-addr (get borrower loan)))
          
          ;; Mint lender NFT
          (try! (nft-mint? lender-position loan-id (get bidder bid-data)))
          
          ;; Update loan to active
          (map-set loans {loan-id: loan-id}
            (merge loan {
              status: "active",
              lender: (some (get bidder bid-data)),
              repayment-amount: (get amount bid-data)
            }))
          
          (print {event: "auction-finalized", loan-id: loan-id})
          (ok true))
      
      ;; No bids - return collateral
      (begin
        (if (is-eq (get collateral-asset loan) ASSET_BTC)
          (try! (contract-call? .mock-sbtc-v21 transfer-from
            (get collateral-amount loan) contract-addr (get borrower loan)))
          (try! (contract-call? .mock-usdt-v21 transfer-from
            (get collateral-amount loan) contract-addr (get borrower loan))))
        
        (map-set loans {loan-id: loan-id} (merge loan {status: "failed"}))
        (print {event: "auction-failed", loan-id: loan-id})
        (ok true)))))

;; ============================================================================
;; FINALIZE AUCTION - USDT COLLATERAL (NEW IN V35)
;; ============================================================================

(define-public (finalize-auction-usdt (loan-id uint))
  (let 
    (
      (loan (unwrap! (map-get? loans {loan-id: loan-id}) ERR_LOAN_NOT_FOUND))
      (winning-bid (map-get? current-bids {loan-id: loan-id}))
      (contract-addr (get-contract-address))
    )
    
    (asserts! (is-eq (get status loan) "auction") ERR_LOAN_NOT_ACTIVE)
    (asserts! (> burn-block-height (get auction-end-block loan)) ERR_AUCTION_ACTIVE)
    
    (match winning-bid
      bid-data
        (begin
          ;; Transfer BTC to borrower
          (try! (contract-call? .mock-sbtc-v21 transfer-from
            (get amount bid-data) contract-addr (get borrower loan)))
          
          ;; Mint lender NFT
          (try! (nft-mint? lender-position loan-id (get bidder bid-data)))
          
          ;; Update loan to active
          (map-set loans {loan-id: loan-id}
            (merge loan {
              status: "active",
              lender: (some (get bidder bid-data)),
              repayment-amount: (get amount bid-data)
            }))
          
          (print {event: "auction-finalized-usdt", loan-id: loan-id})
          (ok true))
      
      ;; No bids - return USDT collateral
      (begin
        (try! (contract-call? .mock-usdt-v21 transfer-from
          (get collateral-amount loan) contract-addr (get borrower loan)))
        
        (map-set loans {loan-id: loan-id} (merge loan {status: "failed"}))
        (print {event: "auction-failed-usdt", loan-id: loan-id})
        (ok true)))))

;; ============================================================================
;; REPAY LOAN (UNCHANGED FROM V26)
;; ============================================================================

(define-public (repay-loan (loan-id uint))
  (let 
    (
      (loan (unwrap! (map-get? loans {loan-id: loan-id}) ERR_LOAN_NOT_FOUND))
      (borrower-nft-owner (unwrap! (nft-get-owner? borrower-position loan-id) ERR_NOT_BORROWER))
      (contract-addr (get-contract-address))
    )
    
    (asserts! (is-eq tx-sender borrower-nft-owner) ERR_NOT_BORROWER)
    (asserts! (is-eq (get status loan) "active") ERR_LOAN_NOT_ACTIVE)
    
    ;; Transfer repayment to lender
    (try! (contract-call? .mock-usdt-v21 transfer
      (get repayment-amount loan) tx-sender (unwrap! (get lender loan) ERR_NOT_LENDER) none))
    
    ;; Return collateral to borrower
    (if (is-eq (get collateral-asset loan) ASSET_BTC)
      (try! (contract-call? .mock-sbtc-v21 transfer-from
        (get collateral-amount loan) contract-addr tx-sender))
      (try! (contract-call? .mock-usdt-v21 transfer-from
        (get collateral-amount loan) contract-addr tx-sender)))
    
    ;; Burn NFTs
    (try! (nft-burn? borrower-position loan-id tx-sender))
    (try! (nft-burn? lender-position loan-id (unwrap! (get lender loan) ERR_NOT_LENDER)))
    
    (map-set loans {loan-id: loan-id} (merge loan {status: "repaid"}))
    (print {event: "loan-repaid", loan-id: loan-id})
    (ok true)))

;; ============================================================================
;; REPAY LOAN - USDT COLLATERAL (NEW IN V35)
;; ============================================================================

(define-public (repay-loan-usdt (loan-id uint))
  (let 
    (
      (loan (unwrap! (map-get? loans {loan-id: loan-id}) ERR_LOAN_NOT_FOUND))
      (borrower-nft-owner (unwrap! (nft-get-owner? borrower-position loan-id) ERR_NOT_BORROWER))
      (contract-addr (get-contract-address))
    )
    
    (asserts! (is-eq tx-sender borrower-nft-owner) ERR_NOT_BORROWER)
    (asserts! (is-eq (get status loan) "active") ERR_LOAN_NOT_ACTIVE)
    
    ;; Transfer BTC repayment to lender
    (try! (contract-call? .mock-sbtc-v21 transfer
      (get repayment-amount loan) tx-sender (unwrap! (get lender loan) ERR_NOT_LENDER) none))
    
    ;; Return USDT collateral to borrower
    (try! (contract-call? .mock-usdt-v21 transfer-from
      (get collateral-amount loan) contract-addr tx-sender))
    
    ;; Burn NFTs
    (try! (nft-burn? borrower-position loan-id tx-sender))
    (try! (nft-burn? lender-position loan-id (unwrap! (get lender loan) ERR_NOT_LENDER)))
    
    (map-set loans {loan-id: loan-id} (merge loan {status: "repaid"}))
    (print {event: "loan-repaid-usdt", loan-id: loan-id})
    (ok true)))

;; ============================================================================
;; CLAIM COLLATERAL (UNCHANGED FROM V26)
;; ============================================================================

(define-public (claim-collateral (loan-id uint))
  (let 
    (
      (loan (unwrap! (map-get? loans {loan-id: loan-id}) ERR_LOAN_NOT_FOUND))
      (lender-nft-owner (unwrap! (nft-get-owner? lender-position loan-id) ERR_NOT_LENDER))
      (contract-addr (get-contract-address))
    )
    
    (asserts! (is-eq tx-sender lender-nft-owner) ERR_NOT_LENDER)
    (asserts! (is-eq (get status loan) "active") ERR_LOAN_NOT_ACTIVE)
    (asserts! (>= burn-block-height (get maturity-block loan)) ERR_NOT_MATURED)
    
    ;; Transfer collateral to lender
    (if (is-eq (get collateral-asset loan) ASSET_BTC)
      (try! (contract-call? .mock-sbtc-v21 transfer-from
        (get collateral-amount loan) contract-addr tx-sender))
      (try! (contract-call? .mock-usdt-v21 transfer-from
        (get collateral-amount loan) contract-addr tx-sender)))
    
    ;; Burn NFTs
    (try! (nft-burn? lender-position loan-id tx-sender))
    (try! (nft-burn? borrower-position loan-id (get borrower loan)))
    
    (map-set loans {loan-id: loan-id} (merge loan {status: "defaulted"}))
    (print {event: "collateral-claimed", loan-id: loan-id})
    (ok true)))

;; ============================================================================
;; CLAIM COLLATERAL - USDT (NEW IN V35)
;; ============================================================================

(define-public (claim-collateral-usdt (loan-id uint))
  (let 
    (
      (loan (unwrap! (map-get? loans {loan-id: loan-id}) ERR_LOAN_NOT_FOUND))
      (lender-nft-owner (unwrap! (nft-get-owner? lender-position loan-id) ERR_NOT_LENDER))
      (contract-addr (get-contract-address))
    )
    
    (asserts! (is-eq tx-sender lender-nft-owner) ERR_NOT_LENDER)
    (asserts! (is-eq (get status loan) "active") ERR_LOAN_NOT_ACTIVE)
    (asserts! (>= burn-block-height (get maturity-block loan)) ERR_NOT_MATURED)
    
    ;; Transfer USDT collateral to lender
    (try! (contract-call? .mock-usdt-v21 transfer-from
      (get collateral-amount loan) contract-addr tx-sender))
    
    ;; Burn NFTs
    (try! (nft-burn? lender-position loan-id tx-sender))
    (try! (nft-burn? borrower-position loan-id (get borrower loan)))
    
    (map-set loans {loan-id: loan-id} (merge loan {status: "defaulted"}))
    (print {event: "collateral-claimed-usdt", loan-id: loan-id})
    (ok true)))

;; ============================================================================
;; NFT TRANSFER FUNCTIONS - NEW IN V27
;; These enable secondary marketplace trading of positions
;; ============================================================================

;; Transfer lender position NFT
(define-public (transfer-lender-position (loan-id uint) (sender principal) (recipient principal))
  (let
    (
      (loan (unwrap! (map-get? loans {loan-id: loan-id}) ERR_LOAN_NOT_FOUND))
      (nft-owner (unwrap! (nft-get-owner? lender-position loan-id) ERR_NOT_LENDER))
    )
    ;; Verify sender actually owns the NFT
    (asserts! (is-eq sender nft-owner) ERR_NOT_POSITION_OWNER)
    
    ;; Verify caller is either the owner OR the authorized marketplace
    (asserts! 
      (or 
        (is-eq tx-sender sender)
        (is-marketplace-authorized)
      )
      ERR_UNAUTHORIZED)
    
    ;; Transfer the NFT
    (try! (nft-transfer? lender-position loan-id sender recipient))
    
    ;; Update loan record with new lender
    (ok (map-set loans
      { loan-id: loan-id }
      (merge loan { lender: (some recipient) })
    ))
  )
)

;; Transfer borrower position NFT
(define-public (transfer-borrower-position (loan-id uint) (sender principal) (recipient principal))
  (let
    (
      (loan (unwrap! (map-get? loans {loan-id: loan-id}) ERR_LOAN_NOT_FOUND))
      (nft-owner (unwrap! (nft-get-owner? borrower-position loan-id) ERR_NOT_BORROWER))
    )
    ;; Verify sender actually owns the NFT
    (asserts! (is-eq sender nft-owner) ERR_NOT_POSITION_OWNER)
    
    ;; Verify caller is either the owner OR the authorized marketplace
    (asserts! 
      (or 
        (is-eq tx-sender sender)
        (is-marketplace-authorized)
      )
      ERR_UNAUTHORIZED)
    
    ;; Transfer the NFT
    (try! (nft-transfer? borrower-position loan-id sender recipient))
    
    ;; Update loan record with new borrower
    (ok (map-set loans
      { loan-id: loan-id }
      (merge loan { borrower: recipient })
    ))
  )
)

;; ============================================================================
;; READ-ONLY FUNCTIONS
;; ============================================================================

(define-read-only (get-loan (loan-id uint))
  (map-get? loans {loan-id: loan-id}))

(define-read-only (get-current-bid (loan-id uint))
  (map-get? current-bids {loan-id: loan-id}))

(define-read-only (get-loan-nonce)
  (var-get loan-nonce))

(define-read-only (get-borrower-position-owner (loan-id uint))
  (nft-get-owner? borrower-position loan-id))

(define-read-only (get-lender-position-owner (loan-id uint))
  (nft-get-owner? lender-position loan-id))

(define-read-only (is-initialized)
  (is-some (var-get contract-address)))

;; NEW in v27: Check if a principal owns the lender position
(define-read-only (is-lender-owner (loan-id uint) (principal-to-check principal))
  (match (nft-get-owner? lender-position loan-id)
    owner (ok (is-eq owner principal-to-check))
    (ok false)
  )
)

;; NEW in v27: Check if a principal owns the borrower position
(define-read-only (is-borrower-owner (loan-id uint) (principal-to-check principal))
  (match (nft-get-owner? borrower-position loan-id)
    owner (ok (is-eq owner principal-to-check))
    (ok false)
  )
)

;; NEW in v27: Get the authorized marketplace contract
(define-read-only (get-marketplace-contract)
  (var-get marketplace-contract))

;; NEW in v28: Get bid count for a loan
(define-read-only (get-bid-count (loan-id uint))
  (ok (default-to u0 (get count (map-get? bid-counts {loan-id: loan-id})))))
