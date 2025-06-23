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
  const [priceImpactData, setPriceImpactData] = useState<Array<PriceImpact>>([]) // API hooks with TanStack Query
  const {
    useWhaleData,
    useGuardianWhales,
    useWhaleBehavior,
    useAIInsights,
    useWhaleStrategies,
    useGuardianLeaderboard,
    useRealTimeEvents,
    useMarketImpact,
    prefetchCriticalData,
  } = useWhaleAPI()

  // Query instances
  const { data: whaleData, isLoading: loadingWhales } = useWhaleData()
  const { data: guardianData, isLoading: loadingGuardians } =
    useGuardianWhales()
  const { data: strategiesData, isLoading: loadingStrategies } =
    useWhaleStrategies()
  const { data: leaderboardData, isLoading: loadingLeaderboard } =
    useGuardianLeaderboard()
  const { data: realTimeData, isLoading: loadingRealTime } = useRealTimeEvents()
  const { data: impactData, isLoading: loadingImpact } = useMarketImpact('24h')

  // Tab configuration
  const tabs = [
    { id: 'dashboard' as TabId, label: 'Dashboard', icon: Activity },
    { id: 'guardians' as TabId, label: 'Guardian Whales', icon: Shield },
    { id: 'strategies' as TabId, label: 'Strategies', icon: Brain },
    { id: 'leaderboard' as TabId, label: 'Leaderboard', icon: Crown },
    { id: 'realtime' as TabId, label: 'Real-time Events', icon: Zap },
  ]
  // Data fetching with TanStack Query
  const loadInitialData = useCallback(() => {
    // Prefetch critical data to ensure it's cached
    prefetchCriticalData()
      .then(() => {
        console.log('Critical data prefetched successfully')
      })
      .catch((err) => {
        console.error('Error prefetching data:', err)
      })
  }, [prefetchCriticalData])

  // Effect to update state when query data changes
  useEffect(() => {
    if (whaleData) {
      setWhaleTransactions(whaleData)
    }
  }, [whaleData])

  useEffect(() => {
    if (guardianData) {
      setGuardianWhales(Array.isArray(guardianData) ? guardianData : [])
    }
  }, [guardianData])

  useEffect(() => {
    if (strategiesData) {
      setWhaleStrategies(strategiesData)
    }
  }, [strategiesData])

  useEffect(() => {
    if (leaderboardData) {
      setGuardianLeaderboard(leaderboardData)
    }
  }, [leaderboardData])

  useEffect(() => {
    if (realTimeData) {
      setRealTimeEvents(realTimeData)
    }
  }, [realTimeData])

  useEffect(() => {
    if (impactData) {
      setPriceImpactData(Array.isArray(impactData) ? impactData : [])
    }
  }, [impactData])

  // Set loading state based on query loading states
  useEffect(() => {
    const isLoading =
      loadingWhales ||
      loadingGuardians ||
      loadingStrategies ||
      loadingLeaderboard ||
      loadingRealTime ||
      loadingImpact

    setLoading(isLoading)

    if (!isLoading) {
      // If any data is missing, set an error
      const hasData =
        !!whaleData?.length ||
        !!guardianData?.length ||
        !!strategiesData?.length

      if (!hasData) {
        setError('No data available')
      } else {
        setError('')
      }
    }
  }, [
    loadingWhales,
    loadingGuardians,
    loadingStrategies,
    loadingLeaderboard,
    loadingRealTime,
    loadingImpact,
    whaleData,
    guardianData,
    strategiesData,
  ])
  // Use TanStack Query hooks for selected whale data
  const { data: behaviorData } = useWhaleBehavior(
    selectedWhale?.address || '',
    '24h',
  )

  const { data: insightsData } = useAIInsights(selectedWhale?.address || '')

  // Update state when query data changes
  useEffect(() => {
    if (behaviorData) {
      setWhaleBehavior(behaviorData)
    }
  }, [behaviorData])

  useEffect(() => {
    if (insightsData) {
      setAiInsights(insightsData)
    }
  }, [insightsData])

  const handleWhaleSelect = useCallback((whale: GuardianWhale) => {
    setSelectedWhale(whale)
    // The TanStack Query hooks will automatically refetch the data
    // when selectedWhale changes due to the enabled: !!address condition
  }, [])
  // Effects
  useEffect(() => {
    loadInitialData()
    // Note: We don't need to set up an interval as TanStack Query's
    // useRealTimeEvents hook already has refetchInterval: 15000 configured
  }, [loadInitialData])

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
