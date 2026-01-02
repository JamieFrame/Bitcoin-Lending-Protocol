export default function TestTokens({ onMint, loading }) {
  return (
    <div className="card" style={{
      padding: '24px',
      marginBottom: '32px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '16px',
      flexWrap: 'wrap'
    }}>
      <div>
        <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '4px' }}>
          Need Test Tokens?
        </h3>
        <p style={{ fontSize: '13px', color: '#94a3b8' }}>
          Mint sBTC and USDT for testing on Stacks testnet
        </p>
      </div>
      <button
        onClick={onMint}
        disabled={loading}
        className="btn btn-secondary"
      >
        {loading ? 'Minting...' : 'Mint Test Tokens'}
      </button>
    </div>
  );
}
