;; Secondary Market Contract for Bitcoin Lending Protocol
;; Enables trading of lender and borrower NFT positions

;; Constants
(define-constant contract-owner tx-sender)
(define-constant err-owner-only (err u100))
(define-constant err-not-found (err u101))
(define-constant err-unauthorized (err u102))
(define-constant err-already-listed (err u103))
(define-constant err-not-listed (err u104))
(define-constant err-invalid-offer (err u105))
(define-constant err-offer-not-found (err u106))
(define-constant err-invalid-status (err u107))
(define-constant err-cannot-accept-own-offer (err u108))

;; Data Variables
(define-data-var loan-protocol-contract principal .loan-protocol-v27)

;; Data Maps

;; Listings: tracks positions listed for sale
(define-map listings
  { loan-id: uint }
  { 
    seller: principal,
    position-type: (string-ascii 20), ;; "lender" or "borrower"
    asking-price: (optional uint),
    listed-at-block: uint
  }
)

;; Offers: tracks all offers made on listings
(define-map offers
  { loan-id: uint, offer-id: uint }
  {
    buyer: principal,
    amount: uint,
    status: (string-ascii 20), ;; "pending", "accepted", "rejected", "countered", "cancelled"
    counter-amount: (optional uint),
    created-at-block: uint
  }
)

;; Offer nonce: tracks next offer ID for each loan
(define-map offer-nonce
  { loan-id: uint }
  { nonce: uint }
)

;; Read-only functions

(define-read-only (get-listing (loan-id uint))
  (map-get? listings { loan-id: loan-id })
)

(define-read-only (get-offer (loan-id uint) (offer-id uint))
  (map-get? offers { loan-id: loan-id, offer-id: offer-id })
)

(define-read-only (get-offer-nonce (loan-id uint))
  (default-to u0 (get nonce (map-get? offer-nonce { loan-id: loan-id })))
)

(define-read-only (get-next-offer-id (loan-id uint))
  (+ u1 (get-offer-nonce loan-id))
)

;; Public functions

;; List a position for sale
(define-public (list-position (loan-id uint) (position-type (string-ascii 20)) (asking-price (optional uint)))
  (let
    (
      (listing (get-listing loan-id))
      (sender tx-sender)
    )
    ;; Check if already listed
    (asserts! (is-none listing) err-already-listed)
    
    ;; Verify sender owns the NFT position
    (if (is-eq position-type "lender")
      (asserts! (unwrap! (contract-call? .loan-protocol-v27 is-lender-owner loan-id sender) err-unauthorized) err-unauthorized)
      (asserts! (unwrap! (contract-call? .loan-protocol-v27 is-borrower-owner loan-id sender) err-unauthorized) err-unauthorized)
    )
    
    ;; Create listing
    (ok (map-set listings
      { loan-id: loan-id }
      {
        seller: sender,
        position-type: position-type,
        asking-price: asking-price,
        listed-at-block: block-height
      }
    ))
  )
)

;; Unlist a position
(define-public (unlist-position (loan-id uint))
  (let
    (
      (listing (get-listing loan-id))
      (sender tx-sender)
    )
    ;; Check listing exists
    (asserts! (is-some listing) err-not-listed)
    
    ;; Check sender is the seller
    (asserts! (is-eq sender (get seller (unwrap! listing err-not-found))) err-unauthorized)
    
    ;; Remove listing
    (ok (map-delete listings { loan-id: loan-id }))
  )
)

;; Make an offer on a listed position
(define-public (make-offer (loan-id uint) (offer-amount uint))
  (let
    (
      (listing (get-listing loan-id))
      (next-offer-id (get-next-offer-id loan-id))
      (sender tx-sender)
    )
    ;; Check listing exists
    (asserts! (is-some listing) err-not-listed)
    
    ;; Check offer amount is valid
    (asserts! (> offer-amount u0) err-invalid-offer)
    
    ;; Cannot make offer on own listing
    (asserts! (not (is-eq sender (get seller (unwrap! listing err-not-found)))) err-cannot-accept-own-offer)
    
    ;; Create offer
    (map-set offers
      { loan-id: loan-id, offer-id: next-offer-id }
      {
        buyer: sender,
        amount: offer-amount,
        status: "pending",
        counter-amount: none,
        created-at-block: block-height
      }
    )
    
    ;; Increment offer nonce
    (map-set offer-nonce
      { loan-id: loan-id }
      { nonce: next-offer-id }
    )
    
    (ok next-offer-id)
  )
)

;; Cancel an offer
(define-public (cancel-offer (loan-id uint) (offer-id uint))
  (let
    (
      (offer (get-offer loan-id offer-id))
      (sender tx-sender)
    )
    ;; Check offer exists
    (asserts! (is-some offer) err-offer-not-found)
    
    ;; Check sender is the buyer
    (asserts! (is-eq sender (get buyer (unwrap! offer err-not-found))) err-unauthorized)
    
    ;; Check offer is pending
    (asserts! (is-eq (get status (unwrap! offer err-not-found)) "pending") err-invalid-status)
    
    ;; Update offer status
    (ok (map-set offers
      { loan-id: loan-id, offer-id: offer-id }
      (merge (unwrap! offer err-not-found) { status: "cancelled" })
    ))
  )
)

;; Accept an offer (seller accepts buyer's offer)
(define-public (accept-offer (loan-id uint) (offer-id uint))
  (let
    (
      (listing (get-listing loan-id))
      (offer (get-offer loan-id offer-id))
      (sender tx-sender)
    )
    ;; Check listing and offer exist
    (asserts! (is-some listing) err-not-listed)
    (asserts! (is-some offer) err-offer-not-found)
    
    ;; Check sender is the seller
    (asserts! (is-eq sender (get seller (unwrap! listing err-not-found))) err-unauthorized)
    
    ;; Check offer is pending or countered
    (asserts! 
      (or 
        (is-eq (get status (unwrap! offer err-not-found)) "pending")
        (is-eq (get status (unwrap! offer err-not-found)) "countered")
      ) 
      err-invalid-status
    )
    
    ;; Execute the trade
    (try! (execute-trade 
      loan-id 
      (get buyer (unwrap! offer err-not-found))
      (get seller (unwrap! listing err-not-found))
      (get amount (unwrap! offer err-not-found))
      (get position-type (unwrap! listing err-not-found))
    ))
    
    ;; Update offer status
    (map-set offers
      { loan-id: loan-id, offer-id: offer-id }
      (merge (unwrap! offer err-not-found) { status: "accepted" })
    )
    
    ;; Remove listing
    (map-delete listings { loan-id: loan-id })
    
    (ok true)
  )
)

;; Reject an offer
(define-public (reject-offer (loan-id uint) (offer-id uint))
  (let
    (
      (listing (get-listing loan-id))
      (offer (get-offer loan-id offer-id))
      (sender tx-sender)
    )
    ;; Check listing and offer exist
    (asserts! (is-some listing) err-not-listed)
    (asserts! (is-some offer) err-offer-not-found)
    
    ;; Check sender is the seller
    (asserts! (is-eq sender (get seller (unwrap! listing err-not-found))) err-unauthorized)
    
    ;; Check offer is pending
    (asserts! (is-eq (get status (unwrap! offer err-not-found)) "pending") err-invalid-status)
    
    ;; Update offer status
    (ok (map-set offers
      { loan-id: loan-id, offer-id: offer-id }
      (merge (unwrap! offer err-not-found) { status: "rejected" })
    ))
  )
)

;; Counter an offer
(define-public (counter-offer (loan-id uint) (offer-id uint) (counter-amount uint))
  (let
    (
      (listing (get-listing loan-id))
      (offer (get-offer loan-id offer-id))
      (sender tx-sender)
    )
    ;; Check listing and offer exist
    (asserts! (is-some listing) err-not-listed)
    (asserts! (is-some offer) err-offer-not-found)
    
    ;; Check sender is the seller
    (asserts! (is-eq sender (get seller (unwrap! listing err-not-found))) err-unauthorized)
    
    ;; Check offer is pending
    (asserts! (is-eq (get status (unwrap! offer err-not-found)) "pending") err-invalid-status)
    
    ;; Check counter amount is valid
    (asserts! (> counter-amount u0) err-invalid-offer)
    
    ;; Update offer with counter
    (ok (map-set offers
      { loan-id: loan-id, offer-id: offer-id }
      (merge (unwrap! offer err-not-found) { 
        status: "countered",
        counter-amount: (some counter-amount)
      })
    ))
  )
)

;; Accept counter offer (buyer accepts seller's counter)
(define-public (accept-counter-offer (loan-id uint) (offer-id uint))
  (let
    (
      (listing (get-listing loan-id))
      (offer (get-offer loan-id offer-id))
      (sender tx-sender)
    )
    ;; Check listing and offer exist
    (asserts! (is-some listing) err-not-listed)
    (asserts! (is-some offer) err-offer-not-found)
    
    ;; Check sender is the buyer
    (asserts! (is-eq sender (get buyer (unwrap! offer err-not-found))) err-unauthorized)
    
    ;; Check offer is countered
    (asserts! (is-eq (get status (unwrap! offer err-not-found)) "countered") err-invalid-status)
    
    ;; Execute the trade with counter amount
    (try! (execute-trade 
      loan-id 
      (get buyer (unwrap! offer err-not-found))
      (get seller (unwrap! listing err-not-found))
      (unwrap! (get counter-amount (unwrap! offer err-not-found)) err-invalid-offer)
      (get position-type (unwrap! listing err-not-found))
    ))
    
    ;; Update offer status
    (map-set offers
      { loan-id: loan-id, offer-id: offer-id }
      (merge (unwrap! offer err-not-found) { status: "accepted" })
    )
    
    ;; Remove listing
    (map-delete listings { loan-id: loan-id })
    
    (ok true)
  )
)

;; Private functions

;; Execute trade: transfer NFT and payment
(define-private (execute-trade 
  (loan-id uint) 
  (buyer principal) 
  (seller principal) 
  (price uint)
  (position-type (string-ascii 20))
)
  (begin
    ;; Transfer USDT from buyer to seller
    ;; Note: Replace .usdt-token with your actual USDT token contract
    (try! (contract-call? .usdt-token transfer 
      price 
      buyer 
      seller 
      (some 0x00))) ;; empty memo
    
    ;; Transfer NFT from seller to buyer based on position type
    (if (is-eq position-type "lender")
      ;; Transfer lender position
      (try! (contract-call? .loan-protocol-v27 transfer-lender-position 
        loan-id 
        seller 
        buyer))
      ;; Transfer borrower position
      (try! (contract-call? .loan-protocol-v27 transfer-borrower-position 
        loan-id 
        seller 
        buyer))
    )
    
    (ok true)
  )
)

;; Admin functions

(define-public (set-loan-protocol-contract (new-contract principal))
  (begin
    (asserts! (is-eq tx-sender contract-owner) err-owner-only)
    (ok (var-set loan-protocol-contract new-contract))
  )
)
