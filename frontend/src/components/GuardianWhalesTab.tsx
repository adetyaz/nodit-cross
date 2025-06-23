import { Brain, Crown, Eye, Shield, Zap } from 'lucide-react'
import type { GuardianWhale } from '../types/whale'

interface Props {
  guardianWhales: Array<GuardianWhale>
  selectedWhale: GuardianWhale | null
  whaleBehavior: any
  aiInsights: any
  onWhaleSelect: (whale: GuardianWhale) => void
}

const getGuardianScoreColor = (score: number) => {
  if (score >= 80) return 'text-green-400'
  if (score >= 60) return 'text-yellow-400'
  if (score >= 40) return 'text-orange-400'
  return 'text-red-400'
}

const getGuardianScoreBadge = (score: number) => {
  if (score >= 90) return { text: 'Elite Guardian', color: 'bg-purple-500' }
  if (score >= 80) return { text: 'Guardian Pro', color: 'bg-green-500' }
  if (score >= 60) return { text: 'Guardian', color: 'bg-blue-500' }
  if (score >= 40) return { text: 'Emerging', color: 'bg-yellow-500' }
  return { text: 'Novice', color: 'bg-gray-500' }
}

export const GuardianWhalesTab = ({
  guardianWhales,
  selectedWhale,
  whaleBehavior,
  aiInsights,
  onWhaleSelect,
}: Props) => {
  return (
    <div className="space-y-6">
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <Shield className="w-6 h-6 text-blue-400" />
          Guardian Whales
        </h2>
        <p className="text-gray-300 mb-6">
          Elite whales with high Guardian Scores based on behavioral analysis
          and market impact
        </p>{' '}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.isArray(guardianWhales) && guardianWhales.length > 0 ? (
            Array.from(
              new Set(
                guardianWhales.filter((w) => w.address).map((w) => w.address),
              ),
            ).map((address, idx) => {
              const whale = guardianWhales.find((w) => w.address === address)
              if (!whale || !whale.address) return null
              const badge = getGuardianScoreBadge(whale.guardianScore || 0)
              return (
                <div
                  key={whale.address + '-' + idx}
                  className="bg-gray-700/50 rounded-lg p-4 hover:bg-gray-700 transition-all cursor-pointer border-l-4 border-blue-400"
                  onClick={() => onWhaleSelect(whale)}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Crown className="w-5 h-5 text-yellow-400" />
                      <span className="font-mono text-sm">
                        {whale.address.slice(0, 6)}...{whale.address.slice(-4)}
                      </span>
                    </div>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-semibold ${badge.color} text-white`}
                    >
                      {badge.text}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Guardian Score</span>
                      <span
                        className={`font-bold ${getGuardianScoreColor(whale.guardianScore || 0)}`}
                      >
                        {whale.guardianScore || 0}/100
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Total Volume</span>
                      <span className="text-green-400 font-semibold">
                        ${((whale.totalVolume || 0) / 1000000).toFixed(1)}M
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Strategies</span>
                      <span className="text-blue-400">
                        {Array.isArray(whale.strategies)
                          ? whale.strategies.length
                          : 0}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Risk Level</span>
                      <span
                        className={`font-semibold ${
                          whale.riskLevel === 'low'
                            ? 'text-green-400'
                            : whale.riskLevel === 'medium'
                              ? 'text-yellow-400'
                              : 'text-red-400'
                        }`}
                      >
                        {whale.riskLevel.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })
          ) : (
            <div className="col-span-full text-center py-8 text-gray-400">
              <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No Guardian Whales found yet.</p>
              <p className="text-sm mt-2">
                Guardian Whales will appear here when addresses with high
                activity and sophisticated trading patterns are detected.
              </p>
            </div>
          )}
        </div>
      </div>
      {/* Selected Whale Details */}
      {selectedWhale && whaleBehavior && (
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Eye className="w-5 h-5 text-green-400" />
            Whale Analysis: {selectedWhale.address.slice(0, 6)}...
            {selectedWhale.address.slice(-4)}
          </h3>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Behavior Analysis */}
            <div className="bg-gray-700/30 rounded-lg p-4">
              <h4 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Brain className="w-4 h-4 text-purple-400" />
                Behavioral Patterns
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">DeFi Activity</span>
                  <span className="text-blue-400">
                    {whaleBehavior.defiScore}/100
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">NFT Trading</span>
                  <span className="text-purple-400">
                    {whaleBehavior.nftScore}/100
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">LP Movements</span>
                  <span className="text-green-400">
                    {whaleBehavior.lpScore}/100
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Sophistication</span>
                  <span className="text-yellow-400">
                    {whaleBehavior.sophisticationLevel}
                  </span>
                </div>
              </div>
            </div>

            {/* AI Insights */}
            {aiInsights && (
              <div className="bg-gray-700/30 rounded-lg p-4">
                <h4 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-400" />
                  AI Insights
                </h4>
                <div className="space-y-3">
                  <div>
                    <span className="text-gray-400 block mb-1">
                      Trading Style
                    </span>
                    <span className="text-green-400 font-semibold">
                      {aiInsights.tradingStyle}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 block mb-1">
                      Market Position
                    </span>
                    <span className="text-blue-400">
                      {aiInsights.marketPosition}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 block mb-1">
                      Primary Strategy
                    </span>
                    <span className="text-purple-400">
                      {aiInsights.primaryStrategy}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 block mb-1">Confidence</span>
                    <span className="text-yellow-400">
                      {(aiInsights.confidence * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
