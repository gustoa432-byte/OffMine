import React, { useState } from 'react';
import { X, Smartphone, Check, Copy, Terminal, ShieldCheck, Cpu } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

export const ApkExportModal: React.FC = () => {
  const { isApkModalOpen, setApkModalOpen } = useAppStore();
  const [activeTab, setActiveTab] = useState<'workflow' | 'capacitor' | 'vite'>('workflow');
  const [copied, setCopied] = useState(false);

  if (!isApkModalOpen) return null;

  const workflowYaml = `name: Build Offline AI Android APK

on:
  push:
    branches: [ "**" ]
  workflow_dispatch:

jobs:
  build-apk:
    runs-on: ubuntu-latest
    timeout-minutes: 30

    steps:
      - name: 1. Checkout Repository
        uses: actions/checkout@v4

      - name: 2. Setup Node.js 22
        uses: actions/setup-node@v4
        with:
          node-version: '22'

      - name: 3. Setup Java JDK 21 (Temurin)
        uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '21'

      - name: 4. Setup Android SDK
        uses: android-actions/setup-android@v3

      - name: 5. Clean Broken Artifacts & Install NPM Dependencies
        run: |
          rm -rf android dist node_modules package-lock.json
          npm install --legacy-peer-deps

      - name: 6. Build Production Web Bundle (Vite)
        run: npm run build

      - name: 7. Generate Fresh Native Android Project via Capacitor
        run: |
          npx cap add android
          npx cap sync android

      - name: 8. Configure AndroidManifest (LargeHeap & Cleartext/HTTPS)
        run: |
          MANIFEST="android/app/src/main/AndroidManifest.xml"
          if [ -f "$MANIFEST" ]; then
            sed -i 's/<application/<application android:largeHeap="true" android:usesCleartextTraffic="true"/g' "$MANIFEST"
          fi

      - name: 9. Build Signed Installable APK via Gradle
        working-directory: ./android
        run: |
          chmod +x gradlew
          ./gradlew assembleDebug --no-daemon --stacktrace

      - name: 10. Rename and Upload Ready-to-Install APK
        uses: actions/upload-artifact@v4
        with:
          name: PocketCore-Offline-AI-APK
          path: android/app/build/outputs/apk/debug/*.apk
          if-no-files-found: error`;

  const capacitorConfig = `{
  "appId": "com.pocketcore.offlineai",
  "appName": "PocketCore AI",
  "webDir": "dist",
  "bundledWebRuntime": false,
  "server": {
    "androidScheme": "https"
  }
}`;

  const viteConfig = `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  optimizeDeps: {
    exclude: ['@wllama/wllama'],
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
  },
});`;

  const getActiveCode = () => {
    switch (activeTab) {
      case 'workflow':
        return workflowYaml;
      case 'capacitor':
        return capacitorConfig;
      case 'vite':
        return viteConfig;
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getActiveCode());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col rounded-3xl border border-white/10 bg-[#12141D] text-[#F3F4F8] shadow-2xl shadow-indigo-500/10">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#30D158]/10 text-[#30D158]">
              <Smartphone className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Android APK & Сборка GitHub Actions</h2>
              <p className="text-xs text-[#8E93A6]">
                Capacitor + @wllama/wllama для автоматической сборки APK
              </p>
            </div>
          </div>
          <button
            onClick={() => setApkModalOpen(false)}
            className="rounded-full p-2 text-[#8E93A6] transition hover:bg-white/5 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Badges / Highlights */}
        <div className="flex flex-wrap items-center gap-2 border-b border-white/5 bg-white/[0.02] px-6 py-3 text-xs">
          <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 font-medium text-emerald-400">
            <ShieldCheck className="h-3.5 w-3.5" />
            Capacitor 6 + Android
          </span>
          <span className="flex items-center gap-1.5 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 font-medium text-indigo-400">
            <Cpu className="h-3.5 w-3.5" />
            @wllama/wllama (WASM Engine)
          </span>
          <span className="flex items-center gap-1.5 rounded-full border border-purple-500/20 bg-purple-500/10 px-3 py-1 font-medium text-purple-400">
            <Terminal className="h-3.5 w-3.5" />
            Чистая генерация в GitHub Actions
          </span>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10 px-6 pt-3">
          <button
            onClick={() => setActiveTab('workflow')}
            className={`border-b-2 px-4 py-2 text-xs font-medium transition ${
              activeTab === 'workflow'
                ? 'border-[#5E6AD2] text-[#7C86FF]'
                : 'border-transparent text-[#8E93A6] hover:text-white'
            }`}
          >
            .github/workflows/build-apk.yml
          </button>
          <button
            onClick={() => setActiveTab('capacitor')}
            className={`border-b-2 px-4 py-2 text-xs font-medium transition ${
              activeTab === 'capacitor'
                ? 'border-[#5E6AD2] text-[#7C86FF]'
                : 'border-transparent text-[#8E93A6] hover:text-white'
            }`}
          >
            capacitor.config.json
          </button>
          <button
            onClick={() => setActiveTab('vite')}
            className={`border-b-2 px-4 py-2 text-xs font-medium transition ${
              activeTab === 'vite'
                ? 'border-[#5E6AD2] text-[#7C86FF]'
                : 'border-transparent text-[#8E93A6] hover:text-white'
            }`}
          >
            vite.config.ts
          </button>
        </div>

        {/* Code Content */}
        <div className="relative flex-1 overflow-auto p-6 font-mono text-xs">
          <div className="absolute right-8 top-8 z-10">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-[#8E93A6] backdrop-blur-md transition hover:bg-white/10 hover:text-white"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Скопировано</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Скопировать код</span>
                </>
              )}
            </button>
          </div>

          <pre className="rounded-xl border border-white/5 bg-[#090A0F] p-4 text-[#D3D7E3] leading-relaxed overflow-x-auto">
            <code>{getActiveCode()}</code>
          </pre>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-white/10 px-6 py-4 text-xs text-[#8E93A6]">
          <span>
            После пуша в GitHub Actions артефакт появится во вкладке Actions → Summary
          </span>
          <button
            onClick={() => setApkModalOpen(false)}
            className="rounded-xl bg-white/10 px-4 py-2 font-medium text-white transition hover:bg-white/15"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};
