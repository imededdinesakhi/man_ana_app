import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, StatusBar, AppState } from 'react-native';
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

// مفتاح التحكم بين إعلانات الاختبار والإعلانات الحقيقية
const USE_TEST_ADS = true; 

const bannerAdUnitId = USE_TEST_ADS ? TestIds.BANNER : 'ca-app-pub-3363485131173314/7285247587';
const interstitialAdUnitId = USE_TEST_ADS ? TestIds.INTERSTITIAL : 'ca-app-pub-3363485131173314/2204732756';
const rewardedAdUnitId = USE_TEST_ADS ? TestIds.REWARDED : 'ca-app-pub-3363485131173314/2622545474';

// إنشاء كائنات الإعلانات
const interstitial = InterstitialAd.createForAdRequest(interstitialAdUnitId, { requestNonPersonalizedAdsOnly: true });
const rewarded = RewardedAd.createForAdRequest(rewardedAdUnitId, { requestNonPersonalizedAdsOnly: true });

export default function App() {
  const webViewRef = useRef(null);
  const [rewardedLoaded, setRewardedLoaded] = useState(false);
  const [interstitialLoaded, setInterstitialLoaded] = useState(false);

  const GAME_URL = "https://imededdinesakhi.github.io/man_ana_web/";

  // دالة إرسال النتيجة إلى الـ WebView بحماية وإعادة محاولة
  const sendRewardToWeb = () => {
    if (webViewRef.current) {
      // إرسال كائن نصي وكائن مباشر لضمان توافق جميع متصفحات الويب
      const rewardData = JSON.stringify({ type: "ADD_COINS_SUCCESS", amount: 50 });
      
      webViewRef.current.injectJavaScript(`
        if (window.onRewardEarned) {
          window.onRewardEarned(50);
        }
        window.postMessage(${rewardData}, '*');
        true;
      `);
      
      webViewRef.current.postMessage(rewardData);
      console.log('Reward message sent to WebView successfully!');
    }
  };

  useEffect(() => {
    // 1. تهيئة AdMob
    mobileAds()
      .initialize()
      .then(() => {
        console.log('AdMob Initialized');
        rewarded.load();
        interstitial.load();
      });

    // 2. إدارة إعلان المكافآت (Rewarded)
    const unsubscribeRewardedLoaded = rewarded.addAdEventListener(
      RewardedAdEventType.LOADED, 
      () => setRewardedLoaded(true)
    );

    const unsubscribeEarned = rewarded.addAdEventListener(
      RewardedAdEventType.EARNED_REWARD, 
      (reward) => {
        console.log('User earned reward:', reward);
        sendRewardToWeb(); // إرسال المكافأة فوراً
      }
    );

    const unsubscribeRewardedClosed = rewarded.addAdEventListener(
      AdEventType.CLOSED, 
      () => {
        setRewardedLoaded(false);
        rewarded.load(); // إعادة التحميل للإعلان القادم
      }
    );

    // 3. إدارة الإعلانات البينية (Interstitial)
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
      unsubscribeRewardedLoaded();
      unsubscribeEarned();
      unsubscribeRewardedClosed();
      unsubscribeInterstitialLoaded();
      unsubscribeInterstitialClosed();
    };
  }, []);

  // استقبال الطلبات من الـ WebView
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

      {/* إعلان البانر السفلي */}
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
});