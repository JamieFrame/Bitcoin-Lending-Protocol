;; Mock sBTC Token v21
;; FIX: Uses contract-caller instead of tx-sender for authorization checks

(define-fungible-token sbtc)

(define-constant err-owner-only (err u100))
(define-constant err-not-token-owner (err u101))
(define-constant err-not-authorized (err u102))

(define-map authorized-contracts principal bool)
(define-data-var contract-owner principal tx-sender)

;; SIP-010 Functions

(define-public (transfer (amount uint) (sender principal) (recipient principal) (memo (optional (buff 34))))
  (begin
    (asserts! (is-eq tx-sender sender) err-not-token-owner)
    (try! (ft-transfer? sbtc amount sender recipient))
    (ok true)))

(define-read-only (get-balance (who principal))
  (ok (ft-get-balance sbtc who)))

(define-read-only (get-total-supply)
  (ok (ft-get-supply sbtc)))

(define-read-only (get-name)
  (ok "Stacks BTC"))

(define-read-only (get-symbol)
  (ok "sBTC"))

(define-read-only (get-decimals)
  (ok u8))

(define-read-only (get-token-uri)
  (ok none))

;; Mint for testing
(define-public (mint (amount uint) (recipient principal))
  (ft-mint? sbtc amount recipient))

;; Transfer from - for authorized contracts
;; FIX: Changed tx-sender to contract-caller for authorization check
(define-public (transfer-from (amount uint) (from principal) (to principal))
  (begin
    (asserts! (default-to false (map-get? authorized-contracts contract-caller)) err-not-authorized)
    (try! (ft-transfer? sbtc amount from to))
    (ok true)))

;; Authorization
(define-public (set-authorized-contract (contract principal) (authorized bool))
  (begin
    (asserts! (is-eq tx-sender (var-get contract-owner)) err-owner-only)
    (ok (map-set authorized-contracts contract authorized))))

(define-read-only (is-authorized-contract (contract principal))
  (default-to false (map-get? authorized-contracts contract)))
