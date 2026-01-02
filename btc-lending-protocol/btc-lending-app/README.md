# BTC Lending Protocol

A decentralized Bitcoin-backed lending platform built on Stacks blockchain.

## Features

- 🔐 Wallet integration (Leather & Hiro)
- 💰 Create Bitcoin-collateralized loan auctions
- 📊 Real-time loan summaries with LTV calculations
- 🎯 Descending auction bidding system
- 🪙 Test token minting for development
- ⚡ Modern React + Vite stack

## Prerequisites

- Node.js 18+ and npm
- Leather or Hiro wallet extension
- Stacks testnet address with STX for gas fees

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Development Server

```bash
npm run dev
```

The app will open automatically at `http://localhost:3000`

### 3. Connect Your Wallet

1. Click "Connect Wallet" button
2. Approve the connection in your wallet extension
3. Make sure you're on **Stacks Testnet**

### 4. Get Test Tokens

1. Click "Mint Test Tokens" to get sBTC and USDT
2. Approve both transactions in your wallet
3. Wait for confirmations

### 5. Create a Loan

**Two-Step Process:**

1. **Transfer Collateral**: Send sBTC to the contract
2. **Create Auction**: Set up your loan terms

## Contract Addresses (Testnet)

```
Contract Address: ST2BKV3K4DQQS6GMFJYT1MY4TQS228190RCSHAGN3

Contracts:
- loan-protocol-v4
- mock-sbtc-v4
- mock-usdt-v4
- borrower-nft-v4
- lender-nft-v4
```

## Project Structure

```
btc-lending-app/
├── src/
│   ├── components/
│   │   ├── Alert.jsx
│   │   ├── BorrowTab.jsx
│   │   ├── Header.jsx
│   │   ├── LendTab.jsx
│   │   ├── Tabs.jsx
│   │   └── TestTokens.jsx
│   ├── App.jsx
│   ├── index.css
│   └── main.jsx
├── index.html
├── package.json
├── vite.config.js
└── README.md
```

## How It Works

### Borrowing

1. **Deposit Collateral**: Transfer Bitcoin (sBTC) to the smart contract
2. **Create Auction**: Specify:
   - Collateral amount (BTC)
   - Requested loan amount (USDT)
   - Loan duration (days)
3. **Descending Auction**: Interest rate starts high and decreases over time
4. **Accept Bid**: First valid bid automatically matches and disburses funds

### Lending

1. **Browse Loans**: View active loan auctions
2. **Place Bid**: Submit your lending amount
3. **Earn Interest**: Receive repayment with interest at loan maturity
4. **Collateral Protection**: Claim collateral if borrower defaults

## Build for Production

```bash
npm run build
```

Built files will be in `dist/` directory.

## Preview Production Build

```bash
npm run preview
```

## Troubleshooting

### Wallet Connection Issues

- Make sure you're using Leather or Hiro wallet
- Check that you're on Stacks **Testnet**
- Try refreshing the page and reconnecting

### Transaction Failures

- Ensure you have enough STX for gas fees
- Verify you're using the correct network (testnet)
- Check transaction details in your wallet before signing

### Mint Token Errors

- You can only mint tokens once per address
- If already minted, check your balance in the wallet

## Resources

- [Stacks Documentation](https://docs.stacks.co/)
- [Stacks Connect Guide](https://docs.hiro.so/stacks.js/connect)
- [Testnet Explorer](https://explorer.hiro.so/?chain=testnet)
- [Stacks Faucet](https://explorer.hiro.so/sandbox/faucet?chain=testnet)

## Tech Stack

- **React 18** - UI framework
- **Vite** - Build tool & dev server
- **@stacks/connect** - Wallet integration
- **@stacks/transactions** - Transaction building
- **@stacks/network** - Network configuration

## License

MIT

## Support

For issues or questions:
1. Check the [Stacks Discord](https://discord.gg/stacks)
2. Review [contract code](https://explorer.hiro.so/address/ST2BKV3K4DQQS6GMFJYT1MY4TQS228190RCSHAGN3?chain=testnet)
3. Inspect transactions in [Stacks Explorer](https://explorer.hiro.so/?chain=testnet)
