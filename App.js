import React, { useEffect, useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  SafeAreaView, 
  ActivityIndicator,
  Alert 
} from 'react-native';
import { WebView } from 'react-native-webview';
import mobileAds, { 
  BannerAd, 
  BannerAdSize, 
  TestIds, 
  RewardedAd, 
  RewardedAdReward,
  InterstitialAd,
  AdEventType 
} from 'react-native-google-mobile-ads';

// ⚠️ نستخدم هنا معرفات الاختبار الرسمية لضمان الظهور الفوري عند الاختبار
// عند الجاهزية لإطلاق التطبيق، استبدل TestIds بالمعرفات الحقيقية الخاصة بك
const BANNER_ID = TestIds.BANNER;
const INTERSTITIAL_ID = TestIds.INTERSTITIAL;
const REWARDED_ID = TestIds.REWARDED;

// إنشاء كائنات الإعلانات البينية والمكافأة
const interstitial = InterstitialAd.createForAdRequest(INTERSTITIAL_ID, {
  requestNonPersonalizedAdsOnly: true,
});

const rewarded = RewardedAd.createForAdRequest(REWARDED_ID, {
  requestNonPersonalizedAdsOnly: true,
});

export default function App() {
  const [isSdkInitialized, setIsSdkInitialized] = useState(false);
  const [interstitialLoaded, setInterstitialLoaded] = useState(false);
  const [rewardedLoaded, setRewardedLoaded] = useState(false);

  useEffect(() => {
    // 1️⃣ تهيئة مكتبة AdMob فور فتح التطبيق
    mobileAds()
      .initialize()
      .then(() => {
        console.log('✅ AdMob SDK Initialized Successfully');
        setIsSdkInitialized(true);

        // بدء تحميل الإعلانات مسبقاً بعد اكتمال التهيئة
        interstitial.load();
        rewarded.load();
      })
      .catch((err) => console.log('❌ AdMob Init Error:', err));

    // 2️⃣ إعداد مستمعات الإعلان البيني (Interstitial)
    const unsubInterLoaded = interstitial.addAdEventListener(AdEventType.LOADED, () => {
      console.log('✅ Interstitial Ad Loaded');
      setInterstitialLoaded(true);
    });

    const unsubInterClosed = interstitial.addAdEventListener(AdEventType.CLOSED, () => {
      console.log('🔄 Interstitial Ad Closed -> Reloading...');
      setInterstitialLoaded(false);
      interstitial.load(); // إعادة التحميل للمرة القادمة
    });

    const unsubInterFailed = interstitial.addAdEventListener(AdEventType.ERROR, (error) => {
      console.log('❌ Interstitial Failed To Load:', error);
      setInterstitialLoaded(false);
    });

    // 3️⃣ إعداد مستمعات إعلان المكافأة (Rewarded)
    const unsubRewardLoaded = rewarded.addAdEventListener(RewardedAdReward.LOADED, () => {
      console.log('✅ Rewarded Ad Loaded');
      setRewardedLoaded(true);
    });

    const unsubRewardEarned = rewarded.addAdEventListener(RewardedAdReward.EARNED_REWARD, (reward) => {
      console.log('🎁 User Earned Reward:', reward);
      Alert.alert('تهانينا!', `لقد حصلت على المكافأة: ${reward.amount} ${reward.type}`);
      // 👈 هنا تضع المنطق الخاص بمنح المحاولات أو الأرباح داخل لعبتك
    });

    const unsubRewardClosed = rewarded.addAdEventListener(AdEventType.CLOSED, () => {
      console.log('🔄 Rewarded Ad Closed -> Reloading...');
      setRewardedLoaded(false);
      rewarded.load(); // إعادة التحميل للمرة القادمة
    });

    const unsubRewardFailed = rewarded.addAdEventListener(AdEventType.ERROR, (error) => {
      console.log('❌ Rewarded Failed To Load:', error);
      setRewardedLoaded(false);
    });

    // تنظيف المستمعات عند إغلاق المكون
    return () => {
      unsubInterLoaded();
      unsubInterClosed();
      unsubInterFailed();
      unsubRewardLoaded();
      unsubRewardEarned();
      unsubRewardClosed();
      unsubRewardFailed();
    };
  }, []);

  // دالة تشغيل الإعلان البيني
  const handleShowInterstitial = () => {
    if (interstitialLoaded) {
      interstitial.show();
    } else {
      Alert.alert('جاري التحميل', 'الإعلان البيني غير جاهز بعد، جاري المحاولة مرة أخرى...');
      interstitial.load();
    }
  };

  // دالة تشغيل إعلان المكافأة
  const handleShowRewarded = () => {
    if (rewardedLoaded) {
      rewarded.show();
    } else {
      Alert.alert('جاري التحميل', 'إعلان المكافأة غير جاهز بعد، جاري المحاولة مرة أخرى...');
      rewarded.load();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 🌐 منطقة الـ WebView الخاصة باللعبة */}
      <View style={styles.webViewContainer}>
        <WebView 
          source={{ uri: 'https://imededdinesakhi.github.io/man_ana_web/' }} // 👈 استبدل برابط لعبتك الحقيقي
          style={styles.webview}
          javaScriptEnabled={true}
          domStorageEnabled={true}
        />
      </View>

      {/* 🎮 أزرار التحكم بالتجربة (يمكنك وضعها داخل اللعبة أو هنا للتجربة) */}
      <View style={styles.controlsContainer}>
        <TouchableOpacity 
          style={[styles.btn, !interstitialLoaded && styles.btnDisabled]} 
          onPress={handleShowInterstitial}
        >
          <Text style={styles.btnText}>
            {interstitialLoaded ? 'عرض إعلان بيني' : 'جاري تحميل البيني...'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.btn, styles.btnReward, !rewardedLoaded && styles.btnDisabled]} 
          onPress={handleShowRewarded}
        >
          <Text style={styles.btnText}>
            {rewardedLoaded ? 'مشاهدة إعلان مكافأة 🎁' : 'جاري تحميل المكافأة...'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 📢 منطقة البانر السفلي المضمونة */}
      <View style={styles.bannerContainer}>
        {isSdkInitialized ? (
          <BannerAd
            unitId={BANNER_ID}
            size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
            requestOptions={{
              requestNonPersonalizedAdsOnly: true,
            }}
            onAdLoaded={() => console.log('✅ Banner Ad Loaded Successfully')}
            onAdFailedToLoad={(error) => console.log('❌ Banner Failed To Load:', error)}
          />
        ) : (
          <ActivityIndicator size="small" color="#ffffff" />
        )}
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
    flex: 1, // استغلال كل المساحة المتاحة للعبة
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
    backgroundColor: '#1c2541',
  },
  btn: {
    backgroundColor: '#3a86ef',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  btnReward: {
    backgroundColor: '#ff006e',
  },
  btnDisabled: {
    backgroundColor: '#6c757d',
  },
  btnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  bannerContainer: {
    width: '100%',
    minHeight: 60, // 👈 حجز ارتفاع ثري ومستقر يمنع خروج البانر أسفل الشاشة
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0b132b',
  },
});