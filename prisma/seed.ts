import { db } from "@/lib/db";

const categories = [
  {
    name: "Watches",
    slug: "watches",
    description: "Luxury timepieces from world-renowned makers",
    image: "/images/categories/watches.jpg",
  },
  {
    name: "Jewelry",
    slug: "jewelry",
    description: "Exquisite jewelry crafted with precious stones and metals",
    image: "/images/categories/jewelry.jpg",
  },
  {
    name: "Leather Goods",
    slug: "leather-goods",
    description: "Premium leather bags, wallets, and accessories",
    image: "/images/categories/leather.jpg",
  },
  {
    name: "Fragrances",
    slug: "fragrances",
    description: "Signature scents from the world's finest perfumers",
    image: "/images/categories/fragrances.jpg",
  },
  {
    name: "Fashion",
    slug: "fashion",
    description: "Designer clothing and haute couture collections",
    image: "/images/categories/fashion.jpg",
  },
  {
    name: "Home & Living",
    slug: "home-living",
    description: "Luxurious home décor and lifestyle accessories",
    image: "/images/categories/home.jpg",
  },
];

const products = [
  // Watches
  {
    name: "Royal Chronograph Gold",
    slug: "royal-chronograph-gold",
    description: "An exquisite 18K gold chronograph with Swiss movement, sapphire crystal, and alligator leather strap. Water-resistant to 100 meters with moon phase complication.",
    price: 12500,
    compareAtPrice: 15000,
    images: JSON.stringify(["/images/products/watch-1.jpg", "/images/products/watch-1-alt.jpg"]),
    categorySlug: "watches",
    stock: 5,
    rating: 4.9,
    reviewCount: 47,
    featured: true,
    tags: JSON.stringify(["gold", "chronograph", "swiss", "luxury"]),
  },
  {
    name: "Midnight Tourbillon",
    slug: "midnight-tourbillon",
    description: "A masterpiece of horological engineering featuring a flying tourbillon, midnight blue dial, and platinum case. Limited edition of 50 pieces worldwide.",
    price: 45000,
    compareAtPrice: null,
    images: JSON.stringify(["/images/products/watch-2.jpg", "/images/products/watch-2-alt.jpg"]),
    categorySlug: "watches",
    stock: 2,
    rating: 5.0,
    reviewCount: 12,
    featured: true,
    tags: JSON.stringify(["tourbillon", "platinum", "limited", "swiss"]),
  },
  {
    name: "Classic Automatic Silver",
    slug: "classic-automatic-silver",
    description: "Timeless elegance with automatic movement, silver dial, and stainless steel bracelet. A perfect everyday luxury timepiece.",
    price: 4200,
    compareAtPrice: 5000,
    images: JSON.stringify(["/images/products/watch-3.jpg"]),
    categorySlug: "watches",
    stock: 15,
    rating: 4.7,
    reviewCount: 89,
    featured: false,
    tags: JSON.stringify(["automatic", "silver", "classic"]),
  },
  {
    name: "Diamond Bezel Diver",
    slug: "diamond-bezel-diver",
    description: "A stunning dive watch with diamond-set bezel, ceramic insert, and 300m water resistance. Where adventure meets luxury.",
    price: 18500,
    compareAtPrice: 22000,
    images: JSON.stringify(["/images/products/watch-4.jpg"]),
    categorySlug: "watches",
    stock: 8,
    rating: 4.8,
    reviewCount: 34,
    featured: true,
    tags: JSON.stringify(["diamond", "diver", "ceramic"]),
  },

  // Jewelry
  {
    name: "Eternal Diamond Necklace",
    slug: "eternal-diamond-necklace",
    description: "A breathtaking 5-carat diamond pendant on an 18K white gold chain. GIA certified, VS1 clarity, D color.",
    price: 28000,
    compareAtPrice: null,
    images: JSON.stringify(["/images/products/jewelry-1.jpg", "/images/products/jewelry-1-alt.jpg"]),
    categorySlug: "jewelry",
    stock: 3,
    rating: 5.0,
    reviewCount: 22,
    featured: true,
    tags: JSON.stringify(["diamond", "necklace", "white-gold"]),
  },
  {
    name: "Ruby Empire Ring",
    slug: "ruby-empire-ring",
    description: "A magnificent 3-carat Burmese ruby surrounded by diamonds, set in 18K rose gold. A statement piece of extraordinary beauty.",
    price: 35000,
    compareAtPrice: null,
    images: JSON.stringify(["/images/products/jewelry-2.jpg"]),
    categorySlug: "jewelry",
    stock: 2,
    rating: 4.9,
    reviewCount: 15,
    featured: true,
    tags: JSON.stringify(["ruby", "ring", "rose-gold"]),
  },
  {
    name: "Sapphire Cascade Earrings",
    slug: "sapphire-cascade-earrings",
    description: "Elegant cascade earrings featuring Ceylon sapphires and diamonds in platinum setting. Total gemstone weight 4.5 carats.",
    price: 8900,
    compareAtPrice: 10500,
    images: JSON.stringify(["/images/products/jewelry-3.jpg"]),
    categorySlug: "jewelry",
    stock: 6,
    rating: 4.8,
    reviewCount: 31,
    featured: false,
    tags: JSON.stringify(["sapphire", "earrings", "platinum"]),
  },

  // Leather Goods
  {
    name: "Heritage Leather Briefcase",
    slug: "heritage-leather-briefcase",
    description: "Handcrafted Italian calfskin leather briefcase with brass hardware. Features laptop compartment, organizer pockets, and detachable shoulder strap.",
    price: 1850,
    compareAtPrice: 2200,
    images: JSON.stringify(["/images/products/leather-1.jpg", "/images/products/leather-1-alt.jpg"]),
    categorySlug: "leather-goods",
    stock: 12,
    rating: 4.8,
    reviewCount: 67,
    featured: true,
    tags: JSON.stringify(["briefcase", "italian-leather", "calfskin"]),
  },
  {
    name: "Monogram Travel Trunk",
    slug: "monogram-travel-trunk",
    description: "A legendary monogram canvas trunk with natural cowhide trim. The epitome of luxury travel, handcrafted with over 150 years of heritage.",
    price: 5200,
    compareAtPrice: null,
    images: JSON.stringify(["/images/products/leather-2.jpg"]),
    categorySlug: "leather-goods",
    stock: 4,
    rating: 4.9,
    reviewCount: 28,
    featured: true,
    tags: JSON.stringify(["trunk", "monogram", "travel"]),
  },
  {
    name: "Bifold Wallet in Epi Leather",
    slug: "bifold-wallet-epi",
    description: "Slim bifold wallet in textured Epi leather with multiple card slots and bill compartment. A refined essential.",
    price: 650,
    compareAtPrice: 780,
    images: JSON.stringify(["/images/products/leather-3.jpg"]),
    categorySlug: "leather-goods",
    stock: 25,
    rating: 4.6,
    reviewCount: 112,
    featured: false,
    tags: JSON.stringify(["wallet", "epi-leather", "slim"]),
  },

  // Fragrances
  {
    name: "Noir Absolu Parfum",
    slug: "noir-absolu-parfum",
    description: "An intoxicating blend of black amber, oud wood, and Bulgarian rose. A bold, sophisticated fragrance for the discerning connoisseur.",
    price: 420,
    compareAtPrice: null,
    images: JSON.stringify(["/images/products/fragrance-1.jpg", "/images/products/fragrance-1-alt.jpg"]),
    categorySlug: "fragrances",
    stock: 30,
    rating: 4.8,
    reviewCount: 156,
    featured: true,
    tags: JSON.stringify(["oud", "amber", "unisex"]),
  },
  {
    name: "Jardin Secret Eau de Parfum",
    slug: "jardin-secret-edp",
    description: "A secret garden captured in a bottle — jasmine sambac, tuberose, and fresh fig leaf create an enchanting feminine fragrance.",
    price: 350,
    compareAtPrice: 420,
    images: JSON.stringify(["/images/products/fragrance-2.jpg"]),
    categorySlug: "fragrances",
    stock: 40,
    rating: 4.7,
    reviewCount: 203,
    featured: false,
    tags: JSON.stringify(["floral", "jasmine", "feminine"]),
  },
  {
    name: "Vetiver Imperial Cologne",
    slug: "vetiver-imperial-cologne",
    description: "A refined masculine cologne featuring Haitian vetiver, Italian bergamot, and pepper. Timeless sophistication in every spritz.",
    price: 280,
    compareAtPrice: null,
    images: JSON.stringify(["/images/products/fragrance-3.jpg"]),
    categorySlug: "fragrances",
    stock: 50,
    rating: 4.6,
    reviewCount: 178,
    featured: false,
    tags: JSON.stringify(["vetiver", "bergamot", "masculine"]),
  },

  // Fashion
  {
    name: "Cashmere Overcoat",
    slug: "cashmere-overcoat",
    description: "Double-breasted overcoat in pure Italian cashmere. Tailored silhouette with satin lining, horn buttons, and hand-finished details.",
    price: 3200,
    compareAtPrice: 3800,
    images: JSON.stringify(["/images/products/fashion-1.jpg", "/images/products/fashion-1-alt.jpg"]),
    categorySlug: "fashion",
    stock: 8,
    rating: 4.9,
    reviewCount: 43,
    featured: true,
    tags: JSON.stringify(["cashmere", "overcoat", "italian"]),
  },
  {
    name: "Silk Evening Gown",
    slug: "silk-evening-gown",
    description: "A stunning floor-length gown in pure silk charmeuse with delicate crystal embellishments. Designed for the most memorable occasions.",
    price: 5800,
    compareAtPrice: null,
    images: JSON.stringify(["/images/products/fashion-2.jpg"]),
    categorySlug: "fashion",
    stock: 4,
    rating: 5.0,
    reviewCount: 19,
    featured: true,
    tags: JSON.stringify(["silk", "gown", "crystal"]),
  },
  {
    name: "Tailored Linen Blazer",
    slug: "tailored-linen-blazer",
    description: "Impeccably tailored linen blazer with half-canvas construction. Perfect for warm-weather sophistication.",
    price: 1450,
    compareAtPrice: 1700,
    images: JSON.stringify(["/images/products/fashion-3.jpg"]),
    categorySlug: "fashion",
    stock: 10,
    rating: 4.7,
    reviewCount: 55,
    featured: false,
    tags: JSON.stringify(["linen", "blazer", "tailored"]),
  },

  // Home & Living
  {
    name: "Murano Crystal Vase",
    slug: "murano-crystal-vase",
    description: "Handblown Murano crystal vase with 24K gold leaf inclusions. Each piece is a unique work of art, signed by the master glassblower.",
    price: 2800,
    compareAtPrice: null,
    images: JSON.stringify(["/images/products/home-1.jpg", "/images/products/home-1-alt.jpg"]),
    categorySlug: "home-living",
    stock: 7,
    rating: 4.8,
    reviewCount: 24,
    featured: true,
    tags: JSON.stringify(["murano", "crystal", "vase", "gold-leaf"]),
  },
  {
    name: "Silk Throw Pillow Set",
    slug: "silk-throw-pillow-set",
    description: "Set of 4 hand-embroidered silk throw pillows with gold thread accents. Filled with premium duck down for luxurious comfort.",
    price: 950,
    compareAtPrice: 1200,
    images: JSON.stringify(["/images/products/home-2.jpg"]),
    categorySlug: "home-living",
    stock: 15,
    rating: 4.6,
    reviewCount: 41,
    featured: false,
    tags: JSON.stringify(["silk", "pillow", "embroidered"]),
  },
  {
    name: "Artisan Scented Candle Collection",
    slug: "artisan-scented-candles",
    description: "A collection of 6 artisan candles hand-poured in amber glass vessels. Notes of sandalwood, vanilla, and exotic spices. Total burn time: 240 hours.",
    price: 380,
    compareAtPrice: null,
    images: JSON.stringify(["/images/products/home-3.jpg"]),
    categorySlug: "home-living",
    stock: 20,
    rating: 4.5,
    reviewCount: 87,
    featured: false,
    tags: JSON.stringify(["candles", "scented", "artisan"]),
  },
];

async function seed() {
  console.log("🌱 Seeding database...");

  // Create categories
  for (const cat of categories) {
    await db.category.upsert({
      where: { slug: cat.slug },
      update: cat,
      create: cat,
    });
  }
  console.log(`✅ Created ${categories.length} categories`);

  // Create products
  for (const prod of products) {
    const category = await db.category.findUnique({
      where: { slug: prod.categorySlug },
    });

    if (!category) {
      console.error(`❌ Category not found: ${prod.categorySlug}`);
      continue;
    }

    const { categorySlug, ...productData } = prod;

    await db.product.upsert({
      where: { slug: prod.slug },
      update: { ...productData, categoryId: category.id },
      create: { ...productData, categoryId: category.id },
    });
  }
  console.log(`✅ Created ${products.length} products`);

  console.log("🎉 Seeding complete!");
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
