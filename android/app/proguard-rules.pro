# Keep React Native symbols
-keep class com.facebook.react.** { *; }

# Keep llama.rn native binding symbols
-keep class com.rnllama.** { *; }
-keepclassmembers class com.rnllama.** { *; }

# JNI Keep
-keepclasseswithmembernames class * {
    native <methods>;
}
