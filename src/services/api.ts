import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000'

export const http = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  withCredentials: false,
})

http.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken')
  if (token) {
    // eslint-disable-next-line no-param-reassign
    config.headers = {
      ...(config.headers ?? {}),
      Authorization: `Bearer ${token}`,
    } as typeof config.headers
  }
  return config
})

http.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      try {
        const refreshToken = localStorage.getItem('refreshToken')
        if (!refreshToken) throw error
        const res = await axios.post(`${API_BASE_URL}/api/auth/refresh`, { refreshToken })
        // 刷新接口同样返回统一的 ApiResponse 结构
        const { accessToken, refreshToken: newRefreshToken } = (res.data as {
          data: { accessToken: string; refreshToken: string }
        }).data
        if (accessToken) {
          localStorage.setItem('accessToken', accessToken)
        }
        if (newRefreshToken) {
          localStorage.setItem('refreshToken', newRefreshToken)
        }
        originalRequest.headers = {
          ...(originalRequest.headers ?? {}),
          Authorization: `Bearer ${accessToken}`,
        }
        return http(originalRequest)
      } catch (refreshError) {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        return Promise.reject(refreshError)
      }
    }
    return Promise.reject(error)
  },
)

export interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

export const api = {
  async login(email: string, password: string) {
    const res = await http.post('/auth/login', { email, password })
    // 后端使用统一的 ApiResponse 包装，token 在 data 里面
    const { accessToken, refreshToken } = (res.data as {
      data: { accessToken: string; refreshToken: string }
    }).data
    if (accessToken) {
      localStorage.setItem('accessToken', accessToken)
    }
    if (refreshToken) {
      localStorage.setItem('refreshToken', refreshToken)
    }
  },

  async logout() {
    try {
      await http.post('/auth/logout')
    } catch {
      // ignore
    } finally {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
    }
  },

  async getMe() {
    // 后端返回结构：
    // {
    //   success: true,
    //   message: "...",
    //   data: { user: { _id, name, email, role, ... } }
    // }
    const res = await http.get('/auth/me')
    const raw = res.data as {
      data: {
        user: {
          _id: string
          name: string
          email: string
          role: string
        }
      }
    }

    const u = raw.data.user

    // 统一转换成前端 AuthContext 里定义的 User 结构
    return {
      id: u._id,
      name: u.name,
      email: u.email,
      role: u.role,
    }
  },

  // Generic CRUD helpers (backend wraps responses in a standard ApiResponse<T>)
  list<T>(resource: string, params?: Record<string, unknown>) {
    return http
      .get<{ data: T[]; success: boolean; message?: string }>(`/${resource}`, { params })
      .then((r) => {
        if (!r.data.success) {
          throw new Error(r.data.message || 'Failed to fetch data')
        }
        return r.data.data
      })
      .catch((error) => {
        // 如果是 HTTP 错误（如 403），尝试从响应体中获取错误消息
        if (error.response?.data) {
          const responseData = error.response.data as { message?: string }
          throw new Error(responseData.message || 'Failed to fetch data')
        }
        throw error
      })
  },

  listWithPagination<T>(resource: string, params?: Record<string, unknown>) {
    return http
      .get<{ data: T[]; pagination?: PaginationInfo; success: boolean; message?: string }>(`/${resource}`, { params })
      .then((r) => {
        if (!r.data.success) {
          throw new Error(r.data.message || 'Failed to fetch data')
        }
        return {
          data: r.data.data,
          pagination: r.data.pagination,
        }
      })
      .catch((error) => {
        // 如果是 HTTP 错误（如 403），尝试从响应体中获取错误消息
        if (error.response?.data) {
          const responseData = error.response.data as { message?: string }
          throw new Error(responseData.message || 'Failed to fetch data')
        }
        throw error
      })
  },
  get<T>(resource: string, id: string) {
    return http
      .get<{ data: T; success: boolean; message?: string }>(`/${resource}/${id}`)
      .then((r) => {
        if (!r.data.success) {
          throw new Error(r.data.message || 'Failed to fetch data')
        }
        return r.data.data
      })
      .catch((error) => {
        // 如果是 HTTP 错误（如 403），尝试从响应体中获取错误消息
        if (error.response?.data) {
          const responseData = error.response.data as { message?: string }
          throw new Error(responseData.message || 'Failed to fetch data')
        }
        throw error
      })
  },
  create<T>(resource: string, data: unknown) {
    return http
      .post<{ data: T; success: boolean; message?: string }>(`/${resource}`, data)
      .then((r) => {
        if (!r.data.success) {
          throw new Error(r.data.message || 'Failed to create resource')
        }
        return r.data.data
      })
      .catch((error) => {
        // 如果是 HTTP 错误（如 403），尝试从响应体中获取错误消息
        if (error.response?.data) {
          const responseData = error.response.data as { message?: string }
          throw new Error(responseData.message || 'Failed to create resource')
        }
        throw error
      })
  },
  update<T>(resource: string, id: string, data: unknown) {
    return http
      .put<{ data: T; success: boolean; message?: string }>(`/${resource}/${id}`, data)
      .then((r) => {
        if (!r.data.success) {
          throw new Error(r.data.message || 'Failed to update resource')
        }
        return r.data.data
      })
      .catch((error) => {
        // 如果是 HTTP 错误（如 403），尝试从响应体中获取错误消息
        if (error.response?.data) {
          const responseData = error.response.data as { message?: string }
          throw new Error(responseData.message || 'Failed to update resource')
        }
        throw error
      })
  },
  remove(resource: string, id: string) {
    return http
      .delete<{ success: boolean; message?: string }>(`/${resource}/${id}`)
      .then((r) => {
        if (!r.data.success) {
          throw new Error(r.data.message || 'Failed to delete resource')
        }
        return undefined
      })
      .catch((error) => {
        // 如果是 HTTP 错误（如 403），尝试从响应体中获取错误消息
        if (error.response?.data) {
          const responseData = error.response.data as { message?: string }
          throw new Error(responseData.message || 'Failed to delete resource')
        }
        throw error
      })
  },

  // Dashboard
  async getDashboardStats() {
    const res = await http.get('/dashboard/stats')
    return res.data
  },
}

