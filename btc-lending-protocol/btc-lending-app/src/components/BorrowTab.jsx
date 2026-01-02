export default function BorrowTab({
  collateralAmount,
  setCollateralAmount,
  requestedAmount,
  setRequestedAmount,
  duration,
  setDuration,
  auctionDuration,
  setAuctionDuration,
  onTransfer,
  onCreate,
  loading
}) {
  const ltv = collateralAmount > 0 
    ? ((parseFloat(requestedAmount) / (parseFloat(collateralAmount) * 60000)) * 100).toFixed(1) 
    : 0;

  return (
    <div style={{ display: 'grid', gap: '32px', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))' }}>
      {/* Form */}
      <div className="card" style={{ padding: '32px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '24px' }}>
          Create Loan Request
        </h2>

        <div style={{
          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(217, 119, 6, 0.15) 100%)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          borderRadius: '12px',
          padding: '16px 20px',
          marginBottom: '24px'
        }}>
          <p style={{ color: '#f59e0b', fontSize: '14px', fontWeight: 700, marginBottom: '4px' }}>
            ⚠️ Two-Step Process
          </p>
          <p style={{ color: 'rgba(254, 243, 199, 0.8)', fontSize: '13px', lineHeight: 1.5 }}>
            Step 1: Transfer collateral to contract<br />
            Step 2: Create the loan auction
          </p>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label className="label" style={{
            display: 'block',
            fontSize: '13px',
            fontWeight: 600,
            color: '#cbd5e1',
            marginBottom: '8px'
          }}>
            Collateral Amount (sBTC)
          </label>
          <input
            type="number"
            className="input"
            value={collateralAmount}
            onChange={(e) => setCollateralAmount(e.target.value)}
            step="0.01"
            min="0"
          />
          <p style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>
            Minimum 0.01 BTC
          </p>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label className="label" style={{
            display: 'block',
            fontSize: '13px',
            fontWeight: 600,
            color: '#cbd5e1',
            marginBottom: '8px'
          }}>
            Requested Amount (USDT)
          </label>
          <input
            type="number"
            className="input"
            value={requestedAmount}
            onChange={(e) => setRequestedAmount(e.target.value)}
            step="100"
            min="0"
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
            Loan Duration (Days)
          </label>
          <input
            type="number"
            className="input"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            step="1"
            min="7"
          />
          <p style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>
            ~{parseInt(duration) * 144} blocks
          </p>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label className="label" style={{
            display: 'block',
            fontSize: '13px',
            fontWeight: 600,
            color: '#cbd5e1',
            marginBottom: '8px'
          }}>
            Auction Duration (Days)
          </label>
          <input
            type="number"
            className="input"
            value={auctionDuration}
            onChange={(e) => setAuctionDuration(e.target.value)}
            step="1"
            min="1"
          />
          <p style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>
            ~{parseInt(auctionDuration) * 144} blocks
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingTop: '16px' }}>
          <button
            onClick={onTransfer}
            disabled={loading}
            className="btn btn-secondary"
            style={{ width: '100%' }}
          >
            {loading ? 'Processing...' : '1️⃣ Transfer Collateral'}
          </button>
          <button
            onClick={onCreate}
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%' }}
          >
            {loading ? 'Processing...' : '2️⃣ Create Loan Auction'}
          </button>
        </div>
      </div>

      {/* Summary */}
      <div>
        <div className="card" style={{ padding: '32px', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '24px' }}>
            Loan Summary
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
                Collateral
              </p>
              <p className="mono" style={{ fontSize: '28px', fontWeight: 700, color: '#fb923c' }}>
                {collateralAmount} sBTC
              </p>
            </div>

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
                Requesting
              </p>
              <p className="mono" style={{ fontSize: '28px', fontWeight: 700, color: '#34d399' }}>
                {requestedAmount} USDT
              </p>
            </div>

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
                Loan Duration
              </p>
              <p className="mono" style={{ fontSize: '28px', fontWeight: 700, color: '#60a5fa' }}>
                {duration} Days
              </p>
            </div>

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
                Auction Duration
              </p>
              <p className="mono" style={{ fontSize: '28px', fontWeight: 700, color: '#f472b6' }}>
                {auctionDuration} Days
              </p>
            </div>

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
                LTV Ratio
              </p>
              <p className="mono" style={{ fontSize: '28px', fontWeight: 700, color: '#a78bfa' }}>
                {ltv}%
              </p>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '24px' }}>
          <h4 style={{ fontWeight: 600, marginBottom: '16px', fontSize: '16px' }}>
            How It Works
          </h4>
          <ol style={{ listStyle: 'none' }}>
            <li style={{ display: 'flex', gap: '12px', marginBottom: '12px', fontSize: '14px', color: '#cbd5e1', lineHeight: 1.6 }}>
              <span className="mono" style={{ color: '#fb923c', fontWeight: 700 }}>1.</span>
              <span>Transfer your Bitcoin collateral to the smart contract</span>
            </li>
            <li style={{ display: 'flex', gap: '12px', marginBottom: '12px', fontSize: '14px', color: '#cbd5e1', lineHeight: 1.6 }}>
              <span className="mono" style={{ color: '#fb923c', fontWeight: 700 }}>2.</span>
              <span>Create a loan auction with your terms</span>
            </li>
            <li style={{ display: 'flex', gap: '12px', marginBottom: '12px', fontSize: '14px', color: '#cbd5e1', lineHeight: 1.6 }}>
              <span className="mono" style={{ color: '#fb923c', fontWeight: 700 }}>3.</span>
              <span>Lenders compete with descending bids during auction period</span>
            </li>
            <li style={{ display: 'flex', gap: '12px', marginBottom: '12px', fontSize: '14px', color: '#cbd5e1', lineHeight: 1.6 }}>
              <span className="mono" style={{ color: '#fb923c', fontWeight: 700 }}>4.</span>
              <span>Auction finalizes - lowest bid wins automatically</span>
            </li>
            <li style={{ display: 'flex', gap: '12px', fontSize: '14px', color: '#cbd5e1', lineHeight: 1.6 }}>
              <span className="mono" style={{ color: '#fb923c', fontWeight: 700 }}>5.</span>
              <span>Receive USDT instantly and NFT representing your loan position</span>
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}
