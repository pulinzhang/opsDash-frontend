import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import App from './App'
import './style.css'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-alpine.css'

// Register AG-Grid modules
ModuleRegistry.registerModules([AllCommunityModule])

const queryClient = new QueryClient()

ReactDOM.createRoot(document.getElementById('app') as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
        <ToastContainer />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
)

