import { createFileRoute } from '@tanstack/react-router'
import WhaleTrackerDashboard from '../components/whale-tracker-dashboard'

export const Route = createFileRoute('/')({
  component: Index,
})

function Index() {
  return (
    <div>
      <div>
        {/* Whale activity, alerts, and analytics will be displayed here */}

        <WhaleTrackerDashboard />
      </div>
    </div>
  )
}
