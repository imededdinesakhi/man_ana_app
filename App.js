import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, StatusBar, AppState } from 'react-native';
import { WebView } from 'react-native-webview';
import { 
  BannerAd, 
  BannerAdSize, 
  TestIds, 
  RewardedAd, 
  RewardedAdEventType, 
  InterstitialAd, 
  AdEventType,
  AppOpenAd
} from 'react-native-google-mobile-ads';

// 1. معرفات الإعلانات الرسمية والإنتاجية الخاصة بتطبيقك
const bannerAdUnitId = __DEV__ ? TestIds.BANNER : 'ca-app-pub-3363485131173314/7285247587';
const interstitialAdUnitId = __DEV__ ? TestIds.INTERSTITIAL : 'ca-app-pub-3363485131173314/2204732756';
const rewardedAdUnitId = __DEV__ ? TestIds.REWARDED : 'ca-app-pub-3363485131173314/2622545474';
const appOpenAdUnitId = __DEV__ ? TestIds.APP_OPEN : 'ca-app-pub-3363485131173314/5844594865';

// 2. إنشاء كائنات الإعلانات مسبقاً وتمرير خيارات منع الإعلانات المخصصة لحماية الخصوصية
const interstitial = InterstitialAd.createForAdRequest(interstitialAdUnitId, { requestNonPersonalizedAdsOnly: true });
const rewarded = RewardedAd.createForAdRequest(rewardedAdUnitId, { requestNonPersonalizedAdsOnly: true });
const appOpenAd = AppOpenAd.createForAdRequest(appOpenAdUnitId, { requestNonPersonalizedAdsOnly: true });

export default function App() {
  const webViewRef = useRef(null);
  const appState = useRef(AppState.currentState);
  const [rewardedLoaded, setRewardedLoaded] = useState(false);
  const [interstitialLoaded, setInterstitialLoaded] = useState(false);

  // رابط مستودع اللعبة الخاص بك على الويب
  const GAME_URL = "https://imededdinesakhi.github.io/man_ana_web/";

  useEffect(() => {
    // ==========================================
    // أ- إدارة إعلان فتح التطبيق (App Open Ad)
    // ==========================================
    const unsubscribeOpen = appOpenAd.addAdEventListener(AdEventType.LOADED, () => {
      appOpenAd.show();
    });
    appOpenAd.load();

    // مستمع لمراقبة خروج المستخدم من التطبيق وعودته إليه من أجل إعلان الفتح
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        appOpenAd.load();
      }
      appState.current = nextAppState;
    });

    // ==========================================
    // ب- إدارة إعلانات المكافآت (Rewarded Ads)
    // ==========================================
    const unsubscribeRewardedLoaded = rewarded.addAdEventListener(
      RewardedAdEventType.LOADED, 
      () => setRewardedLoaded(true)
    );

    // هذا هو الحدث الأهم: يتم إطلاقه فور انتهاء المستخدم من مشاهدة الإعلان كاملاً
    const unsubscribeEarned = rewarded.addAdEventListener(
      RewardedAdEventType.EARNED_REWARD, 
      (reward) => {
        // إرسال رسالة آمنة عبر الجسر البرمجي للويب لشحن الـ 50 عملة فوراً
        if (webViewRef.current) {
          webViewRef.current.postMessage(JSON.stringify({ type: "ADD_COINS_SUCCESS", amount: 50 }));
        }
      }
    );

    const unsubscribeRewardedClosed = rewarded.addAdEventListener(
      AdEventType.CLOSED, 
      () => {
        setRewardedLoaded(false);
        rewarded.load(); // تحميل الإعلان التالي مسبقاً في الخلفية
      }
    );

    // ==========================================
    // ج- إدارة الإعلانات البينية المنظمة (Interstitial)
    // ==========================================
    const unsubscribeInterstitialLoaded = interstitial.addAdEventListener(
      AdEventType.LOADED, 
      () => setInterstitialLoaded(true)
    );

    const unsubscribeInterstitialClosed = interstitial.addAdEventListener(
      AdEventType.CLOSED, 
      () => {
        setInterstitialLoaded(false);
        interstitial.load(); // شحن الإعلان البيني التالي في الخلفية
      }
    );

    // بدء تحميل الإعلانات مسبقاً بمجرد تشغيل التطبيق لأول مرة
    rewarded.load();
    interstitial.load();

    // تنظيف كافة المستمعين عند إغلاق المكون البرمجي لمنع تضخم الذاكرة
    return () => {
      subscription.remove();
      unsubscribeOpen();
      unsubscribeRewardedLoaded();
      unsubscribeEarned();
      unsubscribeRewardedClosed();
      unsubscribeInterstitialLoaded();
      unsubscribeInterstitialClosed();
    };
  }, []);

  // ==========================================
  // د- مستمع استقبال الطلبات القادمة من الويب (Bridge)
  // ==========================================
  const handleWebViewMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);

      // 1. استقبال طلب إعلان المكافأة (عند الرغبة في شحن الذهب)
      if (data.type === "REQUEST_REWARDED_AD") {
        if (rewardedLoaded) {
          rewarded.show();
        } else {
          rewarded.load();
        }
      }

      // 2. استقبال طلب الإعلان البيني المنظم (الذي ينطلق فقط كل 5 مستويات من حسابات الويب)
      if (data.type === "REQUEST_INTERSTITIAL_AD") {
        if (interstitialLoaded) {
          interstitial.show();
        } else {
          interstitial.load();
        }
      }
    } catch (error) {
      console.error("Error handling webview message:", error);
    }
  };

  return (
    <View style={styles.container}>
      {/* إخفاء شريط الحالة العلوي للهاتف لمنع تشتيت اللاعب وإعطاء مظهر الشاشة الكاملة */}
      <StatusBar hidden={true} />
      
      {/* حاوية الـ WebView المسؤولة عن تشغيل اللعبة */}
      <View style={styles.webViewContainer}>
        <WebView
          ref={webViewRef}
          source={{ uri: GAME_URL }}
          style={styles.webview}
          onMessage={handleWebViewMessage}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          scalesPageToFit={false}
          originWhitelist={['*']}
          allowsBackForwardNavigationGestures={true}
        />
      </View>

      {/* حاوية إعلان البانر السفلي المستقر والثابت هندسياً في الأسفل */}
      <View style={styles.bannerContainer}>
        <BannerAd
          unitId={bannerAdUnitId}
          size={BannerAdSize.BANNER}
          requestOptions={{ requestNonPersonalizedAdsOnly: true }}
        />
      </View>
    </View>
  );
}

// التنسيقات والأبعاد البصرية للهيكل الخارجي للـ App
const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#0b132b' 
  },
  webViewContainer: { 
    flex: 1 
  },
  webview: { 
    flex: 1, 
    backgroundColor: 'transparent' 
  },
  bannerContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0b132b', 
    paddingVertical: 3,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)', // خط علوي خفيف جداً لفصل البانر بشكل أنيق عن اللعبة
  },
});