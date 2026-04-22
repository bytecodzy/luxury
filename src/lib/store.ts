import { create } from 'zustand'

export type View = 'home' | 'product' | 'cart' | 'checkout' | 'orders' | 'order-confirmation'

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

  setView: (view: View) => void
  selectProduct: (productId: string) => void
  setSearch: (query: string) => void
  setCategory: (category: string | null) => void
  addItem: (item: Omit<CartItem, 'quantity'>) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  setLastOrderId: (orderId: string) => void
}

export const useStore = create<AppState>((set) => ({
  view: 'home',
  selectedProductId: null,
  searchQuery: '',
  selectedCategory: null,
  cartItems: [],
  lastOrderId: null,

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
}))
