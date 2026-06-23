// Storefront i18n dictionary.
//
// English keys are the source of truth — if a translation is missing for the
// active locale, the English string is returned (so untranslated areas keep
// working without crashes). Keys are hierarchical with dot-paths.
//
// Adding a new language: copy `ar` below, replace strings. Add the locale
// to LOCALES + getLocaleConfig() so the picker knows about it.

export const LOCALES = ['en', 'ar']

export const LOCALE_LABELS = {
  en: 'English',
  ar: 'العربية',
}

// Native-script flag emoji works fine for picker rows.
export const LOCALE_FLAGS = {
  en: '🇺🇸',
  ar: '🇱🇧',
}

export function getLocaleConfig(locale) {
  return {
    code: locale,
    label: LOCALE_LABELS[locale] || locale,
    dir:   locale === 'ar' ? 'rtl' : 'ltr',
  }
}

const dict = {
  en: {
    // Navigation
    'nav.shop':         'Shop',
    'nav.new_arrivals': 'New Arrivals',
    'nav.sale':         'Sale',
    'nav.search':       'Search',
    'nav.cart':         'Cart',
    'nav.wishlist':     'Wishlist',
    'nav.orders':       'My Orders',
    'nav.profile':      'Profile Settings',
    'nav.compare':      'Compare',
    'nav.home':         'Home',
    'nav.account':      'Account',

    // Auth
    'auth.login':       'Login',
    'auth.sign_up':     'Sign Up',
    'auth.sign_out':    'Sign Out',
    'auth.login_register': 'Login / Sign Up',
    'auth.admin_panel': 'Admin Panel',
    'auth.admin_role':  'Admin',

    // Common buttons
    'btn.add_to_cart':  'Add to Cart',
    'btn.buy_now':      'Buy Now',
    'btn.checkout':     'Checkout',
    'btn.continue':     'Continue',
    'btn.back':         'Back',
    'btn.save':         'Save',
    'btn.cancel':       'Cancel',
    'btn.apply':        'Apply',
    'btn.clear':        'Clear',
    'btn.browse_products': 'Browse Products',
    'btn.view_all':     'View all',
    'btn.see_more':     'See more',

    // Cart
    'cart.title':        'Shopping Cart',
    'cart.empty_title':  'Your cart is empty',
    'cart.empty_body':   "Looks like you haven't added anything yet.",
    'cart.subtotal':     'Subtotal',
    'cart.shipping':     'Shipping',
    'cart.tax':          'Tax',
    'cart.discount':     'Discount',
    'cart.total':        'Total',
    'cart.coupon':       'Coupon code',
    'cart.free_shipping_unlocked': 'You unlocked free shipping!',

    // Product
    'product.in_stock':     'In stock',
    'product.out_of_stock': 'Out of stock',
    'product.only_left':    'Only {n} left',
    'product.preorder':     'Pre-order',
    'product.coming':       'Coming {date}',
    'product.notify_me':    'Notify me',
    'product.quick_view':   'Quick view',
    'product.add_to_compare': 'Add to compare',

    // Account / Profile
    'account.welcome':   'Welcome back',
    'account.member_since': 'Member since',
    'account.personal_info': 'Personal Info',
    'account.security':     'Security',
    'account.addresses':    'Addresses',

    // Footer
    'footer.about':       'About Pick&Go LB',
    'footer.about_body':  'Curated products, fast delivery and friendly support.',
    'footer.shop':        'Shop',
    'footer.help':        'Help',
    'footer.contact':     'Contact us',
    'footer.faq':         'FAQ',
    'footer.shipping':    'Shipping & Returns',
    'footer.privacy':     'Privacy Policy',
    'footer.terms':       'Terms of Service',
    'footer.rights':      'All rights reserved.',

    // Misc
    'misc.language':      'Language',
    'misc.currency':      'Currency',
  },

  ar: {
    'nav.shop':         'المتجر',
    'nav.new_arrivals': 'وصل حديثاً',
    'nav.sale':         'تخفيضات',
    'nav.search':       'بحث',
    'nav.cart':         'السلة',
    'nav.wishlist':     'المفضلة',
    'nav.orders':       'طلباتي',
    'nav.profile':      'إعدادات الحساب',
    'nav.compare':      'مقارنة',
    'nav.home':         'الرئيسية',
    'nav.account':      'الحساب',

    'auth.login':       'تسجيل الدخول',
    'auth.sign_up':     'إنشاء حساب',
    'auth.sign_out':    'تسجيل الخروج',
    'auth.login_register': 'تسجيل دخول / إنشاء حساب',
    'auth.admin_panel': 'لوحة الإدارة',
    'auth.admin_role':  'مسؤول',

    'btn.add_to_cart':  'أضف للسلة',
    'btn.buy_now':      'اشتري الآن',
    'btn.checkout':     'إتمام الشراء',
    'btn.continue':     'متابعة',
    'btn.back':         'رجوع',
    'btn.save':         'حفظ',
    'btn.cancel':       'إلغاء',
    'btn.apply':        'تطبيق',
    'btn.clear':        'مسح',
    'btn.browse_products': 'تصفح المنتجات',
    'btn.view_all':     'عرض الكل',
    'btn.see_more':     'عرض المزيد',

    'cart.title':        'سلة التسوق',
    'cart.empty_title':  'سلتك فارغة',
    'cart.empty_body':   'يبدو أنك لم تُضف أي منتج بعد.',
    'cart.subtotal':     'المجموع الفرعي',
    'cart.shipping':     'الشحن',
    'cart.tax':          'الضريبة',
    'cart.discount':     'الخصم',
    'cart.total':        'الإجمالي',
    'cart.coupon':       'رمز الخصم',
    'cart.free_shipping_unlocked': 'حصلت على شحن مجاني!',

    'product.in_stock':     'متوفر',
    'product.out_of_stock': 'غير متوفر',
    'product.only_left':    'بقي {n} فقط',
    'product.preorder':     'طلب مسبق',
    'product.coming':       'يصدر في {date}',
    'product.notify_me':    'أعلمني',
    'product.quick_view':   'عرض سريع',
    'product.add_to_compare': 'أضف للمقارنة',

    'account.welcome':   'مرحباً بعودتك',
    'account.member_since': 'عضو منذ',
    'account.personal_info': 'المعلومات الشخصية',
    'account.security':     'الأمان',
    'account.addresses':    'العناوين',

    'footer.about':       'عن متجرنا',
    'footer.about_body':  'منتجات مختارة بعناية، توصيل سريع، ودعم ودود.',
    'footer.shop':        'المتجر',
    'footer.help':        'المساعدة',
    'footer.contact':     'اتصل بنا',
    'footer.faq':         'الأسئلة الشائعة',
    'footer.shipping':    'الشحن والإرجاع',
    'footer.privacy':     'سياسة الخصوصية',
    'footer.terms':       'شروط الخدمة',
    'footer.rights':      'جميع الحقوق محفوظة.',

    'misc.language':      'اللغة',
    'misc.currency':      'العملة',
  },
}

export default dict
