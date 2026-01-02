export default function Header({ userData, onConnect, onDisconnect }) {
  return (
    <div style={{
      borderBottom: '1px solid rgba(51, 65, 85, 0.5)',
      background: 'rgba(2, 6, 23, 0.5)',
      backdropFilter: 'blur(20px)'
    }}>
      <div className="container">
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '24px 0',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div>
            <h1 className="gradient-text" style={{ fontSize: '32px', fontWeight: 700 }}>
              ₿TC Lending Protocol
            </h1>
            <p style={{ color: '#94a3b8', marginTop: '4px', fontSize: '14px' }}>
              Decentralized Bitcoin-backed loans on Stacks
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {userData && (
              <div className="card" style={{ padding: '8px 16px' }}>
                <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Connected
                </div>
                <div className="mono" style={{ color: '#fb923c', fontSize: '13px', marginTop: '2px' }}>
                  {userData.profile.stxAddress.testnet.slice(0, 8)}...{userData.profile.stxAddress.testnet.slice(-6)}
                </div>
              </div>
            )}

            <button
              onClick={userData ? onDisconnect : onConnect}
              className="btn btn-primary"
            >
              {userData ? 'Disconnect' : 'Connect Wallet'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
