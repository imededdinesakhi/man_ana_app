import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, SafeAreaView, Platform, StatusBar } from 'react-native';
import { WebView } from 'react-native-webview';
// استيراد مكتبة الإعلانات الرسمية (معدل ليتوافق مع v14 بسلام)
import { 
  BannerAd, 
  BannerAdSize, 
  TestIds, 
  RewardedAd, 
  RewardedAdEventType, 
  InterstitialAd, 
  AdEventType 
} from 'react-native-google-mobile-ads';

// معرفات الإعلانات (مجهّزة حالياً بمعرفات تجريبية آمنة للتطوير)
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

  useEffect(() => {
    // 1. تحميل الإعلان بمكافأة وتجهيزه
    const unsubscribeRewardedLoaded = rewarded.addAdEventListener(
      RewardedAdEventType.LOADED,
      () => setRewardedLoaded(true)
    );

    const unsubscribeEarned = rewarded.addAdEventListener(
      RewardedAdEventType.EARNED_REWARD,
      (reward) => {
        // عندما يكمل المستخدم مشاهدة الإعلان، نرسل إشارة للـ HTML لإضافة 50 عملة
        if (webViewRef.current) {
          const successMessage = JSON.stringify({ type: "ADD_COINS_SUCCESS", amount: 50 });
          webViewRef.current.postMessage(successMessage);
        }
      }
    );

    // 💡 تعديل حاسم: تم تغيير RewardedAdEventType.CLOSED إلى AdEventType.CLOSED ليتوافق مع v14
    const unsubscribeRewardedClosed = rewarded.addAdEventListener(
      AdEventType.CLOSED,
      () => {
        setRewardedLoaded(false);
        rewarded.load(); // إعادة تحميل إعلان آخر للخلفية
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
        interstitial.load(); // إعادة تحميل إعلان آخر
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

  // دالة استقبال الرسائل القادمة من الـ HTML (الـ WebView)
  const handleWebViewMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);

      // الحالة الأولى: اللاعب طلب شحن نقاط وضغط على زر "مشاهدة إعلان"
      if (data.type === "REQUEST_REWARDED_AD") {
        if (rewardedLoaded) {
          rewarded.show();
        } else {
          alert("الإعلان جاري التحميل، يرجى المحاولة مجدداً بعد ثوانٍ قليلة.");
          rewarded.load();
        }
      }

      // الحالة الثانية: الانتقال بين المراحل أو تخطي الأسئلة (حساب الـ 7 مراحل الحقيقي)
      if (data.type === "PAGE_CHANGED") {
        const nextCount = pageChangeCount + 1;
        setPageChangeCount(nextCount);
        
        if (nextCount >= 7) {
          if (interstitialLoaded) {
            interstitial.show();
          }
          setPageChangeCount(0); // تصغير العداد للبدء من جديد لـ 7 مراحل أخرى
        }
      }
    } catch (error) {
      console.error("Error handling webview message:", error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a365d" />
      
      {/* نافذة عرض اللعبة الـ HTML */}
      <View style={styles.webViewContainer}>
        <WebView
          ref={webViewRef}
          source={{ uri: GAME_URL }}
          style={styles.webview}
          onMessage={handleWebViewMessage}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          originWhitelist={['*']}
          allowsBackForwardNavigationGestures={true}
        />
      </View>

      {/* إعلان البانر الثابت الحقيقي أسفل التطبيق فوق أزرار التحكم مباشرة */}
      <View style={styles.bannerContainer}>
        <BannerAd
          unitId={bannerAdUnitId}
          size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
          requestOptions={{ requestNonPersonalizedAdsOnly: true }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    minHeight: 60,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0b132b',
    paddingVertical: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
});