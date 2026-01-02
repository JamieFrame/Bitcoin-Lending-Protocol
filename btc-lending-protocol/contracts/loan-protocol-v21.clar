;; Bitcoin-USDT Lending Protocol v21
;; Descending auction system with tradeable NFT positions
;; FIX: Replaced USDT_CONTRACT and SBTC_CONTRACT constants with literal contract references
;; in all contract-call? statements to work around Clarity 1 limitation

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

;; Contract references
(define-constant SBTC_CONTRACT .mock-sbtc-v20)
(define-constant USDT_CONTRACT .mock-usdt-v20)

;; ============================================================================
;; DATA VARIABLES
;; ============================================================================

(define-data-var loan-nonce uint u0)
(define-data-var contract-address (optional principal) none)
(define-data-var contract-owner principal tx-sender)

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

;; ============================================================================
;; PRIVATE FUNCTIONS
;; ============================================================================

(define-private (is-valid-asset (asset (string-ascii 10)))
  (or (is-eq asset ASSET_BTC) (is-eq asset ASSET_USDT)))

(define-private (get-contract-address)
  (unwrap-panic (var-get contract-address)))

;; ============================================================================
;; CREATE LOAN AUCTION
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
      (auction-end (+ stacks-block-height auction-duration-blocks))
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
    
    (var-set loan-nonce loan-id)
    (print {event: "loan-created", loan-id: loan-id})
    (ok loan-id)))

;; ============================================================================
;; PLACE BID
;; ============================================================================

(define-public (place-bid (loan-id uint) (bid-amount uint))
  (let 
    (
      (loan (unwrap! (map-get? loans {loan-id: loan-id}) ERR_LOAN_NOT_FOUND))
      (current-bid (map-get? current-bids {loan-id: loan-id}))
      (contract-addr (get-contract-address))
    )
    
    (asserts! (is-eq (get status loan) "auction") ERR_LOAN_NOT_ACTIVE)
    (asserts! (<= stacks-block-height (get auction-end-block loan)) ERR_AUCTION_ENDED)
    (asserts! (>= bid-amount (get borrow-amount loan)) ERR_BID_TOO_LOW)
    (asserts! (<= bid-amount (get max-repayment loan)) ERR_BID_TOO_HIGH)
    (asserts! 
      (match current-bid
        prev-bid (< bid-amount (get amount prev-bid))
        true)
      ERR_NOT_LOWEST_BID)
    
    ;; Transfer USDT from bidder to contract
    (try! (contract-call? .mock-usdt-v20 transfer 
      bid-amount tx-sender contract-addr none))
    
    ;; Refund previous bidder if exists
    (match current-bid
      prev-bid 
        (try! (contract-call? .mock-usdt-v20 transfer-from
          (get amount prev-bid) contract-addr (get bidder prev-bid)))
      true)
    
    (map-set current-bids {loan-id: loan-id} {
      bidder: tx-sender,
      amount: bid-amount
    })
    
    (print {event: "bid-placed", loan-id: loan-id, bidder: tx-sender, amount: bid-amount})
    (ok true)))

;; ============================================================================
;; FINALIZE AUCTION
;; ============================================================================

(define-public (finalize-auction (loan-id uint))
  (let 
    (
      (loan (unwrap! (map-get? loans {loan-id: loan-id}) ERR_LOAN_NOT_FOUND))
      (winning-bid (map-get? current-bids {loan-id: loan-id}))
      (contract-addr (get-contract-address))
    )
    
    (asserts! (is-eq (get status loan) "auction") ERR_LOAN_NOT_ACTIVE)
    (asserts! (> stacks-block-height (get auction-end-block loan)) ERR_AUCTION_ACTIVE)
    
    (match winning-bid
      bid-data
        (begin
          ;; Transfer USDT to borrower
          (try! (contract-call? .mock-usdt-v20 transfer-from
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
          (try! (contract-call? .mock-sbtc-v20 transfer-from
            (get collateral-amount loan) contract-addr (get borrower loan)))
          (try! (contract-call? .mock-usdt-v20 transfer-from
            (get collateral-amount loan) contract-addr (get borrower loan))))
        
        (map-set loans {loan-id: loan-id} (merge loan {status: "failed"}))
        (print {event: "auction-failed", loan-id: loan-id})
        (ok true)))))

;; ============================================================================
;; REPAY LOAN
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
    (try! (contract-call? .mock-usdt-v20 transfer
      (get repayment-amount loan) tx-sender (unwrap! (get lender loan) ERR_NOT_LENDER) none))
    
    ;; Return collateral to borrower
    (if (is-eq (get collateral-asset loan) ASSET_BTC)
      (try! (contract-call? .mock-sbtc-v20 transfer-from
        (get collateral-amount loan) contract-addr tx-sender))
      (try! (contract-call? .mock-usdt-v20 transfer-from
        (get collateral-amount loan) contract-addr tx-sender)))
    
    ;; Burn NFTs
    (try! (nft-burn? borrower-position loan-id tx-sender))
    (try! (nft-burn? lender-position loan-id (unwrap! (get lender loan) ERR_NOT_LENDER)))
    
    (map-set loans {loan-id: loan-id} (merge loan {status: "repaid"}))
    (print {event: "loan-repaid", loan-id: loan-id})
    (ok true)))

;; ============================================================================
;; CLAIM COLLATERAL (DEFAULT)
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
      (try! (contract-call? .mock-sbtc-v20 transfer-from
        (get collateral-amount loan) contract-addr tx-sender))
      (try! (contract-call? .mock-usdt-v20 transfer-from
        (get collateral-amount loan) contract-addr tx-sender)))
    
    ;; Burn NFTs
    (try! (nft-burn? lender-position loan-id tx-sender))
    (try! (nft-burn? borrower-position loan-id (get borrower loan)))
    
    (map-set loans {loan-id: loan-id} (merge loan {status: "defaulted"}))
    (print {event: "collateral-claimed", loan-id: loan-id})
    (ok true)))

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
