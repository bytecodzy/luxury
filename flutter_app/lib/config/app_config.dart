import 'dart:io';
import 'package:flutter/foundation.dart';

class AppConfig {
  // Base URL - will be relative for web, uses same origin
  static const String baseUrl = 'http://10.0.2.2:81';  // Android emulator

  // Get the appropriate base URL for the current platform
  static String get effectiveBaseUrl {
    // For Android emulator, use 10.0.2.2
    // For iOS simulator, use localhost
    // For physical devices, use actual server IP
    if (kIsWeb) return '';
    if (Platform.isAndroid) return 'http://10.0.2.2:81';
    if (Platform.isIOS) return 'http://localhost:81';
    return 'http://10.0.2.2:81';
  }

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
    if (path == null || path.isEmpty) return '${effectiveBaseUrl}/images/logo.png';
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return '${effectiveBaseUrl}/api/image-proxy?url=${Uri.encodeComponent(path)}';
    }
    return '$effectiveBaseUrl$path';
  }
}
