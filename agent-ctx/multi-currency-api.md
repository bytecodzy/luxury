# Task: Create Multi-Currency API Routes

## Summary
Created two API routes for multi-currency support in the 3 BOXES LUXURY e-commerce project.

## Files Created/Modified

### 1. `/src/app/api/geo/route.ts`
- **GET /api/geo** — Detects user's country, currency, and language from IP address
- Uses `x-forwarded-for` header for IP detection
- Fetches geo data from `ipapi.co` API
- Falls back to IN/INR/Hindi if detection fails
- Seeds `GeoCountry` table on first request with 20 countries
- Returns: `{ country, countryName, currency, language, flagEmoji, ip }`

### 2. `/src/app/api/currency/rates/route.ts`
- **GET /api/currency/rates** — Returns all currency exchange rates (INR base)
- **POST /api/currency/rates** — Force refresh rates from Frankfurter API
- Checks `CurrencyRate` table; refreshes if > 24 hours stale
- Fetches from `https://api.frankfurter.dev/v1/latest?from=INR` (free, no API key)
- Seeds fallback data (17 currencies) if table is empty
- Stores/updates rates via upsert operations
- Extended CURRENCY_META mapping for 30+ currencies from the API
- Returns: `{ baseCurrency, rates: { CODE: { code, name, symbol, rate } }, lastUpdated }`

## Key Decisions
- Used `https://api.frankfurter.dev/v1/latest` (new domain, old `.app` domain redirects with 301)
- Removed `skipDuplicates` from `createMany` (not supported in Prisma v6+)
- Used `cache: 'no-store'` instead of `next: { revalidate: 0 }` for fetch options
- Both APIs gracefully handle errors with fallback data

## Testing Results
- GET /api/geo ✅ Returns correct geo data (IN/INR/hi for local requests)
- GET /api/currency/rates ✅ Returns 32 currencies with live rates
- POST /api/currency/rates ✅ Successfully refreshes rates from external API
- ESLint passes ✅
