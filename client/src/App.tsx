import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import SynopsisView from './components/SynopsisView'

// Create a client
const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SynopsisView />
    </QueryClientProvider>
  )
}

export default App