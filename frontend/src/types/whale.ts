export interface WhaleTransaction {
  id: string
  chain: string
  hash: string
  from: string
  to: string
  value: number
  token: string
  timestamp: number
  type: string
  usdValue: number
  priceImpact: number
}

export interface GuardianWhale {
  address: string
  guardianScore: number
  totalVolume: number
  strategies: Array<Strategy>
  riskLevel: 'low' | 'medium' | 'high'
  successRate: number
  confidence?: number
  tradingStyle?: string
  marketPosition?: string
  primaryStrategy?: string
}

export interface Strategy {
  id: string
  name: string
  description: string
  successRate: number
  avgReturn: number
  riskScore: number
  whaleCount: number
}

export interface WhaleBehavior {
  defiScore: number
  nftScore: number
  lpScore: number
  sophisticationLevel: string
  transactionVolume: number
  frequencyScore: number
}

export interface AIInsights {
  tradingStyle: string
  marketPosition: string
  primaryStrategy: string
  confidence: number
  riskAssessment: string
  recommendations: Array<string>
}

export interface RealTimeEvent {
  id: string
  type: string
  address: string
  amount: number
  chain: string
  timestamp: number
  description?: string
}

export interface PriceImpact {
  symbol: string
  impact: number
  volume: number
}

export interface SupportedChain {
  name: string
  color: string
  symbol: string
}

export interface AppConfig {
  whaleThreshold: string
  chains: Array<string>
  networks: Array<string>
  updateInterval: number
}

export type TabId =
  | 'dashboard'
  | 'guardians'
  | 'strategies'
  | 'leaderboard'
  | 'realtime'

export interface TabConfig {
  id: TabId
  label: string
  icon: any
}
