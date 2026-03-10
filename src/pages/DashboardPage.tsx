import { useQuery } from '@tanstack/react-query'
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Bar,
} from 'recharts'
import { api } from '../services/api'

type DashboardStats = {
  activeShifts: number
  pendingTasks: number
  openIncidents: number
  reportsPendingApproval: number
  recentLogs: number
  criticalLogs: number
  recentHandovers: number
  taskStatusBreakdown: Record<string, number>
  incidentSeverity: Record<string, number>
  logLevelBreakdown: Record<string, number>
  recentActivities: {
    _id: string
    message: string
    level: string
    createdAt: string
    createdBy?: { name: string; email: string }
  }[]
}

type ApiResponse<T> = {
  success: boolean
  message: string
  data: T
}

const COLORS = ['#2563eb', '#22c55e', '#f97316', '#ef4444', '#a855f7', '#0ea5e9']

export const DashboardPage = () => {
  const { data, isLoading } = useQuery<ApiResponse<DashboardStats>>({
    queryKey: ['dashboard', 'stats'],
    queryFn: api.getDashboardStats,
  })

  const stats = data?.data

  const taskStatusData =
    stats &&
    Object.entries(stats.taskStatusBreakdown).map(([status, count]) => ({
      name: status,
      value: count,
    }))

  const incidentSeverityData =
    stats &&
    Object.entries(stats.incidentSeverity).map(([severity, count]) => ({
      name: severity,
      value: count,
    }))

  const logLevelData =
    stats &&
    Object.entries(stats.logLevelBreakdown).map(([level, count]) => ({
      name: level,
      value: count,
    }))

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500">
            Key operations metrics and recent activity
          </p>
        </div>
      </div>

      {isLoading && (
        <div className="text-sm text-gray-500">Loading statistics...</div>
      )}

      {!isLoading && stats && (
        <>
          <section className="dashboard-grid">
            <div className="stat-card primary">
              <div className="stat-label">Active Shifts</div>
              <div className="stat-value">{stats.activeShifts}</div>
              <div className="stat-meta">Shifts currently in progress</div>
            </div>
            <div className="stat-card warning">
              <div className="stat-label">Pending Tasks</div>
              <div className="stat-value">{stats.pendingTasks}</div>
              <div className="stat-meta">Tasks not yet completed</div>
            </div>
            <div className="stat-card danger">
              <div className="stat-label">Open Incidents</div>
              <div className="stat-value">{stats.openIncidents}</div>
              <div className="stat-meta">Incidents awaiting resolution</div>
            </div>
            <div className="stat-card neutral">
              <div className="stat-label">Reports Pending</div>
              <div className="stat-value">{stats.reportsPendingApproval}</div>
              <div className="stat-meta">Reports awaiting review / approval</div>
            </div>
            <div className="stat-card info">
              <div className="stat-label">Logs Today</div>
              <div className="stat-value">{stats.recentLogs}</div>
              <div className="stat-meta">Entries created since start of day</div>
            </div>
            <div className="stat-card critical">
              <div className="stat-label">Critical Logs (7d)</div>
              <div className="stat-value">{stats.criticalLogs}</div>
              <div className="stat-meta">Critical events in the last week</div>
            </div>
            <div className="stat-card accent">
              <div className="stat-label">Recent Handovers (7d)</div>
              <div className="stat-value">{stats.recentHandovers}</div>
              <div className="stat-meta">Handover logs created last 7 days</div>
            </div>
          </section>

          <section className="dashboard-charts">
            <div className="chart-card">
              <div className="chart-header">
                <h2>Tasks by Status</h2>
                <span className="chart-caption">Distribution of all tasks</span>
              </div>
              {taskStatusData && taskStatusData.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={taskStatusData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={4}
                    >
                      {taskStatusData.map((entry, index) => (
                        <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="chart-empty">No task data available</div>
              )}
            </div>

            <div className="chart-card">
              <div className="chart-header">
                <h2>Incidents by Severity</h2>
                <span className="chart-caption">Open incidents only</span>
              </div>
              {incidentSeverityData && incidentSeverityData.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={incidentSeverityData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={4}
                    >
                      {incidentSeverityData.map((entry, index) => (
                        <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="chart-empty">No incident data available</div>
              )}
            </div>

            <div className="chart-card wide">
              <div className="chart-header">
                <h2>Log Levels (Last 7 Days)</h2>
                <span className="chart-caption">Volume of logs by level</span>
              </div>
              {logLevelData && logLevelData.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={logLevelData} margin={{ top: 8, right: 16, left: -16, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]} fill="#2563eb" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="chart-empty">No log data available</div>
              )}
            </div>
          </section>

          <section className="dashboard-activity">
            <div className="activity-header">
              <h2>Recent Activity</h2>
              <span className="chart-caption">Last 10 log entries</span>
            </div>
            {stats.recentActivities.length === 0 ? (
              <div className="chart-empty">No recent activity.</div>
            ) : (
              <ul className="activity-list">
                {stats.recentActivities.map((activity) => (
                  <li key={activity._id} className="activity-item">
                    <div className="activity-badge" data-level={activity.level}>
                      {activity.level.toUpperCase()}
                    </div>
                    <div className="activity-main">
                      <div className="activity-message">{activity.message}</div>
                      <div className="activity-meta">
                        <span>
                          {new Date(activity.createdAt).toLocaleString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        {activity.createdBy && (
                          <span>
                            • {activity.createdBy.name}{' '}
                            {activity.createdBy.email && `(${activity.createdBy.email})`}
                          </span>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  )
}

