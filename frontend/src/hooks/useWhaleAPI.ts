import { useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'

// Use the deployed backend URL
const API_BASE_URL = 'https://nodit-backend.onrender.com'

// Cache configuration for different API endpoints
const CACHE_CONFIG = {
  // Long-lived data with infrequent changes
  GUARDIAN_WHALES: {
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 60 * 60 * 1000, // 1 hour
  },
  // Medium-lived data that changes occasionally
  WHALE_STRATEGIES: {
    staleTime: 3 * 60 * 1000, // 3 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
  },
  // More frequently changing data
  WHALE_DATA: {
    staleTime: 60 * 1000, // 1 minute
    cacheTime: 15 * 60 * 1000, // 15 minutes
  },
  // Real-time data that changes frequently
  ALERTS: {
    staleTime: 30 * 1000, // 30 seconds
    cacheTime: 5 * 60 * 1000, // 5 minutes
  },
  // Per-wallet data
  WALLET_DATA: {
    staleTime: 2 * 60 * 1000, // 2 minutes
    cacheTime: 15 * 60 * 1000, // 15 minutes
  },
}

/**
 * Type for the standardized API responses
 */
type ApiResponse<T> = {
  status: 'ok' | 'error' | 'nodata'
  data: T
  message?: string
}

export const useWhaleAPI = () => {
  /**
   * Helper to handle standardized API responses with diagnostic logging
   */
  const handleApiResponse = useCallback(
    <T>(response: any, endpoint: string): T => {
      // Handle case where response is not in expected format
      if (!response || typeof response !== 'object') {
        console.error(`[API] ${endpoint} returned invalid response:`, response)
        return (Array.isArray({} as T) ? [] : null) as T
      }

      // Handle case where response is already an array (legacy format)
      if (Array.isArray(response)) {
        console.log(
          `[API] ${endpoint} returned legacy array format with ${response.length} items`,
        )
        return response as unknown as T
      }

      // Diagnostic logging - safely access properties
      console.log(`[API] ${endpoint} response:`, {
        status: response.status || 'unknown',
        hasData:
          response.data !== undefined &&
          response.data !== null &&
          (Array.isArray(response.data) ? response.data.length > 0 : true),
        message: response.message || 'No message',
      })

      // Return empty array for array responses or null for object responses when no data
      if (response.status === 'error' || response.status === 'nodata') {
        console.warn(
          `[API] ${endpoint} returned ${response.status}: ${response.message || 'No error message'}`,
        )
        return (Array.isArray({} as T) ? [] : null) as T
      }

      // If response doesn't have our expected structure, return the whole response
      if (response.status === undefined || response.data === undefined) {
        console.log(`[API] ${endpoint} returned non-standard format`)
        return response as unknown as T
      }

      return response.data
    },
    [],
  )

  // Generic fetch wrapper with error handling and diagnostics
  const fetchWithDiagnostics = useCallback(
    async <T>(endpoint: string, options?: RequestInit): Promise<any> => {
      const url = `${API_BASE_URL}${endpoint}`
      console.log(`[API] Fetching ${url}`)

      try {
        const startTime = performance.now()
        const controller = new AbortController()
        // Timeout after 10 seconds
        const timeoutId = setTimeout(() => controller.abort(), 10000)

        const res = await fetch(url, {
          ...options,
          signal: controller.signal,
        })

        clearTimeout(timeoutId)
        const endTime = performance.now()

        // Handle HTTP error status
        if (!res.ok) {
          console.error(
            `[API] Error ${res.status} from ${endpoint}: ${res.statusText}`,
          )

          // Special handling for 5xx errors - likely server-side issues
          if (res.status >= 500) {
            console.warn(
              `[API] Server error on ${endpoint} - returning empty result`,
            )
            return {
              status: 'error',
              data: (Array.isArray({} as T) ? [] : null) as T,
              message: `Server error: ${res.status} ${res.statusText}`,
            }
          }

          throw new Error(`HTTP ${res.status}: ${res.statusText}`)
        }

        // Handle empty responses
        const contentType = res.headers.get('content-type')
        if (!contentType || !contentType.includes('application/json')) {
          console.warn(`[API] ${endpoint} returned non-JSON response`)
          return {
            status: 'error',
            data: (Array.isArray({} as T) ? [] : null) as T,
            message: 'Non-JSON response from server',
          }
        }

        // Parse JSON with error handling
        let response
        try {
          response = await res.json()
        } catch (parseError) {
          console.error(`[API] JSON parse error for ${endpoint}:`, parseError)
          return {
            status: 'error',
            data: (Array.isArray({} as T) ? [] : null) as T,
            message: 'Invalid JSON response',
          }
        }
        console.log(
          `[API] ${endpoint} completed in ${(endTime - startTime).toFixed(0)}ms`,
        )

        return response
      } catch (error: any) {
        // Differentiate between abort errors (timeouts) and other errors
        if (error && error.name === 'AbortError') {
          console.error(`[API] Request timeout for ${endpoint}`)
          return {
            status: 'error',
            data: (Array.isArray({} as T) ? [] : null) as T,
            message: 'Request timed out',
          }
        }

        console.error(`[API] Failed request to ${endpoint}:`, error)
        // Return error response in the standardized format
        return {
          status: 'error',
          data: (Array.isArray({} as T) ? [] : null) as T,
          message: error instanceof Error ? error.message : 'Unknown error',
        }
      }
    },
    [],
  )
  // Base fetcher functions (these will be used by the query hooks)
  const fetchWhaleData = useCallback(async () => {
    const response = await fetchWithDiagnostics<Array<any>>('/api/whales')
    const data = handleApiResponse<Array<any>>(response, '/api/whales')

    // Extra guard against missing data
    if (!Array.isArray(data)) {
      console.error(
        '[API] Expected array data from /api/whales but got:',
        typeof data,
      )
      return []
    }

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
  }, [fetchWithDiagnostics, handleApiResponse])

  const fetchAlerts = useCallback(async () => {
    const response = await fetchWithDiagnostics<Array<any>>('/api/alerts')
    return handleApiResponse<Array<any>>(response, '/api/alerts')
  }, [fetchWithDiagnostics, handleApiResponse])

  const fetchGuardianWhales = useCallback(async () => {
    const response = await fetchWithDiagnostics<Array<any>>(
      '/api/guardian-whales',
    )
    return handleApiResponse<Array<any>>(response, '/api/guardian-whales')
  }, [fetchWithDiagnostics, handleApiResponse])

  // TanStack Query hooks
  const useWhaleData = () => {
    return useQuery({
      queryKey: ['whales'],
      queryFn: fetchWhaleData,
      staleTime: CACHE_CONFIG.WHALE_DATA.staleTime,
      gcTime: CACHE_CONFIG.WHALE_DATA.cacheTime,
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors (client errors)
        if (error?.status >= 400 && error?.status < 500) return false
        return failureCount < 3 // retry up to 3 times on other errors
      },
    })
  }

  const useAlerts = () => {
    return useQuery({
      queryKey: ['alerts'],
      queryFn: fetchAlerts,
      staleTime: CACHE_CONFIG.ALERTS.staleTime,
      gcTime: CACHE_CONFIG.ALERTS.cacheTime,
      // More frequent refetching for real-time data
      refetchInterval: 30000, // 30 seconds
    })
  }

  const useGuardianWhales = () => {
    return useQuery({
      queryKey: ['guardian-whales'],
      queryFn: fetchGuardianWhales,
      staleTime: CACHE_CONFIG.GUARDIAN_WHALES.staleTime,
      gcTime: CACHE_CONFIG.GUARDIAN_WHALES.cacheTime,
    })
  }
  // Base fetcher functions
  const fetchWhaleBehavior = useCallback(
    async (address: string, timeframe: string) => {
      if (!address) return null
      const endpoint = `/api/whale-behavior/${address}?timeframe=${timeframe}`
      const response = await fetchWithDiagnostics<any>(endpoint)
      return handleApiResponse<any>(response, endpoint)
    },
    [fetchWithDiagnostics, handleApiResponse],
  )

  const fetchAIInsights = useCallback(
    async (address: string) => {
      if (!address) return null
      const endpoint = `/api/ai-insights/${address}`
      const response = await fetchWithDiagnostics<any>(endpoint)
      return handleApiResponse<any>(response, endpoint)
    },
    [fetchWithDiagnostics, handleApiResponse],
  )

  const fetchWhaleStrategies = useCallback(async () => {
    const response = await fetchWithDiagnostics<Array<any>>(
      '/api/whale-strategies',
    )
    return handleApiResponse<Array<any>>(response, '/api/whale-strategies')
  }, [fetchWithDiagnostics, handleApiResponse])

  // TanStack Query hooks
  const useWhaleBehavior = (address: string, timeframe: string) => {
    return useQuery({
      queryKey: ['whale-behavior', address, timeframe],
      queryFn: () => fetchWhaleBehavior(address, timeframe),
      staleTime: CACHE_CONFIG.WALLET_DATA.staleTime,
      gcTime: CACHE_CONFIG.WALLET_DATA.cacheTime,
      enabled: !!address, // Only run query when address is available
    })
  }

  const useAIInsights = (address: string) => {
    return useQuery({
      queryKey: ['ai-insights', address],
      queryFn: () => fetchAIInsights(address),
      staleTime: CACHE_CONFIG.WALLET_DATA.staleTime,
      gcTime: CACHE_CONFIG.WALLET_DATA.cacheTime,
      enabled: !!address, // Only run query when address is available
    })
  }

  const useWhaleStrategies = () => {
    return useQuery({
      queryKey: ['whale-strategies'],
      queryFn: fetchWhaleStrategies,
      staleTime: CACHE_CONFIG.WHALE_STRATEGIES.staleTime,
      gcTime: CACHE_CONFIG.WHALE_STRATEGIES.cacheTime,
    })
  }
  const fetchWhalePortfolio = useCallback(
    async (address: string) => {
      if (!address) return null
      const endpoint = `/api/whale-portfolio/${address}`
      const response = await fetchWithDiagnostics<any>(endpoint)
      return handleApiResponse<any>(response, endpoint)
    },
    [fetchWithDiagnostics, handleApiResponse],
  )

  const fetchInfluenceNetwork = useCallback(async () => {
    const endpoint = '/api/whale-influence-network'
    const response = await fetchWithDiagnostics<any>(endpoint)
    return handleApiResponse<any>(response, endpoint)
  }, [fetchWithDiagnostics, handleApiResponse])

  const fetchMarketImpact = useCallback(
    async (timeframe: string) => {
      const endpoint = `/api/market-impact?timeframe=${timeframe}`
      const response = await fetchWithDiagnostics<any>(endpoint)
      return handleApiResponse<any>(response, endpoint)
    },
    [fetchWithDiagnostics, handleApiResponse],
  )
  const fetchGuardianLeaderboard = useCallback(async () => {
    const endpoint = '/api/guardian-leaderboard?metric=guardian_score&limit=20'
    const response = await fetchWithDiagnostics<Array<any>>(endpoint)
    return handleApiResponse<Array<any>>(response, endpoint)
  }, [fetchWithDiagnostics, handleApiResponse])

  const fetchRealTimeEvents = useCallback(async () => {
    const endpoint = '/api/real-time-events'
    const response = await fetchWithDiagnostics<Array<any>>(endpoint)
    return handleApiResponse<Array<any>>(response, endpoint)
  }, [fetchWithDiagnostics, handleApiResponse])

  // TanStack Query hooks for additional endpoints
  const useWhalePortfolio = (address: string) => {
    return useQuery({
      queryKey: ['whale-portfolio', address],
      queryFn: () => fetchWhalePortfolio(address),
      staleTime: CACHE_CONFIG.WALLET_DATA.staleTime,
      gcTime: CACHE_CONFIG.WALLET_DATA.cacheTime,
      enabled: !!address, // Only run query when address is available
    })
  }

  const useInfluenceNetwork = () => {
    return useQuery({
      queryKey: ['whale-influence-network'],
      queryFn: fetchInfluenceNetwork,
      staleTime: CACHE_CONFIG.GUARDIAN_WHALES.staleTime, // This is more stable data
      gcTime: CACHE_CONFIG.GUARDIAN_WHALES.cacheTime,
    })
  }

  const useMarketImpact = (timeframe: string) => {
    return useQuery({
      queryKey: ['market-impact', timeframe],
      queryFn: () => fetchMarketImpact(timeframe),
      staleTime: CACHE_CONFIG.WHALE_DATA.staleTime,
      gcTime: CACHE_CONFIG.WHALE_DATA.cacheTime,
    })
  }

  const useGuardianLeaderboard = () => {
    return useQuery({
      queryKey: ['guardian-leaderboard'],
      queryFn: fetchGuardianLeaderboard,
      staleTime: CACHE_CONFIG.GUARDIAN_WHALES.staleTime,
      gcTime: CACHE_CONFIG.GUARDIAN_WHALES.cacheTime,
    })
  }

  const useRealTimeEvents = () => {
    return useQuery({
      queryKey: ['real-time-events'],
      queryFn: fetchRealTimeEvents,
      staleTime: CACHE_CONFIG.ALERTS.staleTime, // Use the most aggressive refresh for real-time data
      gcTime: CACHE_CONFIG.ALERTS.cacheTime,
      refetchInterval: 15000, // 15 seconds - more aggressive for real-time data
    })
  }

  const updateConfig = useCallback(
    async (config: {
      whaleThreshold: string
      chains: Array<string>
      networks: Array<string>
      updateInterval: number
    }) => {
      const endpoint = '/api/config'
      const response = await fetchWithDiagnostics<any>(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      return handleApiResponse<any>(response, endpoint)
    },
    [fetchWithDiagnostics, handleApiResponse],
  )
  // Handle global cache invalidation via Query Client
  const queryClient = useQueryClient()

  // Function to invalidate all query cache (useful when data is stale)
  const invalidateAllQueries = useCallback(() => {
    queryClient.invalidateQueries()
    console.log('[API] Invalidated all query caches')
  }, [queryClient])

  // Function to prefetch important data
  const prefetchCriticalData = useCallback(async () => {
    console.log('[API] Prefetching critical data...')
    await Promise.all([
      queryClient.prefetchQuery({
        queryKey: ['whales'],
        queryFn: fetchWhaleData,
      }),
      queryClient.prefetchQuery({
        queryKey: ['guardian-whales'],
        queryFn: fetchGuardianWhales,
      }),
      queryClient.prefetchQuery({ queryKey: ['alerts'], queryFn: fetchAlerts }),
    ])
    console.log('[API] Critical data prefetched')
  }, [queryClient, fetchWhaleData, fetchGuardianWhales, fetchAlerts])

  return {
    // Legacy fetch methods (for backward compatibility)
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

    // TanStack Query enhanced hooks (with caching)
    useWhaleData,
    useAlerts,
    useGuardianWhales,
    useWhaleBehavior,
    useAIInsights,
    useWhaleStrategies,
    useWhalePortfolio,
    useInfluenceNetwork,
    useMarketImpact,
    useGuardianLeaderboard,
    useRealTimeEvents,

    // Cache management functions
    invalidateAllQueries,
    prefetchCriticalData,
  }
}
