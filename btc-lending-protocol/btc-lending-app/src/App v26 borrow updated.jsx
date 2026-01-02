import { useState, useEffect } from 'react';
import { AppConfig, UserSession, showConnect, openContractCall } from '@stacks/connect';
import { StacksTestnet } from '@stacks/network';
import { 
  uintCV, 
  stringAsciiCV,
  standardPrincipalCV, 
  contractPrincipalCV,
  noneCV,
  trueCV,
  PostConditionMode,
  FungibleConditionCode,
  makeStandardFungiblePostCondition,
  createAssetInfo
} from '@stacks/transactions';
import { c32address } from 'c32check';

// Configuration - UPDATE YOUR CONTRACT ADDRESS!
const CONFIG = {
  CONTRACT_ADDRESS: 'ST2BKV3K4DQQS6GMFJYT1MY4TQS228190RCSHAGN3',
  LOAN_PROTOCOL: 'loan-protocol-v26',  // UPDATED TO V26 - USES ALLOW MODE!
  MOCK_SBTC: 'mock-sbtc-v21',          // FIXED: Uses contract-caller
  MOCK_USDT: 'mock-usdt-v21',          // FIXED: Uses contract-caller
  NETWORK: new StacksTestnet()
};

const appConfig = new AppConfig(['store_write', 'publish_data']);
const userSession = new UserSession({ appConfig });

function App() {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  
  // Form state
  const [collateralAmount, setCollateralAmount] = useState('');
  const [requestedAmount, setRequestedAmount] = useState('');
  const [maxRepayment, setMaxRepayment] = useState('');
  const [duration, setDuration] = useState('');
  const [auctionDuration, setAuctionDuration] = useState('');
  const [loanId, setLoanId] = useState('1');
  const [bidAmount, setBidAmount] = useState('');
  
  // Auction state
  const [openAuctions, setOpenAuctions] = useState([]);
  const [loadingAuctions, setLoadingAuctions] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [currentBlock, setCurrentBlock] = useState(0);
  const [showMyAuctionsOnly, setShowMyAuctionsOnly] = useState(false);
  const [showMyLoansOnly, setShowMyLoansOnly] = useState(false);
  const [collateralTransferred, setCollateralTransferred] = useState(false);

  useEffect(() => {
    if (userSession.isUserSignedIn()) {
      setUserData(userSession.loadUserData());
    }
  }, []);

  useEffect(() => {
    if (userData) {
      fetchOpenAuctions();
    }
  }, [userData]);

  const showMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 5000);
  };

  const connectWallet = () => {
    showConnect({
      appDetails: {
        name: 'BTC Lending Protocol',
        icon: 'https://bitcoin.org/img/icons/opengraph.png'
      },
      redirectTo: '/',
      onFinish: () => {
        setUserData(userSession.loadUserData());
        showMessage('Wallet connected!', 'success');
      },
      userSession
    });
  };

  const disconnectWallet = () => {
    userSession.signUserOut('/');
    setUserData(null);
    showMessage('Wallet disconnected', 'info');
  };

  const mintTestTokens = async () => {
    if (!userData) return showMessage('Please connect wallet first', 'error');
    setLoading(true);
    try {
      await openContractCall({
        network: CONFIG.NETWORK,
        contractAddress: CONFIG.CONTRACT_ADDRESS,
        contractName: CONFIG.MOCK_SBTC,
        functionName: 'mint',
        functionArgs: [uintCV(5000000000), standardPrincipalCV(userData.profile.stxAddress.testnet)],
        onFinish: () => showMessage('sBTC minted!', 'success')
      });
      setTimeout(async () => {
        await openContractCall({
          network: CONFIG.NETWORK,
          contractAddress: CONFIG.CONTRACT_ADDRESS,
          contractName: CONFIG.MOCK_USDT,
          functionName: 'mint',
          functionArgs: [uintCV(500000000000), standardPrincipalCV(userData.profile.stxAddress.testnet)],
          onFinish: () => showMessage('USDT minted!', 'success')
        });
      }, 2000);
    } catch (error) {
      showMessage(`Error: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const transferCollateral = async () => {
    if (!userData) return showMessage('Please connect wallet first', 'error');
    setLoading(true);
    try {
      const amount = Math.floor(parseFloat(collateralAmount) * 100000000);
      const sbtcAsset = createAssetInfo(CONFIG.CONTRACT_ADDRESS, CONFIG.MOCK_SBTC, 'sbtc');
      const postCondition = makeStandardFungiblePostCondition(
        userData.profile.stxAddress.testnet, FungibleConditionCode.Equal, amount, sbtcAsset
      );
      
      await openContractCall({
        network: CONFIG.NETWORK,
        contractAddress: CONFIG.CONTRACT_ADDRESS,
        contractName: CONFIG.MOCK_SBTC,
        functionName: 'transfer',
        functionArgs: [
          uintCV(amount),
          standardPrincipalCV(userData.profile.stxAddress.testnet),
          contractPrincipalCV(CONFIG.CONTRACT_ADDRESS, CONFIG.LOAN_PROTOCOL),
          noneCV()
        ],
        postConditions: [postCondition],
        postConditionMode: PostConditionMode.Deny,
        onFinish: () => {
          showMessage('Collateral transferred!', 'success');
          setCollateralTransferred(true);
        }
      });
    } catch (error) {
      showMessage(`Error: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const createLoan = async () => {
    if (!userData) return showMessage('Please connect wallet first', 'error');
    setLoading(true);
    try {
      const collateralSats = Math.floor(parseFloat(collateralAmount) * 100000000);
      const requestedMicro = Math.floor(parseFloat(requestedAmount) * 1000000);
      const maxRepaymentMicro = Math.floor(parseFloat(maxRepayment) * 1000000);
      const loanDurationBlocks = parseInt(duration) * 144;
      const auctionDurationBlocks = parseInt(auctionDuration) * 144;

      await openContractCall({
        network: CONFIG.NETWORK,
        contractAddress: CONFIG.CONTRACT_ADDRESS,
        contractName: CONFIG.LOAN_PROTOCOL,
        functionName: 'create-loan-auction',
        functionArgs: [
          stringAsciiCV('BTC'), uintCV(collateralSats),
          stringAsciiCV('USDT'), uintCV(requestedMicro),
          uintCV(maxRepaymentMicro), uintCV(loanDurationBlocks), uintCV(auctionDurationBlocks)
        ],
        onFinish: () => {
          showMessage('Loan created! Refreshing...', 'success');
          setCollateralTransferred(false); // Reset for next loan
          
          // Refresh to see the new loan - it will automatically show in "My Loans" filter
          setTimeout(() => {
            fetchOpenAuctions();
          }, 2000);
        }
      });
    } catch (error) {
      showMessage(`Error: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const placeBid = async () => {
    if (!userData) return showMessage('Please connect wallet first', 'error');
    if (!bidAmount || parseFloat(bidAmount) <= 0) return showMessage('Enter valid bid amount', 'error');
    setLoading(true);
    try {
      const amount = Math.floor(parseFloat(bidAmount) * 1000000);
      
      await openContractCall({
        network: CONFIG.NETWORK,
        contractAddress: CONFIG.CONTRACT_ADDRESS,
        contractName: CONFIG.LOAN_PROTOCOL,
        functionName: 'place-bid',
        functionArgs: [uintCV(parseInt(loanId)), uintCV(amount)],
        postConditionMode: PostConditionMode.Allow,
        onFinish: () => showMessage('Bid placed!', 'success')
      });
    } catch (error) {
      showMessage(`Error: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const finalizeAuction = async (loanIdToFinalize) => {
    if (!userData) return showMessage('Please connect wallet first', 'error');
    setLoading(true);
    try {
      await openContractCall({
        network: CONFIG.NETWORK,
        contractAddress: CONFIG.CONTRACT_ADDRESS,
        contractName: CONFIG.LOAN_PROTOCOL,
        functionName: 'finalize-auction',
        functionArgs: [uintCV(parseInt(loanIdToFinalize))],
        postConditionMode: PostConditionMode.Allow, // Allow token transfers during finalization
        onFinish: () => {
          showMessage('Auction finalized!', 'success');
          setTimeout(() => fetchOpenAuctions(), 2000);
        }
      });
    } catch (error) {
      showMessage(`Error: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchOpenAuctions = async () => {
    setLoadingAuctions(true);
    
    // Helper: Delay between requests
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    
    // Helper: Fetch with retry on rate limit
    const fetchWithRetry = async (url, options, retries = 3) => {
      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          const response = await fetch(url, options);
          
          // If rate limited, wait and retry
          if (response.status === 429) {
            const waitTime = Math.pow(2, attempt) * 1000; // Exponential backoff: 2s, 4s, 8s
            console.log(`Rate limited, waiting ${waitTime/1000}s before retry ${attempt}/${retries}`);
            await delay(waitTime);
            continue;
          }
          
          return response;
        } catch (error) {
          if (attempt === retries) throw error;
          await delay(1000 * attempt);
        }
      }
      throw new Error('Max retries exceeded');
    };
    
    try {
      // Fetch current BITCOIN block height (burn-block-height in contract)
      const infoResponse = await fetchWithRetry(`${CONFIG.NETWORK.coreApiUrl}/v2/info`);
      if (infoResponse.ok) {
        const infoData = await infoResponse.json();
        // Use burn_block_height (Bitcoin blocks) NOT stacks_tip_height (Stacks blocks)
        setCurrentBlock(infoData.burn_block_height || 0);
        console.log('Current Bitcoin block:', infoData.burn_block_height);
      }
      
      // First check if contract is initialized
      const initResponse = await fetch(
        `${CONFIG.NETWORK.coreApiUrl}/v2/contracts/call-read/${CONFIG.CONTRACT_ADDRESS}/${CONFIG.LOAN_PROTOCOL}/is-initialized`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sender: CONFIG.CONTRACT_ADDRESS,
            arguments: []
          })
        }
      );
      
      if (!initResponse.ok) {
        const errorText = await initResponse.text();
        console.error('Init check failed:', errorText);
        showMessage('Contract not found! Check contract names in App.jsx', 'error');
        setLoadingAuctions(false);
        return;
      }

      const initResult = await initResponse.json();
      // Clarity returns true as 0x03 (hex)
      if (!initResult.result || initResult.result === '0x04') {
        showMessage('Contract not initialized! Click "1. Initialize Contract"', 'error');
        setLoadingAuctions(false);
        return;
      }

      const response = await fetch(
        `${CONFIG.NETWORK.coreApiUrl}/v2/contracts/call-read/${CONFIG.CONTRACT_ADDRESS}/${CONFIG.LOAN_PROTOCOL}/get-loan-nonce`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sender: CONFIG.CONTRACT_ADDRESS,
            arguments: []
          })
        }
      );
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Nonce fetch failed:', errorText);
        showMessage('Error reading contract. Check console.', 'error');
        setLoadingAuctions(false);
        return;
      }

      const result = await response.json();
      
      if (!result.result || result.error) {
        showMessage(`Contract error: ${result.error || 'Unable to read loan-nonce'}`, 'error');
        setLoadingAuctions(false);
        return;
      }
      
      const totalLoans = (() => {
        const hexResult = result.result;
        // Clarity returns uint as 0x01 + 32-byte hex value
        // e.g., 0x0100000000000000000000000000000004 = u4
        if (hexResult.startsWith('0x01')) {
          // Remove '0x01' prefix and parse the remaining hex as decimal
          const hexValue = hexResult.slice(4); // Skip '0x01'
          return parseInt(hexValue, 16);
        }
        // Fallback: try old string format like "u4"
        return parseInt(hexResult.replace('u', ''));
      })();
      
      if (totalLoans === 0) {
        showMessage('No loans created yet! Create one first.', 'info');
        setOpenAuctions([]);
        setLoadingAuctions(false);
        return;
      }
      
      const auctions = [];
      
      console.log(`Fetching ${totalLoans} loans with rate limiting...`);
      let successCount = 0;
      let failCount = 0;
      
      for (let i = 1; i <= totalLoans; i++) {
        try {
          // Add delay between requests (500ms = ~2 requests per second)
          if (i > 1) await delay(500);
          
          // Progress update every 10 loans
          if (i % 10 === 0) {
            console.log(`Progress: ${i}/${totalLoans} loans (${successCount} loaded, ${failCount} failed)`);
          }
          
          // Get loan details with retry
          const loanResponse = await fetchWithRetry(
            `${CONFIG.NETWORK.coreApiUrl}/v2/contracts/call-read/${CONFIG.CONTRACT_ADDRESS}/${CONFIG.LOAN_PROTOCOL}/get-loan`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                sender: CONFIG.CONTRACT_ADDRESS,
                arguments: [`0x01${i.toString(16).padStart(32, '0')}`]
              })
            }
          );
        
        if (!loanResponse.ok) {
          failCount++;
          continue;
        }
        
        const loanResult = await loanResponse.json();
        if (!loanResult.result || loanResult.result === '(none)' || loanResult.result === '0x09') {
          console.log(`Loan ${i}: not found (skipping)`);
          continue;
        }
        
        // Parse loan data - Clarity returns entire tuple as hex
        const loanData = loanResult.result;
        console.log(`Loan ${i} raw data:`, loanData);
        
        // Clarity tuple fields are in this order (from contract):
        // borrower, collateral-asset, collateral-amount, borrow-asset, borrow-amount, 
        // max-repayment, auction-end-block, maturity-block, status, lender, repayment-amount
        
        // Parse field values from Clarity tuple hex
        // In a tuple, fields are: length_byte + field_name + value_type + value
        const findUint = (fieldName) => {
          // Convert field name to hex
          let fieldHex = '';
          for (let i = 0; i < fieldName.length; i++) {
            fieldHex += fieldName.charCodeAt(i).toString(16).padStart(2, '0');
          }
          // Length is stored as single byte (2 hex digits)
          const lenHex = fieldName.length.toString(16).padStart(2, '0');
          // Pattern: length + fieldname + 01 (uint type) + value(32 hex digits)
          const pattern = new RegExp(lenHex + fieldHex + '01([0-9a-f]{32})', 'i');
          const match = loanData.match(pattern);
          if (match) {
            return parseInt(match[1], 16);
          }
          return 0;
        };
        
        const findString = (fieldName) => {
          // Convert field name to hex
          let fieldHex = '';
          for (let i = 0; i < fieldName.length; i++) {
            fieldHex += fieldName.charCodeAt(i).toString(16).padStart(2, '0');
          }
          // Length of field name as single byte
          const fieldLenHex = fieldName.length.toString(16).padStart(2, '0');
          // String values have 0d prefix and length
          const pattern = new RegExp(fieldLenHex + fieldHex + '0d([0-9a-f]{8})([0-9a-f]+)', 'i');
          const match = loanData.match(pattern);
          if (match) {
            const len = parseInt(match[1], 16);
            const hexChars = match[2].slice(0, len * 2);
            let result = '';
            for (let j = 0; j < hexChars.length; j += 2) {
              result += String.fromCharCode(parseInt(hexChars.substr(j, 2), 16));
            }
            return result;
          }
          return '';
        };
        
        const collateralAmount = findUint('collateral-amount');
        const borrowAmount = findUint('borrow-amount');
        const maxRepayment = findUint('max-repayment');
        const auctionEndBlock = findUint('auction-end-block');
        const maturityBlock = findUint('maturity-block');
        const loanDuration = findUint('loan-duration') || findUint('duration');
        const status = findString('status');
        
        console.log(`Loan ${i} raw duration check:`, { 
          'loan-duration': findUint('loan-duration'),
          'duration': findUint('duration')
        });
        
        // Calculate duration from maturity-block if not directly available
        let calculatedDuration = 0;
        if (maturityBlock > 0 && auctionEndBlock > 0) {
          calculatedDuration = maturityBlock - auctionEndBlock;
        }
        const finalDuration = loanDuration || calculatedDuration;
        
        console.log(`Loan ${i} duration:`, { loanDuration, calculatedDuration, finalDuration });
        
        // Parse borrower principal (for filtering "my loans")
        let borrowerHex = '';
        let borrowerAddress = '';
        const borrowerFieldName = 'borrower';
        let borrowerFieldHex = '';
        for (let j = 0; j < borrowerFieldName.length; j++) {
          borrowerFieldHex += borrowerFieldName.charCodeAt(j).toString(16).padStart(2, '0');
        }
        const borrowerLenHex = borrowerFieldName.length.toString(16).padStart(2, '0');
        const borrowerPattern = new RegExp(borrowerLenHex + borrowerFieldHex + '05([0-9a-f]{42})', 'i');
        const borrowerMatch = loanData.match(borrowerPattern);
        if (borrowerMatch) {
          borrowerHex = borrowerMatch[1];
          
          // Convert hex to Stacks address
          // Format: version byte (1 byte) + hash160 (20 bytes)
          const version = parseInt(borrowerHex.slice(0, 2), 16);
          const hash = borrowerHex.slice(2);
          
          try {
            borrowerAddress = c32address(version, hash);
            console.log(`Loan ${i} borrower:`, borrowerAddress);
          } catch (err) {
            console.error(`Failed to decode borrower for loan ${i}:`, err);
          }
        }
        
        console.log(`Loan ${i} parsed:`, { status, borrowAmount, maxRepayment, collateralAmount, auctionEndBlock, borrowerAddress, finalDuration });
        
        const isAuction = status === 'auction';
        
        let currentBid = null;
        let bidderAddress = '';
        if (isAuction) {
          // Only fetch bid if it's an auction
          const bidResponse = await fetch(
            `${CONFIG.NETWORK.coreApiUrl}/v2/contracts/call-read/${CONFIG.CONTRACT_ADDRESS}/${CONFIG.LOAN_PROTOCOL}/get-current-bid`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                sender: CONFIG.CONTRACT_ADDRESS,
                arguments: [`0x01${i.toString(16).padStart(32, '0')}`]  // 0x01 + 32 hex chars = 17 bytes total
              })
            }
          );
          
          const bidResult = bidResponse.ok ? await bidResponse.json() : { result: '(none)' };
          
          console.log(`Loan ${i} bid result:`, bidResult.result);
          
          if (bidResult.result && bidResult.result !== '(none)' && bidResult.result !== '0x09') {
            // Parse bid data - need to search in bidResult, not loanData!
            const bidData = bidResult.result;
            
            // Find amount in bid tuple
            let fieldHex = '';
            for (let j = 0; j < 'amount'.length; j++) {
              fieldHex += 'amount'.charCodeAt(j).toString(16).padStart(2, '0');
            }
            const lenHex = 'amount'.length.toString(16).padStart(2, '0');
            const pattern = new RegExp(lenHex + fieldHex + '01([0-9a-f]{32})', 'i');
            const match = bidData.match(pattern);
            
            if (match) {
              const bidAmount = parseInt(match[1], 16);
              console.log(`Loan ${i} has bid:`, bidAmount / 1000000, 'USDT');
              currentBid = bidAmount / 1000000;
            }
            
            // Parse bidder address from bid tuple
            let bidderFieldHex = '';
            for (let j = 0; j < 'bidder'.length; j++) {
              bidderFieldHex += 'bidder'.charCodeAt(j).toString(16).padStart(2, '0');
            }
            const bidderLenHex = 'bidder'.length.toString(16).padStart(2, '0');
            const bidderPattern = new RegExp(bidderLenHex + bidderFieldHex + '05([0-9a-f]{42})', 'i');
            const bidderMatch = bidData.match(bidderPattern);
            
            if (bidderMatch) {
              const bidderHex = bidderMatch[1];
              const version = parseInt(bidderHex.slice(0, 2), 16);
              const hash = bidderHex.slice(2);
              
              try {
                bidderAddress = c32address(version, hash);
                console.log(`Loan ${i} bidder:`, bidderAddress);
              } catch (err) {
                console.error(`Failed to decode bidder for loan ${i}:`, err);
              }
            }
          }
        }
        
        auctions.push({
          id: i,
          collateralAmount: collateralAmount / 100000000, // sats to BTC
          borrowAmount: borrowAmount / 1000000, // micro-USDT to USDT
          maxRepayment: maxRepayment / 1000000, // micro-USDT to USDT
          auctionEndBlock: auctionEndBlock,
          maturityBlock: maturityBlock,
          loanDuration: finalDuration,
          currentBid: currentBid,
          bidderAddress: bidderAddress,
          status: status || 'unknown',
          isAuction: isAuction,
          borrowerHex: borrowerHex,
          borrowerAddress: borrowerAddress
        });
        successCount++;
      } catch (error) {
        console.error(`Error fetching loan ${i}:`, error.message);
        failCount++;
      }
    }
    
    console.log(`Loaded ${successCount}/${totalLoans} loans (${failCount} failed)`);
    if (successCount === 0) {
      showMessage('Failed to load any loans. Please try again.', 'error');
      setLoadingAuctions(false);
      return;
    }
      
      // Get current BITCOIN block for reference
      const infoResponse2 = await fetchWithRetry(`${CONFIG.NETWORK.coreApiUrl}/v2/info`);
      const currentBlockHeight = infoResponse2.ok ? (await infoResponse2.json()).burn_block_height || 0 : 0;
      
      // Show ALL loans - let each column filter as needed
      setOpenAuctions(auctions);
      console.log(`Checked ${totalLoans} loan IDs, found ${auctions.length} total loans`);
      
      if (auctions.length === 0) {
        showMessage(`Checked ${totalLoans} loans - none found. Create a new loan!`, 'info');
      } else {
        // Count different types
        const activeAuctionCount = auctions.filter(a => a.status === 'auction' && a.auctionEndBlock > currentBlockHeight).length;
        const endedAuctionCount = auctions.filter(a => a.status === 'auction' && a.auctionEndBlock > 0 && a.auctionEndBlock <= currentBlockHeight).length;
        const activeLoansCount = auctions.filter(a => a.status === 'active').length;
        const repaidCount = auctions.filter(a => a.status === 'repaid').length;
        const defaultedCount = auctions.filter(a => a.status === 'failed').length;
        
        showMessage(`Found ${auctions.length} loan(s) - ${activeAuctionCount} active auctions, ${endedAuctionCount} ended, ${activeLoansCount} active, ${defaultedCount} defaulted, ${repaidCount} repaid`, 'success');
      }
    } catch (error) {
      console.error('Error fetching auctions:', error);
      showMessage(`Error: ${error.message}`, 'error');
    } finally {
      setLoadingAuctions(false);
    }
  };

  const selectAuction = (id, minBid) => {
    setLoanId(id.toString());
    setBidAmount(minBid.toString());
  };

  // Parse Clarity uint128 from hex format
  const parseUint128 = (hexStr) => {
    if (!hexStr) return 0;
    // Clarity uint128 format: 0x01 (type) + 64 hex chars (32 bytes)
    if (hexStr.startsWith('0x01')) {
      const hexValue = hexStr.slice(4); // Remove '0x01'
      return parseInt(hexValue, 16);
    }
    // Fallback: try parsing as decimal string
    const match = hexStr.match(/u(\d+)/);
    return match ? parseInt(match[1]) : 0;
  };

  // Parse Clarity string-ascii from hex or raw format
  const parseStringAscii = (str) => {
    if (!str) return '';
    // If it's already a quoted string, extract it
    const quotedMatch = str.match(/"([^"]+)"/);
    if (quotedMatch) return quotedMatch[1];
    // If it's hex encoded, decode it
    if (str.startsWith('0x0d')) {
      const hex = str.slice(4); // Remove '0x0d' (string-ascii type)
      let result = '';
      for (let i = 0; i < hex.length; i += 2) {
        result += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
      }
      return result;
    }
    return str;
  };

  // Format loan duration from blocks to days
  const formatDuration = (blocks) => {
    if (!blocks || blocks === 0) return null;
    const days = Math.floor(blocks / 144);
    return days > 0 ? `${days} day${days !== 1 ? 's' : ''}` : `${blocks} blocks`;
  };

  const initializeContract = async () => {
    if (!userData) return showMessage('Please connect wallet first', 'error');
    setLoading(true);
    try {
      await openContractCall({
        network: CONFIG.NETWORK,
        contractAddress: CONFIG.CONTRACT_ADDRESS,
        contractName: CONFIG.LOAN_PROTOCOL,
        functionName: 'initialize',
        functionArgs: [
          contractPrincipalCV(CONFIG.CONTRACT_ADDRESS, CONFIG.LOAN_PROTOCOL)
        ],
        onFinish: () => {
          showMessage('Contract initialized! Now authorize the tokens.', 'success');
          setTimeout(() => fetchOpenAuctions(), 2000);
        }
      });
    } catch (error) {
      showMessage(`Error: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const authorizeContracts = async () => {
    if (!userData) return showMessage('Please connect wallet first', 'error');
    setLoading(true);
    try {
      // Authorize in sBTC
      await openContractCall({
        network: CONFIG.NETWORK,
        contractAddress: CONFIG.CONTRACT_ADDRESS,
        contractName: CONFIG.MOCK_SBTC,
        functionName: 'set-authorized-contract',
        functionArgs: [
          contractPrincipalCV(CONFIG.CONTRACT_ADDRESS, CONFIG.LOAN_PROTOCOL),
          trueCV()
        ],
        onFinish: () => {
          showMessage('sBTC authorized! Now authorizing USDT...', 'success');
        }
      });

      // Authorize in USDT after delay
      setTimeout(async () => {
        await openContractCall({
          network: CONFIG.NETWORK,
          contractAddress: CONFIG.CONTRACT_ADDRESS,
          contractName: CONFIG.MOCK_USDT,
          functionName: 'set-authorized-contract',
          functionArgs: [
            contractPrincipalCV(CONFIG.CONTRACT_ADDRESS, CONFIG.LOAN_PROTOCOL),
            trueCV()
          ],
          onFinish: () => {
            showMessage('All authorized! Protocol ready to use.', 'success');
          }
        });
      }, 3000);
    } catch (error) {
      showMessage(`Error: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#e2e8f0' }}>
      <header style={{ borderBottom: '1px solid #334155', padding: '16px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>BTC Lending v1</h1>
          {userData ? (
            <button onClick={disconnectWallet} style={{ padding: '8px 16px', background: '#334155', border: 'none', borderRadius: '6px', color: '#e2e8f0', cursor: 'pointer' }}>
              {userData.profile.stxAddress.testnet.slice(0, 6)}...{userData.profile.stxAddress.testnet.slice(-4)}
            </button>
          ) : (
            <button onClick={connectWallet} style={{ padding: '8px 16px', background: '#3b82f6', border: 'none', borderRadius: '6px', color: 'white', cursor: 'pointer' }}>
              Connect Wallet
            </button>
          )}
        </div>
      </header>

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '48px 16px' }}>
        {message.text && (
          <div style={{ padding: '16px', marginBottom: '24px', background: message.type === 'success' ? '#065f46' : '#991b1b', borderRadius: '6px' }}>
            {message.text}
          </div>
        )}

        {userData && (
          <div style={{ marginBottom: '32px' }}>
            {/* Mint Test Tokens - Always Visible */}
            <div style={{ background: '#1e293b', padding: '20px', borderRadius: '8px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h2 style={{ fontSize: '18px', margin: 0 }}>Get Test Tokens</h2>
              </div>
              <button onClick={mintTestTokens} disabled={loading} style={{ width: '100%', padding: '12px 24px', background: '#3b82f6', border: 'none', borderRadius: '6px', color: 'white', cursor: 'pointer', fontSize: '16px', fontWeight: '600' }}>
                Mint Test Tokens (sBTC & USDT)
              </button>
              <p style={{ marginTop: '12px', fontSize: '13px', color: '#94a3b8' }}>
                Click to receive 50 sBTC and 500,000 USDT for testing
              </p>
            </div>

            {/* Admin Section - Collapsible */}
            <div style={{ background: '#1e293b', padding: '20px', borderRadius: '8px', border: '1px solid #334155' }}>
              <div 
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                onClick={() => setShowAdmin(!showAdmin)}
              >
                <h3 style={{ fontSize: '16px', margin: 0, color: '#94a3b8' }}>
                  ⚙️ Admin Setup (First-time only)
                </h3>
                <span style={{ fontSize: '18px', color: '#64748b' }}>
                  {showAdmin ? '▼' : '▶'}
                </span>
              </div>
              
              {showAdmin && (
                <div style={{ marginTop: '16px' }}>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <button onClick={initializeContract} disabled={loading} style={{ padding: '12px 24px', background: '#8b5cf6', border: 'none', borderRadius: '6px', color: 'white', cursor: 'pointer' }}>
                      1. Initialize Contract
                    </button>
                    <button onClick={authorizeContracts} disabled={loading} style={{ padding: '12px 24px', background: '#ec4899', border: 'none', borderRadius: '6px', color: 'white', cursor: 'pointer' }}>
                      2. Authorize Tokens
                    </button>
                  </div>
                  <p style={{ marginTop: '12px', fontSize: '13px', color: '#94a3b8' }}>
                    First time setup: Click buttons 1, 2 in order (once only!)
                  </p>
                  <details style={{ marginTop: '16px', fontSize: '12px', color: '#64748b' }}>
                    <summary style={{ cursor: 'pointer', marginBottom: '8px' }}>Show contract names (for debugging)</summary>
                    <div style={{ background: '#0f172a', padding: '12px', borderRadius: '4px', fontFamily: 'monospace' }}>
                      <div>Loan Protocol: {CONFIG.LOAN_PROTOCOL}</div>
                      <div>sBTC: {CONFIG.MOCK_SBTC}</div>
                      <div>USDT: {CONFIG.MOCK_USDT}</div>
                      <div style={{ marginTop: '8px', color: '#94a3b8' }}>
                        Check these match your deployed contracts at:<br/>
                        https://explorer.hiro.so/address/{CONFIG.CONTRACT_ADDRESS}?chain=testnet
                      </div>
                    </div>
                  </details>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Horizontal Borrow Section */}
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '24px', marginBottom: '16px', color: '#e2e8f0', fontWeight: '600' }}>Borrow</h2>
          <div style={{ background: '#1e293b', padding: '24px', borderRadius: '8px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '16px' }}>
              
              {/* Column 1: Collateral and Loan Amount */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', color: '#94a3b8', fontWeight: '500' }}>Collateral (BTC)</label>
                  <input 
                    value={collateralAmount} 
                    onChange={(e) => setCollateralAmount(e.target.value)} 
                    placeholder="Enter BTC amount" 
                    style={{ 
                      width: '100%', 
                      padding: '12px', 
                      background: '#0f172a', 
                      border: '1px solid #334155', 
                      borderRadius: '6px', 
                      color: '#e2e8f0',
                      fontSize: '14px'
                    }} 
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', color: '#94a3b8', fontWeight: '500' }}>Loan Amount (USDT)</label>
                  <input 
                    value={requestedAmount} 
                    onChange={(e) => setRequestedAmount(e.target.value)} 
                    placeholder="Enter USDT amount" 
                    style={{ 
                      width: '100%', 
                      padding: '12px', 
                      background: '#0f172a', 
                      border: '1px solid #334155', 
                      borderRadius: '6px', 
                      color: '#e2e8f0',
                      fontSize: '14px'
                    }} 
                  />
                </div>
              </div>

              {/* Column 2: Max Repayment and Implied Interest */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', color: '#94a3b8', fontWeight: '500' }}>Max. Repayment (USDT)</label>
                  <input 
                    value={maxRepayment} 
                    onChange={(e) => setMaxRepayment(e.target.value)} 
                    placeholder="Maximum you'll pay" 
                    style={{ 
                      width: '100%', 
                      padding: '12px', 
                      background: '#0f172a', 
                      border: '1px solid #334155', 
                      borderRadius: '6px', 
                      color: '#e2e8f0',
                      fontSize: '14px'
                    }} 
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', color: '#94a3b8', fontWeight: '500' }}>Implied Interest</label>
                  <div 
                    style={{ 
                      width: '100%', 
                      padding: '12px', 
                      background: '#0f172a', 
                      border: '1px solid #334155', 
                      borderRadius: '6px', 
                      color: '#10b981',
                      fontSize: '14px',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      minHeight: '44px'
                    }} 
                  >
                    {requestedAmount && maxRepayment && parseFloat(requestedAmount) > 0 ? 
                      `${(((parseFloat(maxRepayment) - parseFloat(requestedAmount)) / parseFloat(requestedAmount)) * 100).toFixed(2)}%` 
                      : '—'}
                  </div>
                </div>
              </div>

              {/* Column 3: Loan Duration and Auction Duration */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', color: '#94a3b8', fontWeight: '500' }}>Loan Duration (days)</label>
                  <input 
                    value={duration} 
                    onChange={(e) => setDuration(e.target.value)} 
                    placeholder="e.g., 30" 
                    style={{ 
                      width: '100%', 
                      padding: '12px', 
                      background: '#0f172a', 
                      border: '1px solid #334155', 
                      borderRadius: '6px', 
                      color: '#e2e8f0',
                      fontSize: '14px'
                    }} 
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', color: '#94a3b8', fontWeight: '500' }}>Auction Duration (days)</label>
                  <input 
                    value={auctionDuration} 
                    onChange={(e) => setAuctionDuration(e.target.value)} 
                    placeholder="e.g., 1" 
                    style={{ 
                      width: '100%', 
                      padding: '12px', 
                      background: '#0f172a', 
                      border: '1px solid #334155', 
                      borderRadius: '6px', 
                      color: '#e2e8f0',
                      fontSize: '14px'
                    }} 
                  />
                </div>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '16px' }}>
              <button onClick={transferCollateral} disabled={loading} style={{ flex: 1, padding: '12px', background: '#3b82f6', border: 'none', borderRadius: '6px', color: 'white', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: '600', opacity: loading ? 0.5 : 1 }}>
                1. Transfer Collateral
              </button>
              <button 
                onClick={createLoan} 
                disabled={loading || !collateralTransferred} 
                style={{ 
                  flex: 1, 
                  padding: '12px', 
                  background: (!collateralTransferred || loading) ? '#64748b' : '#10b981', 
                  border: 'none', 
                  borderRadius: '6px', 
                  color: 'white', 
                  cursor: (!collateralTransferred || loading) ? 'not-allowed' : 'pointer', 
                  fontWeight: '600',
                  opacity: (!collateralTransferred || loading) ? 0.6 : 1
                }}
                title={!collateralTransferred ? 'Transfer collateral first' : ''}
              >
                2. Create Loan {!collateralTransferred && '🔒'}
              </button>
            </div>
            {!collateralTransferred && (
              <div style={{ 
                marginTop: '8px', 
                padding: '8px 12px', 
                background: 'rgba(59, 130, 246, 0.1)', 
                borderRadius: '4px', 
                fontSize: '12px', 
                color: '#60a5fa',
                textAlign: 'center'
              }}>
                ℹ️ Transfer collateral first, then create loan
              </div>
            )}
            {collateralTransferred && (
              <div style={{ 
                marginTop: '8px', 
                padding: '8px 12px', 
                background: 'rgba(16, 185, 129, 0.1)', 
                borderRadius: '4px', 
                fontSize: '12px', 
                color: '#34d399',
                textAlign: 'center'
              }}>
                ✓ Collateral transferred - ready to create loan
              </div>
            )}
          </div>
        </div>

        {/* Auctions Section Title */}
        <h2 style={{ fontSize: '24px', marginBottom: '16px', color: '#e2e8f0', fontWeight: '600' }}>Auctions</h2>

        {/* Auctions Filter Bar */}
        <div style={{ 
          background: '#1e293b', 
          padding: '12px 24px', 
          borderRadius: '8px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px'
        }}>
          <label style={{ 
            fontSize: '14px', 
            color: '#94a3b8', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            cursor: 'pointer',
            fontWeight: '500'
          }}>
            <input
              type="checkbox"
              checked={showMyAuctionsOnly}
              onChange={(e) => setShowMyAuctionsOnly(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            My Auctions Only
          </label>
          <button 
            onClick={fetchOpenAuctions} 
            disabled={loadingAuctions} 
            style={{ 
              padding: '8px 16px', 
              background: '#475569', 
              border: 'none', 
              borderRadius: '6px', 
              color: 'white', 
              cursor: 'pointer', 
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            {loadingAuctions ? 'Loading...' : 'Refresh Auctions'}
          </button>
        </div>

        <div style={{ display: 'grid', gap: '32px', gridTemplateColumns: '2fr 1fr 1fr', marginBottom: '32px' }}>
          <div style={{ background: '#1e293b', padding: '24px', borderRadius: '8px' }}>
            <div style={{ marginBottom: '16px' }}>
              <h2 style={{ fontSize: '20px' }}>Active Auctions</h2>
            </div>

            {showMyAuctionsOnly && openAuctions.filter(auction => {
              // Filter for active auctions from user's wallet (not ended)
              if (auction.status !== 'auction') return false;
              if (auction.auctionEndBlock && auction.auctionEndBlock > 0 && auction.auctionEndBlock <= currentBlock) return false;
              const userAddress = userData?.profile?.stxAddress?.testnet;
              if (!userAddress || !auction.borrowerAddress) return false;
              return auction.borrowerAddress === userAddress;
            }).length === 0 && (
              <div style={{ 
                padding: '24px', 
                background: 'rgba(59, 130, 246, 0.1)', 
                border: '1px solid rgba(59, 130, 246, 0.3)',
                borderRadius: '8px',
                marginBottom: '16px',
                fontSize: '14px',
                color: '#93c5fd'
              }}>
                <div style={{ marginBottom: '8px', fontWeight: '600' }}>No active auctions from your wallet</div>
                <div style={{ fontSize: '13px', color: '#64748b' }}>
                  Create a new auction using the Borrow section, or check other columns for ended/completed loans.
                </div>
              </div>
            )}

            {openAuctions.filter(a => {
              if (a.status !== 'auction') return false;
              // Exclude ended auctions
              if (a.auctionEndBlock && a.auctionEndBlock > 0 && a.auctionEndBlock <= currentBlock) return false;
              return true;
            }).length > 0 && (
              <div style={{ marginBottom: '24px', maxHeight: '300px', overflowY: 'auto' }}>
                <h3 style={{ fontSize: '16px', marginBottom: '12px', color: '#94a3b8' }}>
                  {showMyAuctionsOnly ? 'My Auctions' : 'Active Auctions'} ({(() => {
                    // Filter for active auctions only (not ended)
                    const activeAuctions = openAuctions.filter(a => {
                      if (a.status !== 'auction') return false;
                      // Exclude ended auctions
                      if (a.auctionEndBlock && a.auctionEndBlock > 0 && a.auctionEndBlock <= currentBlock) return false;
                      return true;
                    });
                    
                    if (!showMyAuctionsOnly) return activeAuctions.length;
                    
                    // Filter by direct address comparison
                    const userAddress = userData?.profile?.stxAddress?.testnet;
                    if (!userAddress) return 0;
                    
                    return activeAuctions.filter(a => a.borrowerAddress === userAddress).length;
                  })()})
                </h3>
                {openAuctions.filter(auction => {
                  // First filter: only show active auctions (not ended)
                  if (auction.status !== 'auction') return false;
                  
                  // Exclude ended auctions (they go in "Ended Auctions" column)
                  if (auction.auctionEndBlock && auction.auctionEndBlock > 0 && auction.auctionEndBlock <= currentBlock) return false;
                  
                  // Second filter: if My Auctions Only is checked, filter by borrower
                  if (!showMyAuctionsOnly) return true;
                  
                  // Filter by direct address comparison
                  const userAddress = userData?.profile?.stxAddress?.testnet;
                  if (!userAddress) return false;
                  
                  return auction.borrowerAddress === userAddress;
                }).map((auction) => {
                  // Calculate time remaining (using BITCOIN blocks)
                  const blocksLeft = auction.auctionEndBlock - currentBlock;
                  const daysLeft = Math.floor(blocksLeft / 144); // ~144 Bitcoin blocks per day
                  const hoursLeft = Math.floor((blocksLeft % 144) / 6); // ~6 Bitcoin blocks per hour
                  const timeRemaining = blocksLeft > 0 
                    ? (daysLeft > 0 ? `${daysLeft}d ${hoursLeft}h` : `${hoursLeft}h`)
                    : 'Ended';
                  
                  return (
                  <div key={auction.id} style={{ background: '#0f172a', padding: '16px', borderRadius: '6px', marginBottom: '12px', border: '1px solid #334155' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'center' }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 'bold', color: '#3b82f6' }}>Loan #{auction.id}</span>
                        <span style={{ 
                          padding: '2px 8px', 
                          borderRadius: '4px', 
                          fontSize: '11px', 
                          fontWeight: '600',
                          background: auction.status === 'auction' ? '#065f46' : auction.status === 'active' ? '#1e40af' : auction.status === 'repaid' ? '#6b7280' : '#991b1b',
                          color: 'white'
                        }}>
                          {auction.status.toUpperCase()}
                        </span>
                        {auction.isAuction && auction.auctionEndBlock > 0 && (
                          <span style={{ 
                            padding: '2px 8px', 
                            borderRadius: '4px', 
                            fontSize: '11px', 
                            fontWeight: '600',
                            background: blocksLeft < 144 ? '#991b1b' : '#854d0e',
                            color: 'white'
                          }}>
                            ⏱️ {timeRemaining}
                          </span>
                        )}
                      </div>
                      {auction.isAuction && (() => {
                        // Don't show bid button if user is the borrower
                        const userAddress = userData?.profile?.stxAddress?.testnet;
                        const isBorrower = auction.borrowerAddress === userAddress;
                        
                        if (isBorrower) return null; // Can't bid on your own auction
                        
                        return (
                          <button onClick={() => selectAuction(auction.id, auction.currentBid || auction.maxRepayment)} style={{ padding: '4px 12px', background: '#3b82f6', border: 'none', borderRadius: '4px', color: 'white', cursor: 'pointer', fontSize: '12px' }}>
                            Bid
                          </button>
                        );
                      })()}
                    </div>
                    <div style={{ fontSize: '14px', color: '#cbd5e1', display: 'grid', gap: '4px' }}>
                      <div>Collateral: <span style={{ color: '#f59e0b' }}>{auction.collateralAmount} BTC</span></div>
                      <div>Requesting: <span style={{ color: '#10b981' }}>{auction.borrowAmount.toLocaleString()} USDT</span></div>
                      <div>Max Repayment: <span style={{ color: '#ef4444' }}>{auction.maxRepayment.toLocaleString()} USDT</span></div>
                      {auction.isAuction && (
                        <div>Current Bid: <span style={{ color: auction.currentBid ? '#3b82f6' : '#64748b' }}>{auction.currentBid ? `${auction.currentBid.toLocaleString()} USDT` : 'No bids yet'}</span></div>
                      )}
                      {formatDuration(auction.loanDuration) && (
                        <div>Duration: <span style={{ color: '#94a3b8' }}>{formatDuration(auction.loanDuration)}</span></div>
                      )}
                    </div>
                  </div>
                  );
                })}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <input value={loanId} onChange={(e) => setLoanId(e.target.value)} placeholder="Loan ID" style={{ padding: '12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#e2e8f0' }} />
              <input value={bidAmount} onChange={(e) => setBidAmount(e.target.value)} placeholder="Bid Amount (USDT)" style={{ padding: '12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#e2e8f0' }} />
              <button onClick={placeBid} disabled={loading} style={{ padding: '12px', background: '#3b82f6', border: 'none', borderRadius: '6px', color: 'white', cursor: 'pointer' }}>
                Place Bid
              </button>
            </div>
          </div>

          <div style={{ background: '#1e293b', padding: '24px', borderRadius: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '20px' }}>Ended Auctions</h2>
              <div style={{ fontSize: '13px', color: '#94a3b8' }}>
                Needs Finalization
              </div>
            </div>

            {(() => {
              // Filter for ended auctions (auction period over but not finalized)
              const endedAuctions = openAuctions.filter(auction => {
                // Must still be in auction status (not finalized)
                if (auction.status !== 'auction') return false;
                
                // Must have ended (auction end block <= current block)
                if (!auction.auctionEndBlock || auction.auctionEndBlock === 0) return false;
                if (auction.auctionEndBlock > currentBlock) return false;
                
                // If My Auctions Only is checked, filter by borrower
                if (showMyAuctionsOnly) {
                  const userAddress = userData?.profile?.stxAddress?.testnet;
                  if (!userAddress) return false;
                  return auction.borrowerAddress === userAddress;
                }
                
                return true;
              });

              if (endedAuctions.length === 0) {
                return (
                  <div style={{ 
                    padding: '24px', 
                    background: '#0f172a', 
                    borderRadius: '8px',
                    textAlign: 'center',
                    color: '#64748b',
                    fontSize: '14px'
                  }}>
                    No auctions waiting for finalization
                  </div>
                );
              }

              return (
                <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                  <h3 style={{ fontSize: '16px', marginBottom: '12px', color: '#94a3b8' }}>
                    {endedAuctions.length} Auction{endedAuctions.length !== 1 ? 's' : ''}
                  </h3>
                  {endedAuctions.map((auction) => {
                    const blocksEnded = currentBlock - auction.auctionEndBlock;
                    const daysEnded = Math.floor(blocksEnded / 144);
                    const hoursEnded = Math.floor((blocksEnded % 144) / 6);
                    const endedTime = blocksEnded > 0 
                      ? (daysEnded > 0 ? `${daysEnded}d ${hoursEnded}h ago` : `${hoursEnded}h ago`)
                      : 'Just ended';
                    
                    return (
                      <div key={auction.id} style={{ background: '#0f172a', padding: '16px', borderRadius: '6px', marginBottom: '12px', border: '1px solid #f59e0b' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'center' }}>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 'bold', color: '#3b82f6' }}>Loan #{auction.id}</span>
                            <span style={{ 
                              padding: '2px 8px', 
                              borderRadius: '4px', 
                              fontSize: '11px', 
                              fontWeight: '600',
                              background: '#854d0e',
                              color: 'white'
                            }}>
                              ⚠️ ENDED
                            </span>
                            <span style={{ 
                              padding: '2px 8px', 
                              borderRadius: '4px', 
                              fontSize: '11px', 
                              fontWeight: '600',
                              background: '#1e293b',
                              color: '#f59e0b'
                            }}>
                              {endedTime}
                            </span>
                          </div>
                        </div>
                        <div style={{ fontSize: '14px', color: '#cbd5e1', display: 'grid', gap: '4px' }}>
                          <div>Collateral: <span style={{ color: '#f59e0b' }}>{auction.collateralAmount} BTC</span></div>
                          <div>Requesting: <span style={{ color: '#10b981' }}>{auction.borrowAmount.toLocaleString()} USDT</span></div>
                          <div>Max Repayment: <span style={{ color: '#ef4444' }}>{auction.maxRepayment.toLocaleString()} USDT</span></div>
                          {auction.currentBid ? (
                            <div>Winning Bid: <span style={{ color: '#3b82f6' }}>{auction.currentBid.toLocaleString()} USDT</span></div>
                          ) : (
                            <div style={{ color: '#64748b' }}>No bids received</div>
                          )}
                          {formatDuration(auction.loanDuration) && (
                            <div>Duration: <span style={{ color: '#94a3b8' }}>{formatDuration(auction.loanDuration)}</span></div>
                          )}
                        </div>
                        <div style={{ 
                          marginTop: '12px', 
                          padding: '8px', 
                          background: 'rgba(245, 158, 11, 0.1)', 
                          borderRadius: '4px',
                          fontSize: '12px',
                          color: '#fbbf24'
                        }}>
                          ⚠️ Auction ended - needs finalization
                        </div>
                        
                        {(() => {
                          // Check if user has authority to finalize
                          const userAddress = userData?.profile?.stxAddress?.testnet;
                          if (!userAddress) return null;
                          
                          const isBorrower = auction.borrowerAddress === userAddress;
                          const isWinningBidder = auction.bidderAddress === userAddress;
                          const canFinalize = isBorrower || isWinningBidder;
                          
                          if (!canFinalize) return null;
                          
                          return (
                            <button 
                              onClick={() => finalizeAuction(auction.id)}
                              disabled={loading}
                              style={{ 
                                width: '100%',
                                marginTop: '12px',
                                padding: '12px', 
                                background: '#10b981', 
                                border: 'none', 
                                borderRadius: '6px', 
                                color: 'white', 
                                cursor: 'pointer',
                                fontWeight: '600'
                              }}
                            >
                              Finalize Auction #{auction.id}
                            </button>
                          );
                        })()}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          <div style={{ background: '#1e293b', padding: '24px', borderRadius: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '20px' }}>Failed Auctions</h2>
              <div style={{ fontSize: '13px', color: '#94a3b8' }}>
                Defaulted
              </div>
            </div>

            {(() => {
              // Filter for failed loans only
              const failedAuctions = openAuctions.filter(loan => {
                if (!showMyAuctionsOnly) {
                  return loan.status === 'failed';
                }
                const userAddress = userData?.profile?.stxAddress?.testnet;
                if (!userAddress) return false;
                return loan.status === 'failed' && loan.borrowerAddress === userAddress;
              });

              if (failedAuctions.length === 0) {
                return (
                  <div style={{ padding: '24px', background: '#0f172a', borderRadius: '8px', textAlign: 'center', color: '#64748b', fontSize: '14px' }}>
                    No failed loans
                  </div>
                );
              }

              return (
                <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                  <h3 style={{ fontSize: '16px', marginBottom: '12px', color: '#94a3b8' }}>
                    {failedAuctions.length} Loan{failedAuctions.length !== 1 ? 's' : ''}
                  </h3>
                  {failedAuctions.map((loan) => (
                    <div key={loan.id} style={{ background: '#0f172a', padding: '16px', borderRadius: '6px', marginBottom: '12px', border: '1px solid #991b1b' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 'bold', color: '#3b82f6' }}>Loan #{loan.id}</span>
                          <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '600', background: '#991b1b', color: 'white' }}>
                            DEFAULTED
                          </span>
                        </div>
                      </div>
                      <div style={{ fontSize: '14px', color: '#cbd5e1', display: 'grid', gap: '4px' }}>
                        <div>Collateral: <span style={{ color: '#f59e0b' }}>{loan.collateralAmount} BTC</span></div>
                        <div>Borrowed: <span style={{ color: '#10b981' }}>{loan.borrowAmount.toLocaleString()} USDT</span></div>
                        <div>Repayment: <span style={{ color: '#ef4444' }}>{loan.maxRepayment.toLocaleString()} USDT</span></div>
                        {loan.currentBid && (
                          <div>Final Rate: <span style={{ color: '#3b82f6' }}>{loan.currentBid.toLocaleString()} USDT</span></div>
                        )}
                        {formatDuration(loan.loanDuration) && (
                          <div>Duration: <span style={{ color: '#94a3b8' }}>{formatDuration(loan.loanDuration)}</span></div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>

        {/* Loans Section Title */}
        <h2 style={{ fontSize: '24px', marginBottom: '16px', color: '#e2e8f0', fontWeight: '600' }}>Loans</h2>

        {/* Loans Filter Bar */}
        <div style={{ 
          background: '#1e293b', 
          padding: '12px 24px', 
          borderRadius: '8px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px'
        }}>
          <label style={{ 
            fontSize: '14px', 
            color: '#94a3b8', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            cursor: 'pointer',
            fontWeight: '500'
          }}>
            <input
              type="checkbox"
              checked={showMyLoansOnly}
              onChange={(e) => setShowMyLoansOnly(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            My Loans Only
          </label>
          <button 
            onClick={fetchOpenAuctions} 
            disabled={loadingAuctions} 
            style={{ 
              padding: '8px 16px', 
              background: '#475569', 
              border: 'none', 
              borderRadius: '6px', 
              color: 'white', 
              cursor: 'pointer', 
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            {loadingAuctions ? 'Loading...' : 'Refresh Loans'}
          </button>
        </div>

        <div style={{ display: 'grid', gap: '32px', gridTemplateColumns: '1fr 1fr' }}>
          <div style={{ background: '#1e293b', padding: '24px', borderRadius: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '20px' }}>Active Loans</h2>
              <div style={{ fontSize: '13px', color: '#94a3b8' }}>
                Currently Active
              </div>
            </div>

            {(() => {
              // Filter for active loans only
              const activeLoans = openAuctions.filter(loan => {
                if (!showMyLoansOnly) {
                  return loan.status === 'active'; // Show all active loans
                }
                
                // If My Loans Only is checked, also filter by borrower
                const userAddress = userData?.profile?.stxAddress?.testnet;
                if (!userAddress) return false;
                return loan.status === 'active' && loan.borrowerAddress === userAddress;
              });

              if (activeLoans.length === 0) {
                return (
                  <div style={{ 
                    padding: '24px', 
                    background: '#0f172a', 
                    borderRadius: '8px',
                    textAlign: 'center',
                    color: '#64748b',
                    fontSize: '14px'
                  }}>
                    No active loans yet
                  </div>
                );
              }

              return (
                <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                  <h3 style={{ fontSize: '16px', marginBottom: '12px', color: '#94a3b8' }}>
                    {activeLoans.length} Loan{activeLoans.length !== 1 ? 's' : ''}
                  </h3>
                  {activeLoans.map((loan) => {
                    // Calculate time remaining until maturity
                    let timeDisplay = '';
                    let timeColor = '#1e40af';
                    if (loan.maturityBlock > 0) {
                      const blocksLeft = loan.maturityBlock - currentBlock;
                      if (blocksLeft > 0) {
                        const daysLeft = Math.floor(blocksLeft / 144);
                        const hoursLeft = Math.floor((blocksLeft % 144) / 6);
                        timeDisplay = daysLeft > 0 ? `${daysLeft}d ${hoursLeft}h` : `${hoursLeft}h`;
                        timeColor = blocksLeft < 144 ? '#991b1b' : blocksLeft < 1440 ? '#854d0e' : '#1e40af';
                      } else {
                        timeDisplay = 'Overdue';
                        timeColor = '#991b1b';
                      }
                    }

                    return (
                    <div key={loan.id} style={{ background: '#0f172a', padding: '16px', borderRadius: '6px', marginBottom: '12px', border: '1px solid #1e40af' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 'bold', color: '#3b82f6' }}>Loan #{loan.id}</span>
                          <span style={{ 
                            padding: '2px 8px', 
                            borderRadius: '4px', 
                            fontSize: '11px', 
                            fontWeight: '600',
                            background: '#1e40af',
                            color: 'white'
                          }}>
                            ACTIVE
                          </span>
                          {timeDisplay && (
                            <span style={{ 
                              padding: '2px 8px', 
                              borderRadius: '4px', 
                              fontSize: '11px', 
                              fontWeight: '600',
                              background: timeColor,
                              color: 'white'
                            }}>
                              ⏱️ {timeDisplay}
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={{ fontSize: '14px', color: '#cbd5e1', display: 'grid', gap: '4px' }}>
                        <div>Collateral: <span style={{ color: '#f59e0b' }}>{loan.collateralAmount} BTC</span></div>
                        <div>Borrowed: <span style={{ color: '#10b981' }}>{loan.borrowAmount.toLocaleString()} USDT</span></div>
                        <div>Repayment: <span style={{ color: '#ef4444' }}>{loan.maxRepayment.toLocaleString()} USDT</span></div>
                        {loan.currentBid && (
                          <div>Final Rate: <span style={{ color: '#3b82f6' }}>{loan.currentBid.toLocaleString()} USDT</span></div>
                        )}
                        {formatDuration(loan.loanDuration) && (
                          <div>Duration: <span style={{ color: '#94a3b8' }}>{formatDuration(loan.loanDuration)}</span></div>
                        )}
                      </div>
                    </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          <div style={{ background: '#1e293b', padding: '24px', borderRadius: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '20px' }}>Completed Loans</h2>
              <div style={{ fontSize: '13px', color: '#94a3b8' }}>
                Repaid
              </div>
            </div>

            {(() => {
              // Filter for repaid loans only
              const completedLoans = openAuctions.filter(loan => {
                if (!showMyLoansOnly) {
                  return loan.status === 'repaid'; // Show all repaid loans
                }
                
                // If My Loans Only is checked, also filter by borrower
                const userAddress = userData?.profile?.stxAddress?.testnet;
                if (!userAddress) return false;
                return loan.status === 'repaid' && loan.borrowerAddress === userAddress;
              });

              if (completedLoans.length === 0) {
                return (
                  <div style={{ 
                    padding: '24px', 
                    background: '#0f172a', 
                    borderRadius: '8px',
                    textAlign: 'center',
                    color: '#64748b',
                    fontSize: '14px'
                  }}>
                    No completed loans yet
                  </div>
                );
              }

              return (
                <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                  <h3 style={{ fontSize: '16px', marginBottom: '12px', color: '#94a3b8' }}>
                    {completedLoans.length} Loan{completedLoans.length !== 1 ? 's' : ''}
                  </h3>
                  {completedLoans.map((loan) => (
                    <div key={loan.id} style={{ background: '#0f172a', padding: '16px', borderRadius: '6px', marginBottom: '12px', border: '1px solid #059669' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 'bold', color: '#3b82f6' }}>Loan #{loan.id}</span>
                          <span style={{ 
                            padding: '2px 8px', 
                            borderRadius: '4px', 
                            fontSize: '11px', 
                            fontWeight: '600',
                            background: '#059669',
                            color: 'white'
                          }}>
                            REPAID
                          </span>
                        </div>
                      </div>
                      <div style={{ fontSize: '14px', color: '#cbd5e1', display: 'grid', gap: '4px' }}>
                        <div>Collateral: <span style={{ color: '#f59e0b' }}>{loan.collateralAmount} BTC</span></div>
                        <div>Borrowed: <span style={{ color: '#10b981' }}>{loan.borrowAmount.toLocaleString()} USDT</span></div>
                        <div>Repayment: <span style={{ color: '#ef4444' }}>{loan.maxRepayment.toLocaleString()} USDT</span></div>
                        {loan.currentBid && (
                          <div>Final Rate: <span style={{ color: '#3b82f6' }}>{loan.currentBid.toLocaleString()} USDT</span></div>
                        )}
                        {formatDuration(loan.loanDuration) && (
                          <div>Duration: <span style={{ color: '#94a3b8' }}>{formatDuration(loan.loanDuration)}</span></div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
