import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, StatusBar } from 'react-native';
import { WebView } from 'react-native-webview';
import mobileAds, { 
  BannerAd, 
  BannerAdSize, 
  TestIds, 
  RewardedAd, 
  RewardedAdEventType, 
  InterstitialAd, 
  AdEventType
} from 'react-native-google-mobile-ads';

// =========================================================
// 💡 للتحكم في نوع الإعلانات:
// - اجعلها false حتى تظهر إعلاناتك الحقيقية بدلاً من Test Ad
// =========================================================
const USE_TEST_ADS = false; 

// معرفات الإعلانات الحقيقية والتجريبية
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

  // دالة منح الـ 50 عملة للعبة الويب بكل الطرق الممكنة
  const sendRewardToWeb = () => {
    if (webViewRef.current) {
      const rewardPayload = JSON.stringify({ type: "ADD_COINS_SUCCESS", amount: 50 });

      // 1. إرسال حدث عبر postMessage العادي
      webViewRef.current.postMessage(rewardPayload);

      // 2. حقن كود JavaScript مباشر في صفحة اللعبة لإضافة العملات وتحديث الواجهة والـ LocalStorage
      const injectJsCode = `
        (function() {
          try {
            // محاولة استدعاء الدالة المخصصة في اللعبة إن وجدت
            if (typeof window.addCoins === 'function') {
              window.addCoins(50);
            } else if (typeof window.onRewardEarned === 'function') {
              window.onRewardEarned(50);
            }

            // تحديث المتغيرات الشائعة للعملات في اللعبة
            if (typeof window.coins !== 'undefined') {
              window.coins = (parseInt(window.coins) || 0) + 50;
            }

            // إرسال حدث window message يدوي داخل الويب
            window.dispatchEvent(new MessageEvent('message', {
              data: ${rewardPayload}
            }));

            // إعادة تحميل أو تحديث واجهة النقاط إن كانت مسجلة في LocalStorage
            let currentCoins = parseInt(localStorage.getItem('coins') || '0');
            localStorage.setItem('coins', currentCoins + 50);

          } catch(e) {
            console.error("Error executing reward script:", e);
          }
        })();
        true;
      `;

      webViewRef.current.injectJavaScript(injectJsCode);
      console.log('Reward execution injected to WebView!');
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
        console.log('User completed rewarded ad, giving 50 coins...');
        sendRewardToWeb();
      }
    );

    const unsubscribeRewardedClosed = rewarded.addAdEventListener(
      AdEventType.CLOSED, 
      () => {
        setRewardedLoaded(false);
        rewarded.load();
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

  // استقبال طلبات الإعلانات القادمة من اللعبة (WebView)
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

      {/* إعلان البانر السفلي (الحقيقي) */}
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
});