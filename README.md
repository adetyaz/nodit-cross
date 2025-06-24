# Cross-Chain Whale Tracker & Wallet Management System

This project tracks and visualizes whale movements and wallet activities across multiple chains (Ethereum, Polygon, XRPL) using Nodit APIs. It features comprehensive monitoring tools, alert systems, and inheritance management solutions.

## Deployment

The application is deployed on Render:
- Frontend: [https://whale-tracker-frontend.onrender.com](https://whale-tracker-frontend.onrender.com)
- Backend: [https://nodit-backend.onrender.com](https://nodit-backend.onrender.com)

## Core Features

### Whale Tracking

- Real-time monitoring of large transactions
- Token impact analysis on market conditions
- Customizable alert thresholds
- Historical movement patterns

### Whale-Centric Wallet Tracking

- Multi-wallet dashboard for whale addresses
- Whale transaction pattern analysis
- Cross-chain balance monitoring
- Whale wallet clustering and relationship mapping
- Gas fee optimization alerts

### Multi-Chain Inheritance Vault

- Smart contract-based inheritance system
- Time-locked transfer mechanisms
- Multi-signature security
- Dead man's switch functionality

### Inheritance Vault Roadmap

- Multi-token portfolio distribution
- Inheritance tax optimization
- Scheduled partial transfers
- Multi-generational transfer planning
- Cross-chain asset consolidation
- Beneficiary verification system

## Structure

- `backend/` — Node.js service for monitoring, analytics, and alerts
- `frontend/` — React dashboard for visualization and user interaction

## Setup

Instructions for backend and frontend setup will be provided in their respective folders.

---

## Roadmap

- [x] Backend: Whale monitoring, alerting, token impact analysis
- [x] Frontend: Real-time dashboard, alert management
- [ ] Multi-Chain Inheritance Vault integration

## Nodit API Usage Documentation

### Nodit APIs Used in the Project

| API Endpoint                                               | Method | Purpose                                   | TTL Cache          | Called By                     |
| ---------------------------------------------------------- | ------ | ----------------------------------------- | ------------------ | ----------------------------- |
| `/{protocol}/{network}/token/getTokenTransfersWithinRange` | POST   | Fetch token transfers within a time range | 30 min (1800000ms) | `getTokenTransfers()`         |
| `/{protocol}/{network}/token/getTokenPricesByContracts`    | POST   | Get token prices by contract addresses    | 60 min (3600000ms) | `getTokenPrices()`            |
| `/ethereum/mainnet/account/getTokenBalancesByAccount`      | POST   | Get token balances for an account         | 30 min (1800000ms) | `getWhalePortfolioAnalysis()` |

### WhaleMonitor Methods Using Nodit APIs

| Method                        | API Endpoints Used                                         | Called By                                               |
| ----------------------------- | ---------------------------------------------------------- | ------------------------------------------------------- |
| `getTokenTransfers()`         | `/{protocol}/{network}/token/getTokenTransfersWithinRange` | `getRecentWhaleMovements()`, `analyzeWhaleBehavior()`   |
| `getTokenPrices()`            | `/{protocol}/{network}/token/getTokenPricesByContracts`    | `filterWhaleTransfers()`, `getWhalePortfolioAnalysis()` |
| `getRecentWhaleMovements()`   | Calls `getTokenTransfers()`                                | `/api/whales` endpoint                                  |
| `analyzeWhaleBehavior()`      | Calls `getTokenTransfers()`                                | `getWhaleBehaviorAnalysis()`                            |
| `getRecentAlerts()`           | Processes data from `getRecentEvents()`                    | `/api/alerts` endpoint                                  |
| `getRecentEvents()`           | Derived from whale movements                               | `/api/events` endpoint                                  |
| `getWhalePortfolioAnalysis()` | `/ethereum/mainnet/account/getTokenBalancesByAccount`      | `/api/portfolio/:address` endpoint                      |

### Enhanced Caching System

The enhanced caching system now implements the following features:

1. **Increased TTLs for High-Frequency Endpoints**

   - Token Transfers: 30 minutes (up from 1 minute)
   - Token Prices: 60 minutes (up from 5 minutes)
   - General cache: 15 minutes default, 1 hour stale TTL

2. **Stale-While-Revalidate Pattern**

   - Returns stale data immediately while refreshing cache in background
   - Prevents blocking on API requests when acceptable stale data is available

3. **Advanced Rate Limit Handling**

   - Exponential backoff (starting at 2 minutes, max 4 hours)
   - Global rate limiting state to prevent multiple concurrent requests during cooldown
   - Automatic fallback to stale data during rate limit periods

4. **Cache Statistics and Monitoring**

   - Tracks hits, misses, stale hits, and rate limit events
   - Periodic logging of cache performance metrics
   - Improved cache memory management (increased from 150 to 300 entries)

5. **Background Refresh**
   - Non-blocking cache updates for frequently accessed data
   - Prevention of duplicate refreshes for the same cache key

This enhanced caching system should significantly reduce 429 rate limit errors by better utilizing cached data and implementing proper backoff strategies.
