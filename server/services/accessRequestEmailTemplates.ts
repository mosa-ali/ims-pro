/**
 * HTML Email Templates for Access Request Flows
 * Supports English and Arabic with RTL/LTR
 * 8 templates total (4 flows × 2 languages)
 */

const baseWrapper = (content: string, isArabic: boolean = false) => `
<!DOCTYPE html>
<html dir="${isArabic ? 'rtl' : 'ltr'}" lang="${isArabic ? 'ar' : 'en'}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #333; line-height: 1.6; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0; font-size: 24px; }
    .body { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
    .footer { background: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; background: #1e40af; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
    .button:hover { background: #1e3a8a; }
    .info-box { background: #dbeafe; border-left: 4px solid #1e40af; padding: 15px; margin: 20px 0; border-radius: 4px; }
    .info-box.warning { background: #fef3c7; border-left-color: #f59e0b; }
    .info-box.success { background: #d1fae5; border-left-color: #10b981; }
    .merge-tag { color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    ${content}
  </div>
</body>
</html>
`;

// ─────────────────────────────────────────────────────────────────────────────
// 1. ACCESS REQUEST SUBMITTED - Admin Notification
// ─────────────────────────────────────────────────────────────────────────────

export function buildAccessRequestSubmittedEmail(input: {
  applicantName: string;
  applicantEmail: string;
  requestType: string; // organization_user | platform_admin
  organization?: string;
  requestedRole?: string;
  requestId: string;
  reviewUrl: string;
  language: 'en' | 'ar';
}): { subject: string; html: string } {
  const isArabic = input.language === 'ar';

  const subject = isArabic
    ? `طلب وصول جديد - ${input.applicantName}`
    : `New Access Request - ${input.applicantName}`;

  const requestTypeLabel = input.requestType === 'platform_admin'
    ? (isArabic ? 'مسؤول منصة' : 'Platform Admin')
    : (isArabic ? 'مستخدم منظمة' : 'Organization User');

  const content = isArabic ? `
    <div class="header">
      <h1>طلب وصول جديد</h1>
    </div>
    <div class="body">
      <p>مرحبا،</p>
      <p>تم تقديم طلب وصول جديد يتطلب مراجعتك:</p>
      
      <div class="info-box">
        <p><strong>اسم المتقدم:</strong> ${input.applicantName}</p>
        <p><strong>البريد الإلكتروني:</strong> ${input.applicantEmail}</p>
        <p><strong>نوع الطلب:</strong> ${requestTypeLabel}</p>
        ${input.organization ? `<p><strong>المنظمة:</strong> ${input.organization}</p>` : ''}
        ${input.requestedRole ? `<p><strong>الدور المطلوب:</strong> ${input.requestedRole}</p>` : ''}
        <p><strong>معرّف الطلب:</strong> <span class="merge-tag">${input.requestId}</span></p>
      </div>

      <p>يرجى مراجعة الطلب واتخاذ الإجراء المناسب:</p>
      <a href="${input.reviewUrl}" class="button">مراجعة الطلب</a>

      <p>شكراً لك على اهتمامك بإدارة طلبات الوصول.</p>
    </div>
    <div class="footer">
      <p>نظام إدارة المنظمات - IMS</p>
      <p>هذا بريد آلي، يرجى عدم الرد عليه مباشرة</p>
    </div>
  ` : `
    <div class="header">
      <h1>New Access Request</h1>
    </div>
    <div class="body">
      <p>Hello,</p>
      <p>A new access request has been submitted and requires your review:</p>
      
      <div class="info-box">
        <p><strong>Applicant Name:</strong> ${input.applicantName}</p>
        <p><strong>Email:</strong> ${input.applicantEmail}</p>
        <p><strong>Request Type:</strong> ${requestTypeLabel}</p>
        ${input.organization ? `<p><strong>Organization:</strong> ${input.organization}</p>` : ''}
        ${input.requestedRole ? `<p><strong>Requested Role:</strong> ${input.requestedRole}</p>` : ''}
        <p><strong>Request ID:</strong> <span class="merge-tag">${input.requestId}</span></p>
      </div>

      <p>Please review the request and take appropriate action:</p>
      <a href="${input.reviewUrl}" class="button">Review Request</a>

      <p>Thank you for managing access requests.</p>
    </div>
    <div class="footer">
      <p>Integrated Management System - IMS</p>
      <p>This is an automated email, please do not reply directly</p>
    </div>
  `;

  return {
    subject,
    html: baseWrapper(content, isArabic),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. ACCESS APPROVED - Organization User / Microsoft
// ─────────────────────────────────────────────────────────────────────────────

export function buildAccessApprovedMicrosoftEmail(input: {
  applicantName: string;
  organization: string;
  signInUrl: string;
  supportEmail?: string;
  language: 'en' | 'ar';
}): { subject: string; html: string } {
  const isArabic = input.language === 'ar';

  const subject = isArabic ? 'تم الموافقة على طلب الوصول' : 'Access Request Approved';

  const content = isArabic ? `
    <div class="header">
      <h1>تم الموافقة على طلب الوصول</h1>
    </div>
    <div class="body">
      <p>مرحبا ${input.applicantName}،</p>
      <p>تم الموافقة على طلب الوصول الخاص بك!</p>
      
      <div class="info-box success">
        <p><strong>المنظمة:</strong> ${input.organization}</p>
        <p>يمكنك الآن الوصول إلى نظام إدارة المنظمات باستخدام بيانات اعتماد Microsoft 365 الخاصة بك.</p>
      </div>

      <p>للدخول إلى النظام:</p>
      <a href="${input.signInUrl}" class="button">تسجيل الدخول</a>

      <p><strong>ملاحظة مهمة:</strong></p>
      <p>استخدم بيانات اعتماد Microsoft 365 الخاصة بك للدخول. إذا نسيت كلمة المرور، يرجى التواصل مع مسؤول المنظمة أو فريق دعم Microsoft.</p>

      ${input.supportEmail ? `<p>للمساعدة، يرجى التواصل مع: <strong>${input.supportEmail}</strong></p>` : ''}
    </div>
    <div class="footer">
      <p>نظام إدارة المنظمات - IMS</p>
    </div>
  ` : `
    <div class="header">
      <h1>Access Request Approved</h1>
    </div>
    <div class="body">
      <p>Hello ${input.applicantName},</p>
      <p>Your access request has been approved!</p>
      
      <div class="info-box success">
        <p><strong>Organization:</strong> ${input.organization}</p>
        <p>You can now access the Integrated Management System using your Microsoft 365 credentials.</p>
      </div>

      <p>To sign in to the system:</p>
      <a href="${input.signInUrl}" class="button">Sign In</a>

      <p><strong>Important Note:</strong></p>
      <p>Use your Microsoft 365 credentials to sign in. If you forgot your password, please contact your organization administrator or Microsoft support.</p>

      ${input.supportEmail ? `<p>For assistance, please contact: <strong>${input.supportEmail}</strong></p>` : ''}
    </div>
    <div class="footer">
      <p>Integrated Management System - IMS</p>
    </div>
  `;

  return {
    subject,
    html: baseWrapper(content, isArabic),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. ACCESS APPROVED - Organization User / Local Account
// ─────────────────────────────────────────────────────────────────────────────

export function buildAccessApprovedLocalEmail(input: {
  applicantName: string;
  organization: string;
  email: string;
  tempPassword: string;
  signInUrl: string;
  language: 'en' | 'ar';
}): { subject: string; html: string } {
  const isArabic = input.language === 'ar';

  const subject = isArabic ? 'تم الموافقة على طلب الوصول - بيانات الدخول' : 'Access Request Approved - Login Credentials';

  const content = isArabic ? `
    <div class="header">
      <h1>تم الموافقة على طلب الوصول</h1>
    </div>
    <div class="body">
      <p>مرحبا ${input.applicantName}،</p>
      <p>تم الموافقة على طلب الوصول الخاص بك! تم إنشاء حسابك في النظام.</p>
      
      <div class="info-box success">
        <p><strong>المنظمة:</strong> ${input.organization}</p>
        <p><strong>البريد الإلكتروني:</strong> ${input.email}</p>
      </div>

      <p><strong>بيانات الدخول المؤقتة:</strong></p>
      <div class="info-box warning">
        <p><strong>كلمة المرور المؤقتة:</strong> <code>${input.tempPassword}</code></p>
        <p>يرجى تغيير كلمة المرور عند أول دخول لك.</p>
      </div>

      <p>للدخول إلى النظام:</p>
      <a href="${input.signInUrl}" class="button">تسجيل الدخول</a>

      <p><strong>خطوات الدخول:</strong></p>
      <ol>
        <li>انتقل إلى رابط تسجيل الدخول أعلاه</li>
        <li>أدخل بريدك الإلكتروني: ${input.email}</li>
        <li>أدخل كلمة المرور المؤقتة المذكورة أعلاه</li>
        <li>غيّر كلمة المرور إلى كلمة قوية من اختيارك</li>
      </ol>

      <p><strong>تنبيه أمني:</strong> لا تشارك بيانات الدخول مع أحد. احتفظ بكلمة المرور في مكان آمن.</p>
    </div>
    <div class="footer">
      <p>نظام إدارة المنظمات - IMS</p>
    </div>
  ` : `
    <div class="header">
      <h1>Access Request Approved</h1>
    </div>
    <div class="body">
      <p>Hello ${input.applicantName},</p>
      <p>Your access request has been approved! Your account has been created in the system.</p>
      
      <div class="info-box success">
        <p><strong>Organization:</strong> ${input.organization}</p>
        <p><strong>Email:</strong> ${input.email}</p>
      </div>

      <p><strong>Temporary Login Credentials:</strong></p>
      <div class="info-box warning">
        <p><strong>Temporary Password:</strong> <code>${input.tempPassword}</code></p>
        <p>Please change your password on your first login.</p>
      </div>

      <p>To sign in to the system:</p>
      <a href="${input.signInUrl}" class="button">Sign In</a>

      <p><strong>Sign-In Steps:</strong></p>
      <ol>
        <li>Visit the sign-in link above</li>
        <li>Enter your email: ${input.email}</li>
        <li>Enter the temporary password shown above</li>
        <li>Change your password to a strong password of your choice</li>
      </ol>

      <p><strong>Security Alert:</strong> Do not share your login credentials with anyone. Keep your password in a safe place.</p>
    </div>
    <div class="footer">
      <p>Integrated Management System - IMS</p>
    </div>
  `;

  return {
    subject,
    html: baseWrapper(content, isArabic),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. ACCESS APPROVED - Platform Admin / Local Public Domain
// ─────────────────────────────────────────────────────────────────────────────

export function buildAccessApprovedPlatformLocalEmail(input: {
  applicantName: string;
  email: string;
  tempPassword: string;
  signInUrl: string;
  language: 'en' | 'ar';
}): { subject: string; html: string } {
  const isArabic = input.language === 'ar';

  const subject = isArabic ? 'تم الموافقة على طلب الوصول - مسؤول منصة' : 'Access Request Approved - Platform Admin';

  const content = isArabic ? `
    <div class="header">
      <h1>تم الموافقة على طلب الوصول</h1>
    </div>
    <div class="body">
      <p>مرحبا ${input.applicantName}،</p>
      <p>تم الموافقة على طلبك ليصبح مسؤول منصة! تم إنشاء حسابك.</p>
      
      <div class="info-box success">
        <p><strong>الدور:</strong> مسؤول منصة</p>
        <p><strong>البريد الإلكتروني:</strong> ${input.email}</p>
      </div>

      <p><strong>بيانات الدخول المؤقتة:</strong></p>
      <div class="info-box warning">
        <p><strong>كلمة المرور المؤقتة:</strong> <code>${input.tempPassword}</code></p>
        <p>يرجى تغيير كلمة المرور عند أول دخول لك.</p>
      </div>

      <p>للدخول إلى لوحة التحكم:</p>
      <a href="${input.signInUrl}" class="button">تسجيل الدخول</a>

      <p><strong>صلاحيات المسؤول:</strong></p>
      <ul>
        <li>إدارة طلبات الوصول</li>
        <li>إدارة المستخدمين والأدوار</li>
        <li>إدارة المنظمات والوحدات التنظيمية</li>
        <li>الإشراف على النظام</li>
      </ul>

      <p><strong>تنبيه أمني:</strong> كحساب إداري، يجب عليك حماية بيانات الدخول بشكل آمن.</p>
    </div>
    <div class="footer">
      <p>نظام إدارة المنظمات - IMS</p>
    </div>
  ` : `
    <div class="header">
      <h1>Access Request Approved</h1>
    </div>
    <div class="body">
      <p>Hello ${input.applicantName},</p>
      <p>Your request to become a Platform Admin has been approved! Your account has been created.</p>
      
      <div class="info-box success">
        <p><strong>Role:</strong> Platform Admin</p>
        <p><strong>Email:</strong> ${input.email}</p>
      </div>

      <p><strong>Temporary Login Credentials:</strong></p>
      <div class="info-box warning">
        <p><strong>Temporary Password:</strong> <code>${input.tempPassword}</code></p>
        <p>Please change your password on your first login.</p>
      </div>

      <p>To access the admin dashboard:</p>
      <a href="${input.signInUrl}" class="button">Sign In</a>

      <p><strong>Admin Permissions:</strong></p>
      <ul>
        <li>Manage access requests</li>
        <li>Manage users and roles</li>
        <li>Manage organizations and operating units</li>
        <li>System oversight and configuration</li>
      </ul>

      <p><strong>Security Alert:</strong> As an admin account, protect your login credentials securely.</p>
    </div>
    <div class="footer">
      <p>Integrated Management System - IMS</p>
    </div>
  `;

  return {
    subject,
    html: baseWrapper(content, isArabic),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. ACCESS APPROVED - Platform Admin / Microsoft
// ─────────────────────────────────────────────────────────────────────────────

export function buildAccessApprovedPlatformMicrosoftEmail(input: {
  applicantName: string;
  email: string;
  signInUrl: string;
  supportEmail?: string;
  language: 'en' | 'ar';
}): { subject: string; html: string } {
  const isArabic = input.language === 'ar';

  const subject = isArabic ? 'تم الموافقة على طلب الوصول - مسؤول منصة' : 'Access Request Approved - Platform Admin';

  const content = isArabic ? `
    <div class="header">
      <h1>تم الموافقة على طلب الوصول</h1>
    </div>
    <div class="body">
      <p>مرحبا ${input.applicantName}،</p>
      <p>تم الموافقة على طلبك ليصبح مسؤول منصة!</p>
      
      <div class="info-box success">
        <p><strong>الدور:</strong> مسؤول منصة</p>
        <p><strong>البريد الإلكتروني:</strong> ${input.email}</p>
        <p>يمكنك الآن الوصول إلى لوحة التحكم باستخدام بيانات اعتماد Microsoft الخاصة بك.</p>
      </div>

      <p>للدخول إلى لوحة التحكم:</p>
      <a href="${input.signInUrl}" class="button">تسجيل الدخول</a>

      <p><strong>ملاحظة:</strong> استخدم بيانات اعتماد Microsoft الخاصة بك. إذا واجهت أي مشاكل، يرجى التواصل مع فريق الدعم.</p>

      ${input.supportEmail ? `<p>للمساعدة: <strong>${input.supportEmail}</strong></p>` : ''}
    </div>
    <div class="footer">
      <p>نظام إدارة المنظمات - IMS</p>
    </div>
  ` : `
    <div class="header">
      <h1>Access Request Approved</h1>
    </div>
    <div class="body">
      <p>Hello ${input.applicantName},</p>
      <p>Your request to become a Platform Admin has been approved!</p>
      
      <div class="info-box success">
        <p><strong>Role:</strong> Platform Admin</p>
        <p><strong>Email:</strong> ${input.email}</p>
        <p>You can now access the admin dashboard using your Microsoft credentials.</p>
      </div>

      <p>To access the admin dashboard:</p>
      <a href="${input.signInUrl}" class="button">Sign In</a>

      <p><strong>Note:</strong> Use your Microsoft credentials to sign in. If you experience any issues, please contact support.</p>

      ${input.supportEmail ? `<p>For assistance: <strong>${input.supportEmail}</strong></p>` : ''}
    </div>
    <div class="footer">
      <p>Integrated Management System - IMS</p>
    </div>
  `;

  return {
    subject,
    html: baseWrapper(content, isArabic),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. PASSWORD RESET - Local IMS Account
// ─────────────────────────────────────────────────────────────────────────────

export function buildPasswordResetEmail(input: {
  userName: string;
  resetUrl: string;
  expiryMinutes?: number;
  language: 'en' | 'ar';
}): { subject: string; html: string } {
  const isArabic = input.language === 'ar';

  const subject = isArabic ? 'إعادة تعيين كلمة المرور' : 'Password Reset Request';

  const content = isArabic ? `
    <div class="header">
      <h1>إعادة تعيين كلمة المرور</h1>
    </div>
    <div class="body">
      <p>مرحبا ${input.userName}،</p>
      <p>تم تلقي طلب لإعادة تعيين كلمة المرور الخاصة بك.</p>
      
      <p>انقر على الزر أدناه لإعادة تعيين كلمة المرور:</p>
      <a href="${input.resetUrl}" class="button">إعادة تعيين كلمة المرور</a>

      <p><strong>أو انسخ الرابط التالي في المتصفح:</strong></p>
      <p style="word-break: break-all; color: #6b7280; font-size: 12px;">${input.resetUrl}</p>

      <div class="info-box warning">
        <p><strong>انتبه:</strong> هذا الرابط ينتهي صلاحيته في ${input.expiryMinutes || 60} دقيقة.</p>
        <p>إذا لم تطلب إعادة تعيين كلمة المرور، يرجى تجاهل هذا البريد.</p>
      </div>

      <p><strong>نصائح الأمان:</strong></p>
      <ul>
        <li>لا تشارك رابط إعادة التعيين مع أحد</li>
        <li>استخدم كلمة مرور قوية تحتوي على أحرف وأرقام ورموز</li>
        <li>لا تستخدم كلمة مرور سهلة التخمين</li>
      </ul>
    </div>
    <div class="footer">
      <p>نظام إدارة المنظمات - IMS</p>
    </div>
  ` : `
    <div class="header">
      <h1>Password Reset Request</h1>
    </div>
    <div class="body">
      <p>Hello ${input.userName},</p>
      <p>A password reset request has been received for your account.</p>
      
      <p>Click the button below to reset your password:</p>
      <a href="${input.resetUrl}" class="button">Reset Password</a>

      <p><strong>Or copy the following link in your browser:</strong></p>
      <p style="word-break: break-all; color: #6b7280; font-size: 12px;">${input.resetUrl}</p>

      <div class="info-box warning">
        <p><strong>Important:</strong> This link expires in ${input.expiryMinutes || 60} minutes.</p>
        <p>If you did not request a password reset, please ignore this email.</p>
      </div>

      <p><strong>Security Tips:</strong></p>
      <ul>
        <li>Do not share the reset link with anyone</li>
        <li>Use a strong password with letters, numbers, and symbols</li>
        <li>Avoid using easily guessable passwords</li>
      </ul>
    </div>
    <div class="footer">
      <p>Integrated Management System - IMS</p>
    </div>
  `;

  return {
    subject,
    html: baseWrapper(content, isArabic),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. MICROSOFT PASSWORD SUPPORT NOTICE
// ─────────────────────────────────────────────────────────────────────────────

export function buildMicrosoftPasswordSupportEmail(input: {
  userName: string;
  userType: 'organization' | 'platform'; // organization user or platform admin
  supportEmail?: string;
  language: 'en' | 'ar';
}): { subject: string; html: string } {
  const isArabic = input.language === 'ar';

  const subject = isArabic ? 'مساعدة إعادة تعيين كلمة المرور' : 'Password Reset Support';

  const supportText = input.userType === 'organization'
    ? (isArabic ? 'مسؤول المنظمة' : 'Organization Administrator')
    : (isArabic ? 'فريق الدعم' : 'Support Team');

  const content = isArabic ? `
    <div class="header">
      <h1>مساعدة إعادة تعيين كلمة المرور</h1>
    </div>
    <div class="body">
      <p>مرحبا ${input.userName}،</p>
      <p>حسابك مرتبط بـ Microsoft Entra (Microsoft 365).</p>
      
      <div class="info-box">
        <p><strong>إدارة كلمة المرور:</strong></p>
        <p>لا يتم إدارة كلمة المرور من خلال نظام IMS. بدلاً من ذلك، يتم إدارتها من خلال Microsoft Entra.</p>
      </div>

      <p><strong>إذا نسيت كلمة المرور:</strong></p>
      <ol>
        <li>انتقل إلى صفحة تسجيل الدخول</li>
        <li>انقر على "هل نسيت كلمة المرور؟"</li>
        <li>اتبع تعليمات Microsoft Entra</li>
      </ol>

      <p><strong>إذا واجهت مشاكل:</strong></p>
      <p>يرجى التواصل مع ${supportText}:</p>
      ${input.supportEmail ? `<p><strong>${input.supportEmail}</strong></p>` : '<p><strong>فريق الدعم</strong></p>'}

      <p>سيساعدك الفريق في إعادة تعيين كلمة المرور من خلال Microsoft Entra.</p>
    </div>
    <div class="footer">
      <p>نظام إدارة المنظمات - IMS</p>
    </div>
  ` : `
    <div class="header">
      <h1>Password Reset Support</h1>
    </div>
    <div class="body">
      <p>Hello ${input.userName},</p>
      <p>Your account is linked to Microsoft Entra (Microsoft 365).</p>
      
      <div class="info-box">
        <p><strong>Password Management:</strong></p>
        <p>Your password is not managed through the IMS system. Instead, it is managed through Microsoft Entra.</p>
      </div>

      <p><strong>If you forgot your password:</strong></p>
      <ol>
        <li>Go to the sign-in page</li>
        <li>Click "Forgot password?"</li>
        <li>Follow Microsoft Entra instructions</li>
      </ol>

      <p><strong>If you experience issues:</strong></p>
      <p>Please contact ${supportText}:</p>
      ${input.supportEmail ? `<p><strong>${input.supportEmail}</strong></p>` : '<p><strong>Support Team</strong></p>'}

      <p>The team will assist you in resetting your password through Microsoft Entra.</p>
    </div>
    <div class="footer">
      <p>Integrated Management System - IMS</p>
    </div>
  `;

  return {
    subject,
    html: baseWrapper(content, isArabic),
  };
}
