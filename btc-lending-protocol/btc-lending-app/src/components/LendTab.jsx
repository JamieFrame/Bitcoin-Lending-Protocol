export default function LendTab({
  loanId,
  setLoanId,
  bidAmount,
  setBidAmount,
  onPlaceBid,
  loading
}) {
  return (
    <div style={{ display: 'grid', gap: '32px', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))' }}>
      {/* Form */}
      <div className="card" style={{ padding: '32px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '24px' }}>
          Place Bid
        </h2>

        <div style={{ marginBottom: '24px' }}>
          <label className="label" style={{
            display: 'block',
            fontSize: '13px',
            fontWeight: 600,
            color: '#cbd5e1',
            marginBottom: '8px'
          }}>
            Loan ID
          </label>
          <input
            type="number"
            className="input"
            value={loanId}
            onChange={(e) => setLoanId(e.target.value)}
            step="1"
            min="1"
          />
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label className="label" style={{
            display: 'block',
            fontSize: '13px',
            fontWeight: 600,
            color: '#cbd5e1',
            marginBottom: '8px'
          }}>
            Bid Amount (USDT)
          </label>
          <input
            type="number"
            className="input"
            value={bidAmount}
            onChange={(e) => setBidAmount(e.target.value)}
            placeholder="Enter amount"
            step="100"
            min="0"
          />
          <p style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>
            Lower bids win in descending auctions
          </p>
        </div>

        <button
          onClick={onPlaceBid}
          disabled={loading || !bidAmount}
          className="btn btn-primary"
          style={{ width: '100%', marginTop: '32px' }}
        >
          {loading ? 'Processing...' : 'Place Bid'}
        </button>
      </div>

      {/* Info */}
      <div>
        <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
          <h4 style={{ fontWeight: 600, marginBottom: '12px', fontSize: '16px' }}>
            Lending Strategy
          </h4>
          <p style={{ fontSize: '14px', color: '#cbd5e1', lineHeight: 1.6, marginBottom: '12px' }}>
            In a <span style={{ fontWeight: 600, color: '#fb923c' }}>descending auction</span>, bids start high and decrease over time.
          </p>
          <p style={{ fontSize: '14px', color: '#cbd5e1', lineHeight: 1.6, marginBottom: '12px' }}>
            The <span style={{ fontWeight: 600, color: '#34d399' }}>first valid bid wins</span> - so timing is everything!
          </p>
          <p style={{ fontSize: '14px', color: '#94a3b8', fontStyle: 'italic' }}>
            💡 Tip: Wait for better rates, but don't wait too long or someone else might win.
          </p>
        </div>

        <div className="card" style={{ padding: '24px' }}>
          <h4 style={{ fontWeight: 600, marginBottom: '12px', fontSize: '16px' }}>
            Your Returns
          </h4>
          <p style={{ fontSize: '14px', color: '#cbd5e1', lineHeight: 1.6, marginBottom: '16px' }}>
            Earn interest on your USDT by providing liquidity. Collateral is held in escrow until repayment.
          </p>
          <div style={{
            background: 'rgba(15, 23, 42, 0.4)',
            border: '1px solid rgba(248, 250, 252, 0.05)',
            borderRadius: '12px',
            padding: '20px'
          }}>
            <p style={{
              fontSize: '11px',
              color: '#94a3b8',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '8px'
            }}>
              Estimated APY
            </p>
            <p className="mono gradient-text" style={{ fontSize: '36px', fontWeight: 700 }}>
              12-18%
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
