'use client';

import { useStore } from '@/lib/store';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Loader2, CreditCard, Lock } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState } from 'react';

interface CheckoutResponse {
  orderId: string;
  orderNumber: string;
  status: string;
  total: number;
  createdAt: string;
}

export function CheckoutView() {
  const { cartItems, setView, setLastOrderId } = useStore();

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = subtotal > 500 ? 0 : 15;
  const tax = subtotal * 0.08;
  const total = subtotal + shipping + tax;

  const [form, setForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'US',
    phone: '',
    cardNumber: '',
    cardExpiry: '',
    cardCvv: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!form.email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) newErrors.email = 'Invalid email';
    if (!form.firstName) newErrors.firstName = 'First name is required';
    if (!form.lastName) newErrors.lastName = 'Last name is required';
    if (!form.address) newErrors.address = 'Address is required';
    if (!form.city) newErrors.city = 'City is required';
    if (!form.state) newErrors.state = 'State is required';
    if (!form.zipCode) newErrors.zipCode = 'ZIP code is required';
    if (!form.cardNumber) newErrors.cardNumber = 'Card number is required';
    if (!form.cardExpiry) newErrors.cardExpiry = 'Expiry is required';
    if (!form.cardCvv) newErrors.cardCvv = 'CVV is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const mutation = useMutation({
    mutationFn: async (): Promise<CheckoutResponse> => {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          items: cartItems.map((item) => ({
            productId: item.productId,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            image: item.image,
          })),
          subtotal: subtotal.toFixed(2),
          shipping: shipping.toFixed(2),
          tax: tax.toFixed(2),
          total: total.toFixed(2),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Checkout failed');
      }
      return res.json();
    },
    onSuccess: (data) => {
      setLastOrderId(data.orderNumber);
      useStore.getState().clearCart();
      setView('order-confirmation');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      mutation.mutate();
    }
  };

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-amber-200/60">Your cart is empty</p>
        <Button
          onClick={() => setView('home')}
          className="mt-4 bg-amber-600 text-stone-950 hover:bg-amber-500"
        >
          Shop Now
        </Button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="py-8"
    >
      <Button
        variant="ghost"
        onClick={() => setView('cart')}
        className="mb-6 text-amber-200/60 hover:bg-amber-900/20 hover:text-amber-400"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Cart
      </Button>

      <h2 className="text-2xl font-bold text-amber-100">Checkout</h2>

      <form onSubmit={handleSubmit}>
        <div className="mt-6 grid gap-8 lg:grid-cols-3">
          {/* Form Fields */}
          <div className="lg:col-span-2 space-y-8">
            {/* Contact */}
            <div className="rounded-lg border border-amber-900/20 bg-stone-900/60 p-6">
              <h3 className="text-lg font-semibold text-amber-100">Contact Information</h3>
              <div className="mt-4">
                <Label htmlFor="email" className="text-amber-200/60">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  placeholder="your@email.com"
                  className="mt-1 border-amber-900/40 bg-stone-800/50 text-amber-50 placeholder:text-amber-200/20"
                />
                {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email}</p>}
              </div>
            </div>

            {/* Shipping */}
            <div className="rounded-lg border border-amber-900/20 bg-stone-900/60 p-6">
              <h3 className="text-lg font-semibold text-amber-100">Shipping Address</h3>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="firstName" className="text-amber-200/60">First Name</Label>
                  <Input
                    id="firstName"
                    value={form.firstName}
                    onChange={(e) => updateField('firstName', e.target.value)}
                    className="mt-1 border-amber-900/40 bg-stone-800/50 text-amber-50"
                  />
                  {errors.firstName && <p className="mt-1 text-xs text-red-400">{errors.firstName}</p>}
                </div>
                <div>
                  <Label htmlFor="lastName" className="text-amber-200/60">Last Name</Label>
                  <Input
                    id="lastName"
                    value={form.lastName}
                    onChange={(e) => updateField('lastName', e.target.value)}
                    className="mt-1 border-amber-900/40 bg-stone-800/50 text-amber-50"
                  />
                  {errors.lastName && <p className="mt-1 text-xs text-red-400">{errors.lastName}</p>}
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="address" className="text-amber-200/60">Address</Label>
                  <Input
                    id="address"
                    value={form.address}
                    onChange={(e) => updateField('address', e.target.value)}
                    className="mt-1 border-amber-900/40 bg-stone-800/50 text-amber-50"
                  />
                  {errors.address && <p className="mt-1 text-xs text-red-400">{errors.address}</p>}
                </div>
                <div>
                  <Label htmlFor="city" className="text-amber-200/60">City</Label>
                  <Input
                    id="city"
                    value={form.city}
                    onChange={(e) => updateField('city', e.target.value)}
                    className="mt-1 border-amber-900/40 bg-stone-800/50 text-amber-50"
                  />
                  {errors.city && <p className="mt-1 text-xs text-red-400">{errors.city}</p>}
                </div>
                <div>
                  <Label htmlFor="state" className="text-amber-200/60">State</Label>
                  <Input
                    id="state"
                    value={form.state}
                    onChange={(e) => updateField('state', e.target.value)}
                    className="mt-1 border-amber-900/40 bg-stone-800/50 text-amber-50"
                  />
                  {errors.state && <p className="mt-1 text-xs text-red-400">{errors.state}</p>}
                </div>
                <div>
                  <Label htmlFor="zipCode" className="text-amber-200/60">ZIP Code</Label>
                  <Input
                    id="zipCode"
                    value={form.zipCode}
                    onChange={(e) => updateField('zipCode', e.target.value)}
                    className="mt-1 border-amber-900/40 bg-stone-800/50 text-amber-50"
                  />
                  {errors.zipCode && <p className="mt-1 text-xs text-red-400">{errors.zipCode}</p>}
                </div>
                <div>
                  <Label htmlFor="country" className="text-amber-200/60">Country</Label>
                  <Input
                    id="country"
                    value={form.country}
                    onChange={(e) => updateField('country', e.target.value)}
                    className="mt-1 border-amber-900/40 bg-stone-800/50 text-amber-50"
                  />
                </div>
                <div>
                  <Label htmlFor="phone" className="text-amber-200/60">Phone (optional)</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={form.phone}
                    onChange={(e) => updateField('phone', e.target.value)}
                    className="mt-1 border-amber-900/40 bg-stone-800/50 text-amber-50"
                  />
                </div>
              </div>
            </div>

            {/* Payment */}
            <div className="rounded-lg border border-amber-900/20 bg-stone-900/60 p-6">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-amber-400" />
                <h3 className="text-lg font-semibold text-amber-100">Payment</h3>
              </div>
              <p className="mt-1 text-xs text-amber-200/30">
                <Lock className="inline h-3 w-3 mr-1" />
                This is a demo. No real payment will be processed.
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label htmlFor="cardNumber" className="text-amber-200/60">Card Number</Label>
                  <Input
                    id="cardNumber"
                    value={form.cardNumber}
                    onChange={(e) => updateField('cardNumber', e.target.value)}
                    placeholder="4242 4242 4242 4242"
                    className="mt-1 border-amber-900/40 bg-stone-800/50 text-amber-50 placeholder:text-amber-200/20"
                  />
                  {errors.cardNumber && <p className="mt-1 text-xs text-red-400">{errors.cardNumber}</p>}
                </div>
                <div>
                  <Label htmlFor="cardExpiry" className="text-amber-200/60">Expiry</Label>
                  <Input
                    id="cardExpiry"
                    value={form.cardExpiry}
                    onChange={(e) => updateField('cardExpiry', e.target.value)}
                    placeholder="MM/YY"
                    className="mt-1 border-amber-900/40 bg-stone-800/50 text-amber-50 placeholder:text-amber-200/20"
                  />
                  {errors.cardExpiry && <p className="mt-1 text-xs text-red-400">{errors.cardExpiry}</p>}
                </div>
                <div>
                  <Label htmlFor="cardCvv" className="text-amber-200/60">CVV</Label>
                  <Input
                    id="cardCvv"
                    value={form.cardCvv}
                    onChange={(e) => updateField('cardCvv', e.target.value)}
                    placeholder="123"
                    className="mt-1 border-amber-900/40 bg-stone-800/50 text-amber-50 placeholder:text-amber-200/20"
                  />
                  {errors.cardCvv && <p className="mt-1 text-xs text-red-400">{errors.cardCvv}</p>}
                </div>
              </div>
            </div>
          </div>

          {/* Order Summary Sidebar */}
          <div className="h-fit rounded-lg border border-amber-900/20 bg-stone-900/60 p-6">
            <h3 className="text-lg font-semibold text-amber-100">Order Summary</h3>

            <div className="mt-4 space-y-3 max-h-64 overflow-y-auto">
              {cartItems.map((item) => (
                <div key={item.productId} className="flex justify-between text-sm">
                  <span className="text-amber-200/60 truncate mr-2">
                    {item.name} x{item.quantity}
                  </span>
                  <span className="text-amber-100 flex-shrink-0">
                    ${(item.price * item.quantity).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>

            <Separator className="my-4 bg-amber-900/30" />

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-amber-200/50">Subtotal</span>
                <span className="text-amber-100">${subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-amber-200/50">Shipping</span>
                <span className="text-amber-100">
                  {shipping === 0 ? (
                    <span className="text-emerald-400">Free</span>
                  ) : (
                    `$${shipping}`
                  )}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-amber-200/50">Tax</span>
                <span className="text-amber-100">${tax.toFixed(2)}</span>
              </div>
              <Separator className="bg-amber-900/30" />
              <div className="flex justify-between">
                <span className="font-semibold text-amber-100">Total</span>
                <span className="text-lg font-bold text-amber-400">
                  ${total.toFixed(2)}
                </span>
              </div>
            </div>

            <Button
              type="submit"
              disabled={mutation.isPending}
              className="mt-6 w-full bg-amber-600 text-stone-950 hover:bg-amber-500 hover:shadow-lg hover:shadow-amber-600/25"
              size="lg"
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                `Place Order - $${total.toFixed(2)}`
              )}
            </Button>

            {mutation.error && (
              <p className="mt-3 text-center text-sm text-red-400">
                {mutation.error.message}
              </p>
            )}
          </div>
        </div>
      </form>
    </motion.div>
  );
}
