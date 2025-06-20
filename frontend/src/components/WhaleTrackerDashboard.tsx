import { useCallback, useEffect, useState } from 'react'
import { Activity, Brain, Crown, Shield, Zap } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'

// Hooks
import { useWhaleAPI } from '../hooks/useWhaleAPI'

// Components
import { DashboardOverview } from './DashboardOverview'
import { GuardianWhalesTab } from './GuardianWhalesTab'
import { LeaderboardTab } from './LeaderboardTab'
import { RealTimeEventsTab } from './RealTimeEventsTab'
import { StrategiesTab } from './StrategiesTab'

// Types
import type {
  AIInsights,
  GuardianWhale,
  PriceImpact,
  RealTimeEvent,
  Strategy,
  TabId,
  WhaleBehavior,
  WhaleTransaction,
} from '../types/whale'

const WhaleTrackerDashboard = () => {
  // State
  const [activeTab, setActiveTab] = useState<TabId>('dashboard')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Data state
  const [whaleTransactions, setWhaleTransactions] = useState<
    Array<WhaleTransaction>
  >([])
  const [guardianWhales, setGuardianWhales] = useState<Array<GuardianWhale>>([])
  const [selectedWhale, setSelectedWhale] = useState<GuardianWhale | null>(null)
  const [whaleBehavior, setWhaleBehavior] = useState<WhaleBehavior | null>(null)
  const [aiInsights, setAiInsights] = useState<AIInsights | null>(null)
  const [whaleStrategies, setWhaleStrategies] = useState<Array<Strategy>>([])
  const [guardianLeaderboard, setGuardianLeaderboard] = useState<
    Array<GuardianWhale>
  >([])
  const [realTimeEvents, setRealTimeEvents] = useState<Array<RealTimeEvent>>([])
  const [priceImpactData, setPriceImpactData] = useState<Array<PriceImpact>>([])

  // API hooks
  const {
    fetchWhaleData,
    fetchGuardianWhales,
    fetchWhaleBehavior,
    fetchAIInsights,
    fetchWhaleStrategies,
    fetchGuardianLeaderboard,
    fetchRealTimeEvents,
  } = useWhaleAPI()

  // Tab configuration
  const tabs = [
    { id: 'dashboard' as TabId, label: 'Dashboard', icon: Activity },
    { id: 'guardians' as TabId, label: 'Guardian Whales', icon: Shield },
    { id: 'strategies' as TabId, label: 'Strategies', icon: Brain },
    { id: 'leaderboard' as TabId, label: 'Leaderboard', icon: Crown },
    { id: 'realtime' as TabId, label: 'Real-time Events', icon: Zap },
  ]

  // Data fetching
  const loadInitialData = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const [transactions, guardians, strategies, leaderboard, events] =
        await Promise.all([
          fetchWhaleData().catch(() => []),
          fetchGuardianWhales().catch(() => []),
          fetchWhaleStrategies().catch(() => []),
          fetchGuardianLeaderboard().catch(() => []),
          fetchRealTimeEvents().catch(() => []),
        ])

      setWhaleTransactions(transactions)
      setGuardianWhales(guardians)
      setWhaleStrategies(strategies)
      setGuardianLeaderboard(leaderboard)
      setRealTimeEvents(events)

      // Mock price impact data
      setPriceImpactData([
        { symbol: 'ETH', impact: -2.3, volume: 1500000 },
        { symbol: 'USDT', impact: 0.1, volume: 5000000 },
        { symbol: 'WBTC', impact: -1.8, volume: 800000 },
      ])
    } catch (err) {
      console.error('Error loading data:', err)
      setError('Failed to load dashboard data')
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }, [
    fetchWhaleData,
    fetchGuardianWhales,
    fetchWhaleStrategies,
    fetchGuardianLeaderboard,
    fetchRealTimeEvents,
  ])

  const handleWhaleSelect = useCallback(
    async (whale: GuardianWhale) => {
      setSelectedWhale(whale)

      try {
        const [behavior, insights] = await Promise.all([
          fetchWhaleBehavior(whale.address, '24h'),
          fetchAIInsights(whale.address),
        ])

        setWhaleBehavior(behavior)
        setAiInsights(insights)
      } catch (err) {
        console.error('Error fetching whale details:', err)
        toast.error('Failed to load whale details')
      }
    },
    [fetchWhaleBehavior, fetchAIInsights],
  )

  // Effects
  useEffect(() => {
    loadInitialData()

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchRealTimeEvents().then(setRealTimeEvents).catch(console.error)
    }, 30000)

    return () => clearInterval(interval)
  }, [loadInitialData, fetchRealTimeEvents])

  // Render tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'guardians':
        return (
          <GuardianWhalesTab
            guardianWhales={guardianWhales}
            selectedWhale={selectedWhale}
            whaleBehavior={whaleBehavior}
            aiInsights={aiInsights}
            onWhaleSelect={handleWhaleSelect}
          />
        )
      case 'strategies':
        return <StrategiesTab strategies={whaleStrategies} />
      case 'leaderboard':
        return (
          <LeaderboardTab
            leaderboard={guardianLeaderboard}
            onWhaleSelect={handleWhaleSelect}
          />
        )
      case 'realtime':
        return <RealTimeEventsTab events={realTimeEvents} />
      default:
        return (
          <DashboardOverview
            whaleTransactions={whaleTransactions}
            guardianWhales={guardianWhales}
            realTimeEvents={realTimeEvents}
            priceImpactData={priceImpactData}
            loading={loading}
            error={error}
            onWhaleSelect={handleWhaleSelect}
          />
        )
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 text-white relative">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Cross-Chain Whale Tracker
            </h1>
            <p className="text-gray-300">
              Guardian Whale Protocol - AI-Powered Behavioral Analysis & Market
              Intelligence
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-700">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-t-lg transition-all ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white border-b-2 border-blue-400'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Tab Content */}
        {renderTabContent()}

        {/* Footer */}
        <div className="mt-8 text-center text-gray-400 text-sm">
          <p>
            Data powered by Nodit Blockchain Context API • Guardian Whale
            Protocol • AI-Powered Behavioral Analysis
          </p>
        </div>
      </div>

      <Toaster position="bottom-right" />
    </div>
  )
}

export default WhaleTrackerDashboard
