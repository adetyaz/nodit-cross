import { Activity, Zap } from 'lucide-react'
import type { RealTimeEvent } from '../types/whale'

interface Props {
  events: Array<RealTimeEvent>
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

export const RealTimeEventsTab = ({ events }: Props) => {
  return (
    <div className="space-y-6">
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <Zap className="w-6 h-6 text-yellow-400" />
          Real-time Whale Events
        </h2>
        <p className="text-gray-300 mb-6">
          Live stream of whale activities and market movements
        </p>

        <div className="space-y-3 max-h-96 overflow-y-auto">
          {events.map((event, index) => (
            <div
              key={event.id || index}
              className="bg-gray-700/50 rounded-lg p-4 border-l-4 border-blue-400"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-400" />
                  <span className="font-semibold text-blue-400">
                    {event.type}
                  </span>
                </div>
                <span className="text-gray-400 text-sm">
                  {formatTimeAgo(event.timestamp)}
                </span>
              </div>

              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-400">Address</span>
                  <span className="font-mono text-green-400">
                    {event.address.slice(0, 6)}...{event.address.slice(-4)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Amount</span>
                  <span className="text-yellow-400 font-semibold">
                    ${(event.amount / 1000000).toFixed(2)}M
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Chain</span>
                  <span className="text-purple-400">{event.chain}</span>
                </div>
                {event.description && (
                  <p className="text-gray-300 mt-2">{event.description}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
