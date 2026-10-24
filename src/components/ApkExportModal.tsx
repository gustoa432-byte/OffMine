import React, { useState } from 'react';
import { X, Smartphone, Check, Copy, Terminal, ShieldCheck, Cpu } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

export const ApkExportModal: React.FC = () => {
  const { isApkModalOpen, setApkModalOpen } = useAppStore();
  const [activeTab, setActiveTab] = useState<'workflow' | 'gradle' | 'manifest'>('workflow');
  const [copied, setCopied] = useState(false);

  if (!isApkModalOpen) return null;

  const workflowYaml = `name: Build Offline AI Android APK
on:
  push:
    branches: [ "main", "master" ]
  workflow_dispatch:

jobs:
  build-android:
    runs-on: ubuntu-latest
    timeout-minutes: 45
    steps:
      - name: 1. Checkout Repository
        uses: actions/checkout@v4

      - name: 2. Setup Node.js 22
        uses: actions/setup-node@v4
        with:
          node-version: '22.15.0'

      - name: 3. Setup Java JDK 17 (Temurin)
        uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '17'

      - name: 4. Setup Android SDK
        uses: android-actions/setup-android@v4

      - name: 5. Install NPM Dependencies
        run: npm install --legacy-peer-deps

      - name: 6. Download Pre-built Native Artifacts for llama.rn
        run: |
          if [ -f "./node_modules/llama.rn/install/download-native-artifacts.js" ]; then
            node ./node_modules/llama.rn/install/download-native-artifacts.js
          fi

      - name: 7. Ensure Keystores Exist for Signed Release APK
        run: |
          mkdir -p android/app
          if [ ! -f "android/app/release.keystore" ]; then
            keytool -genkeypair -v \\
              -storepass android \\
              -keystore android/app/release.keystore \\
              -alias releasekey \\
              -keypass android \\
              -keyalg RSA \\
              -keysize 2048 \\
              -validity 10000 \\
              -dname "CN=PocketCore Release,O=PocketCore,C=US"
          fi
          if [ ! -f "android/app/debug.keystore" ]; then
            keytool -genkeypair -v \\
              -storepass android \\
              -keystore android/app/debug.keystore \\
              -alias androiddebugkey \\
              -keypass android \\
              -keyalg RSA \\
              -keysize 2048 \\
              -validity 10000 \\
              -dname "CN=Android Debug,O=Android,C=US"
          fi

      - name: 8. Ensure Gradle Wrapper & Build Signed Release APK
        working-directory: ./android
        run: |
          mkdir -p gradle/wrapper
          if [ ! -f "gradle/wrapper/gradle-wrapper.jar" ]; then
            curl -sLo gradle/wrapper/gradle-wrapper.jar https://raw.githubusercontent.com/gradle/gradle/v8.10.2/gradle/wrapper/gradle-wrapper.jar
          fi
          chmod +x gradlew
          ./gradlew assembleRelease --no-daemon --stacktrace

      - name: 9. Upload Ready-to-Install APK Artifact
        uses: actions/upload-artifact@v4
        with:
          name: PocketCore-Offline-AI-APK
          path: android/app/build/outputs/apk/release/*.apk
          if-no-files-found: error`;

  const gradleCode = `android {
    ndkVersion rootProject.ext.ndkVersion
    compileSdkVersion 34

    defaultConfig {
        applicationId "com.pocketcore.ai"
        minSdkVersion 26
        targetSdkVersion 34
        versionCode 1
        versionName "1.0.0"
        ndk {
            abiFilters "arm64-v8a"
        }
    }

    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
        release {
            storeFile file('release.keystore')
            storePassword 'android'
            keyAlias 'releasekey'
            keyPassword 'android'
        }
    }

    packagingOptions {
        pickFirst '**/libc++_shared.so'
        pickFirst '**/libfbjni.so'
        pickFirst '**/libllama.so'
        pickFirst '**/librnllama*.so'
    }

    buildTypes {
        release {
            signingConfig file('release.keystore').exists() ? signingConfigs.release : signingConfigs.debug
            minifyEnabled false
            shrinkResources false
        }
    }
}`;

  const manifestXml = `<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <uses-permission android:name="android.permission.INTERNET" />
    <application
      android:name=".MainApplication"
      android:label="@string/app_name"
      android:icon="@mipmap/ic_launcher"
      android:roundIcon="@mipmap/ic_launcher_round"
      android:allowBackup="false"
      android:theme="@style/AppTheme"
      android:largeHeap="true"
      android:supportsRtl="true">
      <activity
        android:name=".MainActivity"
        android:label="@string/app_name"
        android:configChanges="keyboard|keyboardHidden|orientation|screenLayout|screenSize|smallestScreenSize|uiMode"
        android:launchMode="singleTask"
        android:windowSoftInputMode="adjustResize"
        android:exported="true">
        <intent-filter>
            <action android:name="android.intent.action.MAIN" />
            <category android:name="android.intent.category.LAUNCHER" />
        </intent-filter>
      </activity>
    </application>
</manifest>`;

  const activeContent =
    activeTab === 'workflow' ? workflowYaml : activeTab === 'gradle' ? gradleCode : manifestXml;

  const handleCopy = () => {
    navigator.clipboard.writeText(activeContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5">
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity"
        onClick={() => setApkModalOpen(false)}
      />

      <div className="relative z-10 flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-[24px] border border-white/10 bg-[#12141D] text-[#F5F7FA] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#30D158] to-[#0A84FF] text-white">
              <Smartphone className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">
                Android APK & Сборка GitHub Actions
              </h2>
              <p className="text-xs text-[#8E93A6]">
                Готовый воркфлоу для автоматической сборки подписанного .apk
              </p>
            </div>
          </div>

          <button
            onClick={() => setApkModalOpen(false)}
            className="rounded-xl p-1.5 text-[#8E93A6] transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Badges bar */}
        <div className="flex flex-wrap items-center gap-2 border-b border-white/5 bg-white/[0.02] px-5 py-3 text-xs">
          <span className="flex items-center gap-1.5 rounded-lg border border-[#30D158]/30 bg-[#30D158]/10 px-2.5 py-1 text-[#30D158]">
            <ShieldCheck className="h-3.5 w-3.5" />
            Подписанный APK (debug.keystore)
          </span>
          <span className="flex items-center gap-1.5 rounded-lg border border-[#0A84FF]/30 bg-[#0A84FF]/10 px-2.5 py-1 text-[#0A84FF]">
            <Cpu className="h-3.5 w-3.5" />
            Фильтр: arm64-v8a (x3 ускорение)
          </span>
          <span className="flex items-center gap-1.5 rounded-lg border border-[#7C86FF]/30 bg-[#7C86FF]/10 px-2.5 py-1 text-[#7C86FF]">
            <Terminal className="h-3.5 w-3.5" />
            largeHeap=true & pickFirst .so
          </span>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-white/10 px-5 pt-3 gap-2">
          <button
            onClick={() => setActiveTab('workflow')}
            className={`pb-2.5 text-xs font-semibold border-b-2 transition ${
              activeTab === 'workflow'
                ? 'border-[#5E6AD2] text-white'
                : 'border-transparent text-[#8E93A6] hover:text-white'
            }`}
          >
            .github/workflows/build-apk.yml
          </button>
          <button
            onClick={() => setActiveTab('gradle')}
            className={`pb-2.5 text-xs font-semibold border-b-2 transition ${
              activeTab === 'gradle'
                ? 'border-[#5E6AD2] text-white'
                : 'border-transparent text-[#8E93A6] hover:text-white'
            }`}
          >
            android/app/build.gradle
          </button>
          <button
            onClick={() => setActiveTab('manifest')}
            className={`pb-2.5 text-xs font-semibold border-b-2 transition ${
              activeTab === 'manifest'
                ? 'border-[#5E6AD2] text-white'
                : 'border-transparent text-[#8E93A6] hover:text-white'
            }`}
          >
            AndroidManifest.xml
          </button>
        </div>

        {/* Code View */}
        <div className="relative flex-1 overflow-y-auto bg-[#050608] p-4 font-mono text-xs text-[#F5F7FA]">
          <button
            onClick={handleCopy}
            className="absolute top-3 right-3 flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/10 px-3 py-1.5 text-xs text-white backdrop-blur hover:bg-white/20 transition"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-[#30D158]" />
                <span className="text-[#30D158]">Скопировано!</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Скопировать код</span>
              </>
            )}
          </button>
          <pre className="overflow-x-auto leading-relaxed">
            <code>{activeContent}</code>
          </pre>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-white/10 bg-[#090A0F]/80 px-5 py-3 text-xs text-[#8E93A6]">
          <span>После пуша в GitHub Actions артефакт появится во вкладке Actions → Summary</span>
          <button
            onClick={() => setApkModalOpen(false)}
            className="rounded-xl bg-white/10 px-4 py-1.5 font-semibold text-white hover:bg-white/20"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};
