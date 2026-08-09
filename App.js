import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, StatusBar, Text, Button } from 'react-native';
import { WebView } from 'react-native-webview';
import mobileAds, {
  BannerAd,
  BannerAdSize,
  RewardedAd,
  RewardedAdEventType,
  InterstitialAd,
  AdEventType
} from 'react-native-google-mobile-ads';

// معرفات الاختبار (استبدلها بالمعرفات الحقيقية عند الرفع للمتجر)
const bannerAdUnitId = 'ca-app-pub-3940256099942544/6300978111';
const interstitialAdUnitId = 'ca-app-pub-3940256099942544/1033173712';
const rewardedAdUnitId = 'ca-app-pub-3940256099942544/5224354917';

// إنشاء الكائنات الإعلانية
const interstitial = InterstitialAd.createForAdRequest(interstitialAdUnitId);
const rewarded = RewardedAd.createForAdRequest(rewardedAdUnitId);

export default function App() {
  const webViewRef = useRef(null);
  const [adStatus, setAdStatus] = useState("Initializing AdMob...");
  const [isInterstitialLoaded, setIsInterstitialLoaded] = useState(false);
  const [isRewardedLoaded, setIsRewardedLoaded] = useState(false);

  const GAME_URL = 'https://imededdinesakhi.github.io/man_ana_web/';

  // وظيفة إرسال الجائزة إلى لعبة الـ WebView
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
            let currentCoins = parseInt(localStorage.getItem('coins') || '0');
            localStorage.setItem('coins', currentCoins + 50);
          } catch (e) {
            console.error('Error adding reward:', e);
          }
        })();
        true;
      `;
      webViewRef.current.injectJavaScript(injectJsCode);
    }
  };

  useEffect(() => {
    // 1. تهيئة AdMob
    mobileAds().initialize().then(() => {
      setAdStatus("AdMob Initialized - Loading Ads...");
      interstitial.load();
      rewarded.load();
    });

    // 2. أحداث الإعلان البيني (Interstitial)
    const subInterstitialLoaded = interstitial.addAdEventListener(AdEventType.LOADED, () => {
      setIsInterstitialLoaded(true);
      setAdStatus("Interstitial Ready!");
    });

    const subInterstitialClosed = interstitial.addAdEventListener(AdEventType.CLOSED, () => {
      setIsInterstitialLoaded(false);
      setAdStatus("Loading next Interstitial...");
      interstitial.load();
    });

    const subInterstitialError = interstitial.addAdEventListener(AdEventType.ERROR, (error) => {
      setIsInterstitialLoaded(false);
      setAdStatus("Interstitial Error. Retrying...");
      setTimeout(() => interstitial.load(), 5000); // إعادة المحاولة تلقائياً بعد 5 ثوانٍ
    });

    // 3. أحداث إعلان المكافأة (Rewarded)
    const subRewardedLoaded = rewarded.addAdEventListener(RewardedAdEventType.LOADED, () => {
      setIsRewardedLoaded(true);
      setAdStatus("Rewarded Ready!");
    });

    const subRewardedEarned = rewarded.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
      setAdStatus("Reward Earned! +50 Coins");
      sendRewardToWeb();
    });

    const subRewardedClosed = rewarded.addAdEventListener(AdEventType.CLOSED, () => {
      setIsRewardedLoaded(false);
      setAdStatus("Loading next Rewarded...");
      rewarded.load();
    });

    const subRewardedError = rewarded.addAdEventListener(AdEventType.ERROR, (error) => {
      setIsRewardedLoaded(false);
      setAdStatus("Rewarded Error. Retrying...");
      setTimeout(() => rewarded.load(), 5000); // إعادة المحاولة تلقائياً بعد 5 ثوانٍ
    });

    return () => {
      subInterstitialLoaded();
      subInterstitialClosed();
      subInterstitialError();
      subRewardedLoaded();
      subRewardedEarned();
      subRewardedClosed();
      subRewardedError();
    };
  }, []);

  // استقبال وإجابة طلبات الموقع داخل الـ WebView
  const handleWebViewMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);

      if (data.type === "REQUEST_REWARDED_AD" || data.type === "SHOW_REWARDED") {
        if (isRewardedLoaded) {
          rewarded.show();
        } else {
          setAdStatus("Rewarded Ad not ready, loading...");
          rewarded.load();
        }
      }

      if (data.type === "REQUEST_INTERSTITIAL_AD" || data.type === "SHOW_INTERSTITIAL") {
        if (isInterstitialLoaded) {
          interstitial.show();
        } else {
          setAdStatus("Interstitial Ad not ready, loading...");
          interstitial.load();
        }
      }
    } catch (error) {
      console.log("Web message:", event.nativeEvent.data);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar hidden={true} />

      {/* لوحة الاختبار والمراقبة العلويّة */}
      <View style={styles.debugPanel}>
        <Text style={styles.statusText}>Status: {adStatus}</Text>
        <View style={styles.buttonRow}>
          <Button
            title="Test Interstitial"
            disabled={!isInterstitialLoaded}
            onPress={() => interstitial.show()}
          />
          <Button
            title="Test Rewarded (+50)"
            disabled={!isRewardedLoaded}
            onPress={() => rewarded.show()}
          />
        </View>
      </View>

      {/* عرض لعبة الـ WebView */}
      <WebView
        ref={webViewRef}
        source={{ uri: GAME_URL }}
        style={{ flex: 1 }}
        onMessage={handleWebViewMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        originWhitelist={['*']}
      />

      {/* إعلان البانر السفلي */}
      <View style={styles.bannerContainer}>
        <BannerAd
          unitId={bannerAdUnitId}
          size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
          onAdFailedToLoad={(e) => console.log('Banner Error:', e)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b132b' },
  debugPanel: { backgroundColor: '#1c2541', padding: 8 },
  statusText: { color: '#00b4d8', textAlign: 'center', fontSize: 12, marginBottom: 4 },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-around' },
  bannerContainer: { width: '100%', alignItems: 'center', backgroundColor: '#0b132b' }
});