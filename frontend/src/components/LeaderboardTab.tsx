import { Award, Crown, Star } from 'lucide-react'
import type { GuardianWhale } from '../types/whale'

interface Props {
  leaderboard: Array<GuardianWhale>
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

export const LeaderboardTab = ({ leaderboard, onWhaleSelect }: Props) => {
  return (
    <div className="space-y-6">
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <Crown className="w-6 h-6 text-yellow-400" />
          Guardian Whale Leaderboard
        </h2>
        <p className="text-gray-300 mb-6">
          Top-performing Guardian Whales ranked by various metrics
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="pb-3 text-gray-400">Rank</th>
                <th className="pb-3 text-gray-400">Address</th>
                <th className="pb-3 text-gray-400">Guardian Score</th>
                <th className="pb-3 text-gray-400">Total Volume</th>
                <th className="pb-3 text-gray-400">Success Rate</th>
                <th className="pb-3 text-gray-400">Badge</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((whale, index) => {
                const badge = getGuardianScoreBadge(whale.guardianScore)
                return (
                  <tr
                    key={whale.address + '-' + index}
                    className="border-b border-gray-800 hover:bg-gray-700/30"
                  >
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        {index === 0 && (
                          <Crown className="w-4 h-4 text-yellow-400" />
                        )}
                        {index === 1 && (
                          <Award className="w-4 h-4 text-gray-300" />
                        )}
                        {index === 2 && (
                          <Star className="w-4 h-4 text-orange-400" />
                        )}
                        <span className="font-semibold">#{index + 1}</span>
                      </div>
                    </td>
                    <td className="py-3">
                      <button
                        onClick={() => onWhaleSelect(whale)}
                        className="font-mono text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        {whale.address.slice(0, 6)}...{whale.address.slice(-4)}
                      </button>
                    </td>
                    <td className="py-3">
                      <span
                        className={`font-bold ${getGuardianScoreColor(whale.guardianScore)}`}
                      >
                        {whale.guardianScore}
                      </span>
                    </td>
                    <td className="py-3 text-green-400 font-semibold">
                      ${(whale.totalVolume / 1000000).toFixed(1)}M
                    </td>
                    <td className="py-3 text-blue-400">{whale.successRate}%</td>
                    <td className="py-3">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${badge.color} text-white`}
                      >
                        {badge.text}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
