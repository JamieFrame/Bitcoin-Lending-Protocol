# 🚀 Quick Setup Guide

## What You Got

A complete React + Vite app with working Stacks wallet integration for your BTC lending protocol!

## Setup (5 minutes)

### 1. Extract the Archive

```bash
tar -xzf btc-lending-app.tar.gz
cd btc-lending-app
```

### 2. Install Dependencies

```bash
npm install
```

This will install:
- React 18
- Vite 5
- @stacks/connect (wallet integration)
- @stacks/transactions (transaction building)
- @stacks/network (testnet config)

### 3. Start Development Server

```bash
npm run dev
```

App opens automatically at `http://localhost:3000`

### 4. Connect Wallet

1. Click "Connect Wallet"
2. Approve in Leather/Hiro wallet
3. **IMPORTANT**: Switch to Testnet!

### 5. Test It Out

1. **Mint Test Tokens** - Get sBTC and USDT
2. **Transfer Collateral** - Send sBTC to contract
3. **Create Loan** - Set up your loan auction
4. **Success!** 🎉

## Project Structure

```
btc-lending-app/
├── src/
│   ├── components/        # React components
│   │   ├── Header.jsx
│   │   ├── BorrowTab.jsx
│   │   ├── LendTab.jsx
│   │   └── ...
│   ├── App.jsx           # Main app logic
│   ├── index.css         # Global styles
│   └── main.jsx          # Entry point
├── package.json          # Dependencies
├── vite.config.js        # Vite config
└── index.html            # HTML template
```

## Features Included

✅ Wallet connection (Leather & Hiro)
✅ Test token minting
✅ Two-step loan creation
✅ Bid placement
✅ Real-time LTV calculations
✅ Beautiful dark theme
✅ Responsive design
✅ Transaction status alerts

## Commands

```bash
npm run dev      # Start dev server
npm run build    # Build for production
npm run preview  # Preview production build
```

## Your Contracts (Pre-configured)

```
Address: ST2BKV3K4DQQS6GMFJYT1MY4TQS228190RCSHAGN3

Contracts:
- loan-protocol-v4
- mock-sbtc-v4
- mock-usdt-v4
```

## Troubleshooting

**Wallet won't connect?**
- Make sure you're on Stacks Testnet
- Refresh page and try again

**Transaction failing?**
- Check you have STX for gas fees
- Verify wallet is unlocked

**Need testnet STX?**
- Visit: https://explorer.hiro.so/sandbox/faucet?chain=testnet

## Next Steps

1. **Customize styling** - Edit `src/index.css`
2. **Add features** - Create new components
3. **Deploy** - Run `npm run build` and host the `dist/` folder

## Resources

- Full README: See `README.md` in project folder
- Stacks Docs: https://docs.stacks.co/
- Your Contracts: https://explorer.hiro.so/address/ST2BKV3K4DQQS6GMFJYT1MY4TQS228190RCSHAGN3?chain=testnet

---

**Questions?** Check the detailed README.md file in the project!
