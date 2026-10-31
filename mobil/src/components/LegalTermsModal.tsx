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

export type LegalTab = 'terms' | 'privacy' | 'sales_terms';

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

  const texts = {
    modalTitle:
      language === 'ar'
        ? 'الشروط والسياسات'
        : language === 'en'
        ? 'Legal Terms & Agreements'
        : language === 'ru'
        ? 'Юридические условия и соглашения'
        : 'Yasal Bilgilendirme ve Sözleşmeler',
    termsTab:
      language === 'ar'
        ? 'شروط الاستخدام'
        : language === 'en'
        ? 'Terms (EULA)'
        : language === 'ru'
        ? 'Условия (EULA)'
        : 'Kullanım (EULA)',
    privacyTab:
      language === 'ar'
        ? 'الخصوصية'
        : language === 'en'
        ? 'Privacy'
        : language === 'ru'
        ? 'Конфиденциальность'
        : 'Gizlilik',
    salesTab:
      language === 'ar'
        ? 'البيع عن بعد'
        : language === 'en'
        ? 'Distance Sales'
        : language === 'ru'
        ? 'Дистанц. продажа'
        : 'Ön Bilgi & Mesafeli Satış',
    closeButton:
      language === 'ar'
        ? 'فهمت وأوافق'
        : language === 'en'
        ? 'I Understand and Agree'
        : language === 'ru'
        ? 'Понятно, согласен(-на)'
        : 'Anladım ve Kabul Ediyorum',
    supportContact: 'destek@censal.app',
  };

  // ─── 1. Terms of Use / EULA ──────────────────────────────────────
  const renderTerms = () => {
    if (language === 'ar') {
      return (
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
      );
    }

    if (language === 'en') {
      return (
        <View style={{ gap: 14 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>
            End User License Agreement (EULA) & Community Guidelines
          </Text>
          <Text style={{ fontSize: 13, color: colors.muted }}>
            Last Updated: 2026 • Applies to Censal Application
          </Text>

          <View style={{ backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : '#FEF2F2', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#EF444440' }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.danger, marginBottom: 4 }}>
              Zero Tolerance Policy for Objectionable Content
            </Text>
            <Text style={{ fontSize: 13, color: colors.text, lineHeight: 20 }}>
              Censal maintains a strict zero-tolerance policy against abusive behavior, harassment, and objectionable content. Any user violating these terms will be immediately banned and their content removed from the platform.
            </Text>
          </View>

          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>
            1. Prohibited Content & User Conduct
          </Text>
          <Text style={{ fontSize: 13, color: colors.text, lineHeight: 20 }}>
            The following actions and contents are strictly forbidden in city rooms and direct chats:
            {'\n'}• Hate speech, discrimination, harassment, threats, or personal abuse.
            {'\n'}• Sexually explicit content, pornography, or nudity.
            {'\n'}• Fraud, counterfeit listings, scamming, or misleading information.
            {'\n'}• Promotion or transaction of illegal goods, narcotics, or weapons.
            {'\n'}• Automated spamming, bots, or repetitive disruptive messages.
          </Text>

          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>
            2. Reporting & Immediate Blocking Tools
          </Text>
          <Text style={{ fontSize: 13, color: colors.text, lineHeight: 20 }}>
            Every user is empowered with built-in safety controls:
            {'\n'}• Report any offending message or user with a single tap for moderation review.
            {'\n'}• Block any user instantly to hide their messages and terminate communication.
            {'\n'}• Our moderation team investigates all reports and takes disciplinary action within 24 hours.
          </Text>

          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>
            3. 30-Day Automated Content Deletion
          </Text>
          <Text style={{ fontSize: 13, color: colors.text, lineHeight: 20 }}>
            To safeguard user privacy, all messages, images, and voice notes shared across city rooms are permanently deleted from our servers after 30 days.
          </Text>

          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>
            4. Account Suspension & Termination
          </Text>
          <Text style={{ fontSize: 13, color: colors.text, lineHeight: 20 }}>
            Censal reserves the right to suspend or permanently ban any user account that infringes upon these terms without prior notice.
          </Text>

          <Text style={{ fontSize: 13, color: colors.muted, marginTop: 8 }}>
            Support & Inquiries: destek@censal.app
          </Text>
        </View>
      );
    }

    if (language === 'ru') {
      return (
        <View style={{ gap: 14 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>
            Лицензионное соглашение с конечным пользователем (EULA)
          </Text>
          <Text style={{ fontSize: 13, color: colors.muted }}>
            Последнее обновление: 2026 • Действует для приложения Censal
          </Text>

          <View style={{ backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : '#FEF2F2', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#EF444440' }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.danger, marginBottom: 4 }}>
              Политика нулевой терпимости к неприемлемому контенту (Zero Tolerance)
            </Text>
            <Text style={{ fontSize: 13, color: colors.text, lineHeight: 20 }}>
              Censal категорически не приемлет оскорбительное поведение и неприемлемый контент. Любой пользователь, нарушающий эти правила, будет немедленно заблокирован, а его контент удален.
            </Text>
          </View>

          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>
            1. Запрещенный контент и поведение
          </Text>
          <Text style={{ fontSize: 13, color: colors.text, lineHeight: 20 }}>
            В комнатах городов и личных чатах строго запрещены:
            {'\n'}• Язык вражды, дискриминация, угрозы, оскорбления или домогательства.
            {'\n'}• Порнографические материалы, контент сексуального характера.
            {'\n'}• Мошенничество, нелегальные ставки, ложная или вводящая в заблуждение информация.
            {'\n'}• Распространение наркотиков, оружия или незаконных веществ.
            {'\n'}• Спам, боты и повторяющиеся сообщения, мешающие общению.
          </Text>

          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>
            2. Механизм жалоб и блокировки
          </Text>
          <Text style={{ fontSize: 13, color: colors.text, lineHeight: 20 }}>
            Каждый пользователь имеет возможность:
            {'\n'}• Пожаловаться на любое сообщение одним нажатием для проверки модераторами.
            {'\n'}• Заблокировать любого пользователя, чтобы скрыть его сообщения и прекратить контакт.
            {'\n'}• Команда модерации рассматривает жалобы в течение 24 часов.
          </Text>

          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>
            3. Автоматическое удаление сообщений через 30 дней
          </Text>
          <Text style={{ fontSize: 13, color: colors.text, lineHeight: 20 }}>
            В целях защиты конфиденциальности все сообщения, фото и голосовые записи в комнатах городов безвозвратно удаляются с серверов через 30 дней.
          </Text>

          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>
            4. Блокировка и удаление аккаунта
          </Text>
          <Text style={{ fontSize: 13, color: colors.text, lineHeight: 20 }}>
            Администрация оставляет за собой право приостановить или удалить учетную запись нарушителя без предварительного уведомления.
          </Text>

          <Text style={{ fontSize: 13, color: colors.muted, marginTop: 8 }}>
            Поддержка: destek@censal.app
          </Text>
        </View>
      );
    }

    // Default: Turkish
    return (
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
    );
  };

  // ─── 2. Privacy Policy ────────────────────────────────────────────
  const renderPrivacy = () => {
    if (language === 'ar') {
      return (
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
            {'\n'}• يتم حذف جميع رسائل غرف المدن تلقائياً بعد مرور 30 يوماً.
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
      );
    }

    if (language === 'en') {
      return (
        <View style={{ gap: 14 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>
            Privacy Policy & Personal Data Protection
          </Text>
          <Text style={{ fontSize: 13, color: colors.muted }}>
            Censal is strictly committed to protecting your privacy and personal data.
          </Text>

          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>
            1. Collected Personal Information
          </Text>
          <Text style={{ fontSize: 13, color: colors.text, lineHeight: 20 }}>
            We only process information essential to providing our services:
            {'\n'}• Identity & Contact: Phone number (for secure OTP sign-in), Name, and Surname.
            {'\n'}• Profile Data: Selected city and optional avatar photo.
            {'\n'}• User Contributions: Messages, media attachments, and optional real-time location shared in city rooms.
            {'\n'}• Phone Privacy: Your phone number is hidden by default and never disclosed without your consent.
          </Text>

          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>
            2. Data Retention & 30-Day Automated Wiping
          </Text>
          <Text style={{ fontSize: 13, color: colors.text, lineHeight: 20 }}>
            In accordance with our data minimization policy:
            {'\n'}• All messages, audio clips, and images shared in city rooms are permanently wiped after 30 days.
            {'\n'}• Your data is never sold or transferred to advertisers, brokers, or external commercial third parties.
          </Text>

          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>
            3. In-App Complete Account & Data Deletion
          </Text>
          <Text style={{ fontSize: 13, color: colors.text, lineHeight: 20 }}>
            Under Apple and Google Play store compliance:
            {'\n'}You can permanently delete your account, conversations, and all personal data anytime via:
            {'\n'}Profile ➔ Delete My Account & Data.
            {'\n'}All records will be instantly and irrevocably erased from our servers.
          </Text>

          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>
            4. Age Requirement
          </Text>
          <Text style={{ fontSize: 13, color: colors.text, lineHeight: 20 }}>
            Censal is designated for users aged 17 and above.
          </Text>

          <Text style={{ fontSize: 13, color: colors.muted, marginTop: 8 }}>
            Data Controller & Inquiries: censal.app@gmail.com
          </Text>
        </View>
      );
    }

    if (language === 'ru') {
      return (
        <View style={{ gap: 14 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>
            Политика конфиденциальности и защита данных
          </Text>
          <Text style={{ fontSize: 13, color: colors.muted }}>
            Censal обеспечивает максимальную безопасность ваших персональных данных.
          </Text>

          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>
            1. Собираемые персональные данные
          </Text>
          <Text style={{ fontSize: 13, color: colors.text, lineHeight: 20 }}>
            Мы обрабатываем только данные, необходимые для предоставления услуг:
            {'\n'}• Идентификация: Номер телефона (для безопасного входа по OTP), Имя, Фамилия.
            {'\n'}• Профиль: Выбранный город и фото профиля (по желанию).
            {'\n'}• Пользовательский контент: Сообщения, медиафайлы и геолокация в чатах.
            {'\n'}• Конфиденциальность номера: Ваш номер скрыт по умолчанию и не передается другим пользователям без вашего согласия.
          </Text>

          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>
            2. Хранение данных и автоудаление
          </Text>
          <Text style={{ fontSize: 13, color: colors.text, lineHeight: 20 }}>
            • Все сообщения и медиа в комнатах городов навсегда удаляются через 30 дней.
            {'\n'}• Мы не продаем и не передаем ваши данные рекламным сетям или третьим лицам.
          </Text>

          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>
            3. Удаление аккаунта и данных в приложении
          </Text>
          <Text style={{ fontSize: 13, color: colors.text, lineHeight: 20 }}>
            В соответствии с требованиями Apple и Google Play, вы можете удалить аккаунт и все данные в любое время через:
            {'\n'}Профиль ➔ Удалить аккаунт и данные.
            {'\n'}Удаление происходит мгновенно и безвозвратно.
          </Text>

          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>
            4. Возрастное ограничение
          </Text>
          <Text style={{ fontSize: 13, color: colors.text, lineHeight: 20 }}>
            Приложение предназначено для пользователей от 17 лет и старше.
          </Text>

          <Text style={{ fontSize: 13, color: colors.muted, marginTop: 8 }}>
            Контакты: censal.app@gmail.com
          </Text>
        </View>
      );
    }

    // Default: Turkish
    return (
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
          Veri Sorumlusu ve İletişim: censal.app@gmail.com | WhatsApp: Censal Resmi Destek Hattı
        </Text>
      </View>
    );
  };

  // ─── 3. Distance Sales & Pre-Information ─────────────────────────
  const renderSalesTerms = () => {
    if (language === 'ar') {
      return (
        <View style={{ gap: 14 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, textAlign: 'right' }}>
            شروط البيع عن بعد ونموذج المعلومات المسبقة
          </Text>
          <Text style={{ fontSize: 13, color: colors.muted, textAlign: 'right' }}>
            وفقاً لقوانين حماية المستهلك والخدمات الرقمية
          </Text>

          <View
            style={{
              backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : '#FEF2F2',
              padding: 12,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: '#EF444440',
            }}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: '700',
                color: colors.danger,
                marginBottom: 4,
                textAlign: 'right',
              }}
            >
              استثناء حق التراجع في المحتوى الرقمي الفوري
            </Text>
            <Text style={{ fontSize: 13, color: colors.text, lineHeight: 20, textAlign: 'right' }}>
              يتم تقديم هذه الخدمة الرقمية وتفعيلها فوراً بعد تأكيد الدفع. وفقاً للائحة العقود عن بعد، لا ينطبق حق التراجع (الاسترداد) على الخدمات التي يتم تنفيذها فورياً في البيئة الإلكترونية بموافقة المستهلك المسبقة.
            </Text>
          </View>

          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text, textAlign: 'right' }}>
            1. معلومات المزود
          </Text>
          <Text style={{ fontSize: 13, color: colors.text, lineHeight: 20, textAlign: 'right' }}>
            • مزود الخدمة: منصة Censal الرقمية
            {'\n'}• البريد الإلكتروني: destek@censal.app / censal.app@gmail.com
            {'\n'}• المشتري: الشخص الطبيعي الذي يسجل الدخول ويشتري الخدمة عبر التطبيق.
          </Text>

          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text, textAlign: 'right' }}>
            2. طبيعة الخدمة وميزاتها
          </Text>
          <Text style={{ fontSize: 13, color: colors.text, lineHeight: 20, textAlign: 'right' }}>
            يتضمن اشتراك Censal PRO الوصول غير المحدود إلى 81 غرفة مدن، ميزات المراسلة المتقدمة، مشاركة الصور والملاحظات الصوتية، وميزات تثبيت الإعلانات في الواجهة.
          </Text>

          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text, textAlign: 'right' }}>
            3. الأسعار والفوترة
          </Text>
          <Text style={{ fontSize: 13, color: colors.text, lineHeight: 20, textAlign: 'right' }}>
            • يتم عرض الأسعار شاملة جميع الضرائب على شاشة Google Play / Apple Store.
            {'\n'}• تتم معالجة الدفع عبر حساب المتجر المعتمد الخاص بك.
          </Text>

          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text, textAlign: 'right' }}>
            4. التجديد التلقائي والإلغاء
          </Text>
          <Text style={{ fontSize: 13, color: colors.text, lineHeight: 20, textAlign: 'right' }}>
            • يتجدد الاشتراك تلقائيًا ما لم يتم إلغاؤه قبل 24 ساعة على الأقل من نهاية الفترة الحالية.
            {'\n'}• يمكنك الإلغاء في أي وقت من خلال: متجر Google Play ← الملف الشخصي ← الدفعات والاشتراكات ← الاشتراكات.
            {'\n'}• يستمر الوصول إلى الميزات حتى نهاية الفترة المدفوعة بالفعل.
          </Text>

          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text, textAlign: 'right' }}>
            5. حل النزاعات
          </Text>
          <Text style={{ fontSize: 13, color: colors.text, lineHeight: 20, textAlign: 'right' }}>
            لأي استفسار أو شكوى يمكنك التواصل عبر البريد الإلكتروني: destek@censal.app.
          </Text>
        </View>
      );
    }

    if (language === 'en') {
      return (
        <View style={{ gap: 14 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>
            Pre-Information Form & Distance Sales Agreement
          </Text>
          <Text style={{ fontSize: 13, color: colors.muted }}>
            In accordance with Consumer Protection and Distance Contract Regulations
          </Text>

          <View
            style={{
              backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : '#FEF2F2',
              padding: 12,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: '#EF444440',
            }}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: '700',
                color: colors.danger,
                marginBottom: 4,
              }}
            >
              IMPORTANT: Immediate Digital Content & No Right of Withdrawal
            </Text>
            <Text style={{ fontSize: 13, color: colors.text, lineHeight: 20 }}>
              Censal PRO subscriptions and pinned listing features are intangible digital services performed and delivered immediately upon payment. Under consumer protection rules for distance contracts, the statutory right of withdrawal (refund) does not apply to services executed immediately in an electronic environment once consent is granted. By confirming this purchase, the Buyer acknowledges that the service is delivered immediately and waives the right of withdrawal.
            </Text>
          </View>

          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>
            1. Parties & Provider Information
          </Text>
          <Text style={{ fontSize: 13, color: colors.text, lineHeight: 20 }}>
            • Service Provider: Censal Digital Community & Classifieds Platform
            {'\n'}• Support & Inquiries: destek@censal.app / censal.app@gmail.com
            {'\n'}• Buyer (Consumer): The individual registered via verified phone credentials who purchases an in-app subscription or feature.
          </Text>

          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>
            2. Subject Matter & Service Scope
          </Text>
          <Text style={{ fontSize: 13, color: colors.text, lineHeight: 20 }}>
            The agreement pertains to the selected Censal PRO plan (Monthly/Yearly) or 24-Hour Pinned Listing feature. Active subscribers gain unrestricted access to all 81 city rooms, real-time messaging, photo/audio sharing, and priority visibility tools. Digital entitlements activate instantly.
          </Text>

          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>
            3. Pricing, Taxes & Billing
          </Text>
          <Text style={{ fontSize: 13, color: colors.text, lineHeight: 20 }}>
            • All fees displayed on the Google Play Store / Apple App Store purchase dialog include all statutory taxes (VAT).
            {'\n'}• Payments are securely debited via your registered Google Play / Apple In-App Purchase account.
          </Text>

          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>
            4. Auto-Renewal & Cancellation Procedure (Google Play)
          </Text>
          <Text style={{ fontSize: 13, color: colors.text, lineHeight: 20 }}>
            • Subscriptions automatically renew at the end of each term (Monthly/Yearly) unless cancelled at least 24 hours prior to the billing date.
            {'\n'}• You can cancel anytime without penalties in the Google Play Store app: [Profile ➔ Payments & subscriptions ➔ Subscriptions].
            {'\n'}• Upon cancellation, your PRO benefits remain active until the end of the paid period; no subsequent fees are billed.
          </Text>

          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>
            5. Complaints & Dispute Settlement
          </Text>
          <Text style={{ fontSize: 13, color: colors.text, lineHeight: 20 }}>
            In the event of inquiries or disputes, users may reach out to destek@censal.app. Formal dispute resolutions fall under the jurisdiction of competent Consumer Arbitration Boards and Courts within statutory monetary thresholds.
          </Text>

          <Text style={{ fontSize: 13, color: colors.muted, marginTop: 8 }}>
            Support & Information: destek@censal.app
          </Text>
        </View>
      );
    }

    if (language === 'ru') {
      return (
        <View style={{ gap: 14 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>
            Условия дистанционной продажи и предварительная информация
          </Text>
          <Text style={{ fontSize: 13, color: colors.muted }}>
            В соответствии с законодательством о защите прав потребителей и цифровых услугах
          </Text>

          <View
            style={{
              backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : '#FEF2F2',
              padding: 12,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: '#EF444440',
            }}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: '700',
                color: colors.danger,
                marginBottom: 4,
              }}
            >
              ВАЖНО: Мгновенное оказание цифровых услуг и исключение права на отказ
            </Text>
            <Text style={{ fontSize: 13, color: colors.text, lineHeight: 20 }}>
              Подписка Censal PRO и закрепление объявлений являются нематериальными цифровыми услугами, которые предоставляются немедленно после подтверждения оплаты. В соответствии с правилами дистанционной торговли, право на отказ (возврат) не распространяется на цифровые услуги, оказанные мгновенно с согласия потребителя. Подтверждая покупку, Покупатель соглашается с немедленным оказанием услуги и отсутствием права на отказ.
            </Text>
          </View>

          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>
            1. Стороны и информация о поставщике
          </Text>
          <Text style={{ fontSize: 13, color: colors.text, lineHeight: 20 }}>
            • Поставщик услуг: Цифровая платформа Censal
            {'\n'}• Электронная почта: destek@censal.app / censal.app@gmail.com
            {'\n'}• Покупатель: Физическое лицо, зарегистрированное в приложении и оформившее цифровую подписку.
          </Text>

          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>
            2. Предмет соглашения
          </Text>
          <Text style={{ fontSize: 13, color: colors.text, lineHeight: 20 }}>
            Предметом является цифровая подписка Censal PRO (Месячная/Годовая) или закрепление объявления на 24 часа, открывающие доступ ко всем комнатам 81 города, обмену медиа и расширенным функциям сообщества. Услуга активируется мгновенно.
          </Text>

          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>
            3. Стоимость и оплата
          </Text>
          <Text style={{ fontSize: 13, color: colors.text, lineHeight: 20 }}>
            • Стоимость включает все применимые налоги и отображается на экране Google Play Store / Apple Store.
            {'\n'}• Оплата осуществляется через встроенные платежи Google Play / Apple с привязанного способа оплаты.
          </Text>

          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>
            4. Автопродление и отмена (Google Play)
          </Text>
          <Text style={{ fontSize: 13, color: colors.text, lineHeight: 20 }}>
            • Подписка продлевается автоматически, если не отменена как минимум за 24 часа до окончания текущего периода.
            {'\n'}• Отменить подписку можно в любое время через: Google Play Store ➔ Профиль ➔ Платежи и подписки ➔ Подписки.
            {'\n'}• Доступ сохраняется до конца оплаченного периода, повторные списания не производятся.
          </Text>

          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>
            5. Разрешение споров
          </Text>
          <Text style={{ fontSize: 13, color: colors.text, lineHeight: 20 }}>
            Обращения и претензии принимаются по адресу destek@censal.app. Споры подлежат рассмотрению в уполномоченных органах по защите прав потребителей.
          </Text>

          <Text style={{ fontSize: 13, color: colors.muted, marginTop: 8 }}>
            Поддержка: destek@censal.app
          </Text>
        </View>
      );
    }

    // Default: Turkish
    return (
      <View style={{ gap: 14 }}>
        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>
          Ön Bilgilendirme Formu ve Mesafeli Satış Sözleşmesi
        </Text>
        <Text style={{ fontSize: 13, color: colors.muted }}>
          6502 Sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği Uyarınca
        </Text>

        <View
          style={{
            backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : '#FEF2F2',
            padding: 12,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: '#EF444440',
          }}
        >
          <Text
            style={{
              fontSize: 14,
              fontWeight: '700',
              color: colors.danger,
              marginBottom: 4,
            }}
          >
            ÖNEMLİ: Dijital İçerik & Anında İfa Cayma Hakkı İstisnası (Madde 15/ğ)
          </Text>
          <Text style={{ fontSize: 13, color: colors.text, lineHeight: 20 }}>
            İşbu sözleşme konusu Censal PRO üyeliği ve vitrin sabitleme hizmetleri, elektronik ortamda anında ifa edilen ve tüketiciye anında teslim edilen gayrimaddi bir dijital hizmettir. Mesafeli Sözleşmeler Yönetmeliği'nin 15. maddesinin 1. fıkrasının (ğ) bendi uyarınca; 'Elektronik ortamda anında ifa edilen hizmetler veya tüketiciye anında teslim edilen gayrimaddi mallara ilişkin sözleşmelerde cayma hakkı kullanılamaz.' Satın alma işlemini onaylayan Alıcı, bu durumu bildiğini, hizmetin anında ifa edilmesine açık rıza gösterdiğini ve cayma hakkının bulunmadığını peşinen kabul ve taahhüt eder.
          </Text>
        </View>

        <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>
          1. Taraflar ve Hizmet Sağlayıcı Bilgileri
        </Text>
        <Text style={{ fontSize: 13, color: colors.text, lineHeight: 20 }}>
          • Hizmet Sağlayıcı: Censal Mobil Topluluk ve Dijital İlan Platformu
          {'\n'}• İletişim & Destek: destek@censal.app / censal.app@gmail.com
          {'\n'}• Alıcı (Tüketici): Censal uygulamasına telefon numarası ile kayıt olup uygulama içi dijital abonelik veya özellik satın alan gerçek kişi.
        </Text>

        <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>
          2. Hizmetin Temel Nitelikleri ve Kapsamı
        </Text>
        <Text style={{ fontSize: 13, color: colors.text, lineHeight: 20 }}>
          İşbu sözleşmenin konusu; Alıcı tarafından seçilen Censal PRO abonelik paketi (Aylık/Yıllık) veya Vitrin Sabitleme ek özelliğidir. Abonelik; 81 ilin şehir odalarına sınırsız erişim, canlı mesajlaşma, fotoğraf ve sesli mesaj paylaşımı ve gelişmiş topluluk araçlarını içerir. Hizmet, satın alma tamamlandığında kullanıcının hesabına anında tanımlanır.
        </Text>

        <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>
          3. Toplam Bedel, Vergiler ve Ödeme
        </Text>
        <Text style={{ fontSize: 13, color: colors.text, lineHeight: 20 }}>
          • Hizmet bedeli; Alıcı’nın seçtiği pakete göre Google Play Store veya Apple App Store onay ekranında Türk Lirası cinsinden tüm yasal vergiler (KDV vb.) dahil olarak açıkça gösterilen tutardır.
          {'\n'}• Ödeme tahsilatı, Google Play Store / Apple In-App Purchase faturalandırma altyapısı aracılığıyla Alıcı’nın tanımlı ödeme yöntemi üzerinden gerçekleştirilir.
        </Text>

        <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>
          4. Otomatik Yenilenme Şartları ve İptal Prosedürü (Google Play)
        </Text>
        <Text style={{ fontSize: 13, color: colors.text, lineHeight: 20 }}>
          • Seçilen abonelik (Aylık veya Yıllık), geçerli fatura döneminin bitiminden en az 24 saat önce iptal edilmediği sürece otomatik olarak aynı süre ve tutarla yenilenir.
          {'\n'}• Alıcı, aboneliğini dilediği zaman hiçbir ek ücret ödemeksizin Google Play Store uygulamasında [Profil ➔ Ödemeler ve Abonelikler ➔ Abonelikler] menüsünden veya Google Hesabı yönetiminden iptal edebilir.
          {'\n'}• İptal işlemi yapıldığında mevcut fatura döneminin sonuna kadar PRO ayrıcalıkları devam eder; fatura dönemi bitiminde karttan tekrar çekim yapılmaz.
        </Text>

        <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>
          5. Şikayet ve Uyuşmazlık Çözümü
        </Text>
        <Text style={{ fontSize: 13, color: colors.text, lineHeight: 20 }}>
          Tüketici, satın aldığı dijital hizmete ilişkin talep ve itirazlarını öncelikle destek@censal.app / censal.app@gmail.com adresine iletebilir. Uyuşmazlık halinde Ticaret Bakanlığı tarafından her yıl ilan edilen parasal sınırlar dahilinde Alıcı’nın yerleşim yerindeki İl veya İlçe Tüketici Hakem Heyetleri ile Tüketici Mahkemeleri yetkilidir.
        </Text>

        <Text style={{ fontSize: 13, color: colors.muted, marginTop: 8 }}>
          Destek & Bilgi: destek@censal.app
        </Text>
      </View>
    );
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
          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: tokens.scale(tokens.spacing.xs) }}>
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
              paddingHorizontal: 4,
              borderRadius: tokens.radii.md,
              backgroundColor: activeTab === 'terms' ? colors.primary : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              style={{
                fontSize: tokens.moderateScale(12),
                fontWeight: tokens.typography.fontWeight.semibold,
                color: activeTab === 'terms' ? '#FFFFFF' : colors.muted,
                textAlign: 'center',
              }}
              numberOfLines={1}
            >
              {texts.termsTab}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setActiveTab('privacy')}
            style={{
              flex: 1,
              paddingVertical: tokens.verticalScale(tokens.spacing.xs),
              paddingHorizontal: 4,
              borderRadius: tokens.radii.md,
              backgroundColor: activeTab === 'privacy' ? colors.primary : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              style={{
                fontSize: tokens.moderateScale(12),
                fontWeight: tokens.typography.fontWeight.semibold,
                color: activeTab === 'privacy' ? '#FFFFFF' : colors.muted,
                textAlign: 'center',
              }}
              numberOfLines={1}
            >
              {texts.privacyTab}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setActiveTab('sales_terms')}
            style={{
              flex: 1,
              paddingVertical: tokens.verticalScale(tokens.spacing.xs),
              paddingHorizontal: 4,
              borderRadius: tokens.radii.md,
              backgroundColor: activeTab === 'sales_terms' ? colors.primary : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              style={{
                fontSize: tokens.moderateScale(12),
                fontWeight: tokens.typography.fontWeight.semibold,
                color: activeTab === 'sales_terms' ? '#FFFFFF' : colors.muted,
                textAlign: 'center',
              }}
              numberOfLines={1}
            >
              {texts.salesTab}
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
          {activeTab === 'terms' && renderTerms()}
          {activeTab === 'privacy' && renderPrivacy()}
          {activeTab === 'sales_terms' && renderSalesTerms()}
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
