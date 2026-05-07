'use client';

import { useStore } from '@/lib/store';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Gem, Watch, Briefcase, Flower2, Shirt, Home,
  Ribbon, ToyBrick, Heart, HeartHandshake,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from '@/hooks/useTranslation';

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  productCount: number;
}

const categoryIcons: Record<string, React.ReactNode> = {
  watches: <Watch className="h-6 w-6" />,
  jewelry: <Gem className="h-6 w-6" />,
  'leather-goods': <Briefcase className="h-6 w-6" />,
  fragrances: <Flower2 className="h-6 w-6" />,
  fashion: <Shirt className="h-6 w-6" />,
  'home-living': <Home className="h-6 w-6" />,
  sarees: <Ribbon className="h-6 w-6" />,
  toys: <ToyBrick className="h-6 w-6" />,
  'romantic-gifts': <Heart className="h-6 w-6" />,
  'couple-gifts': <HeartHandshake className="h-6 w-6" />,
};

const categoryColors: Record<string, string> = {
  watches: 'from-amber-900/40 to-stone-900/60',
  jewelry: 'from-rose-900/30 to-stone-900/60',
  'leather-goods': 'from-yellow-900/30 to-stone-900/60',
  fragrances: 'from-purple-900/30 to-stone-900/60',
  fashion: 'from-emerald-900/30 to-stone-900/60',
  'home-living': 'from-orange-900/30 to-stone-900/60',
  sarees: 'from-pink-900/30 to-stone-900/60',
  toys: 'from-cyan-900/30 to-stone-900/60',
  'romantic-gifts': 'from-red-900/30 to-stone-900/60',
  'couple-gifts': 'from-fuchsia-900/30 to-stone-900/60',
};

export function CategoryGrid() {
  const { setCategory, setView } = useStore();
  const { t } = useTranslation();

  const { data, isLoading } = useQuery<{ categories: Category[] }>({
    queryKey: ['categories'],
    queryFn: () => fetch('/api/categories').then((r) => r.json()),
  });

  const categories = data?.categories ?? [];

  if (isLoading) {
    return (
      <section className="py-12">
        <h2 className="mb-8 text-center text-2xl font-bold text-amber-100 sm:text-3xl">
          {t('categories.title')}
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-lg bg-stone-900/50" />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="py-12">
      <h2 className="mb-8 text-center text-2xl font-bold text-amber-100 sm:text-3xl">
        {t('categories.title')}
      </h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {categories.map((cat, i) => (
          <motion.button
            key={cat.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => {
              setCategory(cat.slug);
              setView('home');
            }}
            className={`group relative flex flex-col items-center justify-center overflow-hidden rounded-lg border border-amber-900/20 bg-gradient-to-br ${categoryColors[cat.slug] || 'from-stone-900/40 to-stone-900/60'} p-6 transition-all duration-300 hover:border-amber-600/40 hover:shadow-lg hover:shadow-amber-900/20`}
          >
            <div className="mb-3 text-amber-400/70 transition-colors group-hover:text-amber-400">
              {categoryIcons[cat.slug] || <Gem className="h-6 w-6" />}
            </div>
            <h3 className="text-sm font-semibold text-amber-100/90">{cat.name}</h3>
            <p className="mt-1 text-xs text-amber-200/40">
              {cat.productCount} {t('categories.items')}
            </p>
          </motion.button>
        ))}
      </div>
    </section>
  );
}
