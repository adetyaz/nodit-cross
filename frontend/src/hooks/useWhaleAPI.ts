import { useCallback } from 'react'

const API_BASE_URL = 'https://nodit-cross.onrender.com'

export const useWhaleAPI = () => {
  const fetchWhaleData = useCallback(async () => {
    const res = await fetch(`${API_BASE_URL}/api/whales`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    return data.map((tx: any, i: number) => ({
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
    }))
  }, [])

  const fetchAlerts = useCallback(async () => {
    const res = await fetch(`${API_BASE_URL}/api/alerts`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  }, [])

  const fetchGuardianWhales = useCallback(async () => {
    const res = await fetch(`${API_BASE_URL}/api/guardian-whales`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  }, [])

  const fetchWhaleBehavior = useCallback(
    async (address: string, timeframe: string) => {
      if (!address) return null
      const res = await fetch(
        `${API_BASE_URL}/api/whale-behavior/${address}?timeframe=${timeframe}`,
      )
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.json()
    },
    [],
  )

  const fetchAIInsights = useCallback(async (address: string) => {
    if (!address) return null
    const res = await fetch(`${API_BASE_URL}/api/ai-insights/${address}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  }, [])

  const fetchWhaleStrategies = useCallback(async () => {
    const res = await fetch(`${API_BASE_URL}/api/whale-strategies`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  }, [])

  const fetchWhalePortfolio = useCallback(async (address: string) => {
    if (!address) return null
    const res = await fetch(`${API_BASE_URL}/api/whale-portfolio/${address}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  }, [])

  const fetchInfluenceNetwork = useCallback(async () => {
    const res = await fetch(`${API_BASE_URL}/api/whale-influence-network`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  }, [])

  const fetchMarketImpact = useCallback(async (timeframe: string) => {
    const res = await fetch(
      `${API_BASE_URL}/api/market-impact?timeframe=${timeframe}`,
    )
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  }, [])

  const fetchGuardianLeaderboard = useCallback(async () => {
    const res = await fetch(
      `${API_BASE_URL}/api/guardian-leaderboard?metric=guardian_score&limit=20`,
    )
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  }, [])

  const fetchRealTimeEvents = useCallback(async () => {
    const res = await fetch(`${API_BASE_URL}/api/real-time-events`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  }, [])

  const updateConfig = useCallback(
    async (config: {
      whaleThreshold: string
      chains: Array<string>
      networks: Array<string>
      updateInterval: number
    }) => {
      const res = await fetch(`${API_BASE_URL}/api/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.json()
    },
    [],
  )

  return {
    fetchWhaleData,
    fetchAlerts,
    fetchGuardianWhales,
    fetchWhaleBehavior,
    fetchAIInsights,
    fetchWhaleStrategies,
    fetchWhalePortfolio,
    fetchInfluenceNetwork,
    fetchMarketImpact,
    fetchGuardianLeaderboard,
    fetchRealTimeEvents,
    updateConfig,
  }
}
