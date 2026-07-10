import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, SafeAreaView, Platform, StatusBar } from 'react-native';
import { WebView } from 'react-native-webview';
// استيراد مكتبة الإعلانات الرسمية
import { 
  BannerAd, 
  BannerAdSize, 
  TestIds, 
  RewardedAd, 
  RewardedAdEventType, 
  InterstitialAd, 
  AdEventType 
} from 'react-native-google-mobile-ads';

// معرفات الإعلانات
const bannerAdUnitId = __DEV__ ? TestIds.BANNER : 'ca-app-pub-xxxxxxxxxxxxx/xxxxxxxxxx';
const interstitialAdUnitId = __DEV__ ? TestIds.INTERSTITIAL : 'ca-app-pub-xxxxxxxxxxxxx/xxxxxxxxxx';
const rewardedAdUnitId = __DEV__ ? TestIds.REWARDED : 'ca-app-pub-xxxxxxxxxxxxx/xxxxxxxxxx';

// إنشاء كائنات الإعلانات البينية والمكافأة
const interstitial = InterstitialAd.createForAdRequest(interstitialAdUnitId);
const rewarded = RewardedAd.createForAdRequest(rewardedAdUnitId);

export default function App() {
  const webViewRef = useRef(null);
  const [pageChangeCount, setPageChangeCount] = useState(0);
  const [rewardedLoaded, setRewardedLoaded] = useState(false);
  const [interstitialLoaded, setInterstitialLoaded] = useState(false);

  // رابط مستودع الـ HTML الخاص بك
  const GAME_URL = "https://imededdinesakhi.github.io/man_ana_web/";

  // الكود السحري لضمان استقرار لغة الجافاسكريبت ومنع أخطاء التلقائية الكراش
  const injectedJavaScript = `
    (function() {
      console.log("WebView initialized safely");
    })();
    true;
  `;

  useEffect(() => {
    // 1. تحميل الإعلان بمكافأة وتجهيزه
    const unsubscribeRewardedLoaded = rewarded.addAdEventListener(
      RewardedAdEventType.LOADED,
      () => setRewardedLoaded(true)
    );

    const unsubscribeEarned = rewarded.addAdEventListener(
      RewardedAdEventType.EARNED_REWARD,
      (reward) => {
        if (webViewRef.current) {
          const successMessage = JSON.stringify({ type: "ADD_COINS_SUCCESS", amount: 50 });
          webViewRef.current.postMessage(successMessage);
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

    // 2. تحميل الإعلان البيني (كل 7 مراحل)
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

    // بدء تحميل الإعلانات في الخلفية فور تشغيل التطبيق
    rewarded.load();
    interstitial.load();

    return () => {
      unsubscribeRewardedLoaded();
      unsubscribeEarned();
      unsubscribeRewardedClosed();
      unsubscribeInterstitialLoaded();
      unsubscribeInterstitialClosed();
    };
  }, []);

  // دالة استقبال الرسائل القادمة من الـ HTML
  const handleWebViewMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);

      if (data.type === "REQUEST_REWARDED_AD") {
        if (rewardedLoaded) {
          rewarded.show();
        } else {
          alert("الإعلان جاري التحميل، يرجى المحاولة مجدداً بعد ثوانٍ قليلة.");
          rewarded.load();
        }
      }

      if (data.type === "PAGE_CHANGED") {
        const nextCount = pageChangeCount + 1;
        setPageChangeCount(nextCount);
        
        if (nextCount >= 7) {
          if (interstitialLoaded) {
            interstitial.show();
          }
          setPageChangeCount(0);
        }
      }
    } catch (error) {
      console.error("Error handling webview message:", error);
    }
  };

  return (
    <View style={styles.container}>
      {/* 🛠️ التعديل الحاسم الأول: إخفاء شريط الحالة تماماً للحصول على مظهر Fullscreen احترافي للعبة */}
      <StatusBar hidden={true} />
      
      {/* نافذة عرض اللعبة الـ HTML */}
      <View style={styles.webViewContainer}>
        <WebView
          ref={webViewRef}
          source={{ uri: GAME_URL }}
          style={styles.webview}
          onMessage={handleWebViewMessage}
          
          // 🛠️ التعديل الحاسم الثاني: منع كراش الجافاسكريبت ومنع الزوم التلقائي بالأصابع
          injectedJavaScript={injectedJavaScript}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          scalesPageToFit={false}
          
          originWhitelist={['*']}
          allowsBackForwardNavigationGestures={true}
        />
      </View>

      {/* إعلان البانر الثابت أسفل التطبيق */}
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
    // خلفية سوداء داكنة وموحدة تمنع ظهور أي فراغات شفافة
    backgroundColor: '#0b132b',
  },
  webViewContainer: {
    flex: 1,
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  bannerContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0b132b', 
    paddingVertical: 0,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)', 
  },
});