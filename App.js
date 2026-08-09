import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, StatusBar, Text } from 'react-native';
import { WebView } from 'react-native-webview';
import mobileAds, { BannerAd, BannerAdSize, RewardedAd, RewardedAdEventType, InterstitialAd, AdEventType } from 'react-native-google-mobile-ads';

// معرفاتك الحقيقية
// استبدل المعرفات القديمة بهذه المعرفات في ملف App.js
const bannerAdUnitId = 'ca-app-pub-3940256099942544/6300978111';
const interstitialAdUnitId = 'ca-app-pub-3940256099942544/1033173712';
const rewardedAdUnitId = 'ca-app-pub-3940256099942544/5224354917';

export default function App() {
  const [adStatus, setAdStatus] = useState("Initializing...");
  const [rewardedLoaded, setRewardedLoaded] = useState(false);
  const webViewRef = useRef(null);

  useEffect(() => {
    // مراقبة التهيئة
    mobileAds().initialize().then(adapterStatuses => {
      setAdStatus("AdMob Initialized");
      loadAds();
    }).catch(err => setAdStatus("Init Failed: " + err.message));
  }, []);

  const loadAds = () => {
    // استخدمنا هذه الطريقة لضمان عدم وجود كائنات معلقة
    const rewarded = RewardedAd.createForAdRequest(rewardedAdUnitId);
    
    rewarded.addAdEventListener(RewardedAdEventType.LOADED, () => {
      setRewardedLoaded(true);
      setAdStatus("Ad Ready");
    });
    
    rewarded.addAdEventListener(AdEventType.ERROR, (error) => {
      setAdStatus("Ad Error: " + error.code);
    });

    rewarded.load();
  };

  const handleWebViewMessage = (event) => {
    // هنا منطق تشغيل الإعلان
    console.log("Message received:", event.nativeEvent.data);
  };

  return (
    <View style={styles.container}>
      <StatusBar hidden={true} />
      {/* مؤشر الحالة الذي سيخبرنا أين الخلل */}
      <View style={{backgroundColor: 'black', padding: 5}}>
        <Text style={{color: 'white', fontSize: 10}}>Status: {adStatus}</Text>
      </View>
      
      <WebView
        ref={webViewRef}
        source={{ uri: 'https://imededdinesakhi.github.io/man_ana_web/' }}
        onMessage={handleWebViewMessage}
      />
      
      <BannerAd
        unitId={bannerAdUnitId}
        size={BannerAdSize.BANNER}
        onAdFailedToLoad={(e) => setAdStatus("Banner Failed: " + e.code)}
      />
    </View>
  );
}

const styles = StyleSheet.create({ container: { flex: 1 } });