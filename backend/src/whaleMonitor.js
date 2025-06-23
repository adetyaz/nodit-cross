import axios from "axios";

class WhaleMonitor {
  constructor(config = {}) {
    this.config = {
      whaleThreshold: config.whaleThreshold || "10000000000000000000000",
      chains: config.chains || [
        "ethereum",
        "polygon",
        "arbitrum",
        "base",
        "optimism",
      ],
      networks: config.networks || [
        "mainnet",
        "mainnet",
        "mainnet",
        "mainnet",
        "mainnet",
      ],
      updateInterval: config.updateInterval || 30000,
      maxStoredAlerts: config.maxStoredAlerts || 100,
      // Guardian Whale Protocol settings
      guardianWhaleMinTransactions: config.guardianWhaleMinTransactions || 100,
      guardianWhaleMinVolume:
        config.guardianWhaleMinVolume || "100000000000000000000000", // $100K
      behaviorAnalysisInterval: config.behaviorAnalysisInterval || 300000, // 5 minutes
    };
    this.recentWhaleMovements = [];
    this.alerts = [];
    this.trackedTokens = new Map();
    this.apiKey = process.env.NODIT_API_KEY || "nodit-demo";
    this.callCount = 0;
    this.telegramBot = config.telegramBot || null;
    this.subscribedChatIds = config.subscribedChatIds || new Set(); // Guardian Whale Protocol data structures
    this.guardianWhales = new Map(); // address -> whale profile
    this.whaleBehaviorData = new Map(); // address -> behavior analysis
    this.defiInteractions = new Map(); // address -> DeFi activities
    this.nftTradingData = new Map(); // address -> NFT trading patterns
    this.liquidityPoolMovements = new Map(); // address -> LP activities
    this.recurringPatterns = new Map(); // address -> pattern analysis
    this.aiInsights = new Map(); // address -> AI-generated insights
    this.microinvestmentTriggers = [];

    // Enhanced Guardian Whale data structure
    this.guardianWhaleData = {
      guardianWhales: new Map(),
      behaviorAnalysis: new Map(),
      strategies: new Map(),
      aiInsights: new Map(),
      eventHistory: [],
      marketTriggers: [],
      crossChainData: new Map(),
    };

    // Initialize tracked wallets if provided
    this.trackedWallets = new Map(); // Initialize in-memory caches
    this.dataCache = new Map();

    // Configure HTTP client with proper timeouts and error handling
    this.client = axios.create({
      baseURL: "https://web3.nodit.io/v1",
      headers: {
        "X-API-KEY": this.apiKey,
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
      timeout: 15000, // Increased timeout for more reliability
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });

    // Add response interceptor for better error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error(`🔥 API Error:`, {
          url: error.config?.url,
          status: error.response?.status,
          message: error.message,
          data: error.response?.data,
        });
        return Promise.reject(error);
      }
    );

    console.log("🐋 WhaleMonitor Initialized:", {
      chains: this.config.chains,
      networks: this.config.networks,
      interval: this.config.updateInterval,
      apiKey: this.apiKey ? "Set" : "Not set",
    });

    // Initialize with empty arrays to prevent null/undefined errors
    this.recentWhaleMovements = [];
    this.alerts = [];

    // Initialize real-time monitoring with error catching
    try {
      this.initializeRealTimeMonitoring();
    } catch (err) {
      console.error("❌ Error initializing real-time monitoring:", err);
    }

    // Setup Nodit webhooks for real-time data
    try {
      this.setupNoditWebhooks();
    } catch (err) {
      console.error("❌ Error setting up webhooks:", err);
    }
  }

  logRequest(method, url, data) {
    console.log(
      `[${new Date().toISOString()}] Call #${++this
        .callCount} ${method} ${url}`,
      data || ""
    );
  }

  logResponse(response) {
    console.log(
      `[${new Date().toISOString()}] Response #${
        this.callCount
      } ${response.config.method.toUpperCase()} ${response.config.url}`,
      {
        status: response.status,
        items: response.data?.items?.length || 0,
      }
    );
  }

  logError(error) {
    console.error(`[${new Date().toISOString()}] Error:`, {
      status: error.response?.status,
      data: error.response?.data || error.message,
      url: error.config?.url,
      headers: error.config?.headers,
    });
  }

  async makeRequest(method, url, data) {
    this.logRequest(method, url, data);
    try {
      const response = await this.client[method.toLowerCase()](url, data);
      this.logResponse(response);
      return response;
    } catch (error) {
      this.logError(error);
      // No fallback data - always throw error for real data only approach
      throw error;
    }
  }

  // Enhanced API request with retry logic and exponential backoff
  async makeRequestWithRetry(method, url, data, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.makeRequest(method, url, data);
      } catch (error) {
        const isRetryable = this.isRetryableError(error);

        if (attempt === maxRetries || !isRetryable) {
          throw error;
        }

        const backoffDelay = Math.pow(2, attempt) * 1000; // Exponential backoff
        console.warn(
          `⚠️ Attempt ${attempt} failed for ${url}, retrying in ${backoffDelay}ms...`
        );
        await this.sleep(backoffDelay);
      }
    }
  }

  isRetryableError(error) {
    if (!error.response) return true; // Network errors are retryable

    const status = error.response.status;
    // Retry on server errors and rate limits, but not on client errors
    return status >= 500 || status === 429 || status === 408;
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  async getTokenTransfers(protocol, network, fromTimestamp, toTimestamp) {
    const cacheKey = `transfers:${protocol}:${network}:${fromTimestamp.getTime()}:${toTimestamp.getTime()}`;    return this.getCachedData(
      cacheKey,
      async () => {
        try {
          console.log(`💹 Fetching token transfers for ${protocol}/${network}`);

          const response = await this.makeRequestWithRetry(
            "POST",
            `/${protocol}/${network}/token/getTokenTransfersWithinRange`,
            {
              fromDate: fromTimestamp.toISOString(),
              toDate: toTimestamp.toISOString(),
              withZeroValue: false,
              minValue: "10000000000000000",
              rpp: 1000,
              withCount: false,
              sort: "value:desc",
            }
          );

          if (!response?.data?.items?.length) {
            console.log(`⚠️ No transfers for ${protocol}/${network}`);
            return [];
          }

          return response.data.items.map((transfer) => ({
            id: `${transfer.transactionHash}-${protocol}`,
            hash: transfer.transactionHash,
            from: transfer.from?.toLowerCase() || "",
            to: transfer.to?.toLowerCase() || "",
            value: Number(transfer.value || 0),
            tokenSymbol:
              transfer.contract?.symbol || this.getNativeSymbol(protocol),
            tokenDecimals: transfer.contract?.decimals || 18,
            contractAddress: transfer.contract?.address?.toLowerCase() || "",
            timestamp: transfer.timestamp
              ? new Date(transfer.timestamp * 1000).getTime()
              : Date.now(),
            tokenName: transfer.contract?.name || "",
            tokenType: transfer.contract?.type || "native",
            type: transfer.contract ? "token_transfer" : "native_transfer",
            chain: protocol,
            network: network,
          }));
        } catch (error) {
          console.error(
            `❌ Error fetching ${protocol}/${network} transfers:`,
            error.message
          );
          // Return empty array instead of throwing to prevent cascading failures          return [];
        }
      },
      1800000, // 30 minutes cache TTL (increased from 1 minute)
      7200000  // 2 hours stale TTL - use stale data for longer during rate limits
    ); // Enhanced cache configuration for token transfers to reduce rate limits
  }
  // In-memory price cache: { key: { price, expiresAt } }
  priceCache = {};
  priceCacheTTL = 60 * 60 * 1000; // 60 minutes (increased from 5 minutes)

  async getTokenPrices(tokenAddresses, protocol, network) {
    // Separate contract addresses and native token symbol
    const contractAddresses = tokenAddresses.filter(
      (addr) => addr && addr.startsWith("0x") && addr.length === 42
    );
    // Map protocol to canonical wrapped native token contract
    const nativeTokenContracts = {
      ethereum: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
      polygon: "0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0", // WMATIC
      arbitrum: "0x82af49447d8a07e3bd95bd0d56f35241523fbab1", // WETH
      base: "0x4200000000000000000000000000000000000006", // WETH
      optimism: "0x4200000000000000000000000000000000000006", // WETH
    };
    const nativeSymbols = {
      ethereum: "ETH",
      polygon: "MATIC",
      arbitrum: "ETH",
      base: "ETH",
      optimism: "ETH",
    };
    let nativeSymbol = nativeSymbols[protocol];
    let nativeContract = nativeTokenContracts[protocol];
    let hasNative = tokenAddresses.includes(nativeSymbol);
    if (
      hasNative &&
      nativeContract &&
      !contractAddresses.includes(nativeContract.toLowerCase())
    ) {
      contractAddresses.push(nativeContract);
    }
    // Deduplicate contract addresses
    const uniqueContracts = Array.from(
      new Set(contractAddresses.map((a) => a.toLowerCase()))
    );
    // Prepare result map
    const priceMap = new Map();
    const now = Date.now();
    const toFetch = [];
    // Check cache first
    for (const addr of uniqueContracts) {
      const cacheKey = `${protocol}:${network}:${addr}`;
      const cached = this.priceCache[cacheKey];
      if (cached && cached.expiresAt > now) {
        priceMap.set(addr, cached.price);
      } else {
        toFetch.push(addr);
      }
    }
    // Log for debugging
    console.log(
      "Fetching prices for:",
      toFetch,
      "native:",
      nativeSymbol,
      nativeContract
    );
    // Fetch token prices for contract addresses not in cache
    if (toFetch.length > 0) {
      try {
        const response = await this.client.post(
          `/${protocol}/${network}/token/getTokenPricesByContracts`,
          {
            contractAddresses: toFetch,
            currency: "USD",
          }
        );
        console.log("Nodit price API response:", response.data); // DEBUG
        if (Array.isArray(response.data)) {
          for (const token of response.data) {
            if (token.contract && token.contract.address) {
              const addr = token.contract.address.toLowerCase();
              priceMap.set(addr, Number(token.price));
              // Update cache
              const cacheKey = `${protocol}:${network}:${addr}`;
              this.priceCache[cacheKey] = {
                price: Number(token.price),
                expiresAt: now + this.priceCacheTTL,
              };
            }
          }
        }
        // For any not returned, set to 0 and cache
        for (const addr of toFetch) {
          if (!priceMap.has(addr)) {
            priceMap.set(addr, 0);
            const cacheKey = `${protocol}:${network}:${addr}`;
            this.priceCache[cacheKey] = {
              price: 0,
              expiresAt: now + this.priceCacheTTL,
            };
          }
        }
      } catch (error) {
        this.logError(error);
        // fallback: set price to 0 for all
        for (const addr of toFetch) {
          priceMap.set(addr, 0);
          const cacheKey = `${protocol}:${network}:${addr}`;
          this.priceCache[cacheKey] = {
            price: 0,
            expiresAt: now + this.priceCacheTTL,
          };
        }
      }
    }
    // For native tokens, map their price from the wrapped contract
    if (hasNative && nativeContract) {
      const price = priceMap.get(nativeContract.toLowerCase()) || 0;
      priceMap.set(nativeSymbol, price);
    }
    // For any other non-contract address, set to 0
    for (const addr of tokenAddresses) {
      if (!addr.startsWith("0x") && addr !== nativeSymbol) {
        priceMap.set(addr, 0);
      }
    }
    return priceMap;
  }

  getNativeSymbol(protocol) {
    const symbols = {
      ethereum: "ETH",
      polygon: "MATIC",
      arbitrum: "ETH",
      base: "ETH",
      optimism: "ETH",
    };
    return symbols[protocol] || "ETH";
  }

  async sendTelegramAlert(message) {
    if (!this.telegramBot || this.subscribedChatIds.size === 0) {
      console.log("⚠️ Telegram bot not configured or no subscribers:", message);
      return;
    }
    try {
      for (const chatId of this.subscribedChatIds) {
        await this.telegramBot.sendMessage(chatId, message);
        console.log(`✅ Sent Telegram alert to ${chatId}: ${message}`);
      }
    } catch (error) {
      console.error(`❌ Telegram alert error: ${error.message}`);
    }
  }

  async filterWhaleTransfers(transfers, protocol, network) {
    const whaleTransfers = [];
    const uniqueTokens = new Set(
      transfers
        .filter((t) => t.contractAddress)
        .map((t) => t.contractAddress?.toLowerCase())
    );
    const nativeToken = this.getNativeSymbol(protocol);
    const tokenPrices = await this.getTokenPrices(
      [...uniqueTokens, nativeToken],
      protocol,
      network
    );
    const thresholdValue = BigInt(this.config.whaleThreshold);

    for (const transfer of transfers) {
      try {
        let rawValue = transfer.value;
        // Fix BigInt for scientific notation
        if (
          typeof rawValue === "number" ||
          (typeof rawValue === "string" && rawValue.includes("e"))
        ) {
          rawValue = BigInt(Math.floor(Number(rawValue))).toString();
        }
        // Validate rawValue
        if (!rawValue || !/^\d+$/.test(rawValue)) {
          console.warn(
            `⚠️ Invalid transfer value for ${transfer.hash}: ${rawValue}`
          );
          continue;
        }

        let valueInWei, priceInUSD;
        if (transfer.contractAddress) {
          priceInUSD = Number(
            tokenPrices.get(transfer.contractAddress?.toLowerCase()) || 0
          );
          const decimals = transfer.tokenDecimals || 18;
          const decimalAdjustment = BigInt(10) ** BigInt(18 - decimals);
          valueInWei = BigInt(rawValue) * decimalAdjustment;
        } else {
          priceInUSD = Number(tokenPrices.get(nativeToken) || 0);
          valueInWei = BigInt(rawValue);
        }
        const valueInEther = Number(valueInWei) / 1e18;
        const usdValue = valueInEther * priceInUSD;

        // Calculate real price impact based on volume and liquidity
        // For now, set to 0 as we need real market data for accurate calculation
        const priceImpact = 0; // TODO: Implement real price impact calculation using market depth data

        // Skip if usdValue is 0
        if (usdValue === 0) {
          console.log(
            `⚠️ Skipping transfer ${transfer.hash} with usdValue 0 on ${protocol}`
          );
          continue;
        }

        if (usdValue >= Number(thresholdValue) / 1e18) {
          whaleTransfers.push({
            ...transfer,
            usdValue,
            tokenPrice: priceInUSD,
            valueInWei: valueInWei.toString(),
            chain: protocol,
            priceImpact,
          });
        }
      } catch (error) {
        console.error(
          `❌ Transfer processing error ${transfer.hash}:`,
          error.message
        );
      }
    }
    return whaleTransfers;
  }
  async getRecentWhaleMovements() {
    try {
      console.log("🐳 Fetching recent whale movements");
      const now = new Date();
      const fromTimestamp = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      let newMovements = [];

      // Process each chain in parallel for better performance
      const promises = [];

      for (let i = 0; i < this.config.chains.length; i++) {
        const chain = this.config.chains[i];
        const network = this.config.networks[i];

        // Create a promise for each chain
        const promise = (async () => {
          try {
            const transfers = await this.getTokenTransfers(
              chain,
              network,
              fromTimestamp,
              now
            );

            if (Array.isArray(transfers) && transfers.length > 0) {
              const whaleTransfers = await this.filterWhaleTransfers(
                transfers,
                chain,
                network
              );
              return whaleTransfers;
            }
            return [];
          } catch (error) {
            console.error(
              `❌ Error processing ${chain} whale movements:`,
              error.message
            );
            return [];
          }
        })();

        promises.push(promise);
      }

      // Wait for all chains to be processed and combine results
      const results = await Promise.all(promises);
      for (const result of results) {
        if (Array.isArray(result)) {
          newMovements.push(...result);
        }
      }

      console.log(
        `✅ Found ${newMovements.length} whale movements across all chains`
      );

      // Only use real data - no fallbacks or mock data
      this.recentWhaleMovements = newMovements;
      return newMovements;
    } catch (error) {
      console.error("❌ Critical error in getRecentWhaleMovements:", error);
      // Return empty array to prevent API failures
      return [];
    }
  }

  // Get recent events for real-time dashboard updates
  async getRecentEvents() {
    try {
      const recentMovements = await this.getRecentWhaleMovements();

      // Transform whale movements into event format for the frontend
      const events = recentMovements.map((movement) => ({
        id: `${movement.hash}_${movement.timestamp}`,
        timestamp: movement.timestamp,
        type: "large_transfer",
        description: `Large ${movement.symbol || "token"} transfer detected`,
        amount: movement.amount,
        amountUSD: movement.amountUSD,
        symbol: movement.symbol,
        from: movement.from,
        to: movement.to,
        hash: movement.hash,
        chain: movement.chain,
        network: movement.network,
        whale: {
          address: movement.from,
          isGuardian: this.guardianWhales.has(movement.from),
        },
        impact:
          movement.amountUSD > 1000000
            ? "high"
            : movement.amountUSD > 100000
            ? "medium"
            : "low",
      }));

      // Sort by timestamp (most recent first)
      events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      // Return last 50 events
      return events.slice(0, 50);
    } catch (error) {
      console.error("Error fetching recent events:", error);
      throw error;
    }
  }

  // Guardian Whale Protocol Methods

  async analyzeWhaleBehavior(address, chain, network) {
    console.log(`🔍 Analyzing whale behavior for ${address} on ${chain}`);

    try {
      // Gather comprehensive behavioral data
      const [
        defiData,
        nftData,
        liquidityData,
        transactionPatterns,
        accountStats,
      ] = await Promise.all([
        this.analyzeDeFiInteractions(address, chain, network),
        this.analyzeNFTTrading(address, chain, network),
        this.analyzeLiquidityPoolMovements(address, chain, network),
        this.analyzeTransactionPatterns(address, chain, network),
        this.getAdvancedAccountStats(address, chain, network),
      ]);

      // Store behavioral data
      this.whaleBehaviorData.set(address, {
        lastAnalysis: Date.now(),
        defiInteractions: defiData,
        nftTrading: nftData,
        liquidityMovements: liquidityData,
        transactionPatterns: transactionPatterns,
        accountStats: accountStats,
        chain: chain,
        network: network,
      });

      // Determine if this whale qualifies as a Guardian Whale
      const guardianScore = this.calculateGuardianScore(address);
      console.log(`Guardian score for ${address}:`, guardianScore);
      if (guardianScore >= 1) {
        // Lowered threshold for testing
        // Threshold for Guardian Whale status
        await this.designateGuardianWhale(
          address,
          this.whaleBehaviorData.get(address)
        );
      } else {
        console.log(`Whale ${address} did not meet Guardian threshold.`);
      }

      return this.whaleBehaviorData.get(address);
    } catch (error) {
      console.error(
        `❌ Error analyzing whale behavior for ${address}:`,
        error.message
      );
      return null;
    }
  }
  async analyzeDeFiInteractions(address, chain, network) {
    console.log(`🏦 Analyzing DeFi interactions for ${address}`);

    try {
      // Get token transfers to identify DeFi protocols
      const response = await this.makeNoditRequest(
        "getTokenTransfersByAccount",
        chain,
        network,
        {
          accountAddress: address,
          rpp: 1000,
          relation: "both",
          fromDate: new Date(
            Date.now() - 30 * 24 * 60 * 60 * 1000
          ).toISOString(),
        }
      );

      const defiInteractions = {
        liquidityProviding: [],
        swaps: [],
        lending: [],
        borrowing: [],
        staking: [],
        governance: [],
        totalValue: 0,
        protocolsUsed: new Set(),
        riskScore: 0,
        sophisticationScore: 0,
        diversificationIndex: 0,
      };

      if (response.data?.items) {
        const protocolClassifier = new DeFiProtocolClassifier();

        for (const transfer of response.data.items) {
          const interaction = await this.classifyDeFiInteraction(
            transfer,
            protocolClassifier
          );
          if (interaction) {
            defiInteractions[interaction.type].push(interaction);
            defiInteractions.protocolsUsed.add(interaction.protocol);
            defiInteractions.totalValue += interaction.value;
          }
        }

        // Calculate sophistication metrics
        defiInteractions.protocolsUsed = Array.from(
          defiInteractions.protocolsUsed
        );
        defiInteractions.riskScore =
          this.calculateDeFiRiskScore(defiInteractions);
        defiInteractions.sophisticationScore =
          this.calculateDeFiSophistication(defiInteractions);
        defiInteractions.diversificationIndex =
          this.calculateDiversificationIndex(defiInteractions);
      }

      this.defiInteractions.set(address, defiInteractions);
      return defiInteractions;
    } catch (error) {
      console.error(`❌ Error analyzing DeFi interactions:`, error.message);
      return {
        totalValue: 0,
        protocolsUsed: [],
        riskScore: 0,
        sophisticationScore: 0,
      };
    }
  }
  async analyzeNFTTrading(address, chain, network) {
    console.log(`🎨 Analyzing NFT trading for ${address}`);

    try {
      const response = await this.makeNoditRequest(
        "getNftTransfersByAccount",
        chain,
        network,
        {
          accountAddress: address,
          rpp: 500,
          relation: "both",
          fromDate: new Date(
            Date.now() - 90 * 24 * 60 * 60 * 1000
          ).toISOString(),
        }
      );

      const nftData = {
        collections: new Set(),
        totalTrades: 0,
        totalVolume: 0,
        averageHoldTime: 0,
        flippingStrategy: false,
        longTermHolding: false,
        bluechipFocus: false,
        tradingFrequency: 0,
        profitabilityScore: 0,
        marketTimingScore: 0,
        portfolioDiversity: 0,
      };

      if (response.data?.items) {
        nftData.totalTrades = response.data.items.length;

        // Analyze trading patterns with more sophistication
        const tradesByCollection = new Map();
        const buyTransactions = [];
        const sellTransactions = [];

        for (const transfer of response.data.items) {
          nftData.collections.add(transfer.contract?.address);

          if (transfer.value) {
            nftData.totalVolume += parseFloat(transfer.value) || 0;
          }

          const collection = transfer.contract?.address;
          if (collection) {
            if (!tradesByCollection.has(collection)) {
              tradesByCollection.set(collection, []);
            }
            tradesByCollection.get(collection).push(transfer);
          }

          // Classify as buy or sell
          if (transfer.to?.toLowerCase() === address.toLowerCase()) {
            buyTransactions.push(transfer);
          } else {
            sellTransactions.push(transfer);
          }
        }

        nftData.collections = Array.from(nftData.collections);
        nftData.tradingFrequency = nftData.totalTrades / 90; // trades per day over 90 days
        nftData.flippingStrategy = nftData.tradingFrequency > 0.5;
        nftData.longTermHolding = nftData.tradingFrequency < 0.1;
        nftData.bluechipFocus = this.identifyBluechipFocus(
          Array.from(tradesByCollection.keys())
        );
        nftData.profitabilityScore = this.calculateNFTProfitability(
          buyTransactions,
          sellTransactions
        );
        nftData.marketTimingScore = this.calculateMarketTiming(
          response.data.items
        );
        nftData.portfolioDiversity =
          nftData.collections.length / Math.max(1, nftData.totalTrades / 2);
      }

      this.nftTradingData.set(address, nftData);
      return nftData;
    } catch (error) {
      console.error(`❌ Error analyzing NFT trading:`, error.message);
      return {
        collections: [],
        totalTrades: 0,
        totalVolume: 0,
        profitabilityScore: 0,
      };
    }
  }
  async analyzeLiquidityPoolMovements(address, chain, network) {
    console.log(`💧 Analyzing liquidity pool movements for ${address}`);

    try {
      // Search for liquidity-related events using the searchEvents API
      const uniswapEvents = await this.makeNoditRequest(
        "searchEvents",
        chain,
        network,
        {
          contractAddress: "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f", // Uniswap V2 Factory
          eventNames: ["PairCreated"],
          abi: JSON.stringify([
            {
              anonymous: false,
              inputs: [
                { indexed: true, name: "token0", type: "address" },
                { indexed: true, name: "token1", type: "address" },
                { indexed: false, name: "pair", type: "address" },
                { indexed: false, name: "length", type: "uint256" },
              ],
              name: "PairCreated",
              type: "event",
            },
          ]),
          fromDate: new Date(
            Date.now() - 30 * 24 * 60 * 60 * 1000
          ).toISOString(),
          rpp: 500,
        }
      );

      const liquidityData = {
        totalDeposits: 0,
        totalWithdrawals: 0,
        activePositions: 0,
        poolsParticipated: new Set(),
        yieldFarming: false,
        liquidityMining: false,
        impermanentLossExposure: 0,
        averagePositionSize: 0,
        rebalancingFrequency: 0,
        concentratedLiquidity: false,
        crossProtocolStrategy: false,
      };

      // Get token transfers for LP tokens
      const lpTokenTransfers = await this.makeNoditRequest(
        "getTokenTransfersByAccount",
        chain,
        network,
        {
          accountAddress: address,
          rpp: 1000,
          relation: "both",
          fromDate: new Date(
            Date.now() - 30 * 24 * 60 * 60 * 1000
          ).toISOString(),
        }
      );

      if (lpTokenTransfers.data?.items) {
        const lpTokens = new Set();
        const deposits = [];
        const withdrawals = [];

        for (const transfer of lpTokenTransfers.data.items) {
          const lpActivity = await this.classifyLiquidityActivity(
            transfer,
            address
          );
          if (lpActivity) {
            lpTokens.add(lpActivity.pool);

            if (lpActivity.type === "deposit") {
              liquidityData.totalDeposits += lpActivity.value;
              deposits.push(lpActivity);
            } else if (lpActivity.type === "withdrawal") {
              liquidityData.totalWithdrawals += lpActivity.value;
              withdrawals.push(lpActivity);
            }
          }
        }

        liquidityData.poolsParticipated = Array.from(lpTokens);
        liquidityData.activePositions =
          liquidityData.totalDeposits - liquidityData.totalWithdrawals;
        liquidityData.yieldFarming = liquidityData.poolsParticipated.length > 3;
        liquidityData.averagePositionSize =
          liquidityData.totalDeposits / Math.max(1, deposits.length);
        liquidityData.rebalancingFrequency = this.calculateRebalancingFrequency(
          deposits,
          withdrawals
        );
        liquidityData.crossProtocolStrategy =
          this.identifyCrossProtocolStrategy(liquidityData.poolsParticipated);
        liquidityData.impermanentLossExposure =
          this.calculateImpermanentLossExposure(liquidityData);
      }

      this.liquidityPoolMovements.set(address, liquidityData);
      return liquidityData;
    } catch (error) {
      console.error(`❌ Error analyzing liquidity movements:`, error.message);
      return {
        totalDeposits: 0,
        totalWithdrawals: 0,
        poolsParticipated: [],
        averagePositionSize: 0,
        rebalancingFrequency: 0,
      };
    }
  }
  async analyzeTransactionPatterns(address, chain, network) {
    console.log(`📊 Analyzing transaction patterns for ${address}`);

    try {
      const response = await this.makeNoditRequest(
        "getTransactionsByAccount",
        chain,
        network,
        {
          accountAddress: address,
          rpp: 1000,
          relation: "both",
          fromDate: new Date(
            Date.now() - 60 * 24 * 60 * 60 * 1000
          ).toISOString(),
        }
      );

      const patterns = {
        recurringIntervals: [],
        preferredHours: new Map(),
        averageGasUsed: 0,
        gasOptimization: false,
        batchingBehavior: false,
        mevProtection: false,
        timeBasedPatterns: {},
        volumePatterns: {},
        frequencyScore: 0,
        consistencyScore: 0,
        sophisticationIndicators: [],
        arbitrageActivity: false,
        flashLoanUsage: false,
      };

      if (response.data?.items) {
        const transactions = response.data.items;

        // Enhanced pattern analysis
        const hourCounts = new Map();
        const dailyVolumes = new Map();
        const gasUsages = [];
        const intervals = [];

        for (let i = 0; i < transactions.length; i++) {
          const tx = transactions[i];
          const timestamp = new Date(tx.timestamp * 1000);
          const hour = timestamp.getHours();
          const day = timestamp.toDateString();

          hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
          dailyVolumes.set(
            day,
            (dailyVolumes.get(day) || 0) + parseFloat(tx.value || 0)
          );
          gasUsages.push(parseFloat(tx.gasUsed || 0));

          // Calculate intervals for pattern detection
          if (i > 0) {
            const prevTimestamp = new Date(
              transactions[i - 1].timestamp * 1000
            );
            const intervalMinutes = (timestamp - prevTimestamp) / (1000 * 60);
            intervals.push(intervalMinutes);
          }
        }

        patterns.preferredHours = this.findPreferredTradingHours(hourCounts);
        patterns.averageGasUsed =
          gasUsages.reduce((a, b) => a + b, 0) / gasUsages.length;
        patterns.gasOptimization = patterns.averageGasUsed < 100000; // Efficient gas usage
        patterns.recurringIntervals = this.detectRecurringIntervals(intervals);
        patterns.frequencyScore = transactions.length / 60; // transactions per day over 60 days
        patterns.consistencyScore = this.calculateConsistencyScore(intervals);
        patterns.batchingBehavior = this.detectBatchingBehavior(transactions);
        patterns.mevProtection = this.detectMEVProtection(transactions);
        patterns.arbitrageActivity = this.detectArbitrageActivity(transactions);
        patterns.flashLoanUsage = this.detectFlashLoanUsage(transactions);
        patterns.sophisticationIndicators =
          this.identifySophisticationIndicators(patterns);
      }

      this.recurringPatterns.set(address, patterns);
      return patterns;
    } catch (error) {
      console.error(`❌ Error analyzing transaction patterns:`, error.message);
      return {
        recurringIntervals: [],
        frequencyScore: 0,
        consistencyScore: 0,
        sophisticationIndicators: [],
      };
    }
  }
  async getAdvancedAccountStats(address, chain, network) {
    console.log(`📈 Getting advanced account stats for ${address}`);

    try {
      const response = await this.makeNoditRequest(
        "getAccountStats",
        chain,
        network,
        {
          address: address,
        }
      );

      const stats = response.data || {
        transactionCounts: { external: 0, internal: 0 },
        transferCounts: { tokens: 0, nfts: 0 },
        assets: { tokens: 0, nfts: 0, nftContracts: 0 },
      };

      // Calculate additional derived metrics
      const enhancedStats = {
        ...stats,
        totalActivity:
          (stats.transactionCounts?.external || 0) +
          (stats.transactionCounts?.internal || 0),
        diversityScore: this.calculateAssetDiversityScore(stats.assets),
        activityRatio: this.calculateActivityRatio(stats),
        wealthIndicator: this.calculateWealthIndicator(stats),
        experienceLevel: this.calculateExperienceLevel(stats),
      };

      return enhancedStats;
    } catch (error) {
      console.error(`❌ Error getting account stats:`, error.message);
      return {
        transactionCounts: { external: 0, internal: 0 },
        transferCounts: { tokens: 0, nfts: 0 },
        assets: { tokens: 0, nfts: 0, nftContracts: 0 },
        totalActivity: 0,
        diversityScore: 0,
        activityRatio: 0,
        wealthIndicator: 0,
        experienceLevel: "beginner",
      };
    }
  }
  calculateGuardianScore(address) {
    const behavior = this.whaleBehaviorData.get(address);
    if (!behavior) {
      console.log(`No behavior data for ${address} in calculateGuardianScore.`);
      return 0;
    }

    let score = 0;
    const weights = {
      transaction_volume: 25, // 25% weight
      defi_sophistication: 20, // 20% weight
      consistency: 15, // 15% weight
      diversification: 15, // 15% weight
      risk_management: 10, // 10% weight
      activity_frequency: 10, // 10% weight
      innovation_adoption: 5, // 5% weight
    };

    // Transaction Volume Score (0-25 points)
    if (behavior.accountStats?.txCount) {
      const volumeScore = Math.min(
        25,
        Math.log10(behavior.accountStats.txCount) * 5
      );
      score += volumeScore;
    }

    // DeFi Sophistication Score (0-20 points)
    if (behavior.defiInteractions?.sophisticationScore) {
      const defiScore =
        (behavior.defiInteractions.sophisticationScore / 100) * 20;
      score += defiScore;
    }

    // Consistency Score (0-15 points)
    if (behavior.transactionPatterns?.consistencyScore) {
      const consistencyScore =
        (behavior.transactionPatterns.consistencyScore / 100) * 15;
      score += consistencyScore;
    }

    // Diversification Score (0-15 points)
    if (behavior.defiInteractions?.diversificationIndex) {
      const diversificationScore = Math.min(
        15,
        behavior.defiInteractions.diversificationIndex * 3
      );
      score += diversificationScore;
    }

    // Risk Management Score (0-10 points)
    if (behavior.defiInteractions?.riskScore !== undefined) {
      // Lower risk score means better risk management
      const riskManagementScore = Math.max(
        0,
        10 - behavior.defiInteractions.riskScore * 10
      );
      score += riskManagementScore;
    }

    // Activity Frequency Score (0-10 points)
    if (behavior.transactionPatterns?.frequencyScore) {
      const activityScore = Math.min(
        10,
        behavior.transactionPatterns.frequencyScore
      );
      score += activityScore;
    }

    // Innovation Adoption Score (0-5 points)
    if (behavior.defiInteractions?.protocolsUsed?.length) {
      const innovationScore = Math.min(
        5,
        behavior.defiInteractions.protocolsUsed.length * 0.5
      );
      score += innovationScore;
    }

    score = Math.min(100, Math.round(score));
    console.log(
      `Calculated Guardian score for ${address}:`,
      score,
      "based on real behavioral data"
    );
    return score;
  }

  async designateGuardianWhale(address, behaviorAnalysis) {
    const score = behaviorAnalysis.guardianScore;
    console.log(
      `👑 Designating ${address} as Guardian Whale with score ${score}`
    );

    const strategies = await this.extractStrategies(behaviorAnalysis);
    const aiInsights = await this.generateAIInsights(
      strategies,
      score,
      address
    );

    const guardianProfile = {
      address: address,
      score: score,
      designation: this.getGuardianTitle(score),
      strategies: strategies,
      aiInsights: aiInsights,
      confidence: score / 100,
      lastUpdate: Date.now(),
      followers: 0,
      totalManaged: 0,
      riskProfile: behaviorAnalysis.riskProfile,
      tradingStyle: aiInsights?.tradingStyle || "Unknown",
      marketPosition: aiInsights?.marketPosition || "Emerging Player",
      reputation: this.calculateReputation(score, strategies.length),
      isActive: true,
    };

    this.guardianWhales.set(address, guardianProfile);

    // Update Guardian Whale data structure
    this.guardianWhaleData.guardianWhales.set(address, guardianProfile);

    // Trigger Guardian Whale alert
    await this.sendGuardianWhaleAlert(guardianProfile);

    return guardianProfile;
  }

  getGuardianTitle(score) {
    if (score >= 90) return "Master Guardian";
    if (score >= 80) return "Elite Guardian";
    if (score >= 70) return "Senior Guardian";
    return "Guardian Whale";
  }

  calculateReputation(score, strategiesCount) {
    return Math.min(100, score + strategiesCount * 5);
  }
  async extractStrategies(behaviorAnalysis) {
    const strategies = [];
    const behaviors = behaviorAnalysis.behaviors;

    // DeFi strategy identification
    if (behaviors.defiInteractions.liquidityProviding.length > 5) {
      strategies.push({
        type: "Liquidity Provider",
        confidence: 0.9,
        description: "Consistent liquidity provision across multiple protocols",
        riskLevel: "Medium",
        profitPotential: "High",
      });
    }

    if (behaviors.defiInteractions.sophisticationScore > 70) {
      strategies.push({
        type: "DeFi Sophisticate",
        confidence: 0.8,
        description:
          "Advanced usage of multiple DeFi protocols with high diversification",
        riskLevel: "Medium",
        profitPotential: "High",
      });
    }

    // NFT strategy identification
    if (behaviors.nftTrading.flippingStrategy) {
      strategies.push({
        type: "NFT Flipper",
        confidence: 0.7,
        description: "Active NFT trading with frequent buy/sell cycles",
        riskLevel: "High",
        profitPotential:
          behaviors.nftTrading.profitabilityScore > 0 ? "High" : "Medium",
      });
    }

    if (behaviors.nftTrading.bluechipFocus) {
      strategies.push({
        type: "Blue-chip NFT Collector",
        confidence: 0.9,
        description: "Focuses on established, high-value NFT collections",
        riskLevel: "Low",
        profitPotential: "Medium",
      });
    }

    // Pattern-based strategies
    if (behaviors.transactionPatterns.recurringIntervals.length > 0) {
      strategies.push({
        type: "Dollar Cost Averaging",
        confidence: 0.8,
        description:
          "Regular, timed investment patterns suggesting systematic approach",
        riskLevel: "Low",
        profitPotential: "Medium",
      });
    }

    if (behaviors.transactionPatterns.arbitrageActivity) {
      strategies.push({
        type: "Arbitrage Trader",
        confidence: 0.7,
        description: "Exploits price differences across markets for profit",
        riskLevel: "Medium",
        profitPotential: "High",
      });
    }

    if (behaviors.liquidityPoolMovements.yieldFarming) {
      strategies.push({
        type: "Yield Farmer",
        confidence: 0.8,
        description: "Actively seeks high-yield opportunities across protocols",
        riskLevel: "Medium",
        profitPotential: "High",
      });
    }

    // Advanced strategies based on sophistication indicators
    if (
      behaviors.transactionPatterns.sophisticationIndicators.includes(
        "MEV Protection"
      )
    ) {
      strategies.push({
        type: "MEV-Aware Trader",
        confidence: 0.9,
        description: "Uses MEV protection for optimal execution",
        riskLevel: "Low",
        profitPotential: "High",
      });
    }

    if (behaviors.transactionPatterns.flashLoanUsage) {
      strategies.push({
        type: "Flash Loan Strategist",
        confidence: 0.8,
        description: "Leverages flash loans for capital efficiency",
        riskLevel: "High",
        profitPotential: "Very High",
      });
    }

    return strategies;
  }

  // Enhanced helper methods for sophisticated analysis

  calculateDeFiSophistication(interactions) {
    let sophisticationScore = 0;

    // Protocol diversity (0-30 points)
    sophisticationScore += Math.min(30, interactions.protocolsUsed.length * 3);

    // Activity type diversity (0-25 points)
    const activityTypes = [
      "swaps",
      "lending",
      "borrowing",
      "liquidityProviding",
      "staking",
      "governance",
    ];
    const activeTypes = activityTypes.filter(
      (type) => interactions[type].length > 0
    );
    sophisticationScore += Math.min(25, activeTypes.length * 4);

    // Volume and frequency (0-25 points)
    const totalActivities = activityTypes.reduce(
      (sum, type) => sum + interactions[type].length,
      0
    );
    sophisticationScore += Math.min(25, Math.log10(totalActivities + 1) * 8);

    // Advanced strategies (0-20 points)
    if (interactions.governance.length > 0) sophisticationScore += 10; // Governance participation
    if (interactions.liquidityProviding.length > 5) sophisticationScore += 10; // Active LP

    return Math.min(100, sophisticationScore);
  }

  calculateDiversificationIndex(interactions) {
    const totalProtocols = interactions.protocolsUsed.length;
    if (totalProtocols === 0) return 0;

    // Calculate Shannon diversity index for protocol usage
    const protocolCounts = new Map();
    const allActivities = [
      ...interactions.swaps,
      ...interactions.lending,
      ...interactions.borrowing,
      ...interactions.liquidityProviding,
    ];

    for (const activity of allActivities) {
      protocolCounts.set(
        activity.protocol,
        (protocolCounts.get(activity.protocol) || 0) + 1
      );
    }

    const totalActivities = allActivities.length;
    let diversityIndex = 0;

    for (const [protocol, count] of protocolCounts) {
      const probability = count / totalActivities;
      diversityIndex -= probability * Math.log2(probability);
    }

    return diversityIndex / Math.log2(totalProtocols); // Normalized to 0-1
  }

  calculateNFTProfitability(buyTransactions, sellTransactions) {
    if (buyTransactions.length === 0 || sellTransactions.length === 0) return 0;

    // Simple profitability calculation based on average buy vs sell prices
    const avgBuyPrice =
      buyTransactions.reduce(
        (sum, tx) => sum + (parseFloat(tx.value) || 0),
        0
      ) / buyTransactions.length;
    const avgSellPrice =
      sellTransactions.reduce(
        (sum, tx) => sum + (parseFloat(tx.value) || 0),
        0
      ) / sellTransactions.length;

    if (avgBuyPrice === 0) return 0;
    return ((avgSellPrice - avgBuyPrice) / avgBuyPrice) * 100; // Percentage profit
  }

  calculateMarketTiming(transactions) {
    // Analyze timing of transactions relative to market conditions
    // For now, return a score based on transaction frequency stability
    if (transactions.length < 5) return 0;

    const intervals = [];
    for (let i = 1; i < transactions.length; i++) {
      const timeDiff =
        new Date(transactions[i - 1].timestamp * 1000) -
        new Date(transactions[i].timestamp * 1000);
      intervals.push(timeDiff / (1000 * 60 * 60 * 24)); // days
    }

    // Calculate coefficient of variation (lower = more consistent timing)
    const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance =
      intervals.reduce(
        (sum, interval) => sum + Math.pow(interval - mean, 2),
        0
      ) / intervals.length;
    const cv = Math.sqrt(variance) / mean;

    return Math.max(0, 100 - cv * 20); // Higher score for more consistent timing
  }

  calculateRebalancingFrequency(deposits, withdrawals) {
    const allEvents = [...deposits, ...withdrawals].sort(
      (a, b) => b.timestamp - a.timestamp
    );
    if (allEvents.length < 4) return 0;

    let rebalancingEvents = 0;
    for (let i = 1; i < allEvents.length; i++) {
      const timeDiff =
        (allEvents[i - 1].timestamp - allEvents[i].timestamp) /
        (1000 * 60 * 60 * 24);
      if (timeDiff < 7) {
        // Events within a week might indicate rebalancing
        rebalancingEvents++;
      }
    }

    return rebalancingEvents / (allEvents.length / 2); // Normalized frequency
  }

  identifyCrossProtocolStrategy(pools) {
    const protocols = new Set();
    const protocolPatterns = {
      uniswap: /uniswap|uni/i,
      sushiswap: /sushi/i,
      curve: /curve/i,
      balancer: /balancer|bal/i,
      aave: /aave/i,
    };

    for (const pool of pools) {
      for (const [protocol, pattern] of Object.entries(protocolPatterns)) {
        if (pattern.test(pool)) {
          protocols.add(protocol);
          break;
        }
      }
    }

    return protocols.size >= 3; // Uses 3+ different protocols
  }

  calculateImpermanentLossExposure(liquidityData) {
    // Simplified IL exposure calculation based on position size and diversity
    const positionRatio =
      liquidityData.activePositions / Math.max(liquidityData.totalDeposits, 1);
    const poolDiversity = liquidityData.poolsParticipated.length;

    // Higher exposure for larger positions, lower for more diversified pools
    return Math.min(
      1,
      (positionRatio * 0.7) / Math.max(1, poolDiversity * 0.1)
    );
  }

  calculateConsistencyScore(intervals) {
    if (intervals.length < 5) return 0;

    // Calculate how consistent the timing intervals are
    const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance =
      intervals.reduce(
        (sum, interval) => sum + Math.pow(interval - mean, 2),
        0
      ) / intervals.length;
    const cv = Math.sqrt(variance) / mean;

    return Math.max(0, 100 - cv * 10); // Higher score for more consistent intervals
  }

  detectBatchingBehavior(transactions) {
    // Detect if user batches transactions to save gas
    const batchWindows = new Map();

    for (const tx of transactions) {
      const minute = Math.floor(
        new Date(tx.timestamp * 1000).getTime() / (1000 * 60)
      );
      batchWindows.set(minute, (batchWindows.get(minute) || 0) + 1);
    }

    const batchedMinutes = Array.from(batchWindows.values()).filter(
      (count) => count > 1
    ).length;
    return batchedMinutes / batchWindows.size > 0.1; // 10% of minutes have multiple transactions
  }

  detectMEVProtection(transactions) {
    // Look for signs of MEV protection (private mempools, etc.)
    // For now, check for consistent gas prices (might indicate protection usage)
    if (transactions.length < 10) return false;

    const gasPrices = transactions
      .map((tx) => parseFloat(tx.gasPrice || 0))
      .filter((price) => price > 0);
    if (gasPrices.length < 5) return false;

    const mean = gasPrices.reduce((a, b) => a + b, 0) / gasPrices.length;
    const variance =
      gasPrices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) /
      gasPrices.length;
    const cv = Math.sqrt(variance) / mean;

    return cv < 0.1; // Very consistent gas pricing might indicate MEV protection
  }

  detectArbitrageActivity(transactions) {
    // Look for patterns that might indicate arbitrage
    const shortIntervals = transactions.filter((tx, i) => {
      if (i === 0) return false;
      const timeDiff =
        new Date(tx.timestamp * 1000) -
        new Date(transactions[i - 1].timestamp * 1000);
      return timeDiff < 5 * 60 * 1000; // Transactions within 5 minutes
    });

    return shortIntervals.length / transactions.length > 0.2; // 20% of transactions are rapid-fire
  }

  detectFlashLoanUsage(transactions) {
    // Simplified detection based on high-value, quick transactions
    const highValueTxs = transactions.filter(
      (tx) => parseFloat(tx.value || 0) > 1000000
    ); // > $1M
    return (
      highValueTxs.length > 0 && this.detectArbitrageActivity(transactions)
    );
  }

  identifySophisticationIndicators(patterns) {
    const indicators = [];

    if (patterns.gasOptimization) indicators.push("Gas Optimization");
    if (patterns.batchingBehavior) indicators.push("Transaction Batching");
    if (patterns.mevProtection) indicators.push("MEV Protection");
    if (patterns.arbitrageActivity) indicators.push("Arbitrage Activity");
    if (patterns.flashLoanUsage) indicators.push("Flash Loan Usage");
    if (patterns.consistencyScore > 70) indicators.push("Consistent Timing");
    if (patterns.recurringIntervals.length > 2)
      indicators.push("Pattern Recognition");

    return indicators;
  }

  calculateAssetDiversityScore(assets) {
    const tokenScore = Math.min(50, (assets?.tokens || 0) * 2);
    const nftScore = Math.min(30, (assets?.nfts || 0) * 0.5);
    const nftContractScore = Math.min(20, (assets?.nftContracts || 0) * 2);

    return tokenScore + nftScore + nftContractScore;
  }

  calculateActivityRatio(stats) {
    const totalTxs =
      (stats.transactionCounts?.external || 0) +
      (stats.transactionCounts?.internal || 0);
    const totalTransfers =
      (stats.transferCounts?.tokens || 0) + (stats.transferCounts?.nfts || 0);

    if (totalTxs === 0) return 0;
    return totalTransfers / totalTxs; // Transfers per transaction
  }

  calculateWealthIndicator(stats) {
    // Rough wealth indicator based on asset counts and activity
    const assetValue =
      (stats.assets?.tokens || 0) * 10 + (stats.assets?.nfts || 0) * 5;
    const activityMultiplier = Math.log10(
      (stats.transactionCounts?.external || 0) + 1
    );

    return Math.min(100, assetValue * activityMultiplier);
  }

  calculateExperienceLevel(stats) {
    const totalTxs =
      (stats.transactionCounts?.external || 0) +
      (stats.transactionCounts?.internal || 0);
    const totalAssets = (stats.assets?.tokens || 0) + (stats.assets?.nfts || 0);

    if (totalTxs < 10) return "beginner";
    if (totalTxs < 100 || totalAssets < 5) return "intermediate";
    if (totalTxs < 1000 || totalAssets < 20) return "advanced";
    return "expert";
  }

  // AI-powered strategy extraction and insights
  async generateAIInsights(strategies, guardianScore, address) {
    console.log(`🤖 Generating AI insights for ${address}`);

    try {
      const behaviorData = this.whaleBehaviorData.get(address);
      if (!behaviorData) return null;

      const insights = {
        riskProfile: this.determineRiskProfile(behaviorData, guardianScore),
        tradingStyle: this.identifyTradingStyle(behaviorData),
        strengths: this.identifyStrengths(behaviorData, strategies),
        recommendations: this.generateRecommendations(
          behaviorData,
          guardianScore
        ),
        marketPosition: this.assessMarketPosition(behaviorData),
        futurePredictions: this.generatePredictions(behaviorData),
        similarWhales: await this.findSimilarWhales(address),
        confidence: this.calculateInsightConfidence(behaviorData),
      };

      this.aiInsights.set(address, insights);
      return insights;
    } catch (error) {
      console.error(`❌ Error generating AI insights:`, error.message);
      return null;
    }
  }

  determineRiskProfile(behaviorData, guardianScore) {
    const defiRisk = behaviorData.defiInteractions.riskScore;
    const liquidityRisk =
      behaviorData.liquidityMovements.impermanentLossExposure;
    const consistencyScore = behaviorData.transactionPatterns.consistencyScore;

    const overallRisk =
      (defiRisk + liquidityRisk + (100 - consistencyScore) / 100) / 3;

    if (overallRisk < 0.3) return { level: "Conservative", score: overallRisk };
    if (overallRisk < 0.6) return { level: "Moderate", score: overallRisk };
    return { level: "Aggressive", score: overallRisk };
  }

  identifyTradingStyle(behaviorData) {
    const nftFreq = behaviorData.nftTrading.tradingFrequency;
    const defiSoph = behaviorData.defiInteractions.sophisticationScore;
    const txFreq = behaviorData.transactionPatterns.frequencyScore;

    if (nftFreq > 1) return "NFT Flipper";
    if (defiSoph > 70) return "DeFi Power User";
    if (txFreq > 5) return "High-Frequency Trader";
    if (behaviorData.liquidityMovements.yieldFarming) return "Yield Farmer";
    if (behaviorData.nftTrading.longTermHolding) return "Long-term Holder";
    return "Balanced Investor";
  }

  identifyStrengths(behaviorData, strategies) {
    const strengths = [];

    if (behaviorData.defiInteractions.sophisticationScore > 70) {
      strengths.push("Advanced DeFi Knowledge");
    }
    if (behaviorData.transactionPatterns.gasOptimization) {
      strengths.push("Gas Efficiency");
    }
    if (behaviorData.nftTrading.profitabilityScore > 20) {
      strengths.push("Profitable NFT Trading");
    }
    if (behaviorData.liquidityMovements.crossProtocolStrategy) {
      strengths.push("Cross-Protocol Strategy");
    }
    if (behaviorData.transactionPatterns.consistencyScore > 80) {
      strengths.push("Consistent Execution");
    }

    return strengths;
  }

  generateRecommendations(behaviorData, guardianScore) {
    const recommendations = [];

    if (behaviorData.defiInteractions.diversificationIndex < 0.5) {
      recommendations.push("Consider diversifying across more DeFi protocols");
    }
    if (behaviorData.liquidityMovements.impermanentLossExposure > 0.6) {
      recommendations.push("Monitor impermanent loss exposure in LP positions");
    }
    if (!behaviorData.transactionPatterns.gasOptimization) {
      recommendations.push("Optimize gas usage with batching or L2 solutions");
    }
    if (behaviorData.nftTrading.profitabilityScore < 0) {
      recommendations.push(
        "Review NFT trading strategy for better profitability"
      );
    }
    if (guardianScore < 60) {
      recommendations.push(
        "Increase activity sophistication to achieve Guardian Whale status"
      );
    }

    return recommendations;
  }

  assessMarketPosition(behaviorData) {
    const totalValue =
      behaviorData.defiInteractions.totalValue +
      behaviorData.nftTrading.totalVolume;
    const sophistication = behaviorData.defiInteractions.sophisticationScore;

    if (totalValue > 10000000 && sophistication > 80) return "Market Leader";
    if (totalValue > 1000000 && sophistication > 60)
      return "Significant Player";
    if (totalValue > 100000 && sophistication > 40) return "Active Participant";
    return "Emerging Player";
  }

  generatePredictions(behaviorData) {
    const predictions = [];

    if (behaviorData.transactionPatterns.frequencyScore > 3) {
      predictions.push("Likely to increase activity in the next 30 days");
    }
    if (behaviorData.defiInteractions.protocolsUsed.length > 5) {
      predictions.push("May explore new DeFi protocols");
    }
    if (behaviorData.nftTrading.flippingStrategy) {
      predictions.push("Will continue active NFT trading");
    }
    if (behaviorData.liquidityMovements.yieldFarming) {
      predictions.push("May seek higher yield opportunities");
    }

    return predictions;
  }

  async findSimilarWhales(address) {
    const targetBehavior = this.whaleBehaviorData.get(address);
    if (!targetBehavior) return [];

    const similarities = [];

    for (const [whaleAddress, behavior] of this.whaleBehaviorData) {
      if (whaleAddress === address) continue;

      const similarity = this.calculateBehaviorSimilarity(
        targetBehavior,
        behavior
      );
      if (similarity > 0.7) {
        // 70% similarity threshold
        similarities.push({
          address: whaleAddress,
          similarity: similarity,
          commonStrategies: this.findCommonStrategies(targetBehavior, behavior),
        });
      }
    }

    return similarities.sort((a, b) => b.similarity - a.similarity).slice(0, 5);
  }

  calculateBehaviorSimilarity(behavior1, behavior2) {
    // Simplified similarity calculation
    const defiSim = this.calculateSetSimilarity(
      behavior1.defiInteractions.protocolsUsed,
      behavior2.defiInteractions.protocolsUsed
    );
    const nftSim = this.calculateSetSimilarity(
      behavior1.nftTrading.collections,
      behavior2.nftTrading.collections
    );
    const liquiditySim = this.calculateSetSimilarity(
      behavior1.liquidityMovements.poolsParticipated,
      behavior2.liquidityMovements.poolsParticipated
    );

    return (defiSim + nftSim + liquiditySim) / 3;
  }

  calculateSetSimilarity(set1, set2) {
    const intersection = set1.filter((item) => set2.includes(item));
    const union = [...new Set([...set1, ...set2])];
    return union.length === 0 ? 0 : intersection.length / union.length;
  }

  findCommonStrategies(behavior1, behavior2) {
    const strategies = [];

    if (
      behavior1.nftTrading.flippingStrategy &&
      behavior2.nftTrading.flippingStrategy
    ) {
      strategies.push("NFT Flipping");
    }
    if (
      behavior1.liquidityMovements.yieldFarming &&
      behavior2.liquidityMovements.yieldFarming
    ) {
      strategies.push("Yield Farming");
    }
    if (
      behavior1.defiInteractions.sophisticationScore > 70 &&
      behavior2.defiInteractions.sophisticationScore > 70
    ) {
      strategies.push("Advanced DeFi");
    }

    return strategies;
  }

  calculateInsightConfidence(behaviorData) {
    const dataPoints = [
      behaviorData.defiInteractions.protocolsUsed.length,
      behaviorData.nftTrading.totalTrades,
      behaviorData.liquidityMovements.poolsParticipated.length,
      behaviorData.transactionPatterns.frequencyScore * 10,
    ].reduce((sum, val) => sum + Math.min(val, 10), 0);

    return Math.min(100, dataPoints * 2.5); // Max confidence of 100%
  }
  /**
   * Advanced caching system with rate limit handling and stale-while-revalidate functionality
   * @param {string} key - Cache key
   * @param {Function} fetchFn - Async function to fetch data if not cached
   * @param {number} ttl - Normal Time to Live in ms (default: 5 minutes)
   * @param {number} staleTtl - Extended TTL for rate-limited situations (default: 30 minutes)
   * @returns {Promise<any>} - Cached or fetched data
   */  async getCachedData(key, fetchFn, ttl = 900000, staleTtl = 3600000) {
    try {
      const now = Date.now();
      const cacheKey = `nodit:${key}`;

      // Initialize cache if needed
      if (!this.dataCache) {
        this.dataCache = new Map();
        console.log("🔧 Initializing cache system");
      }

      // Attempt to get cache statistics
      if (!this.cacheStats) {
        this.cacheStats = {
          hits: 0,
          misses: 0,
          staleHits: 0,
          rateLimitFallbacks: 0,
          errors: 0
        };
      }

      // Check if we have a valid cache entry
      const cached = this.dataCache.get(cacheKey);
      
      // If we have fresh data in cache, return it immediately
      if (cached && cached.expiresAt > now) {
        this.cacheStats.hits++;
        console.log(`✅ Cache hit for ${cacheKey} (fresh data) [Hits: ${this.cacheStats.hits}]`);
        return cached.value;
      }
      
      // If we have stale data and are in a rate limit cooldown period, return stale data
      if (cached && this.rateLimitedUntil && this.rateLimitedUntil > now) {
        this.cacheStats.rateLimitFallbacks++;
        console.log(`⚠️ Using stale cache for ${cacheKey} due to rate limiting until ${new Date(this.rateLimitedUntil).toISOString()} [Rate limit fallbacks: ${this.cacheStats.rateLimitFallbacks}]`);
        return cached.value;
      }      // If we have stale data that's still within the stale TTL, we'll return it but also refresh in background
      const hasStaleButUsableData = cached && cached.staleExpiresAt && cached.staleExpiresAt > now;
      
      // Use stale-while-revalidate pattern: return stale data immediately while refreshing in background
      if (hasStaleButUsableData) {
        this.cacheStats.staleHits++;
        console.log(`♻️ Using stale data for ${cacheKey} while refreshing in background [Stale hits: ${this.cacheStats.staleHits}]`);
        
        // Refresh in background (don't await)
        this.refreshCacheInBackground(cacheKey, fetchFn, ttl, staleTtl);
        
        // Return stale data immediately
        return cached.value;
      }
      
      // No usable cache data, fetch fresh data synchronously
      try {
        this.cacheStats.misses++;
        console.log(`🔍 Cache miss for ${cacheKey}, fetching fresh data... [Misses: ${this.cacheStats.misses}]`);
        const fetchStartTime = Date.now();
        
        const value = await fetchFn();
        const fetchDuration = Date.now() - fetchStartTime;
        
        console.log(`✅ Fresh data fetched for ${cacheKey} in ${fetchDuration}ms`);
        
        // Store in cache with both normal and stale expiration times
        this.dataCache.set(cacheKey, {
          value,
          expiresAt: now + ttl,
          staleExpiresAt: now + staleTtl,
          createdAt: now,
          lastFetchDuration: fetchDuration,
          lastUpdated: now
        });        // Ensure the cache doesn't grow too large (increased from 150 to 300 entries)
        if (this.dataCache.size > 300) {
          // Delete oldest entries when cache gets too big
          const entries = [...this.dataCache.entries()];
          entries.sort((a, b) => a[1].createdAt - b[1].createdAt);

          // Remove the oldest 20% entries
          const toRemove = Math.ceil(entries.length * 0.2);
          console.log(`🧹 Cleaning cache, removing ${toRemove} oldest entries`);
          
          for (let i = 0; i < toRemove; i++) {
            if (entries[i]) {
              this.dataCache.delete(entries[i][0]);
            }
          }
        }
        
        // Save cache stats periodically
        if (!this.lastCacheReport || now - this.lastCacheReport > 300000) { // 5 minutes
          console.log(`📊 Cache stats: ${JSON.stringify(this.cacheStats)}`);
          console.log(`📈 Cache size: ${this.dataCache.size} entries`);
          this.lastCacheReport = now;
        }
        
        // Return the fresh data
        return value;
      } catch (error) {
        // Check if this is a rate limit error
        const isRateLimit = error.response?.status === 429;
        
        if (isRateLimit) {
          this.cacheStats.errors++;
          console.error(`🛑 RATE LIMIT hit for ${cacheKey} [Total errors: ${this.cacheStats.errors}]`);
          
          // Set a rate limit flag with exponential backoff (starting at 2 minutes, up to 4 hours)
          const currentBackoff = this.rateLimitBackoff || 120000; // Start at 2 minutes
          this.rateLimitBackoff = Math.min(currentBackoff * 2, 14400000); // Max 4 hours
          this.rateLimitedUntil = now + this.rateLimitBackoff;
          
          console.warn(`⏳ Rate limit backoff: ${this.rateLimitBackoff/1000}s until ${new Date(this.rateLimitedUntil).toISOString()}`);
          
          // If we have stale data, return that instead
          if (hasStaleButUsableData) {
            this.cacheStats.rateLimitFallbacks++;
            console.log(`♻️ Falling back to stale data for ${cacheKey} during rate limit [Fallbacks: ${this.cacheStats.rateLimitFallbacks}]`);
            return cached.value;
          }
          
          // No stale data but we hit rate limit - escalate backoff and throw specific error
          throw new Error(`Rate limit exceeded. Using exponential backoff (${this.rateLimitBackoff/1000}s). Please try again later.`);
        }
        
        // Re-throw if it's not a rate limit or we don't have stale data
        throw error;
      }
    } catch (error) {
      console.error(`❌ Cache error for ${key}:`, error);
      return []
    }
  }

  // Background refresh method for stale-while-revalidate caching pattern
  async refreshCacheInBackground(cacheKey, fetchFn, ttl, staleTtl) {
    try {
      // Create a flag to prevent multiple simultaneous refreshes of the same key
      if (!this.refreshInProgress) {
        this.refreshInProgress = new Set();
      }
      
      // If we're already refreshing this key, don't start another refresh
      if (this.refreshInProgress.has(cacheKey)) {
        console.log(`🔄 Background refresh already in progress for ${cacheKey}`);
        return;
      }
      
      // Mark that we're refreshing this key
      this.refreshInProgress.add(cacheKey);

      const now = Date.now();
      console.log(`🔄 Background refresh started for ${cacheKey}`);
      const fetchStartTime = now;
      
      try {
        // Fetch new data
        const value = await fetchFn();
        const fetchDuration = Date.now() - fetchStartTime;
        
        console.log(`✅ Background refresh completed for ${cacheKey} in ${fetchDuration}ms`);
        
        // Update cache with new data
        this.dataCache.set(cacheKey, {
          value,
          expiresAt: now + ttl,
          staleExpiresAt: now + staleTtl,
          lastUpdated: now,
          lastFetchDuration: fetchDuration,
          createdAt: this.dataCache.get(cacheKey)?.createdAt || now // Preserve original creation time
        });
      } catch (error) {
        // Log error but don't throw - the stale data is still being used
        console.error(`❌ Background refresh failed for ${cacheKey}:`, error.message);
        
        // If this was a rate limit, update global rate limit state
        if (error.response?.status === 429) {
          const currentBackoff = this.rateLimitBackoff || 120000;
          this.rateLimitBackoff = Math.min(currentBackoff * 2, 14400000);
          this.rateLimitedUntil = now + this.rateLimitBackoff;
          console.warn(`⏳ Rate limit during background refresh. Backoff: ${this.rateLimitBackoff/1000}s until ${new Date(this.rateLimitedUntil).toISOString()}`);
        }
      } finally {
        // Always remove from in-progress set, even if there was an error
        this.refreshInProgress.delete(cacheKey);
      }
    } catch (error) {
      console.error(`❌ Unexpected error in background refresh for ${cacheKey}:`, error);
    }
  }

  initializeRealTimeMonitoring() {
    console.log("🌐 Initializing real-time whale monitoring...");

    // Initialize webhook listeners for different event types
    this.webhookListeners = new Map();
    this.activeStreams = new Map();
    this.eventQueue = [];
    this.processingQueue = false;

    // Configure monitoring thresholds
    this.monitoringConfig = {
      largeTransferThreshold: 1000000, // $1M USD
      liquidityMovementThreshold: 500000, // $500K USD
      microInvestmentThreshold: 10000, // $10K USD
      whaleWalletThreshold: 10000000, // $10M USD total value
      guardianWhaleUpdateInterval: 300000, // 5 minutes
      eventProcessingBatch: 50,
      maxQueueSize: 1000,
    };

    // Start real-time monitoring
    this.startRealTimeStreams();
    this.startEventProcessor();

    console.log("✅ Real-time monitoring initialized");
  }

  /**
   * Polls Nodit Data API for real-time whale events (large token transfers, DeFi, NFT, etc.)
   * Uses getTokenTransfersWithinRange and searchEvents for all supported protocols.
   * @param {Object} options - { protocols, minValue, from, to }
   * @returns {Promise<Array>} - Array of real event objects
   */
  async fetchRealTimeEvents({
    protocols = ["ethereum", "polygon", "arbitrum", "base", "optimism"],
    minValue = "10000000000000000000000", // $10K default
    from = new Date(Date.now() - 5 * 60 * 1000), // last 5 minutes
    to = new Date(),
  } = {}) {
    const allEvents = [];
    for (const protocol of protocols) {
      try {
        // Large token transfers
        const transfers = await this.getTokenTransfers(
          protocol,
          "mainnet",
          from,
          to
        );
        allEvents.push(...transfers.filter((t) => t.value >= Number(minValue)));
        // You can add more event types here using searchEvents, getNftTransfersWithinRange, etc.
      } catch (err) {
        this.logError(err);
      }
    }
    // Sort by timestamp descending
    return allEvents.sort((a, b) => b.timestamp - a.timestamp);
  }

  // Remove all mock webhook logic from setupNoditWebhooks
  async setupNoditWebhooks() {
    console.log(
      "ℹ️ Skipping mock webhook setup. Using Nodit MCP Data API polling for real-time events."
    );
    return true;
  }

  createWebhookHandler(eventType) {
    return async (eventData) => {
      console.log(`🔔 Webhook triggered: ${eventType}`);

      try {
        const processedEvent = await this.processWebhookEvent(
          eventType,
          eventData
        );
        if (processedEvent) {
          this.queueEvent(processedEvent);
        }
      } catch (error) {
        console.error(`❌ Error processing webhook ${eventType}:`, error);
      }
    };
  }

  async processWebhookEvent(eventType, eventData) {
    const timestamp = Date.now();

    switch (eventType) {
      case "large_token_transfer":
        return this.processLargeTransferEvent(eventData, timestamp);

      case "liquidity_pool_interaction":
        return this.processLiquidityEvent(eventData, timestamp);

      case "nft_high_value_trade":
        return this.processNFTEvent(eventData, timestamp);

      case "defi_protocol_interaction":
        return this.processDeFiEvent(eventData, timestamp);

      default:
        console.warn(`⚠️ Unknown webhook event type: ${eventType}`);
        return null;
    }
  }

  async processLargeTransferEvent(eventData, timestamp) {
    const transfer = eventData.transfer;
    const usdValue = eventData.usd_value || 0;

    if (usdValue >= this.monitoringConfig.largeTransferThreshold) {
      console.log(`🐋 Large transfer detected: $${usdValue.toLocaleString()}`);

      // Check if this involves a tracked whale
      const fromWhale = this.isTrackedWhale(transfer.from);
      const toWhale = this.isTrackedWhale(transfer.to);

      if (fromWhale || toWhale) {
        return {
          type: "whale_large_transfer",
          data: {
            transfer,
            usdValue,
            whaleInvolved: fromWhale || toWhale,
            direction: fromWhale ? "outgoing" : "incoming",
            significance: this.calculateTransferSignificance(usdValue),
            triggerAnalysis:
              usdValue >= this.monitoringConfig.whaleWalletThreshold,
          },
          timestamp,
        };
      }
    }

    return null;
  }

  async processLiquidityEvent(eventData, timestamp) {
    const liquidityChange = eventData.liquidity_change;
    const poolAddress = eventData.pool_address;
    const userAddress = eventData.user_address;

    if (this.isTrackedWhale(userAddress)) {
      console.log(`💧 Liquidity movement by whale: ${userAddress}`);

      return {
        type: "whale_liquidity_movement",
        data: {
          userAddress,
          poolAddress,
          liquidityChange,
          poolInfo: eventData.pool_info,
          significance: this.calculateLiquiditySignificance(liquidityChange),
          triggerAnalysis:
            Math.abs(liquidityChange.usd_value) >=
            this.monitoringConfig.liquidityMovementThreshold,
        },
        timestamp,
      };
    }

    return null;
  }

  async processNFTEvent(eventData, timestamp) {
    const nftTrade = eventData.nft_trade;
    const tradeValue = eventData.trade_value_usd || 0;

    const buyerWhale = this.isTrackedWhale(nftTrade.buyer);
    const sellerWhale = this.isTrackedWhale(nftTrade.seller);

    if (buyerWhale || sellerWhale) {
      console.log(`🎨 High-value NFT trade by whale: ${tradeValue}`);

      return {
        type: "whale_nft_trade",
        data: {
          nftTrade,
          tradeValue,
          whaleInvolved: buyerWhale || sellerWhale,
          role: buyerWhale ? "buyer" : "seller",
          collection: nftTrade.collection_info,
          marketTrend: await this.analyzeNFTMarketTrend(
            nftTrade.collection_address
          ),
          triggerAnalysis: true,
        },
        timestamp,
      };
    }

    return null;
  }

  async processDeFiEvent(eventData, timestamp) {
    const interaction = eventData.defi_interaction;
    const userAddress = interaction.user_address;

    if (this.isTrackedWhale(userAddress)) {
      console.log(`🏦 DeFi interaction by whale: ${userAddress}`);

      return {
        type: "whale_defi_interaction",
        data: {
          userAddress,
          protocol: interaction.protocol,
          interactionType: interaction.type,
          value: interaction.value_usd,
          significance: this.calculateDeFiSignificance(interaction),
          triggerAnalysis: this.shouldTriggerDeFiAnalysis(interaction),
        },
        timestamp,
      };
    }

    return null;
  }

  queueEvent(event) {
    if (!this.eventQueue) this.eventQueue = [];
    this.eventQueue.push(event);
    if (this.eventQueue.length > 1000) this.eventQueue.shift();
    console.log(`Queued event:`, event);
  }

  async startEventProcessor() {
    if (this.processingQueue) return;

    this.processingQueue = true;
    console.log("🔄 Starting event processor...");

    const processEvents = async () => {
      while (this.eventQueue.length > 0 && this.processingQueue) {
        const eventsToProcess = this.eventQueue.splice(
          0,
          this.monitoringConfig.eventProcessingBatch
        );

        try {
          await this.processBatchEvents(eventsToProcess);
        } catch (error) {
          console.error("❌ Error processing event batch:", error);
        }

        // Small delay to prevent overwhelming the system
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      // Schedule next processing cycle
      setTimeout(processEvents, 1000);
    };

    processEvents();
  }

  async processBatchEvents(events) {
    console.log(`⚡ Processing ${events.length} events...`);

    const analysisPromises = [];
    const alertPromises = [];

    for (const event of events) {
      try {
        // Trigger behavior analysis for significant events
        if (event.data.triggerAnalysis) {
          const userAddress = this.extractUserAddress(event);
          if (userAddress) {
            analysisPromises.push(
              this.analyzeWhaleBehavior(userAddress, "ethereum", "mainnet")
            );
          }
        }

        // Send real-time alerts
        if (this.shouldSendAlert(event)) {
          alertPromises.push(this.sendRealTimeAlert(event));
        }

        // Store event for historical analysis
        this.storeEventForAnalysis(event);
      } catch (error) {
        console.error(`❌ Error processing individual event:`, error);
      }
    }

    // Execute all promises concurrently
    await Promise.allSettled([...analysisPromises, ...alertPromises]);

    console.log(`✅ Processed ${events.length} events`);
  }

  // Generate real-time events from actual whale movements
  generateEventsFromWhaleMovements() {
    for (const movement of this.recentWhaleMovements) {
      if (!movement.eventGenerated) {
        const event = {
          id: `whale-movement-${movement.id}`,
          type: "whale_transaction",
          address: movement.from,
          amount: movement.usdValue,
          chain: movement.chain,
          timestamp: movement.timestamp,
          description: `Large ${
            movement.token
          } transfer: $${movement.usdValue.toLocaleString()}`,
          hash: movement.hash,
          token: movement.token,
          to: movement.to,
          isRealData: true,
        };

        this.queueEvent(event);
        movement.eventGenerated = true; // Mark as processed
      }
    }
  }

  // Override the monitoring to generate events from real data
  async startRealTimeStreams() {
    console.log("🚀 Starting real-time whale monitoring streams...");

    // Generate events from recent whale movements every 30 seconds
    setInterval(() => {
      this.generateEventsFromWhaleMovements();
    }, 30000);

    // Also generate events when new whale movements are detected
    const originalGetRecentWhaleMovements =
      this.getRecentWhaleMovements.bind(this);
    this.getRecentWhaleMovements = async () => {
      const movements = await originalGetRecentWhaleMovements();
      this.generateEventsFromWhaleMovements();
      return movements;
    };

    console.log("✅ Real-time streams started");
  }
  // Portfolio Analytics - analyze whale's token holdings and allocations
  async getWhalePortfolioAnalysis(address) {
    try {
      console.log(`📊 Analyzing portfolio for ${address}`);

      const cacheKey = `portfolio:ethereum:mainnet:${address}`;
      
      // Use advanced caching with longer TTLs for portfolio data (30 min fresh, 2 hours stale)
      return this.getCachedData(
        cacheKey,
        async () => {
          // Get token balances using Nodit API
          const balanceResponse = await this.client.post(
            `/ethereum/mainnet/account/getTokenBalancesByAccount`,
            {
              accountAddress: address,
              rpp: 100,
            }
          );

          if (!balanceResponse.data?.items) {
            return { tokens: [], totalValue: 0, diversificationScore: 0 };
          }
          
          // Continue with the original method logic
          const result = await this.processPortfolioData(address, balanceResponse);
          return result;
        },
        1800000,  // 30 minutes fresh TTL
        7200000   // 2 hours stale TTL
      );
    } catch (error) {
      console.error(`❌ Error analyzing portfolio for ${address}:`, error.message);
      return { tokens: [], totalValue: 0, diversificationScore: 0 };
    }
  }
  
  // Helper method to process portfolio data
  async processPortfolioData(address, balanceResponse) {
    try {
      if (!balanceResponse.data?.items) {
        return { tokens: [], totalValue: 0, diversificationScore: 0 };
      }

      // Get current prices for all tokens
      const tokenAddresses = balanceResponse.data.items
        .filter((item) => item.contract?.address)
        .map((item) => item.contract.address);

      const priceMap = await this.getTokenPrices(
        tokenAddresses,
        "ethereum",
        "mainnet"
      );

      // Calculate portfolio metrics
      const portfolio = {
        tokens: [],
        totalValue: 0,
        diversificationScore: 0,
        riskScore: 0,
        concentrationRisk: 0,
        topHoldings: [],
      };

      for (const item of balanceResponse.data.items) {
        if (!item.balance || item.balance === "0") continue;

        const tokenAddress = item.contract?.address?.toLowerCase();
        const price = priceMap.get(tokenAddress) || 0;
        const decimals = item.contract?.decimals || 18;
        const balance = Number(item.balance) / Math.pow(10, decimals);
        const value = balance * price;

        portfolio.tokens.push({
          symbol: item.contract?.symbol || "UNKNOWN",
          address: tokenAddress,
          balance,
          price,
          value,
          percentage: 0, // Will calculate after total
        });

        portfolio.totalValue += value;
      }

      // Calculate percentages and metrics
      for (const token of portfolio.tokens) {
        token.percentage =
          portfolio.totalValue > 0
            ? (token.value / portfolio.totalValue) * 100
            : 0;
      }

      // Sort by value and get top holdings
      portfolio.tokens.sort((a, b) => b.value - a.value);
      portfolio.topHoldings = portfolio.tokens.slice(0, 10);

      // Calculate diversification score (0-100, higher is more diversified)
      portfolio.diversificationScore = this.calculateDiversificationScore(
        portfolio.tokens
      );

      // Calculate concentration risk (percentage held in top 3 tokens)
      portfolio.concentrationRisk = portfolio.tokens
        .slice(0, 3)
        .reduce((sum, token) => sum + token.percentage, 0);

      return portfolio;
    } catch (error) {
      console.error(
        `❌ Error analyzing portfolio for ${address}:`,
        error.message
      );
      return { tokens: [], totalValue: 0, diversificationScore: 0 };
    }
  }

  // Influence Network - analyze connections between whale addresses  async getWhaleInfluenceNetwork() {
    const cacheKey = 'whale:influence:network';
    
    return this.getCachedData(
      cacheKey,
      async () => {
        try {
          console.log(`�️ Analyzing whale influence network`);
          
          const guardianWhales = Array.from(this.guardianWhales.values());
          const network = {
            nodes: [],
            edges: [],
            clusters: [],
            influenceScores: new Map(),
          };

          // Create nodes for each guardian whale
          for (const whale of guardianWhales) {
            network.nodes.push({
              id: whale.address,
              label: `${whale.address.slice(0, 6)}...${whale.address.slice(-4)}`,
              guardianScore: whale.score || 0,
              totalVolume: whale.totalVolume || 0,
              strategies: whale.strategies?.length || 0,
              type: "guardian_whale",
            });
          }

      // Create nodes for each guardian whale
      for (const whale of guardianWhales) {
        network.nodes.push({
          id: whale.address,
          label: `${whale.address.slice(0, 6)}...${whale.address.slice(-4)}`,
          guardianScore: whale.score || 0,
          totalVolume: whale.totalVolume || 0,
          strategies: whale.strategies?.length || 0,
          type: "guardian_whale",
        });
      }

      // Analyze transaction patterns to find connections
      const connections = await this.findWhaleConnections(guardianWhales);

      // Create edges based on transaction relationships
      for (const connection of connections) {
        network.edges.push({
          source: connection.from,
          target: connection.to,
          weight: connection.transactionCount,
          volume: connection.totalVolume,
          type: connection.relationship,
        });
      }

      // Calculate influence scores
      for (const whale of guardianWhales) {
        const score = this.calculateInfluenceScore(whale.address, network);
        network.influenceScores.set(whale.address, score);
      }

      return {
        nodes: network.nodes,
        edges: network.edges,
        stats: {
          totalWhales: network.nodes.length,
          totalConnections: network.edges.length,
          averageInfluence:
            Array.from(network.influenceScores.values()).reduce(
              (sum, score) => sum + score,
              0
            ) / network.influenceScores.size || 0,
        },
      };
    } catch (error) {
      console.error(`❌ Error analyzing influence network:`, error.message);
      return {
        nodes: [],
        edges: [],
        stats: { totalWhales: 0, totalConnections: 0, averageInfluence: 0 },
      };
    }
  }

  // Helper method to find connections between whales based on transaction patterns
  async findWhaleConnections(whales) {
    const connections = [];
    const addressSet = new Set(whales.map((w) => w.address.toLowerCase()));

    // Analyze recent whale movements for connections
    for (const movement of this.recentWhaleMovements) {
      const fromAddr = movement.from?.toLowerCase();
      const toAddr = movement.to?.toLowerCase();

      if (
        fromAddr &&
        toAddr &&
        addressSet.has(fromAddr) &&
        addressSet.has(toAddr)
      ) {
        // Find existing connection or create new one
        let connection = connections.find(
          (c) =>
            (c.from === fromAddr && c.to === toAddr) ||
            (c.from === toAddr && c.to === fromAddr)
        );

        if (!connection) {
          connection = {
            from: fromAddr,
            to: toAddr,
            transactionCount: 0,
            totalVolume: 0,
            relationship: "transaction",
          };
          connections.push(connection);
        }

        connection.transactionCount++;
        connection.totalVolume += movement.usdValue || 0;
      }
    }

    return connections;
  }

  // Calculate influence score based on network position and activity
  calculateInfluenceScore(address, network) {
    const connections = network.edges.filter(
      (e) => e.source === address || e.target === address
    );

    const whale = network.nodes.find((n) => n.id === address);
    if (!whale) return 0;

    // Base score from guardian score
    let score = (whale.guardianScore || 0) * 0.4;

    // Network connectivity score (0-30 points)
    const connectivityScore = Math.min(30, connections.length * 3);
    score += connectivityScore;

    // Volume influence score (0-30 points)
    const totalVolume = connections.reduce(
      (sum, conn) => sum + (conn.volume || 0),
      0
    );
    const volumeScore = Math.min(30, Math.log10(totalVolume + 1) * 3);
    score += volumeScore;

    return Math.min(100, Math.round(score));
  }

  calculateDiversificationScore(tokens) {
    if (tokens.length <= 1) return 0;

    // Use Herfindahl-Hirschman Index (HHI) for diversification
    const hhi = tokens.reduce((sum, token) => {
      const percentage = token.percentage / 100;
      return sum + percentage * percentage;
    }, 0);

    // Convert HHI to diversification score (0-100, higher is better)
    return Math.max(0, Math.round((1 - hhi) * 100));
  }
  /**
   * Returns the most recent real alerts (Guardian Whale triggers, large transfers, etc.)
   * Only real event triggers are used; no mock/static data.
   * @param {number} limit - Max number of alerts to return
   * @returns {Array} Array of alert objects
   */  async getRecentAlerts(limit = 20) {
    try {
      const cacheKey = `alerts:recent:${limit}`;
      
      return this.getCachedData(
        cacheKey,
        async () => {
          console.log(`🔔 Getting recent alerts (limit: ${limit})`);
          
          // If we have sufficient alerts in memory, return those
          if (Array.isArray(this.alerts) && this.alerts.length > 0) {
            return this.alerts.slice(-limit).reverse();
          }

          // Otherwise, generate alerts from recent whale movements
          const movements =
            this.recentWhaleMovements.length > 0
              ? this.recentWhaleMovements
              : await this.getRecentWhaleMovements();

      if (!movements || movements.length === 0) {
        console.log("⚠️ No recent movements to generate alerts from");
        return [];
      }

      // Convert top movements to alerts
      const alerts = movements
        .slice(0, Math.min(movements.length, limit))
        .map((movement) => ({
          id: `${movement.hash || ""}-alert`,
          timestamp: movement.timestamp || Date.now(),
          type: "whale_movement",
          title: `${movement.tokenSymbol || "Token"} Whale Movement`,
          description: `Large ${
            movement.tokenSymbol || "token"
          } transfer detected`,
          value: movement.value || 0,
          usdValue: movement.usdValue || 0,
          from: movement.from || "",
          to: movement.to || "",
          hash: movement.hash || "",
          chain: movement.chain || "ethereum",
          severity: movement.usdValue > 1000000 ? "high" : "medium",
        }));

      // Store these alerts for future reference
      this.alerts = [...(this.alerts || []), ...alerts];

      console.log(`✅ Generated ${alerts.length} alerts from recent movements`);
      return alerts;
    } catch (error) {
      console.error("❌ Error in getRecentAlerts:", error);
      return [];
    }
  }
}

export default WhaleMonitor;
