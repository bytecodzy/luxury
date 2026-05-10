Task ID: 5
Agent: Flutter Bug Fixer
Task: Fix 10 critical bugs in the Flutter app

Work Log:
- Read worklog.md to understand previous agents' work (Tasks 1-4 covered web app bugs and documentation)
- Read all 6 files that needed modifications before making any changes

BUG 1: Fixed baseUrl empty string in app_config.dart
- Added imports for `dart:io` and `package:flutter/foundation.dart`
- Changed `static const String baseUrl = ''` to `'http://10.0.2.2:81'`
- Added `static String get effectiveBaseUrl` that returns correct URL per platform (Android emulator → 10.0.2.2, iOS simulator → localhost)
- Fixed `getImageUrl()` to always prepend `effectiveBaseUrl` for absolute URLs on mobile
- Updated api_service.dart to use `AppConfig.effectiveBaseUrl` instead of `AppConfig.baseUrl` in all 4 HTTP methods (_get, _post, _put, _delete)

BUG 2: Auth token never saved after login/register
- In `login()`, added `final token = data['token'] as String?;` and `if (token != null) _api.setAuthToken(token);`
- In `register()`, added the same token extraction and setting logic

BUG 3: Auth token never persisted to SharedPreferences
- Added `import 'package:shared_preferences/shared_preferences.dart';`
- In `login()`, after setting auth token, save to SharedPreferences: `await prefs.setString('auth_token', token)`
- In `register()`, same persistence logic
- In `initialize()`, added token restoration from SharedPreferences BEFORE calling `_api.getMe()`
- In `logout()`, added `await prefs.remove('auth_token')` to clear saved token

BUG 4: Checkout completely fake — never calls backend
- Replaced mock `Future.delayed(const Duration(seconds: 2))` with real `api.checkout({...})` call
- Added proper error handling with try/catch, showing SnackBar on failure
- Sends cart items, shipping address, payment method, and promo code to backend
- Added import for `../../services/api_service.dart`

BUG 5: Orders screen uses hardcoded mock data
- Replaced `_generateMockOrders()` with real `api.getOrders()` call
- Added `_error` state variable for error display
- Added error UI with retry button
- Added `processing` status handling in StatusBadge and Timeline
- Used `AppConfig.getImageUrl()` for order item images (proper absolute URLs on mobile)
- Removed the entire `_generateMockOrders()` method and mock data

BUG 6: Cart never loaded from backend
- In `initialize()`, after auth restoration (`_user` is set), added cart loading: `_api.getCart()` → parse items → `_cartItems`

BUG 7: Cart operations not synced to backend
- `removeFromCart()`: Changed from `void` to `Future<void>`, added `await _api.removeFromCart(productId)` with try/catch
- `updateCartQuantity()`: Changed from `void` to `Future<void>`, added `await _api.updateCartItem(productId, quantity)` with try/catch
- `clearCart()`: Changed from `void` to `Future<void>`, saved product IDs before clearing, then removes each from backend

BUG 8: Wishlist never loaded from backend
- In `initialize()`, after auth restoration, added wishlist loading: `_api.getWishlist()` → extract product IDs → `_wishlistIds`

BUG 9: addToCart sends wrong item to API
- Changed `await _api.addToCart(_cartItems.last)` to `await _api.addToCart(_cartItems[existingIndex >= 0 ? existingIndex : _cartItems.length - 1])`

BUG 10: Tab switching broken from child screens
- In `MainNavigation` build method, added sync logic:
  - If `provider.currentTab != _currentIndex`, schedule post-frame callback to update state
  - This ensures child screens that call `provider.setTab()` properly update the navigation

Stage Summary:
- All 10 bugs fixed across 5 files (app_config.dart, api_service.dart, app_providers.dart, checkout_screen.dart, orders_screen.dart, main.dart)
- Flutter SDK not available in sandbox, manual code review performed to verify correctness
- All changes are backward-compatible and follow existing code patterns
