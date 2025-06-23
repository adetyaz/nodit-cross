import { AlertTriangle, RefreshCw } from 'lucide-react'
import type {
  GuardianWhale,
  PriceImpact,
  RealTimeEvent,
  WhaleTransaction,
} from '../types/whale'

interface Props {
  whaleTransactions: Array<WhaleTransaction>
  guardianWhales: Array<GuardianWhale>
  realTimeEvents: Array<RealTimeEvent>
  priceImpactData: Array<PriceImpact>
  loading: boolean
  error: string
  onWhaleSelect: (whale: GuardianWhale) => void
}

const supportedChains = {
  ethereum: { name: 'Ethereum', color: 'bg-blue-500', symbol: 'ETH' },
  polygon: { name: 'Polygon', color: 'bg-purple-500', symbol: 'MATIC' },
  arbitrum: { name: 'Arbitrum', color: 'bg-cyan-500', symbol: 'ARB' },
  base: { name: 'Base', color: 'bg-indigo-500', symbol: 'ETH' },
  optimism: { name: 'Optimism', color: 'bg-red-500', symbol: 'OP' },
}

const formatTimeAgo = (timestamp: number) => {
  const now = Date.now()
  const diff = now - timestamp
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)

  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

const getGuardianScoreBadge = (score: number) => {
  if (score >= 90) return { text: 'Elite Guardian', color: 'bg-purple-500' }
  if (score >= 80) return { text: 'Guardian Pro', color: 'bg-green-500' }
  if (score >= 60) return { text: 'Guardian', color: 'bg-blue-500' }
  if (score >= 40) return { text: 'Emerging', color: 'bg-yellow-500' }
  return { text: 'Novice', color: 'bg-gray-500' }
}

export const DashboardOverview = ({
  whaleTransactions,
  guardianWhales,
  realTimeEvents,
  priceImpactData,
  loading,
  error,
  onWhaleSelect,
}: Props) => {
  return (
    <>
      {loading && (
        <div className="absolute rounded-lg bg-blue-400/60 top-10 left-1/2 transform -translate-x-1/2 p-4 text-center">
          <p className="text-lg font-semibold">Loading whale data...</p>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4">
          <h3 className="text-lg font-medium text-gray-300 mb-2">
            Guardian Whales
          </h3>
          <p className="text-3xl font-bold text-purple-400">
            {guardianWhales.length}
          </p>
          <p className="text-sm text-gray-500 mt-1">Active monitors</p>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4">
          <h3 className="text-lg font-medium text-gray-300 mb-2">
            Recent Whales
          </h3>
          <p className="text-3xl font-bold text-green-400">
            {whaleTransactions.length}
          </p>
          <p className="text-sm text-gray-500 mt-1">Last 24 hours</p>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4">
          <h3 className="text-lg font-medium text-gray-300 mb-2">
            Total Volume
          </h3>
          <p className="text-3xl font-bold text-blue-400">
            $
            {(
              whaleTransactions.reduce((acc, tx) => acc + tx.usdValue, 0) /
              1000000
            ).toFixed(1)}
            M
          </p>
          <p className="text-sm text-gray-500 mt-1">USD equivalent</p>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4">
          <h3 className="text-lg font-medium text-gray-300 mb-2">
            Live Events
          </h3>
          <p className="text-3xl font-bold text-yellow-400">
            {realTimeEvents.length}
          </p>
          <p className="text-sm text-gray-500 mt-1">Real-time stream</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Whale Transactions */}
        <div className="lg:col-span-2">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">
                Recent Whale Movements
              </h2>
              <div className="flex gap-2">
                <button
                  className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-all disabled:opacity-50"
                  disabled={loading}
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-700">
                    <th className="pb-3">Chain</th>
                    <th className="pb-3">Transaction</th>
                    <th className="pb-3">From/To</th>
                    <th className="pb-3">Amount</th>
                    <th className="pb-3">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {whaleTransactions.slice(0, 20).map((tx, index) => (
                    <tr
                      key={index + 1}
                      className="border-b border-gray-800 hover:bg-gray-700/30 transition-colors"
                    >
                      <td className="py-3">
                        <div
                          className={`inline-block px-2 py-1 rounded-full text-xs font-medium text-white ${
                            supportedChains[
                              tx.chain as keyof typeof supportedChains
                            ].color || 'bg-gray-500'
                          }`}
                        >
                          {tx.chain.toUpperCase() || 'UNKNOWN'}
                        </div>
                      </td>
                      <td className="py-3">
                        <div className="font-mono text-sm text-blue-400">
                          {tx.hash
                            ? `${tx.hash.slice(0, 6)}...${tx.hash.slice(-4)}`
                            : 'N/A'}
                        </div>
                      </td>
                      <td className="py-3">
                        <div className="text-xs space-y-1">
                          <div className="text-gray-400">
                            From:{' '}
                            <span className="text-red-400 font-mono">
                              {tx.from
                                ? `${tx.from.slice(0, 6)}...${tx.from.slice(-4)}`
                                : 'N/A'}
                            </span>
                          </div>
                          <div className="text-gray-400">
                            To:{' '}
                            <span className="text-green-400 font-mono">
                              {tx.to
                                ? `${tx.to.slice(0, 6)}...${tx.to.slice(-4)}`
                                : 'N/A'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3">
                        <div className="space-y-1">
                          <div className="text-lg font-bold text-green-400">
                            ${tx.usdValue.toLocaleString() || '0'}
                          </div>
                          <div className="text-xs text-gray-400">
                            {Number(tx.value).toLocaleString()} {tx.token}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 text-gray-400 text-sm">
                        {formatTimeAgo(tx.timestamp)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {whaleTransactions.length === 0 && !loading && (
              <div className="text-center py-8 text-gray-500">
                No whale transactions found. Check your configuration or try
                again later.
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Top Guardian Whales */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6">
            <h3 className="text-xl font-bold mb-4 text-white">
              Top Guardian Whales
            </h3>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {Array.isArray(guardianWhales) && guardianWhales.length > 0 ? (
                guardianWhales.slice(0, 5).map((whale) => {
                  const badge = getGuardianScoreBadge(whale.guardianScore)
                  return (
                    <div
                      key={whale.address}
                      className="p-3 bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-700"
                      onClick={() => onWhaleSelect(whale)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono text-sm text-blue-400">
                          {whale.address.slice(0, 6)}...
                          {whale.address.slice(-4)}
                        </span>
                        <span
                          className={`px-2 py-1 rounded text-xs ${badge.color} text-white`}
                        >
                          {badge.text}
                        </span>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="text-gray-400">No guardian whales found.</div>
              )}
            </div>
          </div>

          {/* Market Impact */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6">
            <h3 className="text-xl font-bold mb-4 text-white">Market Impact</h3>
            <div className="space-y-3">
              {priceImpactData.map((impact, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-white">{impact.symbol}</p>
                    <p className="text-xs text-gray-400">
                      Vol: ${impact.volume.toLocaleString()}
                    </p>
                  </div>
                  <div
                    className={`text-right ${
                      impact.impact > 0 ? 'text-green-400' : 'text-red-400'
                    }`}
                  >
                    <p className="font-bold">
                      {impact.impact > 0 ? '+' : ''}
                      {impact.impact.toFixed(2)}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-4 bg-red-900/50 border border-red-500 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <p className="text-red-200">{error}</p>
          </div>
        </div>
      )}
    </>
  )
}
