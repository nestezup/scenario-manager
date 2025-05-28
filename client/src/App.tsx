import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Route, Switch } from 'wouter'
import SynopsisView from './components/SynopsisView'
import LoginPage from './components/auth/LoginPage'
import AuthCallback from './components/auth/AuthCallback'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/auth/ProtectedRoute'

// Create a client
const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Switch>
          <Route path="/auth/login" component={LoginPage} />
          <Route path="/auth/callback" component={AuthCallback} />
          <Route path="/">
            <ProtectedRoute>
              <SynopsisView />
            </ProtectedRoute>
          </Route>
        </Switch>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App