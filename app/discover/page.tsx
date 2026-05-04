import { redirect } from 'next/navigation'

// Discover lives under /dashboard/discover now so it inherits the dashboard
// chrome (sidebar, light theme, Ask Clarzo bar). This route is kept as a
// permanent redirect so any external/inbound links keep working.
export default function DiscoverRedirect() {
  redirect('/dashboard/discover')
}
