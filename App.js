import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, StatusBar, Text, Button, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import mobileAds, { BannerAd, BannerAdSize, RewardedAd, RewardedAdEventType, InterstitialAd, AdEventType } from 'react-native-google-mobile-ads';

// معرفات الاختبار العالمية
const bannerAdUnitId = 'ca-app-pub-3940256099942544/6300978111';
const interstitialAdUnitId = 'ca-app-pub-3940256099942544/1033173712';
const rewardedAdUnitId = 'ca-app-pub-3940256099942544/5224354917';

// تهيئة الإعلانات خارج المكون لضمان الاستقرار
const interstitial = InterstitialAd.createForAdRequest(interstitialAdUnitId);
const rewarded = RewardedAd.createForAdRequest(rewardedAdUnitId);

export default function App() {
  const [adStatus, setAdStatus] = useState("Initializing...");
  const [isInterstitialLoaded, setIsInterstitialLoaded] = useState(false);
  const [isRewardedLoaded, setIsRewardedLoaded] = useState(false);

  useEffect(() => {
    // 1. تهيئة AdMob
    mobileAds().initialize().then(() => {
      setAdStatus("AdMob Initialized");
      loadAds();
    });

    // 2. مستمعات الإعلان البيني
    const unsubscribeInterstitial = interstitial.addAdEventListener(AdEventType.LOADED, () => {
      setIsInterstitialLoaded(true);
      setAdStatus("Interstitial Ready");
    });
    
    // 3. مستمعات إعلان المكافأة
    const unsubscribeRewarded = rewarded.addAdEventListener(RewardedAdEventType.LOADED, () => {
      setIsRewardedLoaded(true);
      setAdStatus("Rewarded Ready");
    });

    return () => {
      unsubscribeInterstitial();
      unsubscribeRewarded();
    };
  }, []);

  const loadAds = () => {
    interstitial.load();
    rewarded.load();
  };

  return (
    <View style={styles.container}>
      <StatusBar hidden={true} />
      
      {/* منطقة الاختبار (تظهر لك حالة الإعلانات) */}
      <View style={styles.debugPanel}>
        <Text style={styles.statusText}>Status: {adStatus}</Text>
        <View style={styles.buttonRow}>
          <Button 
            title="Test Interstitial" 
            disabled={!isInterstitialLoaded}
            onPress={() => interstitial.show()} 
          />
          <Button 
            title="Test Rewarded" 
            disabled={!isRewardedLoaded}
            onPress={() => rewarded.show()} 
          />
        </View>
      </View>
      
      <WebView
        source={{ uri: 'https://imededdinesakhi.github.io/man_ana_web/' }}
        style={{ flex: 1 }}
      />
      
      <BannerAd
        unitId={bannerAdUnitId}
        size={BannerAdSize.BANNER}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  debugPanel: { backgroundColor: '#333', padding: 10 },
  statusText: { color: 'white', textAlign: 'center', marginBottom: 5 },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-around' }
});