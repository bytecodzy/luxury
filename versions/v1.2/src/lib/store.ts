import { create } from 'zustand'

export type View = 'home' | 'product' | 'cart' | 'checkout' | 'orders' | 'order-confirmation' | 'user-dashboard' | 'admin-dashboard' | 'agent-dashboard' | 'team-dashboard' | 'wiki'

export interface AuthUser {
  id: string
  email: string
  name: string
  role: 'admin' | 'user' | 'agent' | 'team' | 'corporate'
}

export interface CartItem {
  productId: string
  name: string
  price: number
  image: string
  quantity: number
}

interface AppState {
  view: View
  selectedProductId: string | null
  searchQuery: string
  selectedCategory: string | null
  cartItems: CartItem[]
  lastOrderId: string | null
  authUser: AuthUser | null
  authToken: string | null
  refreshToken: string | null
  accessExpiresAt: number | null
  refreshExpiresAt: number | null
  authView: 'login' | 'register' | null
  authTwoFAStep: boolean
  authPendingUserId: string | null

  setView: (view: View) => void
  selectProduct: (productId: string) => void
  setSearch: (query: string) => void
  setCategory: (category: string | null) => void
  addItem: (item: Omit<CartItem, 'quantity'>) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  setLastOrderId: (orderId: string) => void
  setAuth: (user: AuthUser, token: string, refreshToken?: string, accessExpiresAt?: number, refreshExpiresAt?: number) => void
  clearAuth: () => void
  setAuthView: (view: 'login' | 'register' | null) => void
  setAuthTwoFAStep: (step: boolean) => void
  setAuthPendingUserId: (id: string | null) => void
  refreshAccessToken: () => Promise<string | null>
}

function loadAuthFromStorage(): {
  user: AuthUser | null
  token: string | null
  refreshToken: string | null
  accessExpiresAt: number | null
  refreshExpiresAt: number | null
} {
  if (typeof window === 'undefined') return { user: null, token: null, refreshToken: null, accessExpiresAt: null, refreshExpiresAt: null }
  try {
    const stored = localStorage.getItem('3boxes_auth')
    if (stored) {
      const parsed = JSON.parse(stored)
      return {
        user: parsed.user ?? null,
        token: parsed.token ?? null,
        refreshToken: parsed.refreshToken ?? null,
        accessExpiresAt: parsed.accessExpiresAt ?? null,
        refreshExpiresAt: parsed.refreshExpiresAt ?? null,
      }
    }
  } catch {
    // ignore parse errors
  }
  return { user: null, token: null, refreshToken: null, accessExpiresAt: null, refreshExpiresAt: null }
}

const initialAuth = loadAuthFromStorage()

// Token refresh lock to prevent concurrent refreshes
let isRefreshing = false
let refreshPromise: Promise<string | null> | null = null

export const useStore = create<AppState>((set, get) => ({
  view: 'home',
  selectedProductId: null,
  searchQuery: '',
  selectedCategory: null,
  cartItems: [],
  lastOrderId: null,
  authUser: initialAuth.user,
  authToken: initialAuth.token,
  refreshToken: initialAuth.refreshToken,
  accessExpiresAt: initialAuth.accessExpiresAt,
  refreshExpiresAt: initialAuth.refreshExpiresAt,
  authView: null,
  authTwoFAStep: false,
  authPendingUserId: null,

  setView: (view) => set({ view }),
  selectProduct: (productId) => set({ selectedProductId: productId, view: 'product' }),
  setSearch: (query) => set({ searchQuery: query }),
  setCategory: (category) => set({ selectedCategory: category, view: 'home' }),
  addItem: (item) =>
    set((state) => {
      const existing = state.cartItems.find((ci) => ci.productId === item.productId)
      if (existing) {
        return {
          cartItems: state.cartItems.map((ci) =>
            ci.productId === item.productId
              ? { ...ci, quantity: ci.quantity + 1 }
              : ci
          ),
        }
      }
      return { cartItems: [...state.cartItems, { ...item, quantity: 1 }] }
    }),
  removeItem: (productId) =>
    set((state) => ({
      cartItems: state.cartItems.filter((ci) => ci.productId !== productId),
    })),
  updateQuantity: (productId, quantity) =>
    set((state) => ({
      cartItems:
        quantity <= 0
          ? state.cartItems.filter((ci) => ci.productId !== productId)
          : state.cartItems.map((ci) =>
              ci.productId === productId ? { ...ci, quantity } : ci
            ),
    })),
  clearCart: () => set({ cartItems: [] }),
  setLastOrderId: (orderId) => set({ lastOrderId: orderId }),
  setAuth: (user, token, refreshToken?, accessExpiresAt?, refreshExpiresAt?) => {
    const authData = {
      user,
      token,
      refreshToken: refreshToken || null,
      accessExpiresAt: accessExpiresAt || null,
      refreshExpiresAt: refreshExpiresAt || null,
    }
    try {
      localStorage.setItem('3boxes_auth', JSON.stringify(authData))
    } catch {
      // ignore storage errors
    }
    set({
      authUser: user,
      authToken: token,
      refreshToken: refreshToken || null,
      accessExpiresAt: accessExpiresAt || null,
      refreshExpiresAt: refreshExpiresAt || null,
      authView: null,
      authTwoFAStep: false,
      authPendingUserId: null,
    })
  },
  clearAuth: () => {
    try {
      localStorage.removeItem('3boxes_auth')
    } catch {
      // ignore storage errors
    }
    set({
      authUser: null,
      authToken: null,
      refreshToken: null,
      accessExpiresAt: null,
      refreshExpiresAt: null,
      authView: null,
      authTwoFAStep: false,
      authPendingUserId: null,
    })
  },
  setAuthView: (view) => set({ authView: view }),
  setAuthTwoFAStep: (step) => set({ authTwoFAStep: step }),
  setAuthPendingUserId: (id) => set({ authPendingUserId: id }),
  refreshAccessToken: async () => {
    // Prevent concurrent refreshes
    if (isRefreshing && refreshPromise) {
      return refreshPromise
    }

    const { refreshToken, authUser } = get()
    if (!refreshToken || !authUser) {
      get().clearAuth()
      return null
    }

    // Check if refresh token is also expired
    const { refreshExpiresAt } = get()
    if (refreshExpiresAt && Date.now() / 1000 > refreshExpiresAt) {
      get().clearAuth()
      return null
    }

    isRefreshing = true
    refreshPromise = (async () => {
      try {
        const res = await fetch('/api/auth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        })

        if (!res.ok) {
          get().clearAuth()
          return null
        }

        const data = await res.json()
        if (data.accessToken && data.refreshToken) {
          const user: AuthUser = {
            id: data.user?.id || authUser.id,
            email: data.user?.email || authUser.email,
            name: data.user?.name || authUser.name,
            role: data.user?.role || authUser.role,
          }
          get().setAuth(
            user,
            data.accessToken,
            data.refreshToken,
            data.accessExpiresAt,
            data.refreshExpiresAt
          )
          return data.accessToken
        }
        return null
      } catch {
        return null
      } finally {
        isRefreshing = false
        refreshPromise = null
      }
    })()

    return refreshPromise
  },
}))

/**
 * Authenticated fetch wrapper with automatic token refresh
 * Use this for all API calls that require authentication
 */
export async function authFetch(
  url: string,
  options: RequestInit = {},
  store?: AppState
): Promise<Response> {
  const state = store || useStore.getState()
  let token = state.authToken

  // Check if access token is expired and we have a refresh token
  if (state.accessExpiresAt && Date.now() / 1000 > state.accessExpiresAt) {
    const newToken = await state.refreshAccessToken()
    if (newToken) {
      token = newToken
    }
  }

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(url, { ...options, headers })

  // If 401, try refreshing the token once
  if (response.status === 401 && state.refreshToken) {
    const newToken = await state.refreshAccessToken()
    if (newToken) {
      headers['Authorization'] = `Bearer ${newToken}`
      return fetch(url, { ...options, headers })
    }
  }

  return response
}
