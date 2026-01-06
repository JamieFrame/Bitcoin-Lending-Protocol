import { useState, useEffect, useRef } from 'react';
import { AppConfig, UserSession, showConnect, openContractCall } from '@stacks/connect';
import { StacksTestnet } from '@stacks/network';
import { 
  uintCV, 
  stringAsciiCV,
  standardPrincipalCV, 
  contractPrincipalCV,
  noneCV,
  someCV,
  trueCV,
  PostConditionMode,
  FungibleConditionCode,
  makeStandardFungiblePostCondition,
  createAssetInfo,
  cvToValue,
  hexToCV
} from '@stacks/transactions';
import { c32address, c32addressDecode } from 'c32check';

// Configuration - UPDATE YOUR CONTRACT ADDRESS!
const CONFIG = {
  CONTRACT_ADDRESS: 'ST2BKV3K4DQQS6GMFJYT1MY4TQS228190RCSHAGN3',
  LOAN_PROTOCOL: 'loan-protocol-v35',  // UPDATED TO V27 - USES ALLOW MODE!
  MARKETPLACE: 'marketplace-contract-v1',  // NEW: Marketplace contract for trading positions
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
  const [loanId, setLoanId] = useState('');
  const [bidAmount, setBidAmount] = useState('');
  const [collateralAsset, setCollateralAsset] = useState('BTC'); // NEW v35: 'BTC' or 'USDT'
  
  // Auction state
  const [openAuctions, setOpenAuctions] = useState([]);
  const [loadingAuctions, setLoadingAuctions] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [currentBlock, setCurrentBlock] = useState(0);
  const [showMyAuctionsOnly, setShowMyAuctionsOnly] = useState(false);
  const [showMyWinningBidsOnly, setShowMyWinningBidsOnly] = useState(false);
  const [showMyLoansOnly, setShowMyLoansOnly] = useState(false);
  const [collateralTransferred, setCollateralTransferred] = useState(false);
  
  // Table sorting state
  const [auctionSortKey, setAuctionSortKey] = useState('id');
  const [auctionSortDirection, setAuctionSortDirection] = useState('desc');
  const [loanSortKey, setLoanSortKey] = useState('id');
  const [loanSortDirection, setLoanSortDirection] = useState('desc');
  
  // Marketplace state
  const [marketplaceTab, setMarketplaceTab] = useState('myPositions'); // 'myPositions', 'browseMarket', 'myOffers'
  const [showListModal, setShowListModal] = useState(false);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [showViewOffersModal, setShowViewOffersModal] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState(null);
  const [listingPrice, setListingPrice] = useState('');
  const [offerAmount, setOfferAmount] = useState('');
  const [marketplaceSortKey, setMarketplaceSortKey] = useState('id');
  const [marketplaceSortDirection, setMarketplaceSortDirection] = useState('desc');
  const [myPositionsNFT, setMyPositionsNFT] = useState([]); // NFT-based positions
  const [loadingMyPositions, setLoadingMyPositions] = useState(false);
  
  // Real marketplace data from contract (V27 - integrated with marketplace-contract-v1)
  const [listedPositions, setListedPositions] = useState([]);
  const [myOffers, setMyOffers] = useState([]);
  const [loadingMarketplace, setLoadingMarketplace] = useState(false);
  
  // Ref to prevent concurrent position loading
  const loadingPositionsRef = useRef(false);

  useEffect(() => {
    if (userSession.isUserSignedIn()) {
      setUserData(userSession.loadUserData());
    }
  }, []);

  useEffect(() => {
    if (userData) {
      fetchOpenAuctions();
      fetchMarketplaceData(); // NEW: Fetch marketplace data on load
    }
  }, [userData]);

  // NEW: Properly load My Positions when tab is active
  useEffect(() => {
    const loadMyPositions = async () => {
      const userAddress = userData?.profile?.stxAddress?.testnet;
      
      // Only load when on myPositions tab and user is connected
      if (marketplaceTab !== 'myPositions' || !userAddress) {
        return;
      }
      
      // Prevent concurrent loading using ref
      if (loadingPositionsRef.current) {
        console.log('⏭️ Skipping load - already in progress');
        return;
      }
      
      // Don't load if we have no auctions yet
      if (openAuctions.length === 0) {
        console.log('⏭️ Skipping load - no auctions available yet');
        return;
      }
      
      loadingPositionsRef.current = true;
      setLoadingMyPositions(true);
      console.log('👥 Checking NFT ownership for all loans...');
      console.log(`📊 User address: ${userAddress}`);
      console.log(`📊 Total loans to check: ${openAuctions.length}`);
      console.log(`📊 Loan statuses:`, openAuctions.map(l => `#${l.id}:${l.status}`));
      
      // IMPORTANT: Only check ACTIVE loans for My Positions
      // Auctions aren't tradeable yet (no finalized ownership)
      // Skip failed, repaid, and defaulted loans (NFTs are burned)
      const activeLoans = openAuctions.filter(loan => 
        loan.status === 'active'
      );
      
      console.log(`📊 Filtering to ${activeLoans.length} active loans (skipping ${openAuctions.length - activeLoans.length} non-active loans)`);
      console.log(`   Skipped statuses:`, openAuctions.filter(l => l.status !== 'active').map(l => `#${l.id}:${l.status}`));
      
      const positions = [];
      
      // Check loans sequentially with small delay to avoid rate limiting
      for (let i = 0; i < activeLoans.length; i++) {
        const loan = activeLoans[i];
        try {
          console.log(`🔍 Checking loan #${loan.id} (${i+1}/${activeLoans.length}) - status: ${loan.status}`);
          console.log(`   Borrower address: ${loan.borrowerAddress}`);
          console.log(`   Lender address: ${loan.lenderAddress || 'none'}`);
          console.log(`   User address: ${userAddress}`);
          console.log(`   Match borrower? ${loan.borrowerAddress === userAddress}`);
          console.log(`   Match lender? ${loan.lenderAddress === userAddress}`);
          
          const [ownsBorrower, ownsLender] = await Promise.all([
            checkNFTOwnership(loan.id, userAddress, 'borrower'),
            checkNFTOwnership(loan.id, userAddress, 'lender')
          ]);
          
          console.log(`📋 Loan #${loan.id} - Borrower NFT: ${ownsBorrower}, Lender NFT: ${ownsLender}`);
          
          // If address matches but NFT check returns false, there might be an API/contract issue
          // Add it anyway with a warning
          const addressMatchesBorrower = loan.borrowerAddress === userAddress;
          const addressMatchesLender = loan.lenderAddress === userAddress;
          
          if (ownsBorrower || ownsLender) {
            console.log(`✅ Adding loan #${loan.id} to positions (NFT ownership confirmed)`);
            positions.push({
              ...loan,
              userOwnsBorrowerNFT: ownsBorrower,
              userOwnsLenderNFT: ownsLender
            });
          } else if (addressMatchesBorrower || addressMatchesLender) {
            console.log(`⚠️ Address matches but NFT check failed for loan #${loan.id} - adding anyway`);
            console.log(`   This might indicate an NFT minting issue or API problem`);
            positions.push({
              ...loan,
              userOwnsBorrowerNFT: addressMatchesBorrower,
              userOwnsLenderNFT: addressMatchesLender,
              nftCheckFailed: true // Flag for debugging
            });
          }
          
          // Small delay between checks to avoid rate limiting (except for last loan)
          if (i < activeLoans.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 200)); // 200ms delay
          }
        } catch (error) {
          console.error(`Error checking loan ${loan.id}:`, error);
        }
      }
      
      setMyPositionsNFT(positions);
      setLoadingMyPositions(false);
      loadingPositionsRef.current = false;
      console.log(`✅ Found ${positions.length} total positions (checked ${activeLoans.length} loans)`);
      if (positions.length === 0) {
        console.log(`⚠️ No positions found! User address: ${userAddress}`);
        console.log(`⚠️ Borrowers in active loans:`, activeLoans.map(l => `#${l.id}:${l.borrowerAddress}`));
        console.log(`⚠️ Lenders in active loans:`, activeLoans.map(l => `#${l.id}:${l.lenderAddress || 'none'}`));
      }
    };
    
    loadMyPositions();
  }, [marketplaceTab, userData?.profile?.stxAddress?.testnet, openAuctions.length]);

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
    if (!userData) {
      showMessage('Please connect wallet first', 'error');
      return;
    }

    // Basic validation
    if (!collateralAmount || !requestedAmount || !maxRepayment || !duration || !auctionDuration) {
      showMessage('Please fill in all fields', 'error');
      return;
    }

    setLoading(true);
    try {
      // v35: Calculate amounts based on asset decimals
      const collateralAmountMicrounits = collateralAsset === 'BTC' 
        ? Math.floor(parseFloat(collateralAmount) * 100000000) // BTC: 8 decimals
        : Math.floor(parseFloat(collateralAmount) * 1000000);   // USDT: 6 decimals
      
      const borrowAmountMicrounits = collateralAsset === 'BTC'
        ? Math.floor(parseFloat(requestedAmount) * 1000000)     // Borrowing USDT: 6 decimals
        : Math.floor(parseFloat(requestedAmount) * 100000000);  // Borrowing BTC: 8 decimals
      
      const maxRepaymentMicrounits = collateralAsset === 'BTC'
        ? Math.floor(parseFloat(maxRepayment) * 1000000)
        : Math.floor(parseFloat(maxRepayment) * 100000000);
      
      const durationBlocks = parseInt(duration) * 144;
      const auctionBlocks = parseInt(auctionDuration) * 144;

      // v35: Choose the correct function based on collateral asset
      const functionName = collateralAsset === 'BTC' 
        ? 'create-loan-auction'           // BTC collateral (original)
        : 'create-loan-auction-usdt';     // USDT collateral (v35)
      
      const functionArgs = collateralAsset === 'BTC' ? [
        stringAsciiCV(collateralAsset),
        uintCV(collateralAmountMicrounits),
        stringAsciiCV('USDT'),
        uintCV(borrowAmountMicrounits),
        uintCV(maxRepaymentMicrounits),
        uintCV(durationBlocks),
        uintCV(auctionBlocks)
      ] : [
        // USDT collateral function has simpler signature
        uintCV(collateralAmountMicrounits),
        uintCV(borrowAmountMicrounits),
        uintCV(maxRepaymentMicrounits),
        uintCV(durationBlocks),
        uintCV(auctionBlocks)
      ];

      await openContractCall({
        network: CONFIG.NETWORK,
        contractAddress: CONFIG.CONTRACT_ADDRESS,
        contractName: CONFIG.LOAN_PROTOCOL,
        functionName: functionName,
        functionArgs: functionArgs,
        postConditionMode: PostConditionMode.Allow,
        onFinish: (data) => {
          console.log('Transaction:', data);
          showMessage('Loan created successfully! Waiting for confirmation...', 'success');
          setCollateralAmount('');
          setRequestedAmount('');
          setMaxRepayment('');
          setDuration('');
          setAuctionDuration('');
          setTimeout(() => fetchOpenAuctions(), 3000);
        },
        onCancel: () => {
          showMessage('Transaction cancelled', 'error');
        }
      });
    } catch (error) {
      console.error('Error creating loan:', error);
      showMessage(`Error: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const placeBid = async () => {
    if (!userData) {
      showMessage('Please connect wallet first', 'error');
      return;
    }

    if (!loanId || !bidAmount) {
      showMessage('Please fill in loan ID and bid amount', 'error');
      return;
    }

    setLoading(true);
    try {
      // v35: Find the auction to determine asset types
      const auction = openAuctions.find(a => a.id === parseInt(loanId));
      if (!auction) {
        showMessage('Loan not found', 'error');
        setLoading(false);
        return;
      }

      // v35: Determine which asset we're bidding with
      const borrowAsset = auction.borrowAsset || 'USDT';
      const isBorrowingBTC = borrowAsset === 'BTC';
      
      const bidAmountMicrounits = isBorrowingBTC
        ? Math.floor(parseFloat(bidAmount) * 100000000)  // BTC: 8 decimals
        : Math.floor(parseFloat(bidAmount) * 1000000);   // USDT: 6 decimals

      // v35: Choose correct function
      const functionName = isBorrowingBTC ? 'place-bid-btc' : 'place-bid';

      console.log(`Placing ${borrowAsset} bid using ${functionName}`);

      await openContractCall({
        network: CONFIG.NETWORK,
        contractAddress: CONFIG.CONTRACT_ADDRESS,
        contractName: CONFIG.LOAN_PROTOCOL,
        functionName: functionName,
        functionArgs: [
          uintCV(parseInt(loanId)),
          uintCV(bidAmountMicrounits)
        ],
        postConditionMode: PostConditionMode.Allow,
        onFinish: (data) => {
          console.log('Transaction:', data);
          showMessage('Bid placed successfully!', 'success');
          setBidAmount('');
          setLoanId('');
          setTimeout(() => fetchOpenAuctions(), 3000);
        },
        onCancel: () => {
          showMessage('Transaction cancelled', 'error');
        }
      });
    } catch (error) {
      console.error('Error placing bid:', error);
      showMessage(`Error: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const finalizeAuction = async (auctionId) => {
    if (!userData) {
      showMessage('Please connect wallet first', 'error');
      return;
    }

    setLoading(true);
    try {
      // v35: Find auction to determine collateral type
      const auction = openAuctions.find(a => a.id === auctionId);
      const collateralAsset = auction?.collateralAsset || 'BTC';
      
      // v35: Choose correct function
      const functionName = collateralAsset === 'USDT' 
        ? 'finalize-auction-usdt' 
        : 'finalize-auction';

      console.log(`Finalizing ${collateralAsset} collateral auction using ${functionName}`);

      await openContractCall({
        network: CONFIG.NETWORK,
        contractAddress: CONFIG.CONTRACT_ADDRESS,
        contractName: CONFIG.LOAN_PROTOCOL,
        functionName: functionName,
        functionArgs: [uintCV(auctionId)],
        postConditionMode: PostConditionMode.Allow,
        onFinish: (data) => {
          console.log('Transaction:', data);
          showMessage('Auction finalized successfully!', 'success');
          setTimeout(() => fetchOpenAuctions(), 3000);
        },
        onCancel: () => {
          showMessage('Transaction cancelled', 'error');
        }
      });
    } catch (error) {
      console.error('Error finalizing auction:', error);
      showMessage(`Error: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const repayLoan = async (loanId) => {
    if (!userData) {
      showMessage('Please connect wallet first', 'error');
      return;
    }

    setLoading(true);
    try {
      // v35: Find loan to determine collateral type
      const loan = openAuctions.find(a => a.id === loanId);
      const collateralAsset = loan?.collateralAsset || 'BTC';
      
      // v35: Choose correct function
      const functionName = collateralAsset === 'USDT'
        ? 'repay-loan-usdt'
        : 'repay-loan';

      console.log(`Repaying ${collateralAsset} collateral loan using ${functionName}`);

      await openContractCall({
        network: CONFIG.NETWORK,
        contractAddress: CONFIG.CONTRACT_ADDRESS,
        contractName: CONFIG.LOAN_PROTOCOL,
        functionName: functionName,
        functionArgs: [uintCV(loanId)],
        postConditionMode: PostConditionMode.Allow,
        onFinish: (data) => {
          console.log('Transaction:', data);
          showMessage('Loan repaid successfully!', 'success');
          setTimeout(() => fetchOpenAuctions(), 3000);
        },
        onCancel: () => {
          showMessage('Transaction cancelled', 'error');
        }
      });
    } catch (error) {
      console.error('Error repaying loan:', error);
      showMessage(`Error: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const claimCollateral = async (loanId) => {
    if (!userData) {
      showMessage('Please connect wallet first', 'error');
      return;
    }

    setLoading(true);
    try {
      // v35: Find loan to determine collateral type
      const loan = openAuctions.find(a => a.id === loanId);
      const collateralAsset = loan?.collateralAsset || 'BTC';
      
      // v35: Choose correct function
      const functionName = collateralAsset === 'USDT'
        ? 'claim-collateral-usdt'
        : 'claim-collateral';

      console.log(`Claiming ${collateralAsset} collateral using ${functionName}`);

      await openContractCall({
        network: CONFIG.NETWORK,
        contractAddress: CONFIG.CONTRACT_ADDRESS,
        contractName: CONFIG.LOAN_PROTOCOL,
        functionName: functionName,
        functionArgs: [uintCV(loanId)],
        postConditionMode: PostConditionMode.Allow,
        onFinish: (data) => {
          console.log('Transaction:', data);
          showMessage('Collateral claimed successfully!', 'success');
          setTimeout(() => fetchOpenAuctions(), 3000);
        },
        onCancel: () => {
          showMessage('Transaction cancelled', 'error');
        }
      });
    } catch (error) {
      console.error('Error claiming collateral:', error);
      showMessage(`Error: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };


  // Helper: Check if an address owns a borrower or lender NFT for a loan
  const checkNFTOwnership = async (loanId, userAddress, nftType) => {
    // Helper: Fetch with retry on rate limit
    const fetchWithRetry = async (url, options, retries = 3) => {
      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          const response = await fetch(url, options);
          
          // If rate limited, wait and retry
          if (response.status === 429) {
            const waitTime = Math.pow(2, attempt) * 1000; // Exponential backoff
            console.log(`⏳ Rate limited on ${nftType} check for loan ${loanId}, waiting ${waitTime/1000}s (attempt ${attempt}/${retries})`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          }
          
          return response;
        } catch (error) {
          if (attempt === retries) throw error;
          const waitTime = 1000 * attempt;
          console.log(`⏳ Fetch failed for loan ${loanId}, retrying in ${waitTime/1000}s...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
      throw new Error('Max retries exceeded');
    };
    
    try {
      // Use is-borrower-owner or is-lender-owner function
      const functionName = nftType === 'borrower' ? 'is-borrower-owner' : 'is-lender-owner';
      
      console.log(`🔍 Checking ${nftType} NFT for loan #${loanId}, user: ${userAddress}`);
      
      // Convert loan ID to hex format
      const loanIdHex = '0x01' + loanId.toString(16).padStart(32, '0');
      
      // For principal, we need to decode the c32 address
      // ST addresses: version 26 (0x1a) for testnet
      // Extract the hash160 from the address
      try {
        // Decode c32 address to get version and hash
        const decoded = c32addressDecode(userAddress);
        const version = decoded[0];
        const hash = decoded[1];
        
        // Standard principal: 0x05 + version byte (1) + hash (20 bytes)
        const principalHex = '0x05' + version.toString(16).padStart(2, '0') + hash;
        
        console.log(`📝 Calling ${functionName} with loanId: ${loanIdHex}, principal: ${principalHex}`);
        
        const response = await fetchWithRetry(
          `${CONFIG.NETWORK.coreApiUrl}/v2/contracts/call-read/${CONFIG.CONTRACT_ADDRESS}/${CONFIG.LOAN_PROTOCOL}/${functionName}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sender: CONFIG.CONTRACT_ADDRESS,
              arguments: [loanIdHex, principalHex]
            })
          }
        );
        
        if (!response.ok) {
          console.warn(`❌ Failed to check ${nftType} ownership for loan ${loanId}: ${response.status}`);
          const errorText = await response.text();
          console.warn(`❌ Error response: ${errorText}`);
          return false;
        }
        
        const result = await response.json();
        console.log(`📊 Raw API response for loan #${loanId} ${nftType}:`, result);
        
        // Parse boolean response
        const resultStr = result.result || result.repr || '';
        const isOwner = resultStr.includes('true');
        
        console.log(`${isOwner ? '✅' : '❌'} Loan #${loanId}: User ${isOwner ? 'OWNS' : 'does not own'} ${nftType} NFT (result: ${resultStr})`);
        
        return isOwner;
      } catch (decodeError) {
        console.error(`❌ Error decoding address ${userAddress}:`, decodeError);
        return false;
      }
    } catch (error) {
      console.error(`❌ Error checking ${nftType} ownership for loan ${loanId}:`, error);
      return false;
    }
  };

  const fetchBidCount = async (loanId) => {
    try {
      // Convert loan ID to hex format: 0x01 (uint type) + 32 bytes
      const loanIdHex = '0x01' + loanId.toString(16).padStart(32, '0');
      
      const response = await fetch(
        `${CONFIG.NETWORK.coreApiUrl}/v2/contracts/call-read/${CONFIG.CONTRACT_ADDRESS}/${CONFIG.LOAN_PROTOCOL}/get-bid-count`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sender: CONFIG.CONTRACT_ADDRESS,
            arguments: [loanIdHex]
          })
        }
      );
      
      if (response.ok) {
        const result = await response.json();
        console.log(`🔍 Raw bid count response for loan ${loanId}:`, result);
        console.log(`📝 Result string: "${result.result}"`);
        
        // Parse the response - it comes as hex: 0x0701...002 (ok u2)
        // Format: 0x07 (ok type) + 0x01 (uint type) + value in hex
        const resultHex = result.result;
        
        if (resultHex && resultHex.startsWith('0x07')) {
          // Skip 0x07 (ok type) and 0x01 (uint type) = first 4 characters after 0x
          // Then parse the remaining hex as the uint value
          const valueHex = resultHex.slice(4); // Remove '0x07'
          if (valueHex.startsWith('01')) {
            // It's a uint, remove the '01' type indicator
            const actualValue = valueHex.slice(2);
            const bidCount = parseInt(actualValue, 16);
            console.log(`✅ Parsed bid count from hex: ${bidCount}`);
            return bidCount;
          }
        }
        
        // Fallback: try to match u(\d+) format if it's a string
        const match = resultHex.match(/u(\d+)/);
        const bidCount = match ? parseInt(match[1]) : 0;
        console.log(`✅ Parsed bid count (fallback): ${bidCount}`);
        return bidCount;
      }
      console.error(`❌ Response not ok for loan ${loanId}:`, response.status);
      return 0;
    } catch (error) {
      console.error(`❌ Error fetching bid count for loan ${loanId}:`, error);
      return 0;
    }
  };

  const fetchOpenAuctions = async () => {
    setLoadingAuctions(true);
    
    // Helper: Fetch with retry on rate limit
    const fetchWithRetry = async (url, options, retries = 3) => {
      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          const response = await fetch(url, options);
          
          // If rate limited, wait and retry
          if (response.status === 429) {
            const waitTime = Math.pow(2, attempt) * 1000;
            console.log(`Rate limited, waiting ${waitTime/1000}s before retry ${attempt}/${retries}`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          }
          
          return response;
        } catch (error) {
          if (attempt === retries) throw error;
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
      throw new Error('Max retries exceeded');
    };
    
    try {
      // Fetch current BITCOIN block height
      const infoResponse = await fetchWithRetry(`${CONFIG.NETWORK.coreApiUrl}/v2/info`);
      if (infoResponse.ok) {
        const infoData = await infoResponse.json();
        setCurrentBlock(infoData.burn_block_height || 0);
        console.log('Current Bitcoin block:', infoData.burn_block_height);
      }
      
      // Check if contract is initialized
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
      if (!initResult.result || initResult.result === '0x04') {
        showMessage('Contract not initialized! Click "1. Initialize Contract"', 'error');
        setLoadingAuctions(false);
        return;
      }

      // Get total loan count
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
        if (hexResult.startsWith('0x01')) {
          const hexValue = hexResult.slice(4);
          return parseInt(hexValue, 16);
        }
        return parseInt(hexResult.replace('u', ''));
      })();
      
      if (totalLoans === 0) {
        showMessage('No loans created yet! Create one first.', 'info');
        setOpenAuctions([]);
        setLoadingAuctions(false);
        return;
      }
      
      const auctions = [];
      
      // ============================================================
      // OPTIMIZED: PARALLEL BATCH LOADING (5-10x FASTER!)
      // ============================================================
      
      const BATCH_SIZE = 10; // Fetch 10 loans simultaneously per batch
      const batches = [];
      
      for (let i = 0; i < totalLoans; i += BATCH_SIZE) {
        batches.push({ start: i + 1, end: Math.min(i + BATCH_SIZE, totalLoans) });
      }
      
      console.log(`🚀 Optimized loading: Fetching ${totalLoans} loans in ${batches.length} parallel batches...`);
      let successCount = 0;
      let failCount = 0;
      
      // Process batches sequentially, but fetch within each batch in parallel
      for (const batch of batches) {
        const batchPromises = [];
        
        // Create fetch promise for each loan in this batch
        for (let i = batch.start; i <= batch.end; i++) {
          batchPromises.push(
            (async (loanId) => {
              try {
                // Fetch loan data
                const loanResponse = await fetchWithRetry(
                  `${CONFIG.NETWORK.coreApiUrl}/v2/contracts/call-read/${CONFIG.CONTRACT_ADDRESS}/${CONFIG.LOAN_PROTOCOL}/get-loan`,
                  {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      sender: CONFIG.CONTRACT_ADDRESS,
                      arguments: [`0x01${loanId.toString(16).padStart(32, '0')}`]
                    })
                  }
                );
              
                if (!loanResponse.ok) {
                  failCount++;
                  return null;
                }
                
                const loanResult = await loanResponse.json();
                if (!loanResult.result || loanResult.result === '(none)' || loanResult.result === '0x09') {
                  return null;
                }
                
                const loanData = loanResult.result;
                
                // Parse helpers
                const findUint = (fieldName) => {
                  let fieldHex = '';
                  for (let i = 0; i < fieldName.length; i++) {
                    fieldHex += fieldName.charCodeAt(i).toString(16).padStart(2, '0');
                  }
                  const lenHex = fieldName.length.toString(16).padStart(2, '0');
                  const pattern = new RegExp(lenHex + fieldHex + '01([0-9a-f]{32})', 'i');
                  const match = loanData.match(pattern);
                  return match ? parseInt(match[1], 16) : 0;
                };
                
                const findPrincipal = (fieldName) => {
                  let fieldHex = '';
                  for (let j = 0; j < fieldName.length; j++) {
                    fieldHex += fieldName.charCodeAt(j).toString(16).padStart(2, '0');
                  }
                  const lenHex = fieldName.length.toString(16).padStart(2, '0');
                  const pattern = new RegExp(lenHex + fieldHex + '05([0-9a-f]{42})', 'i');
                  const match = loanData.match(pattern);
                  
                  if (match) {
                    const principalHex = match[1];
                    const version = parseInt(principalHex.slice(0, 2), 16);
                    const hash = principalHex.slice(2);
                    try {
                      return c32address(version, hash);
                    } catch (err) {
                      return null;
                    }
                  }
                  return null;
                };

                const findOptionalPrincipal = (fieldName) => {
                  let fieldHex = '';
                  for (let j = 0; j < fieldName.length; j++) {
                    fieldHex += fieldName.charCodeAt(j).toString(16).padStart(2, '0');
                  }
                  const lenHex = fieldName.length.toString(16).padStart(2, '0');
                  
                  // Check for (none) - 0x09
                  const nonePattern = new RegExp(lenHex + fieldHex + '09', 'i');
                  if (loanData.match(nonePattern)) {
                    return null;
                  }
                  
                  // Check for (some principal) - 0x0a followed by 0x05 (principal)
                  const somePattern = new RegExp(lenHex + fieldHex + '0a05([0-9a-f]{42})', 'i');
                  const match = loanData.match(somePattern);
                  
                  if (match) {
                    const principalHex = match[1];
                    const version = parseInt(principalHex.slice(0, 2), 16);
                    const hash = principalHex.slice(2);
                    try {
                      return c32address(version, hash);
                    } catch (err) {
                      console.error(`Error decoding optional principal for ${fieldName}:`, err);
                      return null;
                    }
                  }
                  return null;
                };

                const findAsset = (fieldName) => {
                  let fieldHex = '';
                  for (let j = 0; j < fieldName.length; j++) {
                    fieldHex += fieldName.charCodeAt(j).toString(16).padStart(2, '0');
                  }
                  const lenHex = fieldName.length.toString(16).padStart(2, '0');
                  
                  const pattern = new RegExp(lenHex + fieldHex + '0d([0-9a-f]{8})([0-9a-f]+)', 'i');
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
                  return 'UNKNOWN';
                };

                const findStatus = (fieldName) => {
                  let fieldHex = '';
                  for (let j = 0; j < fieldName.length; j++) {
                    fieldHex += fieldName.charCodeAt(j).toString(16).padStart(2, '0');
                  }
                  const lenHex = fieldName.length.toString(16).padStart(2, '0');
                  
                  // FIXED: Length is 4 bytes (8 hex chars), not 1 byte!
                  const pattern = new RegExp(lenHex + fieldHex + '0d([0-9a-f]{8})([0-9a-f]+)', 'i');
                  const match = loanData.match(pattern);
                  
                  if (match) {
                    const len = parseInt(match[1], 16);
                    const hexChars = match[2].slice(0, len * 2);
                    let result = '';
                    for (let j = 0; j < hexChars.length; j += 2) {
                      result += String.fromCharCode(parseInt(hexChars.substr(j, 2), 16));
                    }
                    console.log(`🔍 Parsed status for loan ${loanId}: "${result}" (length: ${len})`);
                    return result;
                  }
                  console.log(`⚠️ No status match found for loan ${loanId}`);
                  return null;
                };
                
                // Extract loan fields
                const collateralAmount = findUint('collateral-amount');
                const borrowAmount = findUint('borrow-amount');
                const collateralAsset = findAsset('collateral-asset');
                const borrowAsset = findAsset('borrow-asset');
                const maxRepayment = findUint('max-repayment');
                const repaymentAmount = findUint('repayment-amount'); // Actual winning bid
                const auctionEndBlock = findUint('auction-end-block');
                const maturityBlock = findUint('maturity-block');
                const borrowerAddress = findPrincipal('borrower');
                const lenderAddress = findOptionalPrincipal('lender'); // Use optional version!
                const status = findStatus('status');
                
                const finalDuration = maturityBlock - auctionEndBlock;
                const isAuction = status === 'auction';
                
                // Get current bid if auction
                let currentBid = null;
                let bidderAddress = null;
                
                // DEBUG: Always log this regardless of isAuction
                console.log(`🔵 Loan ${loanId} - Status: "${status}", isAuction: ${isAuction}`);
                
                if (isAuction) {
                  console.log(`🎯 Loan ${loanId} - Will attempt to fetch bid...`);
                  try {
                    const bidResponse = await fetchWithRetry(
                      `${CONFIG.NETWORK.coreApiUrl}/v2/contracts/call-read/${CONFIG.CONTRACT_ADDRESS}/${CONFIG.LOAN_PROTOCOL}/get-current-bid`,
                      {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          sender: CONFIG.CONTRACT_ADDRESS,
                          arguments: [`0x01${loanId.toString(16).padStart(32, '0')}`]
                        })
                      }
                    );
                    
                    if (bidResponse.ok) {
                      const bidResult = await bidResponse.json();
                      const bidData = bidResult.result;
                      
                      console.log(`🔍 Loan ${loanId} - Raw bid response:`, bidData);
                      
                      // Check if response is (none) or empty
                      if (!bidData || bidData === '(none)' || bidData === '0x09') {
                        console.log(`✅ Loan ${loanId} - No bid placed yet`);
                      } else {
                        console.log(`📊 Loan ${loanId} - Bid data exists, attempting to parse...`);
                        
                        // Try multiple parsing methods
                        let parsed = false;
                        
                        // Method 1: Parse hex tuple format
                        try {
                          // Look for 'amount' field (uint)
                          let fieldHex = '';
                          for (let j = 0; j < 'amount'.length; j++) {
                            fieldHex += 'amount'.charCodeAt(j).toString(16).padStart(2, '0');
                          }
                          const lenHex = 'amount'.length.toString(16).padStart(2, '0');
                          const pattern = new RegExp(lenHex + fieldHex + '01([0-9a-f]{32})', 'i');
                          const match = bidData.match(pattern);
                          
                          if (match) {
                            const bidAmount = parseInt(match[1], 16);
                            // Use correct decimals based on borrow asset
                            currentBid = bidAmount / (borrowAsset === 'BTC' ? 100000000 : 1000000);
                            console.log(`✅ Loan ${loanId} - Parsed bid (Method 1): ${currentBid} ${borrowAsset}`);
                            parsed = true;
                          }
                        } catch (e) {
                          console.log(`⚠️ Method 1 failed:`, e.message);
                        }
                        
                        // Method 2: Try parsing as optional some
                        if (!parsed && bidData.includes('0x0a')) {
                          console.log(`🔄 Trying Method 2: Optional unwrapping...`);
                          // 0x0a indicates (some ...) wrapper
                          // Remove the optional wrapper and try again
                          const unwrapped = bidData.replace(/^0x0a/, '0x0c');
                          let fieldHex = '';
                          for (let j = 0; j < 'amount'.length; j++) {
                            fieldHex += 'amount'.charCodeAt(j).toString(16).padStart(2, '0');
                          }
                          const lenHex = 'amount'.length.toString(16).padStart(2, '0');
                          const pattern = new RegExp(lenHex + fieldHex + '01([0-9a-f]{32})', 'i');
                          const match = unwrapped.match(pattern);
                          
                          if (match) {
                            const bidAmount = parseInt(match[1], 16);
                            // Use correct decimals based on borrow asset
                            currentBid = bidAmount / (borrowAsset === 'BTC' ? 100000000 : 1000000);
                            console.log(`✅ Loan ${loanId} - Parsed bid (Method 2): ${currentBid} ${borrowAsset}`);
                            parsed = true;
                          }
                        }
                        
                        if (!parsed) {
                          console.error(`❌ Loan ${loanId} - All parsing methods failed for:`, bidData);
                          console.log(`📋 Raw hex to debug:`, bidData.substring(0, 100) + '...');
                        }
                        
                        // Parse bidder address
                        if (parsed) {
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
                              console.log(`✅ Loan ${loanId} - Parsed bidder: ${bidderAddress}`);
                            } catch (err) {
                              console.error(`❌ Failed to decode bidder for loan ${loanId}:`, err);
                            }
                          }
                        }
                      }
                    }
                  } catch (error) {
                    console.error(`❌ Loan ${loanId} - Error fetching bid:`, error);
                    console.error(`❌ Error stack:`, error.stack);
                  }
                } else {
                  console.log(`⏭️ Loan ${loanId} - Skipping bid fetch (not auction status)`);
                }
                
                // Fetch bid count
                let bidCount = 0;
                try {
                  console.log(`🔍 Fetching bid count for loan ${loanId}...`);
                  const bidCountResult = await fetchBidCount(loanId);
                  bidCount = bidCountResult;
                  
                  // If bid count is 0 but we have a current bid, it means this is a pre-v35 loan
                  // We can't get accurate historical count, but we know there's at least 1
                  if (bidCount === 0 && currentBid) {
                    console.log(`⚠️ Loan ${loanId} - Contract returned 0 but has current bid. This is a pre-v35 loan.`);
                    // We'll mark it for display purposes
                    bidCount = -1; // Special marker meaning "unknown count, but has bids"
                  }
                  
                  console.log(`📊 Loan ${loanId} - Bid count: ${bidCount >= 0 ? bidCount : 'unknown (pre-v35 loan)'}`);
                } catch (error) {
                  console.error(`❌ Loan ${loanId} - Error fetching bid count:`, error);
                  console.error('Stack:', error.stack);
                }
                
                successCount++;
                
                return {
                  id: loanId,
                  collateralAmount: collateralAmount / (collateralAsset === 'BTC' ? 100000000 : 1000000),
                  borrowAmount: borrowAmount / (borrowAsset === 'BTC' ? 100000000 : 1000000),
                  maxRepayment: maxRepayment / (borrowAsset === 'BTC' ? 100000000 : 1000000),
                  repaymentAmount: repaymentAmount / (borrowAsset === 'BTC' ? 100000000 : 1000000), // Actual winning bid
                  auctionEndBlock: auctionEndBlock,
                  maturityBlock: maturityBlock,
                  loanDuration: finalDuration,
                  currentBid: currentBid,
                  bidderAddress: bidderAddress,
                  status: status || 'unknown',
                  isAuction: isAuction,
                  borrowerAddress: borrowerAddress,
                  lenderAddress: lenderAddress,
                  collateralAsset: collateralAsset,  // NEW v35
                  borrowAsset: borrowAsset,          // NEW v35
                  bidCount: bidCount                 // NEW: Actual bid count
                };
                
              } catch (error) {
                console.error(`Error loading loan ${loanId}:`, error);
                failCount++;
                return null;
              }
            })(i)
          );
        }
        
        // Wait for all loans in this batch to complete
        const batchResults = await Promise.all(batchPromises);
        
        // Add successful loans to auctions array
        batchResults.forEach(loan => {
          if (loan) {
            auctions.push(loan);
          }
        });
        
        // Progress update
        console.log(`✅ Batch ${batches.indexOf(batch) + 1}/${batches.length} complete: ${batch.end}/${totalLoans} loans (${successCount} loaded, ${failCount} failed)`);
      }
      
      console.log(`🎉 Loaded ${successCount}/${totalLoans} loans (${failCount} failed)`);
      if (successCount === 0) {
        showMessage('Failed to load any loans. Please try again.', 'error');
        setLoadingAuctions(false);
        return;
      }
      
      // Don't check NFT ownership on page load - too many API calls
      // We'll check it on-demand when user clicks "My Positions" tab
        
      // Get current BITCOIN block for reference
      const infoResponse2 = await fetchWithRetry(`${CONFIG.NETWORK.coreApiUrl}/v2/info`);
      const currentBlockHeight = infoResponse2.ok ? (await infoResponse2.json()).burn_block_height || 0 : 0;
      
      // Show ALL loans
      setOpenAuctions(auctions);
      console.log(`Checked ${totalLoans} loan IDs, found ${auctions.length} total loans`);
      
      // BID SUMMARY
      console.log(`\n📊 ===== BID SUMMARY =====`);
      auctions.forEach(a => {
        const bidStatus = a.currentBid ? `✅ ${a.currentBid} USDT` : '❌ No bid';
        console.log(`  Loan #${a.id}: ${bidStatus} (status: ${a.status})`);
      });
      console.log(`Total with bids: ${auctions.filter(a => a.currentBid).length}/${auctions.length}`);
      console.log(`========================\n`);
      
      
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

  const selectAuction = (id, auction) => {
    setLoanId(id.toString());
    
    // If there's a current bid, reduce by 0.1%
    if (auction.currentBid) {
      const suggestedBid = auction.currentBid * 0.999;
      setBidAmount(suggestedBid.toFixed(6));
    } else {
      // If no bid, use max repayment
      setBidAmount(auction.maxRepayment.toString());
    }
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

  // Sorting functions for tables
  const handleAuctionSort = (key) => {
    if (auctionSortKey === key) {
      setAuctionSortDirection(auctionSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setAuctionSortKey(key);
      setAuctionSortDirection('desc');
    }
  };

  const handleLoanSort = (key) => {
    if (loanSortKey === key) {
      setLoanSortDirection(loanSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setLoanSortKey(key);
      setLoanSortDirection('desc');
    }
  };

  const handleMarketplaceSort = (key) => {
    if (marketplaceSortKey === key) {
      setMarketplaceSortDirection(marketplaceSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setMarketplaceSortKey(key);
      setMarketplaceSortDirection('desc');
    }
  };

  const sortData = (data, sortKey, sortDirection) => {
    return [...data].sort((a, b) => {
      let aVal = a[sortKey];
      let bVal = b[sortKey];
      
      // Handle calculated fields
      if (sortKey === 'maxInterest') {
        aVal = ((a.maxRepayment - a.borrowAmount) / a.borrowAmount) * 100;
        bVal = ((b.maxRepayment - b.borrowAmount) / b.borrowAmount) * 100;
      } else if (sortKey === 'currentInterest') {
        aVal = a.currentBid ? ((a.currentBid - a.borrowAmount) / a.borrowAmount) * 100 : -1;
        bVal = b.currentBid ? ((b.currentBid - b.borrowAmount) / b.borrowAmount) * 100 : -1;
      } else if (sortKey === 'maxAPY') {
        const aDays = a.loanDuration ? Math.floor(a.loanDuration / 144) : 0;
        const bDays = b.loanDuration ? Math.floor(b.loanDuration / 144) : 0;
        if (aDays > 0) {
          const aRate = (a.maxRepayment - a.borrowAmount) / a.borrowAmount;
          aVal = (aRate * (365 / aDays)) * 100;
        } else {
          aVal = -1;
        }
        if (bDays > 0) {
          const bRate = (b.maxRepayment - b.borrowAmount) / b.borrowAmount;
          bVal = (bRate * (365 / bDays)) * 100;
        } else {
          bVal = -1;
        }
      } else if (sortKey === 'currentAPY') {
        const aDays = a.loanDuration ? Math.floor(a.loanDuration / 144) : 0;
        const bDays = b.loanDuration ? Math.floor(b.loanDuration / 144) : 0;
        if (aDays > 0 && a.currentBid) {
          const aRate = (a.currentBid - a.borrowAmount) / a.borrowAmount;
          aVal = (aRate * (365 / aDays)) * 100;
        } else {
          aVal = -1;
        }
        if (bDays > 0 && b.currentBid) {
          const bRate = (b.currentBid - b.borrowAmount) / b.borrowAmount;
          bVal = (bRate * (365 / bDays)) * 100;
        } else {
          bVal = -1;
        }
      } else if (sortKey === 'timeRemaining') {
        aVal = a.auctionEndBlock ? a.auctionEndBlock - currentBlock : 999999;
        bVal = b.auctionEndBlock ? b.auctionEndBlock - currentBlock : 999999;
      } else if (sortKey === 'loanTimeRemaining') {
        aVal = a.maturityBlock ? a.maturityBlock - currentBlock : -1;
        bVal = b.maturityBlock ? b.maturityBlock - currentBlock : -1;
      } else if (sortKey === 'interestRate') {
        aVal = ((a.maxRepayment - a.borrowAmount) / a.borrowAmount) * 100;
        bVal = ((b.maxRepayment - b.borrowAmount) / b.borrowAmount) * 100;
      } else if (sortKey === 'loanAPY') {
        const aDays = a.loanDuration ? Math.floor(a.loanDuration / 144) : 0;
        const bDays = b.loanDuration ? Math.floor(b.loanDuration / 144) : 0;
        if (aDays > 0) {
          const aRate = (a.maxRepayment - a.borrowAmount) / a.borrowAmount;
          aVal = (aRate * (365 / aDays)) * 100;
        } else {
          aVal = -1;
        }
        if (bDays > 0) {
          const bRate = (b.maxRepayment - b.borrowAmount) / b.borrowAmount;
          bVal = (bRate * (365 / bDays)) * 100;
        } else {
          bVal = -1;
        }
      }
      
      // Handle null/undefined
      if (aVal === null || aVal === undefined) aVal = 0;
      if (bVal === null || bVal === undefined) bVal = 0;
      
      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });
  };

  // ============================================================================
  // MARKETPLACE FUNCTIONS - NEW IN V27
  // ============================================================================

  // Fetch all marketplace data
  const fetchMarketplaceData = async () => {
    setLoadingMarketplace(true);
    try {
      await Promise.all([
        fetchListings(),
        fetchMyOffers()
      ]);
    } catch (error) {
      console.error('Error fetching marketplace data:', error);
      showMessage('Error loading marketplace data', 'error');
    } finally {
      setLoadingMarketplace(false);
    }
  };

  // Fetch all listings from the marketplace contract
  const fetchListings = async () => {
    try {
      // Get total number of loans
      const nonceResponse = await fetch(
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

      const nonceResult = await nonceResponse.json();
      const totalLoans = parseInt(nonceResult.result.slice(4), 16);

      const listings = [];
      
      // Check each loan for listings
      for (let i = 1; i <= totalLoans; i++) {
        // Get listing data
        const listingResponse = await fetch(
          `${CONFIG.NETWORK.coreApiUrl}/v2/contracts/call-read/${CONFIG.CONTRACT_ADDRESS}/${CONFIG.MARKETPLACE}/get-listing`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sender: CONFIG.CONTRACT_ADDRESS,
              arguments: [`0x01${i.toString(16).padStart(32, '0')}`]
            })
          }
        );

        const listingResult = await listingResponse.json();
        
        // If listing exists (not none)
        if (listingResult.result && listingResult.result !== '0x09') {
          // Get loan details
          const loanResponse = await fetch(
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

          const loanResult = await loanResponse.json();
          
          if (loanResult.result && loanResult.result !== '0x09') {
            const listingData = cvToValue(hexToCV(listingResult.result));
            const loanData = cvToValue(hexToCV(loanResult.result));

            // Get offers count
            const offerNonceResponse = await fetch(
              `${CONFIG.NETWORK.coreApiUrl}/v2/contracts/call-read/${CONFIG.CONTRACT_ADDRESS}/${CONFIG.MARKETPLACE}/get-offer-nonce`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  sender: CONFIG.CONTRACT_ADDRESS,
                  arguments: [`0x01${i.toString(16).padStart(32, '0')}`]
                })
              }
            );

            const offerNonceResult = await offerNonceResponse.json();
            const offerCount = parseInt(offerNonceResult.result.slice(4), 16);

            listings.push({
              id: i,
              type: listingData.value['position-type'],
              owner: listingData.value.seller,
              collateralAmount: parseInt(loanData.value['collateral-amount']) / 100000000,
              borrowAmount: parseInt(loanData.value['borrow-amount']) / 1000000,
              maxRepayment: parseInt(loanData.value['max-repayment']) / 1000000,
              loanDuration: parseInt(loanData.value['maturity-block']) - parseInt(loanData.value['auction-end-block']),
              maturityBlock: parseInt(loanData.value['maturity-block']),
              askingPrice: listingData.value['asking-price'] ? parseInt(listingData.value['asking-price']) / 1000000 : null,
              offerCount: offerCount,
              status: loanData.value.status
            });
          }
        }
      }

      setListedPositions(listings);
      console.log('Fetched listings:', listings);
    } catch (error) {
      console.error('Error fetching listings:', error);
    }
  };

  // Fetch offers made by the current user
  const fetchMyOffers = async () => {
    if (!userData?.profile?.stxAddress?.testnet) return;

    const userAddress = userData.profile.stxAddress.testnet;
    const offers = [];

    try {
      // Get total loans
      const nonceResponse = await fetch(
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

      const nonceResult = await nonceResponse.json();
      const totalLoans = parseInt(nonceResult.result.slice(4), 16);

      // Check each loan for offers
      for (let loanId = 1; loanId <= totalLoans; loanId++) {
        // Get offer count for this loan
        const offerNonceResponse = await fetch(
          `${CONFIG.NETWORK.coreApiUrl}/v2/contracts/call-read/${CONFIG.CONTRACT_ADDRESS}/${CONFIG.MARKETPLACE}/get-offer-nonce`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sender: CONFIG.CONTRACT_ADDRESS,
              arguments: [`0x01${loanId.toString(16).padStart(32, '0')}`]
            })
          }
        );

        const offerNonceResult = await offerNonceResponse.json();
        const offerCount = parseInt(offerNonceResult.result.slice(4), 16);

        // Check each offer for this loan
        for (let offerId = 1; offerId <= offerCount; offerId++) {
          const offerResponse = await fetch(
            `${CONFIG.NETWORK.coreApiUrl}/v2/contracts/call-read/${CONFIG.CONTRACT_ADDRESS}/${CONFIG.MARKETPLACE}/get-offer`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                sender: CONFIG.CONTRACT_ADDRESS,
                arguments: [
                  `0x01${loanId.toString(16).padStart(32, '0')}`,
                  `0x01${offerId.toString(16).padStart(32, '0')}`
                ]
              })
            }
          );

          const offerResult = await offerResponse.json();
          
          if (offerResult.result && offerResult.result !== '0x09') {
            const offerData = cvToValue(hexToCV(offerResult.result));
            
            // Only include offers made by this user
            if (offerData.value.buyer === userAddress) {
              // Get listing to find asking price and type
              const listingResponse = await fetch(
                `${CONFIG.NETWORK.coreApiUrl}/v2/contracts/call-read/${CONFIG.CONTRACT_ADDRESS}/${CONFIG.MARKETPLACE}/get-listing`,
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    sender: CONFIG.CONTRACT_ADDRESS,
                    arguments: [`0x01${loanId.toString(16).padStart(32, '0')}`]
                  })
                }
              );

              const listingResult = await listingResponse.json();
              const listingData = listingResult.result !== '0x09' ? cvToValue(hexToCV(listingResult.result)) : null;

              offers.push({
                loanId: loanId,
                offerId: offerId,
                type: listingData?.value['position-type'] || 'unknown',
                offerAmount: parseInt(offerData.value.amount) / 1000000,
                askingPrice: listingData?.value['asking-price'] ? parseInt(listingData.value['asking-price']) / 1000000 : null,
                status: offerData.value.status,
                counterOffer: offerData.value['counter-amount'] ? parseInt(offerData.value['counter-amount']) / 1000000 : null
              });
            }
          }
        }
      }

      setMyOffers(offers);
      console.log('Fetched my offers:', offers);
    } catch (error) {
      console.error('Error fetching my offers:', error);
    }
  };

  // List a position for sale
  const listPosition = async (loanId, positionType, askingPrice) => {
    setLoading(true);
    try {
      await openContractCall({
        network: CONFIG.NETWORK,
        contractAddress: CONFIG.CONTRACT_ADDRESS,
        contractName: CONFIG.MARKETPLACE,
        functionName: 'list-position',
        functionArgs: [
          uintCV(loanId),
          stringAsciiCV(positionType),
          askingPrice ? someCV(uintCV(Math.floor(askingPrice * 1000000))) : noneCV()
        ],
        postConditionMode: PostConditionMode.Allow,
        onFinish: (data) => {
          console.log('List position transaction:', data);
          showMessage('Position listed! Refreshing in 10 seconds...', 'success');
          setTimeout(() => {
            fetchMarketplaceData();
            setShowListModal(false);
            setListingPrice('');
            setSelectedPosition(null);
            setLoading(false);
          }, 10000);
        },
        onCancel: () => {
          console.log('Transaction cancelled');
          setLoading(false);
        },
      });
    } catch (error) {
      console.error('Error listing position:', error);
      showMessage('Error listing position: ' + error.message, 'error');
      setLoading(false);
    }
  };

  // Make an offer on a listing
  const makeOfferOnPosition = async (loanId, offerAmount) => {
    setLoading(true);
    try {
      await openContractCall({
        network: CONFIG.NETWORK,
        contractAddress: CONFIG.CONTRACT_ADDRESS,
        contractName: CONFIG.MARKETPLACE,
        functionName: 'make-offer',
        functionArgs: [
          uintCV(loanId),
          uintCV(Math.floor(offerAmount * 1000000))
        ],
        postConditionMode: PostConditionMode.Allow,
        onFinish: (data) => {
          console.log('Make offer transaction:', data);
          showMessage('Offer submitted! Refreshing in 10 seconds...', 'success');
          setTimeout(() => {
            fetchMarketplaceData();
            setShowOfferModal(false);
            setOfferAmount('');
            setSelectedPosition(null);
            setLoading(false);
          }, 10000);
        },
        onCancel: () => {
          console.log('Transaction cancelled');
          setLoading(false);
        },
      });
    } catch (error) {
      console.error('Error making offer:', error);
      showMessage('Error making offer: ' + error.message, 'error');
      setLoading(false);
    }
  };

  // Cancel an offer
  const cancelOffer = async (loanId, offerId) => {
    setLoading(true);
    try {
      await openContractCall({
        network: CONFIG.NETWORK,
        contractAddress: CONFIG.CONTRACT_ADDRESS,
        contractName: CONFIG.MARKETPLACE,
        functionName: 'cancel-offer',
        functionArgs: [
          uintCV(loanId),
          uintCV(offerId)
        ],
        postConditionMode: PostConditionMode.Allow,
        onFinish: (data) => {
          console.log('Cancel offer transaction:', data);
          showMessage('Offer cancelled! Refreshing in 10 seconds...', 'success');
          setTimeout(() => {
            fetchMarketplaceData();
            setLoading(false);
          }, 10000);
        },
        onCancel: () => {
          console.log('Transaction cancelled');
          setLoading(false);
        },
      });
    } catch (error) {
      console.error('Error cancelling offer:', error);
      showMessage('Error cancelling offer: ' + error.message, 'error');
      setLoading(false);
    }
  };

  // Accept an offer (seller accepts buyer's offer)
  const acceptOffer = async (loanId, offerId) => {
    setLoading(true);
    try {
      await openContractCall({
        network: CONFIG.NETWORK,
        contractAddress: CONFIG.CONTRACT_ADDRESS,
        contractName: CONFIG.MARKETPLACE,
        functionName: 'accept-offer',
        functionArgs: [
          uintCV(loanId),
          uintCV(offerId)
        ],
        postConditionMode: PostConditionMode.Allow,
        onFinish: (data) => {
          console.log('Accept offer transaction:', data);
          showMessage('Offer accepted! Trade executing... Refreshing in 10 seconds...', 'success');
          setTimeout(() => {
            fetchMarketplaceData();
            fetchOpenAuctions();
            setLoading(false);
          }, 10000);
        },
        onCancel: () => {
          console.log('Transaction cancelled');
          setLoading(false);
        },
      });
    } catch (error) {
      console.error('Error accepting offer:', error);
      showMessage('Error accepting offer: ' + error.message, 'error');
      setLoading(false);
    }
  };

  // Unlist a position
  const unlistPosition = async (loanId) => {
    setLoading(true);
    try {
      await openContractCall({
        network: CONFIG.NETWORK,
        contractAddress: CONFIG.CONTRACT_ADDRESS,
        contractName: CONFIG.MARKETPLACE,
        functionName: 'unlist-position',
        functionArgs: [
          uintCV(loanId)
        ],
        postConditionMode: PostConditionMode.Allow,
        onFinish: (data) => {
          console.log('Unlist position transaction:', data);
          showMessage('Position unlisted! Refreshing in 10 seconds...', 'success');
          setTimeout(() => {
            fetchMarketplaceData();
            setLoading(false);
          }, 10000);
        },
        onCancel: () => {
          console.log('Transaction cancelled');
          setLoading(false);
        },
      });
    } catch (error) {
      console.error('Error unlisting position:', error);
      showMessage('Error unlisting position: ' + error.message, 'error');
      setLoading(false);
    }
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
      {/* TESTNET WARNING BANNER */}
      <div style={{
        background: 'linear-gradient(90deg, #fbbf24 0%, #f59e0b 100%)',
        color: '#78350f',
        padding: '12px 16px',
        textAlign: 'center',
        fontWeight: '600',
        fontSize: '14px',
        borderBottom: '2px solid #f59e0b',
        boxShadow: '0 2px 8px rgba(251, 191, 36, 0.3)'
      }}>
        ⚠️ TESTNET MODE - For Testing Only - Not Real Money ⚠️
      </div>
      
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
                  {/* NEW v35: Collateral Asset Selector */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: '#cbd5e1', fontSize: '14px', fontWeight: '500' }}>
                  Collateral Asset
                </label>
                <select
                  value={collateralAsset}
                  onChange={(e) => setCollateralAsset(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#e2e8f0',
                    fontSize: '14px'
                  }}
                >
                  <option value="BTC">Bitcoin (BTC)</option>
                  <option value="USDT">Tether (USDT)</option>
                </select>
                <div style={{ marginTop: '6px', fontSize: '12px', color: '#64748b' }}>
                  {collateralAsset === 'BTC' ? 
                    'You will borrow USDT using BTC as collateral' : 
                    'You will borrow BTC using USDT as collateral'}
                </div>
              </div>
                  <label style={{ display: 'block', marginBottom: '8px', color: '#cbd5e1', fontSize: '14px', fontWeight: '500' }}>
                   Collateral Amount ({collateralAsset})
                  </label>
                  <input 
                    type="number"
                    step={collateralAsset === 'BTC' ? '0.01' : '1'}
                    value={collateralAmount} 
                    onChange={(e) => setCollateralAmount(e.target.value)} 
                    placeholder="Collateral value" 
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
                  <label style={{ display: 'block', marginBottom: '8px', color: '#cbd5e1', fontSize: '14px', fontWeight: '500' }}>
                  Loan Amount ({collateralAsset === 'BTC' ? 'USDT' : 'BTC'})
                  </label>
                  <input 
                    type="number"
                    step={collateralAsset === 'BTC' ? '1' : '0.01'}
                    value={requestedAmount} 
                    onChange={(e) => setRequestedAmount(e.target.value)} 
                    placeholder="Loan amount" 
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

              {/* Column 2: Max Repayment and Implied APY */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', color: '#cbd5e1', fontSize: '14px', fontWeight: '500' }}>
                  Max Repayment ({collateralAsset === 'BTC' ? 'USDT' : 'BTC'})
                  </label>
                  <input 
                    type="number"
                    step={collateralAsset === 'BTC' ? '1' : '0.01'}
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
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', color: '#94a3b8', fontWeight: '500' }}>Implied APY</label>
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
                    {(() => {
                      if (!requestedAmount || !maxRepayment || !duration || parseFloat(requestedAmount) <= 0 || parseFloat(duration) <= 0) {
                        return '—';
                      }
                      const rate = (parseFloat(maxRepayment) - parseFloat(requestedAmount)) / parseFloat(requestedAmount);
                      const days = parseFloat(duration);
                      const apy = ((rate * (365 / days)) * 100).toFixed(2);
                      return `${apy}%`;
                    })()}
                  </div>
                </div>
              </div>

              {/* Column 3: Loan Duration and Auction Duration */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', color: '#94a3b8', fontWeight: '500' }}>Loan Duration (days)</label>
                  <input 
                    type="number"
                    step="1"
                    min="7"
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
                    type="number"
                    step="1"
                    min="1"
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
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
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
                onChange={(e) => {
                  setShowMyAuctionsOnly(e.target.checked);
                  if (e.target.checked) setShowMyWinningBidsOnly(false);
                }}
                style={{ cursor: 'pointer' }}
              />
              My Auctions Only
            </label>
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
                checked={showMyWinningBidsOnly}
                onChange={(e) => {
                  setShowMyWinningBidsOnly(e.target.checked);
                  if (e.target.checked) setShowMyAuctionsOnly(false);
                }}
                style={{ cursor: 'pointer' }}
              />
              My Winning Bids Only
            </label>
          </div>
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

        {/* Auctions Table */}
        <div style={{ background: '#1e293b', padding: '24px', borderRadius: '8px', marginBottom: '32px', overflowX: 'auto' }}>
          {(() => {
            // DEBUG: Log what we have
            console.log('Total openAuctions:', openAuctions.length, openAuctions);
            console.log('Auction statuses:', openAuctions.map(a => ({ id: a.id, status: a.status, auctionEndBlock: a.auctionEndBlock, currentBlock })));
            
            // Filter to only show loans with status 'auction' (not finalized yet)
            let filteredAuctions = openAuctions.filter(auction => auction.status === 'auction');
            
            console.log(`Auctions section: Showing ${filteredAuctions.length} auctions (filtered from ${openAuctions.length} total loans)`);
            
            if (showMyAuctionsOnly) {
              const userAddress = userData?.profile?.stxAddress?.testnet;
              if (userAddress) {
                filteredAuctions = filteredAuctions.filter(a => a.borrowerAddress === userAddress);
              }
            }
            
            if (showMyWinningBidsOnly) {
              const userAddress = userData?.profile?.stxAddress?.testnet;
              if (userAddress) {
                filteredAuctions = filteredAuctions.filter(a => a.bidderAddress === userAddress);
              }
            }
            
            // Sort auctions
            const sortedAuctions = sortData(filteredAuctions, auctionSortKey, auctionSortDirection);
            
            if (sortedAuctions.length === 0) {
              return (
                <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                  <div style={{ fontSize: '16px', marginBottom: '12px' }}>
                    No auctions to display with current filters.
                  </div>
                  <div style={{ fontSize: '13px', color: '#475569' }}>
                    Total loans loaded: {openAuctions.length}
                    <br />
                    {openAuctions.length > 0 && (
                      <>
                        Statuses: {[...new Set(openAuctions.map(a => a.status))].join(', ')}
                        <br />
                        <span style={{ fontStyle: 'italic' }}>
                          (Check console for details)
                        </span>
                      </>
                    )}
                  </div>
                </div>
              );
            }
            
            const SortHeader = ({ label, sortKey }) => (
              <th 
                onClick={() => handleAuctionSort(sortKey)}
                style={{ 
                  padding: '12px 8px', 
                  textAlign: 'left', 
                  fontSize: '13px', 
                  fontWeight: '600', 
                  color: '#94a3b8',
                  cursor: 'pointer',
                  userSelect: 'none',
                  borderBottom: '2px solid #334155',
                  whiteSpace: 'nowrap'
                }}
              >
                {label} {auctionSortKey === sortKey && (auctionSortDirection === 'asc' ? '↑' : '↓')}
              </th>
            );
            
            return (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <SortHeader label="ID" sortKey="id" />
                    <SortHeader label="Collateral" sortKey="collateralAmount" />
                    <SortHeader label="Loan Amount" sortKey="borrowAmount" />
                    <SortHeader label="Starting Bid (USDT)" sortKey="maxRepayment" />
                    <SortHeader label="Current Bid (USDT)" sortKey="currentBid" />
                    <SortHeader label="# Bids" sortKey="bidCount" />
                    <SortHeader label="Current Interest" sortKey="currentInterest" />
                    <SortHeader label="Current APY" sortKey="currentAPY" />
                    <SortHeader label="Duration" sortKey="loanDuration" />
                    <SortHeader label="Time Remaining" sortKey="timeRemaining" />
                    <SortHeader label="Status" sortKey="status" />
                    <th style={{ padding: '12px 8px', textAlign: 'center', fontSize: '13px', fontWeight: '600', color: '#94a3b8', borderBottom: '2px solid #334155', whiteSpace: 'nowrap' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedAuctions.map((auction) => {
                    // Calculate time remaining
                    const blocksLeft = auction.auctionEndBlock - currentBlock;
                    const daysLeft = Math.floor(blocksLeft / 144);
                    const hoursLeft = Math.floor((blocksLeft % 144) / 6);
                    const timeRemaining = blocksLeft > 0 
                      ? (daysLeft > 0 ? `${daysLeft}d ${hoursLeft}h` : `${hoursLeft}h`)
                      : 'Ended';
                    const isEnded = blocksLeft <= 0;
                    
                    // Calculate interest rates
                    const maxInterest = ((auction.maxRepayment - auction.borrowAmount) / auction.borrowAmount * 100).toFixed(2);
                    const currentInterest = auction.currentBid 
                      ? ((auction.currentBid - auction.borrowAmount) / auction.borrowAmount * 100).toFixed(2)
                      : null;
                    
                    // Calculate APY (Annualized Percentage Yield)
                    const loanDays = auction.loanDuration ? Math.floor(auction.loanDuration / 144) : 0;
                    let maxAPY = null;
                    let currentAPY = null;
                    
                    if (loanDays > 0) {
                      // APY for single-payment loans: rate * (365/days)
                      const maxRate = (auction.maxRepayment - auction.borrowAmount) / auction.borrowAmount;
                      maxAPY = ((maxRate * (365 / loanDays)) * 100).toFixed(2);
                      
                      if (auction.currentBid) {
                        const currentRate = (auction.currentBid - auction.borrowAmount) / auction.borrowAmount;
                        currentAPY = ((currentRate * (365 / loanDays)) * 100).toFixed(2);
                      }
                    }
                    
                    // Determine status
                    let statusText = 'Live';
                    let statusColor = '#059669';
                    if (isEnded) {
                      if (!auction.currentBid) {
                        statusText = 'Failed';
                        statusColor = '#991b1b';
                      } else {
                        statusText = 'Ended';
                        statusColor = '#854d0e';
                      }
                    }
                    
                    const userAddress = userData?.profile?.stxAddress?.testnet;
                    const isBorrower = auction.borrowerAddress === userAddress;
                    const isBidder = auction.bidderAddress === userAddress;
                    const canBid = !isBorrower && !isEnded && !isBidder; // Prevent bidding if user already has winning bid
                    // Only allow finalization 2 blocks after auction end to avoid blockchain lag
                    const canFinalize = (blocksLeft <= -2) && (isBorrower || isBidder);
                    
                    return (
                      <tr key={auction.id} style={{ borderBottom: '1px solid #334155' }}>
                        <td style={{ padding: '12px 8px', color: '#3b82f6', fontWeight: '600', fontSize: '14px' }}>
                          #{auction.id}
                        </td>
                        <td style={{ padding: '12px 8px', color: '#f59e0b', fontSize: '14px' }}>
                          {auction.collateralAmount} {auction.collateralAsset || 'BTC'}
                        </td>
                        <td style={{ padding: '12px 8px', color: '#10b981', fontSize: '14px' }}>
                          {auction.borrowAmount.toLocaleString()} {auction.borrowAsset || 'USDT'}
                        </td>
                        <td style={{ padding: '12px 8px', color: '#ef4444', fontSize: '14px' }}>
                          {auction.maxRepayment.toLocaleString()} {auction.borrowAsset || 'USDT'}
                        </td>
                        <td style={{ padding: '12px 8px', color: auction.currentBid ? '#3b82f6' : '#64748b', fontSize: '14px' }}>
                          {auction.currentBid ? auction.currentBid.toLocaleString() : '—'}
                        </td>
                        <td style={{ padding: '12px 8px', color: '#94a3b8', fontSize: '14px', textAlign: 'center' }}>
                          {auction.bidCount > 0 ? auction.bidCount : (auction.bidCount === -1 ? '?' : (auction.currentBid ? '1+' : '0'))}
                        </td>
                        <td style={{ padding: '12px 8px', color: auction.currentBid ? '#3b82f6' : '#64748b', fontSize: '14px' }}>
                          {currentInterest ? `${currentInterest}%` : '—'}
                        </td>
                        <td style={{ padding: '12px 8px', color: auction.currentBid ? '#3b82f6' : '#64748b', fontSize: '14px' }}>
                          {currentAPY ? `${currentAPY}%` : '—'}
                        </td>
                        <td style={{ padding: '12px 8px', color: '#94a3b8', fontSize: '14px' }}>
                          {formatDuration(auction.loanDuration) || '—'}
                        </td>
                        <td style={{ padding: '12px 8px', fontSize: '14px' }}>
                          <span style={{ 
                            color: isEnded ? '#ef4444' : (blocksLeft < 144 ? '#fbbf24' : '#10b981'),
                            fontWeight: '500'
                          }}>
                            {timeRemaining}
                          </span>
                        </td>
                        <td style={{ padding: '12px 8px', fontSize: '14px' }}>
                          <span style={{ 
                            padding: '4px 8px', 
                            borderRadius: '4px', 
                            fontSize: '11px', 
                            fontWeight: '600',
                            background: statusColor,
                            color: 'white'
                          }}>
                            {statusText}
                          </span>
                        </td>
                        <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                            {canFinalize && (
                              <button
                                onClick={() => finalizeAuction(auction.id)}
                                disabled={loading}
                                style={{
                                  padding: '6px 12px',
                                  background: '#f59e0b',
                                  border: 'none',
                                  borderRadius: '4px',
                                  color: 'white',
                                  cursor: 'pointer',
                                  fontSize: '12px',
                                  fontWeight: '600'
                                }}
                              >
                                Finalize
                              </button>
                            )}
                            {canBid && (
                              <button
                                onClick={() => selectAuction(auction.id, auction)}
                                style={{
                                  padding: '6px 12px',
                                  background: '#3b82f6',
                                  border: 'none',
                                  borderRadius: '4px',
                                  color: 'white',
                                  cursor: 'pointer',
                                  fontSize: '12px',
                                  fontWeight: '600'
                                }}
                              >
                                Bid
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            );
          })()}
          
          {/* Bid Input Section */}
          <div style={{ marginTop: '24px', padding: '20px', background: '#0f172a', borderRadius: '8px' }}>
            <h3 style={{ fontSize: '16px', marginBottom: '12px', color: '#e2e8f0', fontWeight: '600' }}>Place a Bid</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '0.8fr 1.5fr 1fr 1fr', gap: '12px', alignItems: 'end' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#94a3b8', fontWeight: '500' }}>Loan ID</label>
                <input 
                  value={loanId} 
                  onChange={(e) => {
                    const newLoanId = e.target.value;
                    setLoanId(newLoanId);
                    
                    // Auto-fill bid amount when loan ID changes
                    if (newLoanId) {
                      const auction = openAuctions.find(a => a.id === parseInt(newLoanId));
                      if (auction) {
                        if (auction.currentBid) {
                          // If there's a current bid, set to 0.1% lower
                          const newBid = auction.currentBid * 0.999;
                          setBidAmount(newBid.toFixed(6));
                        } else {
                          // If no bid, set to max repayment
                          setBidAmount(auction.maxRepayment.toString());
                        }
                      }
                    }
                  }} 
                  placeholder="ID" 
                  style={{ width: '100%', padding: '10px', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#e2e8f0', fontSize: '14px' }} 
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#94a3b8', fontWeight: '500' }}>
                  Bid Amount {loanId && openAuctions.find(a => a.id === parseInt(loanId)) ? 
                    `(${openAuctions.find(a => a.id === parseInt(loanId)).borrowAsset || 'USDT'})` : 
                    ''}
                </label>
                <input 
                  type="number"
                  step={(() => {
                    if (!loanId) return '1';
                    const auction = openAuctions.find(a => a.id === parseInt(loanId));
                    return auction?.borrowAsset === 'BTC' ? '0.01' : '1';
                  })()}
                  value={bidAmount} 
                  onChange={(e) => setBidAmount(e.target.value)} 
                  placeholder="Your bid" 
                  style={{ width: '100%', padding: '10px', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#e2e8f0', fontSize: '14px' }} 
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#94a3b8', fontWeight: '500' }}>Bid APY</label>
                <div 
                  style={{ 
                    width: '100%', 
                    padding: '10px', 
                    background: '#1e293b', 
                    border: '1px solid #334155', 
                    borderRadius: '6px', 
                    color: '#10b981',
                    fontSize: '14px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    minHeight: '40px'
                  }} 
                >
                  {(() => {
                    if (!loanId || !bidAmount) return '—';
                    const auction = openAuctions.find(a => a.id === parseInt(loanId));
                    if (!auction) return '—';
                    
                    const bid = parseFloat(bidAmount);
                    const borrowed = auction.borrowAmount;
                    const loanDays = auction.loanDuration ? Math.floor(auction.loanDuration / 144) : 0;
                    
                    if (loanDays <= 0 || bid <= 0 || borrowed <= 0) return '—';
                    
                    const rate = (bid - borrowed) / borrowed;
                    const apy = ((rate * (365 / loanDays)) * 100).toFixed(2);
                    return `${apy}%`;
                  })()}
                </div>
              </div>
              <button 
                onClick={placeBid} 
                disabled={loading} 
                style={{ padding: '10px 20px', background: '#3b82f6', border: 'none', borderRadius: '6px', color: 'white', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: '600', fontSize: '14px', height: '40px' }}
              >
                {loading ? 'Processing...' : 'Place Bid'}
              </button>
            </div>
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

        {/* Loans Table */}
        <div style={{ background: '#1e293b', padding: '24px', borderRadius: '8px', overflowX: 'auto' }}>
          {(() => {
            // Filter loans (active and completed)
            let filteredLoans = openAuctions.filter(loan => 
              loan.status === 'active' || loan.status === 'repaid' || loan.status === 'defaulted'
            );
            
            if (showMyLoansOnly) {
              const userAddress = userData?.profile?.stxAddress?.testnet;
              if (userAddress) {
                filteredLoans = filteredLoans.filter(l => l.borrowerAddress === userAddress);
              }
            }
            
            // Sort loans
            const sortedLoans = sortData(filteredLoans, loanSortKey, loanSortDirection);
            
            if (sortedLoans.length === 0) {
              return (
                <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '14px' }}>
                  No loans found. Auctions must be finalized to become active loans.
                </div>
              );
            }
            
            const SortHeader = ({ label, sortKey }) => (
              <th 
                onClick={() => handleLoanSort(sortKey)}
                style={{ 
                  padding: '12px 8px', 
                  textAlign: 'left', 
                  fontSize: '13px', 
                  fontWeight: '600', 
                  color: '#94a3b8',
                  cursor: 'pointer',
                  userSelect: 'none',
                  borderBottom: '2px solid #334155',
                  whiteSpace: 'nowrap'
                }}
              >
                {label} {loanSortKey === sortKey && (loanSortDirection === 'asc' ? '↑' : '↓')}
              </th>
            );
            
            return (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <SortHeader label="Loan ID" sortKey="id" />
                    <SortHeader label="Collateral" sortKey="collateralAmount" />
                    <SortHeader label="Borrowed" sortKey="borrowAmount" />
                    <SortHeader label="Repayment" sortKey="maxRepayment" />
                    <SortHeader label="# Bids" sortKey="bidCount" />
                    <SortHeader label="Interest Rate" sortKey="interestRate" />
                    <SortHeader label="APY" sortKey="loanAPY" />
                    <SortHeader label="Duration" sortKey="loanDuration" />
                    <SortHeader label="Time Remaining" sortKey="loanTimeRemaining" />
                    <SortHeader label="Status" sortKey="status" />
                    <th style={{ padding: '12px 8px', textAlign: 'center', fontSize: '13px', fontWeight: '600', color: '#94a3b8', borderBottom: '2px solid #334155', whiteSpace: 'nowrap' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedLoans.map((loan) => {
                    // Calculate time remaining until maturity
                    let timeDisplay = '—';
                    let timeColor = '#94a3b8';
                    if (loan.status === 'active' && loan.maturityBlock > 0) {
                      const blocksLeft = loan.maturityBlock - currentBlock;
                      if (blocksLeft > 0) {
                        const daysLeft = Math.floor(blocksLeft / 144);
                        const hoursLeft = Math.floor((blocksLeft % 144) / 6);
                        timeDisplay = daysLeft > 0 ? `${daysLeft}d ${hoursLeft}h` : `${hoursLeft}h`;
                        timeColor = blocksLeft < 144 ? '#ef4444' : blocksLeft < 1440 ? '#fbbf24' : '#10b981';
                      } else {
                        timeDisplay = 'Overdue';
                        timeColor = '#ef4444';
                      }
                    }
                    
                    // Calculate interest rate
                    const interestRate = ((loan.maxRepayment - loan.borrowAmount) / loan.borrowAmount * 100).toFixed(2);
                    
                    // Calculate APY
                    const loanDays = loan.loanDuration ? Math.floor(loan.loanDuration / 144) : 0;
                    let loanAPY = null;
                    if (loanDays > 0) {
                      const rate = (loan.maxRepayment - loan.borrowAmount) / loan.borrowAmount;
                      loanAPY = ((rate * (365 / loanDays)) * 100).toFixed(2);
                    }
                    
                    // Determine status display
                    let statusText = loan.status.toUpperCase();
                    let statusColor = '#1e40af';
                    if (loan.status === 'active') {
                      statusColor = '#1e40af';
                    } else if (loan.status === 'repaid') {
                      statusText = 'COMPLETED';
                      statusColor = '#059669';
                    } else if (loan.status === 'defaulted') {
                      statusColor = '#991b1b';
                    }
                    
                    return (
                      <tr key={loan.id} style={{ borderBottom: '1px solid #334155' }}>
                        <td style={{ padding: '12px 8px', color: '#3b82f6', fontWeight: '600', fontSize: '14px' }}>
                          #{loan.id}
                        </td>
                        <td style={{ padding: '12px 8px', color: '#f59e0b', fontSize: '14px' }}>
                          {loan.collateralAmount.toLocaleString()} {loan.collateralAsset || 'BTC'}
                        </td>
                        <td style={{ padding: '12px 8px', color: '#10b981', fontSize: '14px' }}>
                          {loan.borrowAmount.toLocaleString()} {loan.borrowAsset || 'USDT'}
                        </td>
                        <td style={{ padding: '12px 8px', color: '#ef4444', fontSize: '14px' }}>
                          {loan.status === 'active' && loan.repaymentAmount > 0 
                            ? loan.repaymentAmount.toLocaleString() 
                            : loan.maxRepayment.toLocaleString()} {loan.borrowAsset || 'USDT'}
                        </td>
                        <td style={{ padding: '12px 8px', color: '#94a3b8', fontSize: '14px', textAlign: 'center' }}>
                          {loan.bidCount > 0 ? loan.bidCount : (loan.currentBid ? '1+' : '0')}
                        </td>
                        <td style={{ padding: '12px 8px', color: '#a78bfa', fontSize: '14px' }}>
                          {interestRate}%
                        </td>
                        <td style={{ padding: '12px 8px', color: '#a78bfa', fontSize: '14px' }}>
                          {loanAPY ? `${loanAPY}%` : '—'}
                        </td>
                        <td style={{ padding: '12px 8px', color: '#94a3b8', fontSize: '14px' }}>
                          {formatDuration(loan.loanDuration) || '—'}
                        </td>
                        <td style={{ padding: '12px 8px', fontSize: '14px' }}>
                          <span style={{ color: timeColor, fontWeight: '500' }}>
                            {timeDisplay}
                          </span>
                        </td>
                        <td style={{ padding: '12px 8px', fontSize: '14px' }}>
                          <span style={{ 
                            padding: '4px 8px', 
                            borderRadius: '4px', 
                            fontSize: '11px', 
                            fontWeight: '600',
                            background: statusColor,
                            color: 'white'
                          }}>
                            {statusText}
                          </span>
                        </td>
                        <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                          {(() => {
                            const userAddress = userData?.profile?.stxAddress?.testnet;
                            const isBorrower = loan.borrowerAddress === userAddress;
                            const canRepay = isBorrower && loan.status === 'active';
                            
                            if (canRepay) {
                              return (
                                <button
                                  onClick={() => repayLoan(loan.id)}
                                  disabled={loading}
                                  style={{
                                    padding: '6px 12px',
                                    background: '#10b981',
                                    border: 'none',
                                    borderRadius: '6px',
                                    color: 'white',
                                    cursor: loading ? 'not-allowed' : 'pointer',
                                    fontWeight: '600',
                                    fontSize: '12px',
                                    opacity: loading ? 0.6 : 1
                                  }}
                                >
                                  {loading ? 'Processing...' : 'Repay'}
                                </button>
                              );
                            }
                            
                            return <span style={{ color: '#64748b', fontSize: '12px' }}>—</span>;
                          })()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            );
          })()}
        </div>

        {/* Secondary Market Section */}
        <h2 style={{ fontSize: '24px', marginTop: '48px', marginBottom: '16px', color: '#e2e8f0', fontWeight: '600' }}>Secondary Market</h2>

        {/* Market Tabs */}
        <div style={{ 
          background: '#1e293b', 
          padding: '12px 24px', 
          borderRadius: '8px',
          display: 'flex',
          gap: '8px',
          marginBottom: '16px'
        }}>
          <button
            onClick={() => setMarketplaceTab('myPositions')}
            style={{
              padding: '8px 16px',
              background: marketplaceTab === 'myPositions' ? '#3b82f6' : '#0f172a',
              border: 'none',
              borderRadius: '6px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            My Positions
          </button>
          <button
            onClick={() => setMarketplaceTab('browseMarket')}
            style={{
              padding: '8px 16px',
              background: marketplaceTab === 'browseMarket' ? '#3b82f6' : '#0f172a',
              border: 'none',
              borderRadius: '6px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Browse Market
          </button>
          <button
            onClick={() => setMarketplaceTab('myOffers')}
            style={{
              padding: '8px 16px',
              background: marketplaceTab === 'myOffers' ? '#3b82f6' : '#0f172a',
              border: 'none',
              borderRadius: '6px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              position: 'relative'
            }}
          >
            My Offers
            {myOffers.length > 0 && (
              <span style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                background: '#ef4444',
                color: 'white',
                borderRadius: '10px',
                padding: '2px 6px',
                fontSize: '10px',
                fontWeight: '600'
              }}>
                {myOffers.length}
              </span>
            )}
          </button>
        </div>

        {/* Tab Content */}
        <div style={{ background: '#1e293b', padding: '24px', borderRadius: '8px', marginBottom: '32px', overflowX: 'auto' }}>
          {/* My Positions Tab */}
          {marketplaceTab === 'myPositions' && (() => {
            const userAddress = userData?.profile?.stxAddress?.testnet;
            
            if (loadingMyPositions) {
              return (
                <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '14px' }}>
                  Loading your positions...
                </div>
              );
            }

            if (myPositionsNFT.length === 0) {
              return (
                <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '14px' }}>
                  You don't own any positions yet. Once you have active loans or lend to borrowers, they'll appear here.
                </div>
              );
            }
            
            const myPositions = myPositionsNFT;

            const SortHeader = ({ label, sortKey }) => (
              <th 
                onClick={() => handleMarketplaceSort(sortKey)}
                style={{ 
                  padding: '12px 8px', 
                  textAlign: 'left', 
                  fontSize: '13px', 
                  fontWeight: '600', 
                  color: '#94a3b8',
                  cursor: 'pointer',
                  userSelect: 'none',
                  borderBottom: '2px solid #334155',
                  whiteSpace: 'nowrap'
                }}
              >
                {label} {marketplaceSortKey === sortKey && (marketplaceSortDirection === 'asc' ? '↑' : '↓')}
              </th>
            );

            return (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <SortHeader label="Loan ID" sortKey="id" />
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#94a3b8', borderBottom: '2px solid #334155', whiteSpace: 'nowrap' }}>Position Type</th>
                    <SortHeader label="Collateral" sortKey="collateralAmount" />
                    <SortHeader label="Loan Amount" sortKey="borrowAmount" />
                    <SortHeader label="Repayment" sortKey="maxRepayment" />
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#94a3b8', borderBottom: '2px solid #334155', whiteSpace: 'nowrap' }}>APY</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#94a3b8', borderBottom: '2px solid #334155', whiteSpace: 'nowrap' }}>Time to Maturity</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#94a3b8', borderBottom: '2px solid #334155', whiteSpace: 'nowrap' }}>Status</th>
                    <th style={{ padding: '12px 8px', textAlign: 'center', fontSize: '13px', fontWeight: '600', color: '#94a3b8', borderBottom: '2px solid #334155', whiteSpace: 'nowrap' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {myPositions.map((position) => {
                    const loanDays = position.loanDuration ? Math.floor(position.loanDuration / 144) : 0;
                    const actualRepayment = position.status === 'active' && position.repaymentAmount > 0 ? position.repaymentAmount : position.maxRepayment;
                    const apy = loanDays > 0 ? ((actualRepayment - position.borrowAmount) / position.borrowAmount * (365 / loanDays) * 100).toFixed(2) : '—';
                    const blocksLeft = position.maturityBlock - currentBlock;
                    const daysLeft = Math.floor(blocksLeft / 144);
                    const hoursLeft = Math.floor((blocksLeft % 144) / 6);
                    const timeToMaturity = blocksLeft > 0 ? (daysLeft > 0 ? `${daysLeft}d ${hoursLeft}h` : `${hoursLeft}h`) : 'Matured';
                    
                    // Use NFT ownership flags (the source of truth!)
                    const ownsBorrowerNFT = position.userOwnsBorrowerNFT || false;
                    const ownsLenderNFT = position.userOwnsLenderNFT || false;
                    const positionType = ownsBorrowerNFT ? 'BORROWER' : (ownsLenderNFT ? 'LENDER' : 'UNKNOWN');
                    const positionColor = ownsBorrowerNFT ? '#7c3aed' : '#3b82f6'; // Purple for borrower, blue for lender

                    return (
                      <tr key={position.id} style={{ borderBottom: '1px solid #334155' }}>
                        <td style={{ padding: '12px 8px', color: '#3b82f6', fontWeight: '600', fontSize: '14px' }}>
                          #{position.id}
                        </td>
                        <td style={{ padding: '12px 8px', fontSize: '14px' }}>
                          <span style={{ 
                            padding: '4px 8px', 
                            borderRadius: '4px', 
                            fontSize: '11px', 
                            fontWeight: '600',
                            background: positionColor,
                            color: 'white'
                          }}>
                            {positionType}
                          </span>
                        </td>
                        <td style={{ padding: '12px 8px', color: '#f59e0b', fontSize: '14px' }}>
                          {position.collateralAmount.toLocaleString()} {position.collateralAsset || 'BTC'}
                        </td>
                        <td style={{ padding: '12px 8px', color: '#10b981', fontSize: '14px' }}>
                          {position.borrowAmount.toLocaleString()} {position.borrowAsset || 'USDT'}
                        </td>
                        <td style={{ padding: '12px 8px', color: '#ef4444', fontSize: '14px' }}>
                          {position.status === 'active' && position.repaymentAmount > 0 
                            ? position.repaymentAmount.toLocaleString() 
                            : position.maxRepayment.toLocaleString()} {position.borrowAsset || 'USDT'}
                        </td>
                        <td style={{ padding: '12px 8px', color: '#a78bfa', fontSize: '14px' }}>
                          {apy}%
                        </td>
                        <td style={{ padding: '12px 8px', color: '#94a3b8', fontSize: '14px' }}>
                          {timeToMaturity}
                        </td>
                        <td style={{ padding: '12px 8px', fontSize: '14px' }}>
                          <span style={{ color: '#64748b' }}>Not Listed</span>
                        </td>
                        <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                          <button
                            onClick={() => {
                              setSelectedPosition(position);
                              setShowListModal(true);
                            }}
                            style={{
                              padding: '6px 12px',
                              background: '#10b981',
                              border: 'none',
                              borderRadius: '4px',
                              color: 'white',
                              cursor: 'pointer',
                              fontSize: '12px',
                              fontWeight: '600'
                            }}
                          >
                            List for Sale
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            );
          })()}

          {/* Browse Market Tab */}
          {marketplaceTab === 'browseMarket' && (() => {
            if (listedPositions.length === 0) {
              return (
                <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '14px' }}>
                  No positions listed for sale yet. Check back later!
                </div>
              );
            }

            const SortHeader = ({ label, sortKey }) => (
              <th 
                onClick={() => handleMarketplaceSort(sortKey)}
                style={{ 
                  padding: '12px 8px', 
                  textAlign: 'left', 
                  fontSize: '13px', 
                  fontWeight: '600', 
                  color: '#94a3b8',
                  cursor: 'pointer',
                  userSelect: 'none',
                  borderBottom: '2px solid #334155',
                  whiteSpace: 'nowrap'
                }}
              >
                {label} {marketplaceSortKey === sortKey && (marketplaceSortDirection === 'asc' ? '↑' : '↓')}
              </th>
            );

            return (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <SortHeader label="Loan ID" sortKey="id" />
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#94a3b8', borderBottom: '2px solid #334155', whiteSpace: 'nowrap' }}>Type</th>
                    <SortHeader label="Collateral" sortKey="collateralAmount" />
                    <SortHeader label="Loan" sortKey="borrowAmount" />
                    <SortHeader label="Repayment" sortKey="maxRepayment" />
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#94a3b8', borderBottom: '2px solid #334155', whiteSpace: 'nowrap' }}>Time to Maturity</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#94a3b8', borderBottom: '2px solid #334155', whiteSpace: 'nowrap' }}>Asking Price</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#94a3b8', borderBottom: '2px solid #334155', whiteSpace: 'nowrap' }}>Buyer Yield</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#94a3b8', borderBottom: '2px solid #334155', whiteSpace: 'nowrap' }}># Offers</th>
                    <th style={{ padding: '12px 8px', textAlign: 'center', fontSize: '13px', fontWeight: '600', color: '#94a3b8', borderBottom: '2px solid #334155', whiteSpace: 'nowrap' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {listedPositions.map((listing) => {
                    const blocksLeft = listing.maturityBlock - currentBlock;
                    const daysLeft = Math.floor(blocksLeft / 144);
                    const hoursLeft = Math.floor((blocksLeft % 144) / 6);
                    const timeToMaturity = blocksLeft > 0 ? (daysLeft > 0 ? `${daysLeft}d ${hoursLeft}h` : `${hoursLeft}h`) : 'Matured';
                    
                    const loanDays = listing.loanDuration ? Math.floor(listing.loanDuration / 144) : 0;
                    let buyerYield = '—';
                    if (listing.askingPrice && loanDays > 0) {
                      const profit = listing.maxRepayment - listing.askingPrice;
                      const rate = profit / listing.askingPrice;
                      buyerYield = ((rate * (365 / loanDays)) * 100).toFixed(2) + '%';
                    }

                    return (
                      <tr key={listing.id} style={{ borderBottom: '1px solid #334155' }}>
                        <td style={{ padding: '12px 8px', color: '#3b82f6', fontWeight: '600', fontSize: '14px' }}>
                          #{listing.id}
                        </td>
                        <td style={{ padding: '12px 8px', fontSize: '14px' }}>
                          <span style={{ 
                            padding: '4px 8px', 
                            borderRadius: '4px', 
                            fontSize: '11px', 
                            fontWeight: '600',
                            background: listing.type === 'lender' ? '#10b981' : '#7c3aed',
                            color: 'white'
                          }}>
                            {listing.type.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ padding: '12px 8px', color: '#f59e0b', fontSize: '14px' }}>
                          {listing.collateralAmount.toLocaleString()} {listing.collateralAsset || 'BTC'}
                        </td>
                        <td style={{ padding: '12px 8px', color: '#10b981', fontSize: '14px' }}>
                          {listing.borrowAmount.toLocaleString()} {listing.borrowAsset || 'USDT'}
                        </td>
                        <td style={{ padding: '12px 8px', color: '#ef4444', fontSize: '14px' }}>
                          {listing.maxRepayment.toLocaleString()} {listing.borrowAsset || 'USDT'}
                        </td>
                        <td style={{ padding: '12px 8px', color: '#94a3b8', fontSize: '14px' }}>
                          {timeToMaturity}
                        </td>
                        <td style={{ padding: '12px 8px', color: '#3b82f6', fontSize: '14px', fontWeight: '600' }}>
                          {listing.askingPrice ? `${listing.askingPrice.toLocaleString()} USDT` : 'Open to Offers'}
                        </td>
                        <td style={{ padding: '12px 8px', color: '#10b981', fontSize: '14px', fontWeight: '600' }}>
                          {buyerYield}
                        </td>
                        <td style={{ padding: '12px 8px', color: '#94a3b8', fontSize: '14px', textAlign: 'center' }}>
                          {listing.offerCount || 0}
                        </td>
                        <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                          <button
                            onClick={() => {
                              setSelectedPosition(listing);
                              setShowOfferModal(true);
                            }}
                            style={{
                              padding: '6px 12px',
                              background: '#3b82f6',
                              border: 'none',
                              borderRadius: '4px',
                              color: 'white',
                              cursor: 'pointer',
                              fontSize: '12px',
                              fontWeight: '600'
                            }}
                          >
                            Make Offer
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            );
          })()}

          {/* My Offers Tab */}
          {marketplaceTab === 'myOffers' && (() => {
            if (myOffers.length === 0) {
              return (
                <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '14px' }}>
                  You haven't made any offers yet. Browse the market to make your first offer!
                </div>
              );
            }

            return (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#94a3b8', borderBottom: '2px solid #334155', whiteSpace: 'nowrap' }}>Loan ID</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#94a3b8', borderBottom: '2px solid #334155', whiteSpace: 'nowrap' }}>Type</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#94a3b8', borderBottom: '2px solid #334155', whiteSpace: 'nowrap' }}>Your Offer</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#94a3b8', borderBottom: '2px solid #334155', whiteSpace: 'nowrap' }}>Asking Price</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#94a3b8', borderBottom: '2px solid #334155', whiteSpace: 'nowrap' }}>Status</th>
                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#94a3b8', borderBottom: '2px solid #334155', whiteSpace: 'nowrap' }}>Counter Offer</th>
                    <th style={{ padding: '12px 8px', textAlign: 'center', fontSize: '13px', fontWeight: '600', color: '#94a3b8', borderBottom: '2px solid #334155', whiteSpace: 'nowrap' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {myOffers.map((offer, index) => (
                    <tr key={index} style={{ borderBottom: '1px solid #334155' }}>
                      <td style={{ padding: '12px 8px', color: '#3b82f6', fontWeight: '600', fontSize: '14px' }}>
                        #{offer.loanId}
                      </td>
                      <td style={{ padding: '12px 8px', fontSize: '14px' }}>
                        <span style={{ 
                          padding: '4px 8px', 
                          borderRadius: '4px', 
                          fontSize: '11px', 
                          fontWeight: '600',
                          background: offer.type === 'lender' ? '#10b981' : '#7c3aed',
                          color: 'white'
                        }}>
                          {offer.type.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '12px 8px', color: '#3b82f6', fontSize: '14px', fontWeight: '600' }}>
                        {offer.offerAmount.toLocaleString()} USDT
                      </td>
                      <td style={{ padding: '12px 8px', color: '#94a3b8', fontSize: '14px' }}>
                        {offer.askingPrice ? `${offer.askingPrice.toLocaleString()} USDT` : 'N/A'}
                      </td>
                      <td style={{ padding: '12px 8px', fontSize: '14px' }}>
                        <span style={{ 
                          padding: '4px 8px', 
                          borderRadius: '4px', 
                          fontSize: '11px', 
                          fontWeight: '600',
                          background: offer.status === 'pending' ? '#f59e0b' : offer.status === 'countered' ? '#3b82f6' : '#991b1b',
                          color: 'white'
                        }}>
                          {offer.status.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '12px 8px', color: '#10b981', fontSize: '14px', fontWeight: '600' }}>
                        {offer.counterOffer ? `${offer.counterOffer.toLocaleString()} USDT` : '—'}
                      </td>
                      <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                        <button
                          onClick={() => {
                            cancelOffer(offer.loanId, offer.offerId);
                          }}
                          style={{
                            padding: '6px 12px',
                            background: '#ef4444',
                            border: 'none',
                            borderRadius: '4px',
                            color: 'white',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '600'
                          }}
                        >
                          Cancel
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            );
          })()}
        </div>

        {/* List Position Modal */}
        {showListModal && selectedPosition && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div style={{
              background: '#1e293b',
              borderRadius: '12px',
              padding: '32px',
              maxWidth: '500px',
              width: '90%',
              border: '1px solid #334155'
            }}>
              <h3 style={{ fontSize: '20px', marginBottom: '20px', color: '#e2e8f0', fontWeight: '600' }}>
                List Position for Sale
              </h3>
              
              <div style={{ marginBottom: '20px', padding: '16px', background: '#0f172a', borderRadius: '8px' }}>
                <div style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '8px' }}>Position Details:</div>
                <div style={{ fontSize: '14px', color: '#e2e8f0', display: 'grid', gap: '4px' }}>
                  <div>Loan ID: <span style={{ color: '#3b82f6', fontWeight: '600' }}>#{selectedPosition.id}</span></div>
                  <div>Collateral: <span style={{ color: '#f59e0b' }}>{selectedPosition.collateralAmount} BTC</span></div>
                  <div>Debt: <span style={{ color: '#ef4444' }}>{selectedPosition.maxRepayment.toLocaleString()} USDT</span></div>
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#94a3b8', fontWeight: '500' }}>
                  Asking Price (USDT) - Optional
                </label>
                <input
                  type="text"
                  value={listingPrice}
                  onChange={(e) => setListingPrice(e.target.value)}
                  placeholder="Leave blank to accept offers only"
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

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => {
                    setShowListModal(false);
                    setListingPrice('');
                    setSelectedPosition(null);
                  }}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: '#475569',
                    border: 'none',
                    borderRadius: '6px',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (selectedPosition) {
                      // Determine position type based on user's address
                      const positionType = selectedPosition.borrowerAddress === userData?.profile?.stxAddress?.testnet ? 'borrower' : 'lender';
                      const price = listingPrice ? parseFloat(listingPrice) : null;
                      listPosition(selectedPosition.id, positionType, price);
                    }
                  }}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: '#10b981',
                    border: 'none',
                    borderRadius: '6px',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}
                >
                  List Position
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Make Offer Modal */}
        {showOfferModal && selectedPosition && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div style={{
              background: '#1e293b',
              borderRadius: '12px',
              padding: '32px',
              maxWidth: '500px',
              width: '90%',
              border: '1px solid #334155'
            }}>
              <h3 style={{ fontSize: '20px', marginBottom: '20px', color: '#e2e8f0', fontWeight: '600' }}>
                Make Offer - {selectedPosition.type === 'lender' ? 'Lender' : 'Borrower'} Position #{selectedPosition.id}
              </h3>
              
              <div style={{ marginBottom: '20px', padding: '16px', background: '#0f172a', borderRadius: '8px' }}>
                <div style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '8px' }}>Position Details:</div>
                <div style={{ fontSize: '14px', color: '#e2e8f0', display: 'grid', gap: '4px' }}>
                  <div>Loan Amount: <span style={{ color: '#10b981' }}>{selectedPosition.borrowAmount.toLocaleString()} USDT</span></div>
                  <div>Repayment: <span style={{ color: '#ef4444' }}>{selectedPosition.maxRepayment.toLocaleString()} USDT</span></div>
                  <div>Time to Maturity: <span style={{ color: '#94a3b8' }}>
                    {(() => {
                      const blocksLeft = selectedPosition.maturityBlock - currentBlock;
                      const daysLeft = Math.floor(blocksLeft / 144);
                      return `${daysLeft} days`;
                    })()}
                  </span></div>
                  {selectedPosition.askingPrice && (
                    <div>Asking Price: <span style={{ color: '#3b82f6', fontWeight: '600' }}>{selectedPosition.askingPrice.toLocaleString()} USDT</span></div>
                  )}
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#94a3b8', fontWeight: '500' }}>
                  Your Offer (USDT)
                </label>
                <input
                  type="text"
                  value={offerAmount}
                  onChange={(e) => setOfferAmount(e.target.value)}
                  placeholder="Enter offer amount"
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

              {offerAmount && selectedPosition.type === 'lender' && (
                <div style={{ marginBottom: '20px', padding: '16px', background: '#0f172a', borderRadius: '8px', border: '1px solid #10b981' }}>
                  <div style={{ fontSize: '14px', color: '#10b981', fontWeight: '600', marginBottom: '8px' }}>Your Returns:</div>
                  <div style={{ fontSize: '14px', color: '#e2e8f0', display: 'grid', gap: '4px' }}>
                    <div>Profit: <span style={{ color: '#10b981', fontWeight: '600' }}>
                      {(selectedPosition.maxRepayment - parseFloat(offerAmount || 0)).toLocaleString()} USDT
                    </span></div>
                    <div>Yield: <span style={{ color: '#10b981', fontWeight: '600' }}>
                      {(() => {
                        const profit = selectedPosition.maxRepayment - parseFloat(offerAmount || 0);
                        const rate = profit / parseFloat(offerAmount || 1);
                        const days = Math.floor(selectedPosition.loanDuration / 144);
                        const apy = ((rate * (365 / days)) * 100).toFixed(2);
                        return `${apy}% APY`;
                      })()}
                    </span></div>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => {
                    setShowOfferModal(false);
                    setOfferAmount('');
                    setSelectedPosition(null);
                  }}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: '#475569',
                    border: 'none',
                    borderRadius: '6px',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (offerAmount && selectedPosition) {
                      makeOfferOnPosition(selectedPosition.id, parseFloat(offerAmount));
                    }
                  }}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: '#3b82f6',
                    border: 'none',
                    borderRadius: '6px',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}
                >
                  Submit Offer
                </button>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

export default App;
