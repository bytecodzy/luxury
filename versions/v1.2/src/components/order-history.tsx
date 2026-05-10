'use client';

import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ChevronDown, Package, ArrowLeft } from 'lucide-react';
import { useStore } from '@/lib/store';
import { useState } from 'react';

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string | null;
}

interface Order {
  id: string;
  orderNumber: string;
  email: string;
  status: string;
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  createdAt: string;
  itemCount: number;
  items: OrderItem[];
}

const statusColors: Record<string, string> = {
  pending: 'bg-amber-600/20 text-amber-400 border-amber-600/30',
  processing: 'bg-yellow-600/20 text-yellow-400 border-yellow-600/30',
  shipped: 'bg-emerald-600/20 text-emerald-400 border-emerald-600/30',
  delivered: 'bg-green-600/20 text-green-400 border-green-600/30',
  cancelled: 'bg-red-600/20 text-red-400 border-red-600/30',
};

export function OrderHistory() {
  const { setView } = useStore();
  const [email, setEmail] = useState('');
  const [searchEmail, setSearchEmail] = useState('');

  const { data, isLoading } = useQuery<{ orders: Order[] }>({
    queryKey: ['orders', searchEmail],
    queryFn: () => fetch(`/api/orders?email=${encodeURIComponent(searchEmail)}`).then((r) => r.json()),
    enabled: !!searchEmail,
  });

  const orders = data?.orders ?? [];

  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchEmail(email);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="py-8"
    >
      <Button
        variant="ghost"
        onClick={() => setView('home')}
        className="mb-6 text-amber-200/60 hover:bg-amber-900/20 hover:text-amber-400"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Shop
      </Button>

      <h2 className="text-2xl font-bold text-amber-100">Order History</h2>
      <p className="mt-1 text-sm text-amber-200/40">
        Enter your email to look up your orders
      </p>

      {/* Email Search */}
      <form onSubmit={handleSearch} className="mt-6 flex gap-3">
        <div className="flex-1 max-w-md">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email address"
            className="border-amber-900/40 bg-stone-900/50 text-amber-50 placeholder:text-amber-200/20"
          />
        </div>
        <Button
          type="submit"
          className="bg-amber-600 text-stone-950 hover:bg-amber-500"
        >
          <Search className="mr-2 h-4 w-4" />
          Search
        </Button>
      </form>

      {/* Results */}
      {isLoading && (
        <div className="mt-8 flex justify-center">
          <Package className="h-8 w-8 animate-pulse text-amber-600/40" />
        </div>
      )}

      {searchEmail && !isLoading && orders && orders.length === 0 && (
        <div className="mt-8 text-center">
          <p className="text-amber-200/60">No orders found for {searchEmail}</p>
        </div>
      )}

      {orders && orders.length > 0 && (
        <div className="mt-8 space-y-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className="rounded-lg border border-amber-900/20 bg-stone-900/60 overflow-hidden"
            >
              {/* Order Header */}
              <button
                onClick={() =>
                  setExpandedOrder(expandedOrder === order.id ? null : order.id)
                }
                className="flex w-full items-center justify-between p-4 text-left hover:bg-amber-900/10 transition-colors"
              >
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
                  <span className="font-mono text-sm font-semibold text-amber-400">
                    {order.orderNumber}
                  </span>
                  <Badge
                    variant="outline"
                    className={`w-fit text-xs ${statusColors[order.status] || 'bg-stone-600/20 text-stone-400'}`}
                  >
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </Badge>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-semibold text-amber-100">
                      ${order.total.toFixed(2)}
                    </p>
                    <p className="text-xs text-amber-200/40">
                      {new Date(order.createdAt).toLocaleDateString()} · {order.itemCount} items
                    </p>
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 text-amber-200/40 transition-transform ${
                      expandedOrder === order.id ? 'rotate-180' : ''
                    }`}
                  />
                </div>
              </button>

              {/* Order Items */}
              <AnimatePresence>
                {expandedOrder === order.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <Separator className="bg-amber-900/20" />
                    <div className="p-4 space-y-3">
                      {order.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded bg-stone-800 text-lg">
                              💎
                            </div>
                            <div>
                              <p className="text-sm text-amber-100">{item.name}</p>
                              <p className="text-xs text-amber-200/40">
                                Qty: {item.quantity}
                              </p>
                            </div>
                          </div>
                          <span className="text-sm text-amber-400">
                            ${(item.price * item.quantity).toLocaleString()}
                          </span>
                        </div>
                      ))}

                      <Separator className="bg-amber-900/20" />

                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-amber-200/40">Subtotal</span>
                          <span className="text-amber-200/60">${order.subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-amber-200/40">Shipping</span>
                          <span className="text-amber-200/60">${order.shipping.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-amber-200/40">Tax</span>
                          <span className="text-amber-200/60">${order.tax.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm font-semibold">
                          <span className="text-amber-100">Total</span>
                          <span className="text-amber-400">${order.total.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
