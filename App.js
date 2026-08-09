import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, StatusBar, Text } from 'react-native';
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

// استخدام معرفات الاختبار في وضع التنمية/الاختبار والتطبيقي الحقيقي في Release
const bannerAdUnitId = __DEV__ ? TestIds.BANNER : 'ca-app-pub-3363485131173314/7285247587';
const interstitialAdUnitId = __DEV__ ? TestIds.INTERSTITIAL : 'ca-app-pub-3363485131173314/2204732756';
const rewardedAdUnitId = __DEV__ ? TestIds.REWARDED : 'ca-app-pub-3363485131173314/2622545474';

export default function App() {
  const webViewRef = useRef(null);
  const [adStatus, setAdStatus] = useState("جاري تهيئة الإعلانات...");
  
  const rewardedRef = useRef(null);
  const interstitialRef = useRef(null);
  
  const isRewardedLoaded = useRef(false);
  const isInterstitialLoaded = useRef(false);
  const pageChangeCount = useRef(0); // عداد التنقل بين الأسئلة لإظهار البيني كل عدة مراحل

  const GAME_URL = 'https://imededdinesakhi.github.io/man_ana_web/';

  useEffect(() => {
    // 1. تهيئة AdMob
    mobileAds()
      .initialize()
      .then(() => {
        setAdStatus("تمت التهيئة - جاري تحميل الإعلانات");
        setupAds();
      })
      .catch((err) => setAdStatus("فشل التهيئة: " + err.message));
  }, []);

  const setupAds = () => {
    // إنشاء كائن الإعلان البيني
    interstitialRef.current = InterstitialAd.createForAdRequest(interstitialAdUnitId, {
      requestNonPersonalizedAdsOnly: true,
    });

    // إنشاء كائن إعلان المكافأة
    rewardedRef.current = RewardedAd.createForAdRequest(rewardedAdUnitId, {
      requestNonPersonalizedAdsOnly: true,
    });

    // أحداث الإعلان البيني
    interstitialRef.current.addAdEventListener(AdEventType.LOADED, () => {
      isInterstitialLoaded.current = true;
      setAdStatus("البيني جاهز");
    });

    interstitialRef.current.addAdEventListener(AdEventType.CLOSED, () => {
      isInterstitialLoaded.current = false;
      interstitialRef.current.load(); // إعادة التحميل للمرة القادمة
    });

    // أحداث إعلان المكافأة
    rewardedRef.current.addAdEventListener(RewardedAdEventType.LOADED, () => {
      isRewardedLoaded.current = true;
      setAdStatus("إعلان المكافأة جاهز");
    });

    rewardedRef.current.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
      // إرسال المكافأة إلى كود الـ JS في اللعبة
      if (webViewRef.current) {
        const payload = JSON.stringify({ type: 'ADD_COINS_SUCCESS', amount: 50 });
        webViewRef.current.postMessage(payload);
      }
    });

    rewardedRef.current.addAdEventListener(AdEventType.CLOSED, () => {
      isRewardedLoaded.current = false;
      rewardedRef.current.load(); // إعادة التحميل
    });

    // البدء في تحميل الإعلانات
    interstitialRef.current.load();
    rewardedRef.current.load();
  };

  // معالجة الرسائل القادمة من اللعبة (WebView)
  const handleWebViewMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);

      // طلب إعلان مكافأة من المتجر أو عند انتهاء الرصيد
      if (data.type === "REQUEST_REWARDED_AD") {
        if (isRewardedLoaded.current && rewardedRef.current) {
          rewardedRef.current.show();
        } else {
          setAdStatus("جاري تحضير إعلان المكافأة...");
          rewardedRef.current?.load();
        }
      }

      // طلب إعلان بيني مباشر أو تتبع التنقل بين الأسئلة
      if (data.type === "REQUEST_INTERSTITIAL_AD") {
        showInterstitialAd();
      }

      if (data.type === "PAGE_CHANGED") {
        pageChangeCount.current += 1;
        // عرض إعلان بيني كل 4 مراحل/أسئلة كحد معقول لعدم إزعاج اللاعب
        if (pageChangeCount.current >= 3) {
          showInterstitialAd();
          pageChangeCount.current = 0;
        }
      }
    } catch (error) {
      console.error("خطأ في استقبال الرسالة:", error);
    }
  };

  const showInterstitialAd = () => {
    if (isInterstitialLoaded.current && interstitialRef.current) {
      interstitialRef.current.show();
    } else {
      interstitialRef.current?.load();
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar hidden={true} />
      
      {/* شريط حالة مؤقت لمعاينة الجاهزية */}
      <View style={styles.statusBar}>
        <Text style={styles.statusText}>{adStatus}</Text>
      </View>

      <View style={styles.webViewContainer}>
        <WebView
          ref={webViewRef}
          source={{ uri: GAME_URL }}
          style={styles.webview}
          onMessage={handleWebViewMessage}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          originWhitelist={['*']}
        />
      </View>

      {/* إعلان البانر السفلي */}
      <View style={styles.bannerContainer}>
        <BannerAd
          unitId={bannerAdUnitId}
          size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
          requestOptions={{ requestNonPersonalizedAdsOnly: true }}
          onAdFailedToLoad={(err) => setAdStatus("فشل البانر: " + err.code)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b132b',
  },
  statusBar: {
    backgroundColor: '#000',
    paddingVertical: 2,
    alignItems: 'center',
  },
  statusText: {
    color: '#00ffcc',
    fontSize: 10,
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
  },
});