export default function Tabs({ activeTab, onTabChange }) {
  return (
    <div style={{ display: 'flex', gap: '8px', marginBottom: '32px' }}>
      <button
        className={`tab ${activeTab === 'borrow' ? 'active' : ''}`}
        onClick={() => onTabChange('borrow')}
        style={{
          padding: '12px 24px',
          borderRadius: '10px',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          fontWeight: 600,
          background: activeTab === 'borrow' ? 'rgba(247, 147, 26, 0.15)' : 'transparent',
          border: 'none',
          color: activeTab === 'borrow' ? '#f7931a' : 'rgba(248, 250, 252, 0.6)',
          fontFamily: 'Work Sans, sans-serif',
          fontSize: '15px'
        }}
      >
        Borrow
      </button>
      <button
        className={`tab ${activeTab === 'lend' ? 'active' : ''}`}
        onClick={() => onTabChange('lend')}
        style={{
          padding: '12px 24px',
          borderRadius: '10px',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          fontWeight: 600,
          background: activeTab === 'lend' ? 'rgba(247, 147, 26, 0.15)' : 'transparent',
          border: 'none',
          color: activeTab === 'lend' ? '#f7931a' : 'rgba(248, 250, 252, 0.6)',
          fontFamily: 'Work Sans, sans-serif',
          fontSize: '15px'
        }}
      >
        Lend
      </button>
    </div>
  );
}
