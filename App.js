import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, StatusBar } from 'react-native';
import { WebView } from 'react-native-webview';
import mobileAds, {
  BannerAd,
  BannerAdSize,
  RewardedAd,
  RewardedAdEventType,
  InterstitialAd,
  AdEventType,
  TestIds
} from 'react-native-google-mobile-ads';

// استخدام TestIds للاختبار (استبدلها بالمعرفات الحقيقية عند الرفع للمتجر)
const bannerAdUnitId = __DEV__ ? TestIds.BANNER : 'ca-app-pub-3363485131173314/7285247587';
const interstitialAdUnitId = __DEV__ ? TestIds.INTERSTITIAL : 'ca-app-pub-3363485131173314/2204732756';
const rewardedAdUnitId = __DEV__ ? TestIds.REWARDED : 'ca-app-pub-3363485131173314/2622545474';

export default function App() {
  const webViewRef = useRef(null);
  const [rewardedLoaded, setRewardedLoaded] = useState(false);
  const [interstitialLoaded, setInterstitialLoaded] = useState(false);

  // المراجع الخاصة بالإعلانات العابرة والمكافآت
  const interstitialRef = useRef(null);
  const rewardedRef = useRef(null);

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
    // 1. تهيئة AdMob أولاً
    mobileAds()
      .initialize()
      .then(() => {
        // 2. إنشاء كائنات الإعلانات بعد اكتمال التهيئة
        interstitialRef.current = InterstitialAd.createForAdRequest(interstitialAdUnitId, {
          requestNonPersonalizedAdsOnly: true,
        });

        rewardedRef.current = RewardedAd.createForAdRequest(rewardedAdUnitId, {
          requestNonPersonalizedAdsOnly: true,
        });

        // 3. ربط الاستماعات بعد التكوين
        const unsubscribeRewardedLoaded = rewardedRef.current.addAdEventListener(
          RewardedAdEventType.LOADED,
          () => setRewardedLoaded(true)
        );

        const unsubscribeEarned = rewardedRef.current.addAdEventListener(
          RewardedAdEventType.EARNED_REWARD,
          () => sendRewardToWeb()
        );

        const unsubscribeRewardedClosed = rewardedRef.current.addAdEventListener(
          AdEventType.CLOSED,
          () => {
            setRewardedLoaded(false);
            rewardedRef.current?.load();
          }
        );

        const unsubscribeRewardedError = rewardedRef.current.addAdEventListener(
          AdEventType.ERROR,
          (error) => {
            console.warn('Rewarded Ad Error:', error);
            setRewardedLoaded(false);
          }
        );

        const unsubscribeInterstitialLoaded = interstitialRef.current.addAdEventListener(
          AdEventType.LOADED,
          () => setInterstitialLoaded(true)
        );

        const unsubscribeInterstitialClosed = interstitialRef.current.addAdEventListener(
          AdEventType.CLOSED,
          () => {
            setInterstitialLoaded(false);
            interstitialRef.current?.load();
          }
        );

        const unsubscribeInterstitialError = interstitialRef.current.addAdEventListener(
          AdEventType.ERROR,
          (error) => {
            console.warn('Interstitial Ad Error:', error);
            setInterstitialLoaded(false);
          }
        );

        // 4. طلب تحميل الإعلانات
        rewardedRef.current.load();
        interstitialRef.current.load();

        return () => {
          unsubscribeRewardedLoaded();
          unsubscribeEarned();
          unsubscribeRewardedClosed();
          unsubscribeRewardedError();
          unsubscribeInterstitialLoaded();
          unsubscribeInterstitialClosed();
          unsubscribeInterstitialError();
        };
      });
  }, []);

  const handleWebViewMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);

      if (data.type === "REQUEST_REWARDED_AD") {
        if (rewardedLoaded && rewardedRef.current) {
          rewardedRef.current.show();
        } else {
          rewardedRef.current?.load();
        }
      }

      if (data.type === "REQUEST_INTERSTITIAL_AD") {
        if (interstitialLoaded && interstitialRef.current) {
          interstitialRef.current.show();
        } else {
          interstitialRef.current?.load();
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