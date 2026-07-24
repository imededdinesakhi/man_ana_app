import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, StatusBar, AppState, TouchableOpacity, Text } from 'react-native';
import { WebView } from 'react-native-webview';
import mobileAds, { 
  BannerAd, 
  BannerAdSize, 
  TestIds, 
  RewardedAd, 
  RewardedAdEventType, 
  InterstitialAd, 
  AdEventType,
  AppOpenAd
} from 'react-native-google-mobile-ads';

// ==========================================
// 💡 مفتاح التحكم بالإعلانات:
// اجعلها true لتجربة الإعلانات التجريبية والتأكد من الكود
// اجعلها false عندما تريد استخدام إعلاناتك الحقيقية للجمهور
// ==========================================
const USE_TEST_ADS = true; 

// معرفات إعلاناتك الحقيقية والتجريبية
const bannerAdUnitId = USE_TEST_ADS ? TestIds.BANNER : 'ca-app-pub-3363485131173314/7285247587';
const interstitialAdUnitId = USE_TEST_ADS ? TestIds.INTERSTITIAL : 'ca-app-pub-3363485131173314/2204732756';
const rewardedAdUnitId = USE_TEST_ADS ? TestIds.REWARDED : 'ca-app-pub-3363485131173314/2622545474';
const appOpenAdUnitId = USE_TEST_ADS ? TestIds.APP_OPEN : 'ca-app-pub-3363485131173314/5844594865';

// إنشاء كائنات الإعلانات مسبقاً
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

  // دالة فتح Ad Inspector برمجياً عند الحاجة
  const openInspector = () => {
    mobileAds()
      .openAdInspector()
      .then(() => console.log('Ad Inspector opened'))
      .catch((error) => console.error('Ad Inspector error:', error));
  };

  useEffect(() => {
    // 1. تهيئة AdMob أولاً
    mobileAds()
      .initialize()
      .then(adapterStatuses => {
        console.log('AdMob Initialized successfully!');
        
        // بدء تحميل الإعلانات مسبقاً بعد التهيئة
        appOpenAd.load();
        rewarded.load();
        interstitial.load();
      });

    // 2. إدارة إعلان فتح التطبيق (App Open)
    const unsubscribeOpen = appOpenAd.addAdEventListener(AdEventType.LOADED, () => {
      appOpenAd.show();
    });

    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        appOpenAd.load();
      }
      appState.current = nextAppState;
    });

    // 3. إدارة إعلانات المكافآت (Rewarded)
    const unsubscribeRewardedLoaded = rewarded.addAdEventListener(
      RewardedAdEventType.LOADED, 
      () => setRewardedLoaded(true)
    );

    const unsubscribeEarned = rewarded.addAdEventListener(
      RewardedAdEventType.EARNED_REWARD, 
      (reward) => {
        if (webViewRef.current) {
          webViewRef.current.postMessage(JSON.stringify({ type: "ADD_COINS_SUCCESS", amount: 50 }));
        }
      }
    );

    const unsubscribeRewardedClosed = rewarded.addAdEventListener(
      AdEventType.CLOSED, 
      () => {
        setRewardedLoaded(false);
        rewarded.load();
      }
    );

    // 4. إدارة الإعلانات البينية (Interstitial)
    const unsubscribeInterstitialLoaded = interstitial.addAdEventListener(
      AdEventType.LOADED, 
      () => setInterstitialLoaded(true)
    );

    const unsubscribeInterstitialClosed = interstitial.addAdEventListener(
      AdEventType.CLOSED, 
      () => {
        setInterstitialLoaded(false);
        interstitial.load();
      }
    );

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

  // استقبال الطلبات القادمة من اللعبة (WebView)
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

      {/* زر شفاف تجريبي مخفي في الزاوية يمكنك الضغط عليه لفتح Ad Inspector فوراً */}
      {__DEV__ && (
        <TouchableOpacity style={styles.inspectorBtn} onPress={openInspector}>
          <Text style={styles.inspectorText}>🔍 Ad Inspector</Text>
        </TouchableOpacity>
      )}

      {/* حاوية إعلان البانر السفلي */}
      <View style={styles.bannerContainer}>
        <BannerAd
          unitId={bannerAdUnitId}
          size={BannerAdSize.BANNER}
          requestOptions={{ requestNonPersonalizedAdsOnly: true }}
          onAdFailedToLoad={(error) => console.log('Banner Ad Load Failed:', error)}
        />
      </View>
    </View>
  );
}

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
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  inspectorBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 6,
    borderRadius: 5,
    zIndex: 999,
  },
  inspectorText: {
    color: '#fff',
    fontSize: 10,
  }
});