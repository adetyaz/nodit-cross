/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

/* eslint-disable */
// @ts-nocheck -- Temporarily disable type checking for this file
import { useCallback, useEffect, useState } from 'react'
import {
  AlertTriangle,
  Bell,
  Search,
  Filter,
  RefreshCw,
  Activity,
  Wallet,
  DollarSign,
  Eye,
} from 'lucide-react'

import toast, { Toaster } from 'react-hot-toast'

const WhaleTrackerDashboard = () => {
  const [selectedChains, setSelectedChains] = useState([
    'ethereum',
    'polygon',
    'arbitrum',
    'base',
    'optimism',
  ])
  const [whaleThreshold, setWhaleThreshold] = useState('100000')
  const [timeRange, setTimeRange] = useState('24h')
  const [alerts, setAlerts] = useState([])
  const [whaleTransactions, setWhaleTransactions] = useState([])
  const [priceImpactData, setPriceImpactData] = useState([])
  const [loading, setLoading] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [error, setError] = useState('')
  const [walletAddress, setWalletAddress] = useState('')

  const apiBaseUrl = 'https://nodit-cross.onrender.com'

  const notify = () => toast('Coming soon!')

  const supportedChains = {
    ethereum: { name: 'Ethereum', color: 'bg-blue-500', symbol: 'ETH' },
    polygon: { name: 'Polygon', color: 'bg-purple-500', symbol: 'MATIC' },
    arbitrum: { name: 'Arbitrum', color: 'bg-cyan-500', symbol: 'ARB' },
    base: { name: 'Base', color: 'bg-indigo-500', symbol: 'ETH' },
    optimism: { name: 'Optimism', color: 'bg-red-500', symbol: 'OP' },
  }

  const fetchWhaleData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${apiBaseUrl}/api/whales`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setWhaleTransactions(
        data.map((tx, i) => ({
          id: tx.hash || tx.transactionHash || `tx-${i}`,
          chain: tx.chain,
          hash: tx.hash || tx.transactionHash,
          from: tx.from,
          to: tx.to,
          value: Number(tx.value),
          token: tx.tokenSymbol || tx.token || 'ETH',
          timestamp: Number(tx.timestamp),
          type: tx.type || 'transfer',
          usdValue: Number(tx.usdValue || tx.usd || 0),
          priceImpact: Number(tx.priceImpact || 0),
        })),
      )
    } catch (err) {
      console.error('Error fetching whale data:', err)
      setError('Failed to fetch whale transactions.')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/alerts`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setAlerts(data)
    } catch (err) {
      console.error('Error fetching alerts:', err)
      setError('Failed to fetch alerts.')
    }
  }, [])

  const updateConfig = useCallback(async () => {
    try {
      const payload = {
        whaleThreshold: String(whaleThreshold),
        chains: selectedChains,
        networks: selectedChains.map(() => 'mainnet'),
        updateInterval: 30000,
      }
      const res = await fetch(`${apiBaseUrl}/api/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      console.log('Config updated:', data.message)
    } catch (err) {
      console.error('Config update error:', err)
      setError('Failed to update configuration.')
    }
  }, [whaleThreshold, selectedChains])

  const fetchPriceImpactData = useCallback(async () => {
    setPriceImpactData([
      { chain: 'ethereum', token: 'ETH', impact: 0.5, timestamp: Date.now() },
      {
        chain: 'polygon',
        token: 'MATIC',
        impact: 0.3,
        timestamp: Date.now() - 3600000,
      },
    ])
  }, [])

  useEffect(() => {
    fetchWhaleData()
    fetchAlerts()
    fetchPriceImpactData()
    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchWhaleData()
        fetchAlerts()
        fetchPriceImpactData()
      }, 30000)
      return () => clearInterval(interval)
    }
  }, [fetchWhaleData, fetchAlerts, fetchPriceImpactData, autoRefresh])

  useEffect(() => {
    updateConfig()
  }, [whaleThreshold, selectedChains, updateConfig])

  const formatTimeAgo = (timestamp) => {
    const now = Date.now()
    const diff = now - timestamp
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)

    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${Math.floor(hours / 24)}d ago`
  }

  const formatValue = (value) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`
    return `$${value.toFixed(0)}`
  }

  const handleChainToggle = (chain) => {
    setSelectedChains((prev) =>
      prev.includes(chain) ? prev.filter((c) => c !== chain) : [...prev, chain],
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 text-white relative">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Cross-Chain Whale Tracker
            </h1>
            <p className="text-gray-300">
              Monitor large transactions and market impact across multiple
              blockchains
            </p>
          </div>
          <div className="flex items-center space-x-4 mt-4 lg:mt-0">
            <button
              onClick={fetchWhaleData}
              disabled={loading}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw
                className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
              />
              <span>Refresh</span>
            </button>
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                autoRefresh
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-gray-600 hover:bg-gray-700'
              }`}
            >
              Auto: {autoRefresh ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>

        {loading && (
          <div className="absolute rounded-lg bg-blue-400/60 top-10 left-1/2 transform -translate-x-1/2 p-4 text-center">
            <p className="text-lg font-semibold">Loading whale data...</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4">
            <label className="block text-sm font-medium mb-2">
              Whale Threshold (USD)
            </label>
            <input
              type="number"
              value={whaleThreshold}
              onChange={(e) => setWhaleThreshold(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
              placeholder="100000"
            />
          </div>
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4">
            <label className="block text-sm font-medium mb-2">Time Range</label>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
            >
              <option value="1h">Last Hour</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
          </div>
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 lg:col-span-2">
            <label className="block text-sm font-medium mb-2">
              Active Chains
            </label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(supportedChains).map(([key, chain]) => (
                <button
                  key={key}
                  onClick={() => handleChainToggle(key)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                    selectedChains.includes(key)
                      ? `${chain.color} text-white shadow-lg`
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {chain.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4">
            <label className="block text-sm font-medium mb-2">
              Track Wallet
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                placeholder="Wallet Address (e.g., 0x123...)"
                disabled
                className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-gray-500 cursor-not-allowed"
              />
              <button
                onClick={notify}
                className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors"
              >
                Track
              </button>
              <Toaster />
            </div>
          </div>
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4">
            <label className="block text-sm font-medium mb-2">
              Telegram Alerts
            </label>
            <p className="text-sm text-gray-300 mb-4">
              To receive whale alerts, message{' '}
              <a
                href="https://t.me/WhaleVaultBot"
                target="_blank"
                className="text-blue-400 hover:underline"
              >
                @WhaleVaultBot
              </a>{' '}
              on Telegram and send <code>/start</code>.
            </p>
            <a
              href="https://t.me/WhaleVaultBot"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors"
            >
              Open Telegram
            </a>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 backdrop-blur-sm rounded-xl p-6 border border-blue-500/20">
            <div className="flex items-center justify-between mb-2">
              <Activity className="w-8 h-8 text-blue-400" />
              <span className="text-2xl font-bold text-blue-400">
                {
                  whaleTransactions.filter(
                    (tx) => Date.now() - tx.timestamp < 3600000,
                  ).length
                }
              </span>
            </div>
            <h3 className="text-lg font-semibold">Whale Txns (1h)</h3>
            <p className="text-gray-400 text-sm">Large transactions detected</p>
          </div>
          <div className="bg-gradient-to-br from-green-600/20 to-green-800/20 backdrop-blur-sm rounded-xl p-6 border border-green-500/20">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-8 h-8 text-green-400" />
              <span className="text-2xl font-bold text-green-400">
                {formatValue(
                  whaleTransactions.reduce((sum, tx) => sum + tx.usdValue, 0),
                )}
              </span>
            </div>
            <h3 className="text-lg font-semibold">Total Volume</h3>
            <p className="text-gray-400 text-sm">Across all chains</p>
          </div>
          <div className="bg-gradient-to-br from-purple-600/20 to-purple-800/20 backdrop-blur-sm rounded-xl p-6 border border-purple-500/20">
            <div className="flex items-center justify-between mb-2">
              <Wallet className="w-8 h-8 text-purple-400" />
              <span className="text-2xl font-bold text-purple-400">0</span>
            </div>
            <h3 className="text-lg font-semibold">Tracked Wallets</h3>
            <p className="text-gray-400 text-sm">Active monitoring</p>
          </div>
          <div className="bg-gradient-to-br from-orange-600/20 to-orange-800/20 backdrop-blur-sm rounded-xl p-6 border border-orange-500/20">
            <div className="flex items-center justify-between mb-2">
              <Bell className="w-8 h-8 text-orange-400" />
              <span className="text-2xl font-bold text-orange-400">
                {alerts.length}
              </span>
            </div>
            <h3 className="text-lg font-semibold">Active Alerts</h3>
            <p className="text-gray-400 text-sm">Recent notifications</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">
                  Recent Whale Transactions
                </h2>
                <div className="flex items-center space-x-2">
                  <Filter className="w-5 h-5 text-gray-400" />
                  <Search className="w-5 h-5 text-gray-400" />
                </div>
              </div>
              {error && <p className="text-red-400 mb-4">{error}</p>}
              {whaleTransactions.length === 0 ? (
                <p className="text-gray-400">No whale transactions detected.</p>
              ) : (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {whaleTransactions.slice(0, 10).map((tx) => (
                    <div
                      key={tx.id}
                      className="bg-gray-700/50 rounded-lg p-4 hover:bg-gray-700/70 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <div
                            className={`w-3 h-3 rounded-full ${
                              supportedChains[tx.chain]?.color
                            }`}
                          ></div>
                          <span className="font-medium">
                            {tx.token} Transfer
                          </span>
                        </div>
                        <span className="text-sm text-gray-400">
                          {formatTimeAgo(tx.timestamp)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="text-sm text-gray-400 mb-1">
                            From:{' '}
                            <span className="font-mono text-blue-400">
                              {tx.from.slice(0, 6)}...{tx.from.slice(-4)}
                            </span>
                          </div>
                          <div className="text-sm text-gray-400">
                            To:{' '}
                            <span className="font-mono text-blue-400">
                              {tx.to.slice(0, 6)}...{tx.to.slice(-4)}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-green-400">
                            {formatValue(tx.usdValue)}
                          </div>
                          <div className="text-sm text-gray-400">
                            Impact: {tx.priceImpact.toFixed(2)}%
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Active Alerts</h2>
                <Bell className="w-5 h-5 text-orange-400" />
              </div>
              {alerts.length === 0 ? (
                <p className="text-gray-400">No alerts triggered.</p>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {alerts.slice(0, 5).map((alert) => (
                    <div
                      key={alert.id}
                      className={`p-3 rounded-lg border-l-4 ${
                        alert.severity === 'high'
                          ? 'bg-red-900/20 border-red-500'
                          : alert.severity === 'medium'
                            ? 'bg-yellow-900/20 border-yellow-500'
                            : 'bg-blue-900/20 border-blue-500'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium">{alert.message}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {formatTimeAgo(alert.timestamp)}
                          </p>
                        </div>
                        <AlertTriangle
                          className={`w-4 h-4 ml-2 ${
                            alert.severity === 'high'
                              ? 'text-red-400'
                              : alert.severity === 'medium'
                                ? 'text-yellow-400'
                                : 'text-blue-400'
                          }`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Tracked Wallets</h2>
                <Eye className="w-5 h-5 text-purple-400" />
              </div>
              <p className="text-gray-400">No wallets tracked.</p>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center text-gray-400 text-sm">
          <p>
            Data powered by Nodit Blockchain Context API • Real-time cross-chain
            monitoring
          </p>
        </div>
      </div>
    </div>
  )
}

export default WhaleTrackerDashboard
