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
      useMockData: config.useMockData || false,
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
    this.trackedWallets = new Map();

    this.client = axios.create({
      baseURL: "https://web3.nodit.io/v1",
      headers: {
        "X-API-KEY": this.apiKey,
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
      timeout: 10000,
    });

    if (this.config.useMockData) {
      this.initializeMockData();
      console.log("⚠️ Using mock data");
    }
    console.log("🐋 Initialized:", {
      chains: this.config.chains,
      interval: this.config.updateInterval,
    });

    // Initialize real-time monitoring
    this.initializeRealTimeMonitoring();

    // Setup Nodit webhooks for real-time data
    this.setupNoditWebhooks();
  }

  initializeMockData() {
    const mockMovements = [
      {
        id: "mock1",
        hash: "0xmock123",
        from: "0xmockfrom",
        to: "0xmockto",
        value: 1000000000000,
        tokenSymbol: "USDT",
        tokenDecimals: 6,
        contractAddress: "0xmockcontract",
        timestamp: Date.now(),
        tokenName: "Tether USD",
        tokenType: "ERC20",
        type: "token_transfer",
        usdValue: 1000000,
        tokenPrice: 1,
        valueInWei: "1000000000000",
        chain: "polygon",
        priceImpact: 0.5,
      },
      {
        id: "mock2",
        hash: "0xmock456",
        from: "0xmockfrom2",
        to: "0xmockto2",
        value: 50000000000000000000,
        tokenSymbol: "ETH",
        tokenDecimals: 18,
        contractAddress: null,
        timestamp: Date.now() - 60000,
        tokenName: "Ether",
        tokenType: "native",
        type: "native_transfer",
        usdValue: 100000,
        tokenPrice: 2000,
        valueInWei: "50000000000000000000",
        chain: "ethereum",
        priceImpact: 0.3,
      },
    ];
    this.recentWhaleMovements = mockMovements;
    this.alerts = mockMovements.map((m) => ({
      id: `alert-${m.id}`,
      message: `Whale transfer: ${m.value} ${m.tokenSymbol} on ${m.chain}`,
      severity: "high",
      timestamp: m.timestamp,
      chain: m.chain,
    }));
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
      if (
        error.response?.status === 400 ||
        error.response?.status === 401 ||
        error.response?.status === 404
      ) {
        console.warn(
          `⚠️ ${error.response.status} for ${url}. Using mock data fallback.`
        );
        this.initializeMockData();
        return { data: { items: this.recentWhaleMovements } };
      }
      throw error;
    }
  }

  async getTokenTransfers(protocol, network, fromTimestamp, toTimestamp) {
    if (this.config.useMockData) return this.recentWhaleMovements;
    try {
      const response = await this.makeRequest(
        "POST",
        `/${protocol}/mainnet/token/getTokenTransfersWithinRange`,
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
      if (!response.data?.items?.length) {
        console.log(`⚠️ No transfers for ${protocol}/${network}`);
        return [];
      }
      return response.data.items.map((transfer) => ({
        id: `${transfer.transactionHash}-${protocol}`,
        hash: transfer.transactionHash,
        from: transfer.from?.toLowerCase(),
        to: transfer.to?.toLowerCase(),
        value: Number(transfer.value),
        tokenSymbol:
          transfer.contract?.symbol || this.getNativeSymbol(protocol),
        tokenDecimals: transfer.contract?.decimals || 18,
        contractAddress: transfer.contract?.address?.toLowerCase(),
        timestamp: new Date(transfer.timestamp * 1000).getTime(),
        tokenName: transfer.contract?.name,
        tokenType: transfer.contract?.type || "native",
        type: transfer.contract ? "token_transfer" : "native_transfer",
      }));
    } catch (error) {
      console.error(`❌ Transfers error for ${protocol}:`, error.message);
      return [];
    }
  }

  async getTokenPrices(tokenAddresses, protocol, network) {
    if (this.config.useMockData) {
      return new Map(
        tokenAddresses.map((addr) => [
          addr.toLowerCase(),
          Math.random() * 2000 + 100,
        ])
      );
    }
    console.warn(
      `⚠️ getTokenPrices not implemented for ${protocol}. Using mock prices.`
    );
    return new Map(
      tokenAddresses.map((addr) => [
        addr.toLowerCase(),
        addr.includes("usdt") ? 1 : 2000,
      ])
    );
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
        const priceImpact = Math.random() * 1;

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
    if (this.config.useMockData) return this.recentWhaleMovements;
    const now = new Date();
    const fromTimestamp = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const newMovements = [];

    for (let i = 0; i < this.config.chains.length; i++) {
      const chain = this.config.chains[i];
      const network = this.config.networks[i];
      const transfers = await this.getTokenTransfers(
        chain,
        network,
        fromTimestamp,
        now
      );
      const whaleTransfers = await this.filterWhaleTransfers(
        transfers,
        chain,
        network
      );
      newMovements.push(...whaleTransfers);

      for (const transfer of whaleTransfers) {
        if (this.config.useMockData) {
          console.log("📦 Mock transfer:", transfer);
        } else {
          // Enrich with price data
          const tokenPrices = await this.getTokenPrices(
            [transfer.contractAddress],
            chain,
            network
          );
          const priceInUSD = tokenPrices.get(transfer.contractAddress) || 0;
          transfer.usdValue = (transfer.value / 1e18) * priceInUSD;
        }
      }
    }

    this.recentWhaleMovements = newMovements;
    return newMovements;
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
      if (guardianScore >= 75) {
        // Threshold for Guardian Whale status
        await this.designateGuardianWhale(address, guardianScore);
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
    const behaviorData = this.whaleBehaviorData.get(address);
    if (!behaviorData) return 0;

    let score = 0;

    // DeFi sophistication and diversification (0-30 points)
    const defiScore = Math.min(
      30,
      behaviorData.defiInteractions.sophisticationScore * 0.2 +
        behaviorData.defiInteractions.diversificationIndex * 20 +
        behaviorData.defiInteractions.protocolsUsed.length * 1.5
    );
    score += defiScore;

    // Account maturity and activity (0-25 points)
    const accountScore = Math.min(
      25,
      behaviorData.accountStats.totalActivity * 0.01 +
        behaviorData.accountStats.diversityScore * 0.15 +
        behaviorData.accountStats.wealthIndicator * 0.1
    );
    score += accountScore;

    // Trading sophistication and patterns (0-25 points)
    const tradingScore = Math.min(
      25,
      behaviorData.transactionPatterns.frequencyScore * 2 +
        behaviorData.transactionPatterns.consistencyScore * 0.15 +
        behaviorData.transactionPatterns.sophisticationIndicators.length * 3 +
        (behaviorData.nftTrading.profitabilityScore > 0 ? 5 : 0)
    );
    score += tradingScore;

    // Risk management and optimization (0-20 points)
    let riskScore = 10; // Base score
    if (behaviorData.defiInteractions.riskScore < 0.3) riskScore += 3; // Conservative risk
    if (behaviorData.liquidityMovements.impermanentLossExposure < 0.4)
      riskScore += 3; // IL awareness
    if (behaviorData.transactionPatterns.gasOptimization) riskScore += 2; // Gas efficient
    if (behaviorData.transactionPatterns.mevProtection) riskScore += 2; // MEV protection
    score += Math.min(20, riskScore);

    console.log(`🎯 Enhanced Guardian score for ${address}: ${score}/100`);
    console.log(`  - DeFi: ${defiScore}/30`);
    console.log(`  - Account: ${accountScore}/25`);
    console.log(`  - Trading: ${tradingScore}/25`);
    console.log(`  - Risk: ${riskScore}/20`);

    return Math.round(score);
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

  // Real-time Monitoring and Webhook Integration

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

  async setupNoditWebhooks() {
    console.log("🔗 Setting up Nodit webhooks for whale monitoring...");

    try {
      // In a real implementation, this would register webhooks with Nodit
      // For now, we'll simulate the webhook registration

      const webhookEvents = [
        "large_token_transfer",
        "liquidity_pool_interaction",
        "nft_high_value_trade",
        "defi_protocol_interaction",
      ];

      for (const event of webhookEvents) {
        this.webhookListeners.set(event, this.createWebhookHandler(event));
        console.log(`📡 Webhook registered for: ${event}`);
      }

      // Mock webhook endpoints
      this.webhookEndpoints = {
        base_url: "https://your-app.com/webhooks/nodit",
        endpoints: {
          large_transfer: "/large-transfer",
          liquidity_movement: "/liquidity-movement",
          nft_trade: "/nft-trade",
          defi_interaction: "/defi-interaction",
        },
      };

      console.log("✅ Nodit webhooks configured");
      return true;
    } catch (error) {
      console.error("❌ Failed to setup Nodit webhooks:", error);
      return false;
    }
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
    if (this.eventQueue.length >= this.monitoringConfig.maxQueueSize) {
      // Remove oldest events if queue is full
      this.eventQueue.shift();
      console.warn("⚠️ Event queue full, removing oldest event");
    }

    this.eventQueue.push(event);
    console.log(
      `📥 Event queued: ${event.type} (Queue size: ${this.eventQueue.length})`
    );
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

  // Real-time streaming simulation (would integrate with actual Nodit streams)
  startRealTimeStreams() {
    console.log("🌊 Starting real-time data streams...");

    // Simulate real-time whale activity
    if (this.config.useMockData) {
      this.startMockRealTimeStream();
    } else {
      // In production, this would connect to actual Nodit streams
      this.connectToNoditStreams();
    }
  }

  startMockRealTimeStream() {
    console.log("🎭 Starting mock real-time stream...");

    const generateMockEvent = () => {
      const eventTypes = [
        "large_transfer",
        "liquidity_movement",
        "nft_trade",
        "defi_interaction",
      ];
      const eventType =
        eventTypes[Math.floor(Math.random() * eventTypes.length)];

      const mockEvent = this.generateMockRealTimeEvent(eventType);
      if (mockEvent) {
        this.queueEvent(mockEvent);
      }

      // Schedule next mock event (every 30-60 seconds)
      const nextEventDelay = 30000 + Math.random() * 30000;
      setTimeout(generateMockEvent, nextEventDelay);
    };

    // Start generating mock events
    setTimeout(generateMockEvent, 5000);
  }

  generateMockRealTimeEvent(eventType) {
    const timestamp = Date.now();
    const trackedAddresses = Array.from(this.trackedWallets.keys());

    if (trackedAddresses.length === 0) return null;

    const whaleAddress =
      trackedAddresses[Math.floor(Math.random() * trackedAddresses.length)];

    switch (eventType) {
      case "large_transfer":
        return {
          type: "whale_large_transfer",
          data: {
            transfer: {
              from: whaleAddress,
              to: `0x${Math.random().toString(16).slice(2, 42)}`,
              value: (Math.random() * 5000000 + 1000000).toString(),
              token: "USDC",
            },
            usdValue: Math.random() * 5000000 + 1000000,
            whaleInvolved: whaleAddress,
            direction: "outgoing",
            significance: "high",
            triggerAnalysis: true,
          },
          timestamp,
        };

      case "liquidity_movement":
        return {
          type: "whale_liquidity_movement",
          data: {
            userAddress: whaleAddress,
            poolAddress: `0x${Math.random().toString(16).slice(2, 42)}`,
            liquidityChange: {
              amount: Math.random() * 1000000 + 100000,
              usd_value: Math.random() * 1000000 + 100000,
              type: Math.random() > 0.5 ? "add" : "remove",
            },
            significance: "medium",
            triggerAnalysis: true,
          },
          timestamp,
        };

      default:
        return null;
    }
  }

  async connectToNoditStreams() {
    console.log("🔗 Connecting to Nodit real-time streams...");

    // In a real implementation, this would establish WebSocket connections
    // or long-polling connections to Nodit's streaming APIs

    try {
      // Placeholder for real stream connections
      console.log("✅ Connected to Nodit streams");
    } catch (error) {
      console.error("❌ Failed to connect to Nodit streams:", error);
      // Fallback to polling mode
      this.startPollingMode();
    }
  }

  startPollingMode() {
    console.log("📊 Starting polling mode for whale monitoring...");

    const pollInterval = 60000; // Poll every minute

    const poll = async () => {
      try {
        await this.pollWhaleActivities();
      } catch (error) {
        console.error("❌ Error during polling:", error);
      }

      setTimeout(poll, pollInterval);
    };

    setTimeout(poll, pollInterval);
  }

  async pollWhaleActivities() {
    console.log("🔍 Polling for whale activities...");

    const trackedAddresses = Array.from(this.trackedWallets.keys());

    for (const address of trackedAddresses) {
      try {
        // Check for recent activity
        const recentActivity = await this.checkRecentActivity(address);
        if (recentActivity.hasSignificantActivity) {
          // Trigger analysis
          await this.analyzeWhaleBehavior(address, "ethereum", "mainnet");
        }
      } catch (error) {
        console.error(`❌ Error polling ${address}:`, error);
      }
    }
  }

  async checkRecentActivity(address) {
    // Check for activity in the last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    try {
      const recentTransfers = await this.makeNoditRequest(
        "getTokenTransfersByAccount",
        "ethereum",
        "mainnet",
        {
          accountAddress: address,
          fromDate: oneHourAgo.toISOString(),
          rpp: 100,
        }
      );

      const transferCount = recentTransfers.data?.items?.length || 0;
      const hasSignificantActivity = transferCount > 5; // More than 5 transfers in an hour

      return {
        hasSignificantActivity,
        transferCount,
        lastActivity:
          transferCount > 0 ? recentTransfers.data.items[0].timestamp : null,
      };
    } catch (error) {
      console.error(`❌ Error checking recent activity for ${address}:`, error);
      return { hasSignificantActivity: false, transferCount: 0 };
    }
  }

  // API Methods for Frontend Integration
  async getRecentEvents() {
    return this.eventQueue.slice(-50).reverse(); // Return last 50 events
  }

  async handleWebhookEvent(eventType, eventData) {
    console.log(`🔔 Processing webhook: ${eventType}`);

    // Find the appropriate handler
    const handler = this.webhookListeners.get(eventType);
    if (handler) {
      return await handler(eventData);
    } else {
      console.warn(`⚠️ No handler for webhook type: ${eventType}`);
      return false;
    }
  }

  getEventQueueStatus() {
    return {
      queueLength: this.eventQueue.length,
      isProcessing: this.processingQueue,
      maxQueueSize: this.monitoringConfig.maxQueueSize,
      webhooksActive: this.webhookListeners.size,
    };
  }

  async getNFTMarketContext(collectionAddress) {
    // Get market context for NFT collections
    try {
      const marketData = await this.analyzeNFTMarketTrend(collectionAddress);
      return {
        ...marketData,
        isBlueChip: this.identifyBluechipFocus([collectionAddress]),
        riskLevel: marketData.confidence > 0.8 ? "low" : "medium",
      };
    } catch (error) {
      console.error("Error getting NFT market context:", error);
      return null;
    }
  }

  // --- Guardian Whale API Methods ---
  async getGuardianWhales() {
    // Return all guardian whale profiles as an array
    return Array.from(this.guardianWhales.values());
  }

  async getGuardianWhaleStrategies() {
    // Return all strategies for guardian whales
    return Array.from(this.guardianWhaleData.strategies.values());
  }

  async getGuardianWhaleLeaderboard(metric = 'guardianScore', limit = 20) {
    // Return top guardian whales sorted by metric
    const whales = Array.from(this.guardianWhales.values());
    whales.sort((a, b) => (b[metric] || 0) - (a[metric] || 0));
    return whales.slice(0, limit);
  }
}

export default WhaleMonitor;
