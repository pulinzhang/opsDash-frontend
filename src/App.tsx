import { Route, Routes, Navigate } from 'react-router-dom'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'
import { UsersPage } from './pages/UsersPage'
import { ShiftsPage } from './pages/ShiftsPage'
import { TasksPage } from './pages/TasksPage'
import { LogsPage } from './pages/LogsPage'
import { HandoverLogsPage } from './pages/HandoverLogsPage'
import { IncidentsPage } from './pages/IncidentsPage'
import { ReportsPage } from './pages/ReportsPage'
import { Layout } from './components/Layout'
import { AuthProvider } from './auth/AuthContext'
import { ProtectedRoute } from './auth/ProtectedRoute'

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="shifts" element={<ShiftsPage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="logs" element={<LogsPage />} />
          <Route path="handover-logs" element={<HandoverLogsPage />} />
          <Route path="incidents" element={<IncidentsPage />} />
          <Route path="reports" element={<ReportsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}

