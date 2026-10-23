import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  Pressable,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { tokens } from '../theme/tokens';
import { useTheme } from '../theme';
import { useI18n } from '../i18n';
import { AppButton } from './ui/AppButton';

export type LegalTab = 'terms' | 'privacy';

export type LegalTermsModalProps = {
  visible: boolean;
  initialTab?: LegalTab;
  onClose: () => void;
};

export const LegalTermsModal: React.FC<LegalTermsModalProps> = ({
  visible,
  initialTab = 'terms',
  onClose,
}) => {
  const { colors, isDark } = useTheme();
  const { isRTL, language } = useI18n();
  const [activeTab, setActiveTab] = useState<LegalTab>(initialTab);

  // Sync tab when opened with specific initialTab
  React.useEffect(() => {
    if (visible) {
      setActiveTab(initialTab);
    }
  }, [visible, initialTab]);

  const isAr = language === 'ar';

  const texts = {
    modalTitle: isAr ? 'الشروط والخصوصية' : 'Kullanım Koşulları & Gizlilik',
    termsTab: isAr ? 'شروط الاستخدام (EULA)' : 'Kullanım Koşulları (EULA)',
    privacyTab: isAr ? 'سياسة الخصوصية' : 'Gizlilik Politikası',
    closeButton: isAr ? 'فهمت وأوافق' : 'Anladım ve Kabul Ediyorum',
    supportContact: 'destek@censal.app',
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
      onRequestClose={onClose}
    >
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: colors.bg,
        }}
        edges={['top', 'bottom', 'left', 'right']}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: isRTL ? 'row-reverse' : 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: tokens.scale(tokens.spacing.base),
            paddingVertical: tokens.verticalScale(tokens.spacing.sm),
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
            backgroundColor: colors.surface,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.scale(tokens.spacing.xs) }}>
            <Ionicons name="shield-checkmark" size={20} color={colors.primary} />
            <Text
              style={{
                fontSize: tokens.moderateScale(tokens.typography.fontSize.md),
                fontWeight: tokens.typography.fontWeight.bold,
                color: colors.text,
              }}
            >
              {texts.modalTitle}
            </Text>
          </View>

          <Pressable
            onPress={onClose}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Kapat"
            style={({ pressed }) => [
              {
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                justifyContent: 'center',
                alignItems: 'center',
              },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Ionicons name="close" size={20} color={colors.text} />
          </Pressable>
        </View>

        {/* Tab Switcher */}
        <View
          style={{
            flexDirection: isRTL ? 'row-reverse' : 'row',
            padding: tokens.scale(tokens.spacing.sm),
            backgroundColor: colors.surface,
            gap: tokens.scale(tokens.spacing.xs),
          }}
        >
          <Pressable
            onPress={() => setActiveTab('terms')}
            style={{
              flex: 1,
              paddingVertical: tokens.verticalScale(tokens.spacing.xs),
              borderRadius: tokens.radii.md,
              backgroundColor: activeTab === 'terms' ? colors.primary : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              style={{
                fontSize: tokens.moderateScale(tokens.typography.fontSize.sm),
                fontWeight: tokens.typography.fontWeight.semibold,
                color: activeTab === 'terms' ? '#FFFFFF' : colors.muted,
              }}
            >
              {texts.termsTab}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setActiveTab('privacy')}
            style={{
              flex: 1,
              paddingVertical: tokens.verticalScale(tokens.spacing.xs),
              borderRadius: tokens.radii.md,
              backgroundColor: activeTab === 'privacy' ? colors.primary : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              style={{
                fontSize: tokens.moderateScale(tokens.typography.fontSize.sm),
                fontWeight: tokens.typography.fontWeight.semibold,
                color: activeTab === 'privacy' ? '#FFFFFF' : colors.muted,
              }}
            >
              {texts.privacyTab}
            </Text>
          </Pressable>
        </View>

        {/* Scrollable Content */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            padding: tokens.scale(tokens.spacing.base),
            gap: tokens.verticalScale(tokens.spacing.base),
          }}
          showsVerticalScrollIndicator={true}
        >
          {activeTab === 'terms' ? (
            isAr ? (
              // Arabic EULA
              <View style={{ gap: 14 }}>
                <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, textAlign: 'right' }}>
                  اتفاقية ترخيص المستخدم النهائي (EULA) وقواعد المجتمع
                </Text>
                <Text style={{ fontSize: 13, color: colors.muted, textAlign: 'right' }}>
                  آخر تحديث: 2026 • تنطبق على تطبيق Censal
                </Text>

                <View style={{ backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : '#FEF2F2', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#EF444440' }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: colors.danger, textAlign: 'right', marginBottom: 4 }}>
                    سياسة عدم التسامح مطلقاً مع المحتوى المسيء (Zero Tolerance)
                  </Text>
                  <Text style={{ fontSize: 13, color: colors.text, textAlign: 'right', lineHeight: 20 }}>
                    لا يتسامح Censal مطلقاً مع المحتوى المرفوض أو المستخدمين المسيئين. سيتم حظر أي حساب ينتهك هذه الشروط فوراً وحذف محتواه من المنصة.
                  </Text>
                </View>

                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text, textAlign: 'right' }}>
                  1. شروط المحتوى وسلوك المستخدم
                </Text>
                <Text style={{ fontSize: 13, color: colors.text, textAlign: 'right', lineHeight: 20 }}>
                  يُحظر تماماً نشر أو تبادل أي من المحتويات التالية في غرف المدن أو المحادثات الخاصة:
                  {'\n'}• التحرش، التهديد، التنمر، أو خطاب الكراهية ضد أي شخص أو فئة.
                  {'\n'}• المواد الإباحية، المحتوى الفاحش، أو الصور غير اللائقة.
                  {'\n'}• الاحتيال، النصب، أو نشر معلومات كاذبة أو مضللة.
                  {'\n'}• الترويج للمخدرات أو الأسلحة أو أي أنشطة غير قانونية.
                  {'\n'}• الرسائل المزعجة (Spam) أو الإعلانات المكررة بشكل مسيء.
                </Text>

                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text, textAlign: 'right' }}>
                  2. آليات التبليغ والحظر الفوري
                </Text>
                <Text style={{ fontSize: 13, color: colors.text, textAlign: 'right', lineHeight: 20 }}>
                  يتيح التطبيق للمستخدمين:
                  {'\n'}• التبليغ عن أي رسالة مسيئة بضغطة زر واحدة لمراجعتها من فريق الإشراف.
                  {'\n'}• حظر أي مستخدم فوراً لإخفاء رسائله ومنعه من التواصل معك نهائياً.
                  {'\n'}يقوم فريق المراقبة بمراجعة البلاغات واتخاذ الإجراء المناسب خلال 24 ساعة.
                </Text>

                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text, textAlign: 'right' }}>
                  3. الحذف التلقائي للمحتوى (30 يوماً)
                </Text>
                <Text style={{ fontSize: 13, color: colors.text, textAlign: 'right', lineHeight: 20 }}>
                  حفاظاً على نظافة المنصة والخصوصية، يتم حذف جميع الرسائل والصور والمقاطع الصوتية المشتركة في غرف المدن تلقائياً ونهائياً بعد مرور 30 يوماً.
                </Text>

                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text, textAlign: 'right' }}>
                  4. إنهاء الحساب والمسؤولية القانونية
                </Text>
                <Text style={{ fontSize: 13, color: colors.text, textAlign: 'right', lineHeight: 20 }}>
                  يحتفظ التطبيق بالحق الكامل في تعليق أو حذف حساب أي مستخدم ينتهك الشروط دون إنذار مسبق.
                </Text>

                <Text style={{ fontSize: 13, color: colors.muted, textAlign: 'right', marginTop: 8 }}>
                  لأي استفسار أو بلاغ عاجل: destek@censal.app
                </Text>
              </View>
            ) : (
              // Turkish EULA (Apple & Google Compliant)
              <View style={{ gap: 14 }}>
                <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>
                  Son Kullanıcı Lisans Sözleşmesi (EULA) ve Topluluk Kuralları
                </Text>
                <Text style={{ fontSize: 13, color: colors.muted }}>
                  Son Güncelleme: 2026 • Censal Uygulaması için Geçerlidir
                </Text>

                <View style={{ backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : '#FEF2F2', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#EF444440' }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: colors.danger, marginBottom: 4 }}>
                    Uygunsuz İçeriğe Karşı Sıfır Tolerans Politikası (Zero Tolerance)
                  </Text>
                  <Text style={{ fontSize: 13, color: colors.text, lineHeight: 20 }}>
                    Censal, topluluk huzurunu ve güvenliğini her şeyin üstünde tutar. Taciz edici, hakaret içeren, müstehcen veya yasa dışı hiçbir içeriğe tolerans gösterilmez. Bu kuralları ihlal eden kullanıcıların hesapları derhal kapatılır ve içerikleri kalıcı olarak silinir.
                  </Text>
                </View>

                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>
                  1. Yasaklanmış İçerikler ve Davranışlar
                </Text>
                <Text style={{ fontSize: 13, color: colors.text, lineHeight: 20 }}>
                  Şehir odalarında ve birebir sohbetlerde aşağıdaki eylemler kesinlikle yasaktır:
                  {'\n'}• Nefret söylemi, ayrımcılık, tehdit, hakaret veya kişisel taciz.
                  {'\n'}• Pornografik, cinsel veya çıplaklık barındıran görsel/ses paylaşımları.
                  {'\n'}• Dolandırıcılık, yasa dışı bahis, sahte ilan veya aldatıcı bilgiler.
                  {'\n'}• Uyuşturucu, silah veya suç teşkil eden madde tanıtımı/satışı.
                  {'\n'}• Toplu spam mesajlar, bot faaliyetleri ve oda huzurunu bozan tekrarlı paylaşımlar.
                </Text>

                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>
                  2. Şikayet ve Kullanıcı Engelleme Mekanizması
                </Text>
                <Text style={{ fontSize: 13, color: colors.text, lineHeight: 20 }}>
                  Her kullanıcı aşağıdaki hak ve araçlara sahiptir:
                  {'\n'}• Rahatsız edici herhangi bir mesajı veya profili tek dokunuşla moderasyona bildirebilirsiniz.
                  {'\n'}• Herhangi bir kullanıcıyı dilediğiniz an engelleyebilir; engellediğiniz kişinin mesajlarını ve erişimini anında sonlandırabilirsiniz.
                  {'\n'}• Moderasyon ekibimiz bildirilen içerikleri en geç 24 saat içinde inceleyerek gerekli cezai işlemleri uygular.
                </Text>

                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>
                  3. Mesajların 30 Gün Sonra Otomatik Silinmesi
                </Text>
                <Text style={{ fontSize: 13, color: colors.text, lineHeight: 20 }}>
                  Kullanıcı gizliliğini korumak amacıyla şehir odalarındaki tüm mesajlar, paylaşılan fotoğraflar ve ses kayıtları gönderim tarihinden itibaren 30 gün sonra sistemden kalıcı olarak silinir.
                </Text>

                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>
                  4. Hesap Askıya Alma ve Fesih
                </Text>
                <Text style={{ fontSize: 13, color: colors.text, lineHeight: 20 }}>
                  Censal yönetimi, işbu sözleşmeye aykırı hareket eden veya diğer kullanıcıların güvenliğini tehdit eden kullanıcıların hesaplarını önceden bildirimde bulunmaksızın askıya alma ve kalıcı olarak engelleme hakkını saklı tutar.
                </Text>

                <Text style={{ fontSize: 13, color: colors.muted, marginTop: 8 }}>
                  İletişim ve Destek: destek@censal.app
                </Text>
              </View>
            )
          ) : isAr ? (
            // Arabic Privacy Policy
            <View style={{ gap: 14 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, textAlign: 'right' }}>
                سياسة الخصوصية وأمان البيانات
              </Text>
              <Text style={{ fontSize: 13, color: colors.muted, textAlign: 'right' }}>
                تطبيق Censal ملتزم بحماية خصوصيتك وبياناتك الشخصية.
              </Text>

              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text, textAlign: 'right' }}>
                1. البيانات التي نجمعها
              </Text>
              <Text style={{ fontSize: 13, color: colors.text, textAlign: 'right', lineHeight: 20 }}>
                • رقم الهاتف (للتحقق وتأمين تسجيل الدخول).
                {'\n'}• معلومات الملف الشخصي (الاسم والمدينة وصورة الملف الشخصي إن وجدت).
                {'\n'}• محتوى الرسائل والصور المشتركة في غرف المدن والمحادثات الخاصة.
                {'\n'}• الموقع الجغرافي (فقط عند اختيارك الصريح لمشاركة موقعك في الرسائل).
              </Text>

              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text, textAlign: 'right' }}>
                2. حماية البيانات وعدم المشاركة
              </Text>
              <Text style={{ fontSize: 13, color: colors.text, textAlign: 'right', lineHeight: 20 }}>
                لا نقوم ببيع أو مشاركة بياناتك الشخصية مع أي شركات إعلانية أو أطراف ثالثة لأغراض تجارية.
              </Text>

              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text, textAlign: 'right' }}>
                3. حذف الحساب والبيانات في أي وقت
              </Text>
              <Text style={{ fontSize: 13, color: colors.text, textAlign: 'right', lineHeight: 20 }}>
                يمكنك حذف حسابك وجميع بياناتك بالكامل في أي وقت من خلال التطبيق عبر: (الملف الشخصي ← حذف حسابي وبياناتي). يتم الحذف فوراً ونهائياً بدون رجعة.
              </Text>

              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text, textAlign: 'right' }}>
                4. الفئة العمرية
              </Text>
              <Text style={{ fontSize: 13, color: colors.text, textAlign: 'right', lineHeight: 20 }}>
                التطبيق مخصص للمستخدمين الذين تبلغ أعمارهم 17 عاماً فما فوق.
              </Text>

              <Text style={{ fontSize: 13, color: colors.muted, textAlign: 'right', marginTop: 8 }}>
                فريق حماية البيانات: destek@censal.app
              </Text>
            </View>
          ) : (
            // Turkish Privacy Policy (Apple Nutrition Label & Google Data Safety compliant)
            <View style={{ gap: 14 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>
                Gizlilik Politikası ve Kişisel Verilerin Korunması
              </Text>
              <Text style={{ fontSize: 13, color: colors.muted }}>
                Censal, kullanıcılarının kişisel verilerinin güvenliğini en üst standartlarda korumayı taahhüt eder.
              </Text>

              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>
                1. Toplanan Kişisel Veriler
              </Text>
              <Text style={{ fontSize: 13, color: colors.text, lineHeight: 20 }}>
                Censal hizmetlerini sunabilmek amacıyla yalnızca gerekli olan veriler işlenir:
                {'\n'}• Kimlik & İletişim: Telefon numarası (güvenli OTP doğrulaması için), Ad, Soyad.
                {'\n'}• Profil Bilgisi: Seçilen şehir ve isteğe bağlı yüklenen profil fotoğrafı.
                {'\n'}• Kullanıcı İçerikleri: Şehir odalarında ve birebir sohbette paylaşılan mesajlar, medya ve isteğe bağlı anlık konum.
                {'\n'}• Telefon Numarası Gizliliği: Numaranız varsayılan olarak diğer üyelere gizlenebilir; açıkça izin vermediğiniz sürece kimseyle paylaşılmaz.
              </Text>

              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>
                2. Verilerin Saklanması ve 30 Günlük Otomatik Temizlik
              </Text>
              <Text style={{ fontSize: 13, color: colors.text, lineHeight: 20 }}>
                Veri minimizasyonu ilkemiz gereği:
                {'\n'}• Şehir odalarındaki mesajlar, ses kayıtları ve medya dosyaları 30 günün ardından sunucularımızdan kalıcı olarak silinir.
                {'\n'}• Verileriniz hiçbir reklam ağı, veri simsarı veya üçüncü tarafla ticari amaçla paylaşılmaz ve satılmaz.
              </Text>

              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>
                3. Uygulama İçi Hesap ve Veri Silme Hakkı
              </Text>
              <Text style={{ fontSize: 13, color: colors.text, lineHeight: 20 }}>
                Apple ve Google Play gereklilikleri doğrultusunda, istediğiniz an uygulamanın içinden:
                {'\n'}Profilim ➔ Hesabımı ve Verilerimi Sil
                {'\n'}seçeneğini kullanarak hesabınızı, mesajlarınızı, profilinizi ve tüm kişisel verilerinizi geri dönüşsüz olarak anında silebilirsiniz.
              </Text>

              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>
                4. Yaş Sınırı
              </Text>
              <Text style={{ fontSize: 13, color: colors.text, lineHeight: 20 }}>
                Censal, 17 yaş ve üzeri kullanıcılar için tasarlanmış canlı topluluk ve ilan uygulamasıdır.
              </Text>

              <Text style={{ fontSize: 13, color: colors.muted, marginTop: 8 }}>
                Veri Sorumlusu ve İletişim: destek@censal.app
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Footer Button */}
        <View
          style={{
            padding: tokens.scale(tokens.spacing.base),
            borderTopWidth: 1,
            borderTopColor: colors.border,
            backgroundColor: colors.surface,
          }}
        >
          <AppButton
            variant="primary"
            size="md"
            fullWidth
            label={texts.closeButton}
            onPress={onClose}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
};
