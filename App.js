import React from 'react';
import { StyleSheet, SafeAreaView, StatusBar } from 'react-native';
import { WebView } from 'react-native-webview';

export default function App() {
  // استدعاء ملف الـ HTML المحلي من مجلد الـ assets
  const localHtmlFile = require('./assets/index.html');

  return (
    <SafeAreaView style={styles.container}>
      {/* ضبط شريط الهاتف العلوي ليناسب لون اللعبة */}
      <StatusBar barStyle="light-content" backgroundColor="#0b132b" />
      
      <WebView 
        source={localHtmlFile}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        originWhitelist={['*']}
        allowFileAccess={true}
        allowUniversalAccessFromFileURLs={true}
        mixedContentMode="always"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b132b', 
  },
  webview: {
    flex: 1,
  },
});