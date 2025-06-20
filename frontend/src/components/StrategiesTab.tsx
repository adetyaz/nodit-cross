import { Brain, Target } from 'lucide-react'
import type { Strategy } from '../types/whale'

interface Props {
  strategies: Array<Strategy>
}

export const StrategiesTab = ({ strategies }: Props) => {
  return (
    <div className="space-y-6">
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <Brain className="w-6 h-6 text-purple-400" />
          Guardian Whale Strategies
        </h2>
        <p className="text-gray-300 mb-6">
          Identified trading strategies and behavioral patterns across Guardian
          Whales
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {strategies.map((strategy) => (
            <div key={strategy.id} className="bg-gray-700/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Target className="w-5 h-5 text-green-400" />
                <h3 className="text-lg font-semibold">{strategy.name}</h3>
              </div>

              <p className="text-gray-300 text-sm mb-3">
                {strategy.description}
              </p>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-400">Success Rate</span>
                  <span className="text-green-400 font-semibold">
                    {strategy.successRate}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Avg Return</span>
                  <span className="text-blue-400">{strategy.avgReturn}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Risk Score</span>
                  <span
                    className={`font-semibold ${
                      strategy.riskScore <= 30
                        ? 'text-green-400'
                        : strategy.riskScore <= 60
                          ? 'text-yellow-400'
                          : 'text-red-400'
                    }`}
                  >
                    {strategy.riskScore}/100
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Whales Using</span>
                  <span className="text-purple-400">{strategy.whaleCount}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
