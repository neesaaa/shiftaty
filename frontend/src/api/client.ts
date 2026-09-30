import axios, { AxiosError } from 'axios'
import type { ApiResponse } from '../types'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

export const http = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
})

const TOKEN_KEY = 'shiftaty_access'
const REFRESH_KEY = 'shiftaty_refresh'

export const tokenStore = {
  get access() {
    return localStorage.getItem(TOKEN_KEY)
  },
  get refresh() {
    return localStorage.getItem(REFRESH_KEY)
  },
  set(access: string, refresh: string) {
    localStorage.setItem(TOKEN_KEY, access)
    localStorage.setItem(REFRESH_KEY, refresh)
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(REFRESH_KEY)
  },
}

http.interceptors.request.use((config) => {
  const token = tokenStore.access
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

let refreshing: Promise<string | null> | null = null

async function tryRefresh(): Promise<string | null> {
  const refresh = tokenStore.refresh
  if (!refresh) return null
  try {
    const res = await axios.post<ApiResponse<{ accessToken: string; refreshToken: string }>>(
      `${API_BASE}/auth/refresh`,
      { refreshToken: refresh },
    )
    const data = res.data.data
    if (data) {
      tokenStore.set(data.accessToken, data.refreshToken)
      return data.accessToken
    }
    return null
  } catch {
    tokenStore.clear()
    return null
  }
}

http.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original = error.config as any
    if (error.response?.status === 401 && original && !original._retry) {
      original._retry = true
      if (!refreshing) refreshing = tryRefresh()
      const newToken = await refreshing
      refreshing = null
      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`
        return http(original)
      }
      tokenStore.clear()
      if (!location.pathname.startsWith('/login')) location.href = '/login'
    }
    return Promise.reject(error)
  },
)

export function apiError(err: unknown): string {
  const e = err as AxiosError<ApiResponse<unknown>>
  return e.response?.data?.message || 'حدث خطأ. حاول مرة أخرى.'
}

export async function unwrap<T>(promise: Promise<{ data: ApiResponse<T> }>): Promise<T> {
  const res = await promise
  if (!res.data.success) throw new Error(res.data.message || 'خطأ')
  return res.data.data as T
}
