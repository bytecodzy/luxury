'use client';

import { useStore } from '@/lib/store';
import { motion } from 'framer-motion';

const CATEGORIES = [
  { id: 'women-jewelry', label: 'Jewelry', image: '/images/categories/jewelry.jpg' },
  { id: 'men-watches', label: 'Watches', image: '/images/categories/watches.jpg' },
  { id: 'women-sarees', label: 'Sarees', image: '/images/categories/sarees.jpg' },
  { id: 'men-fragrances', label: 'Fragrances', image: '/images/categories/fragrances.jpg' },
  { id: 'leather', label: 'Leather', image: '/images/categories/leather.jpg' },
  { id: 'fashion', label: 'Fashion', image: '/images/categories/fashion.jpg' },
  { id: 'couple', label: 'Couple', image: '/images/categories/couple.jpg' },
  { id: 'kids', label: 'Kids', image: '/images/categories/kids.jpg' },
];

export function CollectionsSection() {
  const { setCategory, setView } = useStore();
  const appTheme = useStore((s) => s.appTheme);
  const isLight = appTheme === 'light';

  const handleCategoryClick = (categoryId: string) => {
    setCategory(categoryId);
    setView('home');
    setTimeout(() => {
      const el = document.getElementById('products-section');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  return (
    <section className="py-16 sm:py-20 lg:py-24">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="mb-12 text-center"
        >
          <h2
            className={`text-2xl sm:text-3xl lg:text-4xl font-medium ${isLight ? 'text-stone-900' : 'text-amber-50'}`}
            style={{ fontFamily: "'Lora', serif" }}
          >
            Our Collections
          </h2>
          {/* Gold diamond divider */}
          <div className="mt-3 flex items-center justify-center gap-2">
            <span className="luxury-accent-bg h-px w-8 opacity-60" />
            <span className="luxury-accent-bg h-1.5 w-1.5 rotate-45 rounded-sm opacity-70" />
            <span className="luxury-accent-bg h-px w-8 opacity-60" />
          </div>
          <p
            className={`mt-4 text-sm sm:text-base max-w-md mx-auto ${isLight ? 'text-stone-500' : 'text-amber-100/50'}`}
            style={{ fontFamily: "'Urbanist', sans-serif" }}
          >
            Explore curated luxury across every category
          </p>
        </motion.div>

        {/* Circular Category Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-8 sm:gap-10 lg:gap-12 max-w-4xl mx-auto">
          {CATEGORIES.map((cat, i) => (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.5 }}
              className="flex flex-col items-center group cursor-pointer"
              onClick={() => handleCategoryClick(cat.id)}
            >
              {/* Circle with gradient border ring */}
              <motion.div
                whileHover={{ scale: 1.08 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className="relative"
              >
                {/* Gradient border ring — gold accent */}
                <div
                  className={`absolute inset-0 rounded-full transition-all duration-300 group-hover:opacity-100 ${
                    isLight ? 'opacity-40' : 'opacity-50'
                  }`}
                  style={{
                    background: 'conic-gradient(from 0deg, #b8860b, #dbaf36, #f5d063, #dbaf36, #b8860b)',
                    padding: '3px',
                  }}
                >
                  <div className={`h-full w-full rounded-full ${isLight ? 'bg-white' : 'bg-stone-950'}`} />
                </div>

                {/* Gold glow on hover */}
                <div
                  className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                  style={{
                    boxShadow: '0 0 20px rgba(219,175,54,0.3), 0 0 40px rgba(219,175,54,0.15)',
                  }}
                />

                {/* Inner circle — image */}
                <div
                  className={`relative h-20 w-20 sm:h-24 sm:w-24 lg:h-28 lg:w-28 rounded-full overflow-hidden ${isLight ? 'ring-3 ring-stone-200/80' : 'ring-3 ring-stone-800/80'} z-10`}
                >
                  <img
                    src={cat.image}
                    alt={cat.label}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-1.1"
                    loading="lazy"
                  />
                  {/* Subtle overlay */}
                  <div className={`absolute inset-0 ${isLight ? 'bg-amber-900/10' : 'bg-amber-500/10'} group-hover:bg-transparent transition-colors duration-300`} />
                </div>
              </motion.div>

              {/* Category name below */}
              <span
                className={`mt-3 text-xs sm:text-sm font-medium uppercase tracking-wider transition-colors duration-200 ${
                  isLight ? 'text-stone-600 group-hover:text-amber-700' : 'text-amber-200/60 group-hover:luxury-accent-text'
                }`}
                style={{ fontFamily: "'Urbanist', sans-serif" }}
              >
                {cat.label}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
