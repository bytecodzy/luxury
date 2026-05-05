import { create } from 'zustand'

export type View = 'home' | 'product' | 'cart' | 'checkout' | 'orders' | 'order-confirmation' | 'user-dashboard' | 'admin-dashboard' | 'agent-dashboard' | 'team-dashboard' | 'wiki'

export interface AuthUser {
  id: string
  email: string
  name: string
  role: 'admin' | 'user' | 'agent' | 'team'
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
  setAuth: (user: AuthUser, token: string) => void
  clearAuth: () => void
  setAuthView: (view: 'login' | 'register' | null) => void
  setAuthTwoFAStep: (step: boolean) => void
  setAuthPendingUserId: (id: string | null) => void
}

function loadAuthFromStorage(): { user: AuthUser | null; token: string | null } {
  if (typeof window === 'undefined') return { user: null, token: null }
  try {
    const stored = localStorage.getItem('3boxes_auth')
    if (stored) {
      const parsed = JSON.parse(stored)
      return { user: parsed.user ?? null, token: parsed.token ?? null }
    }
  } catch {
    // ignore parse errors
  }
  return { user: null, token: null }
}

const initialAuth = loadAuthFromStorage()

export const useStore = create<AppState>((set) => ({
  view: 'home',
  selectedProductId: null,
  searchQuery: '',
  selectedCategory: null,
  cartItems: [],
  lastOrderId: null,
  authUser: initialAuth.user,
  authToken: initialAuth.token,
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
  setAuth: (user, token) => {
    try {
      localStorage.setItem('3boxes_auth', JSON.stringify({ user, token }))
    } catch {
      // ignore storage errors
    }
    set({ authUser: user, authToken: token, authView: null, authTwoFAStep: false, authPendingUserId: null })
  },
  clearAuth: () => {
    try {
      localStorage.removeItem('3boxes_auth')
    } catch {
      // ignore storage errors
    }
    set({ authUser: null, authToken: null, authView: null, authTwoFAStep: false, authPendingUserId: null })
  },
  setAuthView: (view) => set({ authView: view }),
  setAuthTwoFAStep: (step) => set({ authTwoFAStep: step }),
  setAuthPendingUserId: (id) => set({ authPendingUserId: id }),
}))
