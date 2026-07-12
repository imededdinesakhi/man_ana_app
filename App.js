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

// 🛠️ معرفات الإعلانات الرسمية الكاملة الخاصة بك
const bannerAdUnitId = __DEV__ ? TestIds.BANNER : 'ca-app-pub-3363485131173314/7285247587';
const interstitialAdUnitId = __DEV__ ? TestIds.INTERSTITIAL : 'ca-app-pub-3363485131173314/2204732756';
const rewardedAdUnitId = __DEV__ ? TestIds.REWARDED : 'ca-app-pub-3363485131173314/2622545474';
const appOpenAdUnitId = __DEV__ ? TestIds.APP_OPEN : 'ca-app-pub-3363485131173314/5844594865';

// إنشاء كائنات الإعلانات
const interstitial = InterstitialAd.createForAdRequest(interstitialAdUnitId, { requestNonPersonalizedAdsOnly: true });
const rewarded = RewardedAd.createForAdRequest(rewardedAdUnitId, { requestNonPersonalizedAdsOnly: true });
const appOpenAd = AppOpenAd.createForAdRequest(appOpenAdUnitId, { requestNonPersonalizedAdsOnly: true });

export default function App() {
  const webViewRef = useRef(null);
  const appState = useRef(AppState.currentState);
  const [rewardedLoaded, setRewardedLoaded] = useState(false);
  const [interstitialLoaded, setInterstitialLoaded] = useState(false);

  const GAME_URL = "https://imededdinesakhi.github.io/man_ana_web/";

  useEffect(() => {
    // 1. إدارة إعلان فتح التطبيق (App Open) 
    const unsubscribeOpenLoaded = appOpenAd.addAdEventListener(AdEventType.LOADED, () => {
      // إظهار الإعلان فوراً بمجرد تحميله عند فتح اللعبة
      appOpenAd.show();
    });

    appOpenAd.load();

    // الاستماع لحالة التطبيق (إذا خرج المستخدم للخلفية ثم عاد للعبة)
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        appOpenAd.load();
      }
      appState.current = nextAppState;
    });

    // 2. إدارة إعلانات المكافأة (شحن الذهب عند الطلب)
    const unsubscribeRewardedLoaded = rewarded.addAdEventListener(RewardedAdEventType.LOADED, () => setRewardedLoaded(true));
    const unsubscribeEarned = rewarded.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
      if (webViewRef.current) {
        webViewRef.current.postMessage(JSON.stringify({ type: "ADD_COINS_SUCCESS", amount: 50 }));
      }
    });
    const unsubscribeRewardedClosed = rewarded.addAdEventListener(AdEventType.CLOSED, () => {
      setRewardedLoaded(false);
      rewarded.load(); 
    });

    // 3. إدارة الإعلانات البينية (الدورية كل 5 مستويات)
    const unsubscribeInterstitialLoaded = interstitial.addAdEventListener(AdEventType.LOADED, () => setInterstitialLoaded(true));
    const unsubscribeInterstitialClosed = interstitial.addAdEventListener(AdEventType.CLOSED, () => {
      setInterstitialLoaded(false);
      interstitial.load(); 
    });

    // شحن الإعلانات البينية والمكافآت مسبقاً في الخلفية
    rewarded.load();
    interstitial.load();

    return () => {
      subscription.remove();
      unsubscribeOpenLoaded();
      unsubscribeRewardedLoaded();
      unsubscribeEarned();
      unsubscribeRewardedClosed();
      unsubscribeInterstitialLoaded();
      unsubscribeInterstitialClosed();
    };
  }, []);

  const handleWebViewMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);

      if (data.type === "REQUEST_REWARDED_AD") {
        if (rewardedLoaded) {
          rewarded.show();
        } else {
          rewarded.load();
        }
      }

      if (data.type === "PAGE_CHANGED") {
        global.clickCount = (global.clickCount || 0) + 1;
        
        // الحسبة البرمجية لإظهار الإعلان البيني بانتظام كل 5 مستويات
        if (global.clickCount % 5 === 0) {
          if (interstitialLoaded) {
            interstitial.show();
            global.clickCount = 0; 
          } else {
            interstitial.load();
          }
        }
      }
    } catch (error) {
      console.error("Error handling webview message:", error);
    }
  };

  return (
    <View style={styles.container}>
      {/* إخفاء شريط الحالة للحصول على أبعاد ملء الشاشة الكاملة للموبايل */}
      <StatusBar hidden={true} />
      
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

      {/* إعلان البانر المدمج والمتناسق أسفل اللعبة */}
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b132b' },
  webViewContainer: { flex: 1 },
  webview: { flex: 1, backgroundColor: 'transparent' },
  bannerContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0b132b', 
    paddingVertical: 2,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)', 
  },
});