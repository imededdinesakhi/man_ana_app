import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, StatusBar } from 'react-native';
import { WebView } from 'react-native-webview';
import mobileAds, {
  BannerAd,
  BannerAdSize,
  RewardedAd,
  RewardedAdEventType,
  InterstitialAd,
  AdEventType
} from 'react-native-google-mobile-ads';

// معرفات الإعلانات الحقيقية
const bannerAdUnitId = 'ca-app-pub-3363485131173314/7285247587';
const interstitialAdUnitId = 'ca-app-pub-3363485131173314/2204732756';
const rewardedAdUnitId = 'ca-app-pub-3363485131173314/2622545474';

// إنشاء كائنات الإعلانات
const interstitial = InterstitialAd.createForAdRequest(interstitialAdUnitId, { requestNonPersonalizedAdsOnly: true });
const rewarded = RewardedAd.createForAdRequest(rewardedAdUnitId, { requestNonPersonalizedAdsOnly: true });

export default function App() {
  const webViewRef = useRef(null);
  const [rewardedLoaded, setRewardedLoaded] = useState(false);
  const [interstitialLoaded, setInterstitialLoaded] = useState(false);

  const GAME_URL = 'https://imededdinesakhi.github.io/man_ana_web/';

  const sendRewardToWeb = () => {
    if (webViewRef.current) {
      const rewardPayload = JSON.stringify({ type: 'ADD_COINS_SUCCESS', amount: 50 });

      webViewRef.current.postMessage(rewardPayload);

      const injectJsCode = `
        (function() {
          try {
            if (typeof window.addCoins === 'function') {
              window.addCoins(50);
            } else if (typeof window.onRewardEarned === 'function') {
              window.onRewardEarned(50);
            }

            if (typeof window.coins !== 'undefined') {
              window.coins = (parseInt(window.coins) || 0) + 50;
            }

            window.dispatchEvent(new MessageEvent('message', {
              data: ${rewardPayload}
            }));

            let currentCoins = parseInt(localStorage.getItem('coins') || '0');
            localStorage.setItem('coins', currentCoins + 50);
          } catch (e) {
            console.error('Error executing reward script:', e);
          }
        })();
        true;
      `;

      webViewRef.current.injectJavaScript(injectJsCode);
    }
  };

  useEffect(() => {
    // 1. تهيئة AdMob
    mobileAds()
      .initialize()
      .then(() => {
        rewarded.load();
        interstitial.load();
      });

    // 2. أحداث إعلان المكافآت (Rewarded)
    const unsubscribeRewardedLoaded = rewarded.addAdEventListener(
      RewardedAdEventType.LOADED, 
      () => setRewardedLoaded(true)
    );

    const unsubscribeEarned = rewarded.addAdEventListener(
      RewardedAdEventType.EARNED_REWARD,
      () => sendRewardToWeb()
    );

    const unsubscribeRewardedClosed = rewarded.addAdEventListener(
      AdEventType.CLOSED, 
      () => {
        setRewardedLoaded(false);
        rewarded.load(); // إعادة التحميل للإعلان القادم
      }
    );

    const unsubscribeRewardedError = rewarded.addAdEventListener(
      AdEventType.ERROR,
      (error) => {
        console.warn('Rewarded Ad Error:', error);
        setRewardedLoaded(false);
      }
    );

    // 3. أحداث الإعلانات البينية (Interstitial)
    const unsubscribeInterstitialLoaded = interstitial.addAdEventListener(
      AdEventType.LOADED, 
      () => setInterstitialLoaded(true)
    );

    const unsubscribeInterstitialClosed = interstitial.addAdEventListener(
      AdEventType.CLOSED, 
      () => {
        setInterstitialLoaded(false);
        interstitial.load(); // إعادة التحميل للإعلان القادم
      }
    );

    const unsubscribeInterstitialError = interstitial.addAdEventListener(
      AdEventType.ERROR,
      (error) => {
        console.warn('Interstitial Ad Error:', error);
        setInterstitialLoaded(false);
      }
    );

    return () => {
      unsubscribeRewardedLoaded();
      unsubscribeEarned();
      unsubscribeRewardedClosed();
      unsubscribeRewardedError();
      unsubscribeInterstitialLoaded();
      unsubscribeInterstitialClosed();
      unsubscribeInterstitialError();
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
          rewarded.load(); // محاولة التحميل مجدداً إذا لم يكن جاهزاً
        }
      }

      if (data.type === "REQUEST_INTERSTITIAL_AD") {
        if (interstitialLoaded) {
          interstitial.show();
        } else {
          interstitial.load(); // محاولة التحميل مجدداً
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

      {/* إعلان البانر متكيف مع الشاشة */}
      <View style={styles.bannerContainer}>
        <BannerAd
          unitId={bannerAdUnitId}
          size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
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
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0b132b', 
    paddingVertical: 3,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
});