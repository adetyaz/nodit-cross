import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import WhaleMonitor from "./whaleMonitor.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

let whaleMonitor = new WhaleMonitor({
  whaleThreshold: "10000000000000000000000",
  chains: ["ethereum", "polygon", "arbitrum", "base", "optimism"],
  networks: ["mainnet", "mainnet", "mainnet", "mainnet", "mainnet"],
  updateInterval: 30000,
  useMockData: process.env.USE_MOCK_DATA === "true",
});

app.get("/api/whales", async (req, res) => {
  try {
    const whales = await whaleMonitor.getRecentWhaleMovements();
    res.json(whales);
  } catch (error) {
    console.error("Error fetching whales:", error);
    res.status(500).json({ error: "Failed to fetch whale movements" });
  }
});

app.get("/api/alerts", async (req, res) => {
  try {
    const alerts = await whaleMonitor.getRecentAlerts();
    res.json(alerts);
  } catch (error) {
    console.error("Error fetching alerts:", error);
    res.status(500).json({ error: "Failed to fetch alerts" });
  }
});

app.get("/api/wallet", async (req, res) => {
  const { address, chains } = req.query;
  if (!address || typeof address !== "string") {
    return res.status(400).json({ error: "Valid wallet address required" });
  }
  try {
    const walletData = await whaleMonitor.getWalletData(
      address,
      chains ? chains.split(",") : []
    );
    res.json(walletData);
  } catch (error) {
    console.error("Error fetching wallet data:", error);
    res.status(500).json({ error: "Failed to fetch wallet data" });
  }
});

app.post("/api/subscribe", async (req, res) => {
  const { chatId } = req.body;
  if (!chatId || typeof chatId !== "string") {
    return res.status(400).json({ error: "Valid chat ID required" });
  }
  try {
    res.json({ message: `Subscribed with chat ID ${chatId}` });
  } catch (error) {
    console.error("Error subscribing:", error);
    res.status(500).json({ error: "Failed to subscribe" });
  }
});

app.post("/api/config", async (req, res) => {
  const { whaleThreshold, chains, networks, updateInterval } = req.body;
  if (
    !whaleThreshold ||
    !chains?.length ||
    !networks?.length ||
    !updateInterval
  ) {
    return res.status(400).json({ error: "Invalid configuration" });
  }
  if (!Array.isArray(chains) || !Array.isArray(networks)) {
    return res
      .status(400)
      .json({ error: "Chains and networks must be arrays" });
  }
  const validChains = ["ethereum", "polygon", "arbitrum", "base", "optimism"];
  if (chains.some((c) => !validChains.includes(c))) {
    return res
      .status(400)
      .json({
        error: `Invalid chain(s). Supported: ${validChains.join(", ")}`,
      });
  }
  try {
    whaleMonitor.updateConfig({
      whaleThreshold: String(whaleThreshold),
      chains,
      networks,
      updateInterval: Number(updateInterval),
    });
    res.json({ message: "Configuration updated" });
  } catch (error) {
    console.error("Error updating config:", error);
    res.status(500).json({ error: "Failed to update configuration" });
  }
});

app.listen(port, () => {
  console.log(`Whale Tracker on port ${port}`);
});
