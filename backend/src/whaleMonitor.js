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
    };
    this.recentWhaleMovements = [];
    this.alerts = [];
    this.trackedTokens = new Map();
    this.apiKey = process.env.NODIT_API_KEY || "nodit-demo";
    this.callCount = 0;
    this.telegramBot = config.telegramBot || null;
    this.subscribedChatIds = config.subscribedChatIds || new Set();

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
        if (transfer.usdValue > 0) {
          const alertMessage = `Whale transfer: ${transfer.usdValue.toFixed(
            2
          )} USD of ${transfer.tokenSymbol} on ${chain}`;
          const alert = {
            id: `alert-${transfer.id}`,
            message: alertMessage,
            severity:
              transfer.usdValue > 1000000
                ? "high"
                : transfer.usdValue > 500000
                ? "medium"
                : "low",
            timestamp: transfer.timestamp,
            chain,
          };
          this.alerts = [alert, ...this.alerts].slice(
            0,
            this.config.maxStoredAlerts
          );
          // Send to Telegram
          await this.sendTelegramAlert(alertMessage);
        }
      }
    }

    this.recentWhaleMovements = [...newMovements, ...this.recentWhaleMovements]
      .filter((m, i, arr) => arr.findIndex((t) => t.id === m.id) === i)
      .slice(0, 100);
    return this.recentWhaleMovements;
  }

  async getRecentAlerts() {
    return this.alerts;
  }

  async getWalletData(address, chains) {
    if (this.config.useMockData) {
      return {
        label: `Wallet ${address.slice(0, 6)}`,
        address,
        alertsEnabled: true,
        totalValue: Math.random() * 1000000,
        lastActivity: Date.now() - Math.random() * 24 * 60 * 60 * 1000,
        chains: chains.length ? chains : this.config.chains,
      };
    }
    return {
      label: `Wallet ${address.slice(0, 6)}`,
      address,
      alertsEnabled: true,
      totalValue: 0,
      lastActivity: Date.now(),
      chains: chains.length ? chains : this.config.chains,
    };
  }

  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    this.recentWhaleMovements = [];
    this.alerts = [];
    console.log("🐋 Config updated:", this.config);
  }
}

export default WhaleMonitor;
