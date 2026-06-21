# kotlinx.serialization @Serializable types
-keepattributes *Annotation*, InnerClasses
-dontnote kotlinx.serialization.SerializationKt
-keep,includedescriptorclasses class com.castleandcards.weather.widget.**$$serializer { *; }
-keepclassmembers class com.castleandcards.weather.widget.** { *** Companion; }
-keepclasseswithmembers class com.castleandcards.weather.widget.** { kotlinx.serialization.KSerializer serializer(...); }
