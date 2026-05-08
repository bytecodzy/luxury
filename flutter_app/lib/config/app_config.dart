class AppConfig {
  // Base URL - will be relative for web, uses same origin
  static const String baseUrl = '';
  
  // API endpoints
  static const String productsApi = '/api/products';
  static const String categoriesApi = '/api/categories';
  static const String cartApi = '/api/cart';
  static const String ordersApi = '/api/orders';
  static const String authLoginApi = '/api/auth/login';
  static const String authRegisterApi = '/api/auth/register';
  static const String authMeApi = '/api/auth/me';
  static const String checkoutApi = '/api/checkout';
  static const String wishlistApi = '/api/wishlist';
  static const String giftRecommendApi = '/api/gift-recommend';
  static const String currencyRatesApi = '/api/currency/rates';
  static const String geoApi = '/api/geo';
  static const String imageProxy = '/api/image-proxy';
  static const String offersApi = '/api/offers';
  
  // App info
  static const String appName = '3 BOXES LUXURY';
  static const String appTagline = 'Curated Luxury Gifting';
  
  // Currency defaults
  static const String defaultCurrency = 'INR';
  static const String defaultCurrencySymbol = '₹';
  
  // Colors
  static const int primaryGold = 0xFFD4A437;
  static const int darkBg = 0xFF0C0A09;
  static const int cardBg = 0xFF1C1917;
  static const int surfaceBg = 0xFF292524;
  
  static String getImageUrl(String? path) {
    if (path == null || path.isEmpty) return '/images/logo.png';
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return '$imageProxy?url=${Uri.encodeComponent(path)}';
    }
    return path;
  }
}
