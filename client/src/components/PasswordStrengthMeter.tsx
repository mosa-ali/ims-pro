import { useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';

interface PasswordRequirement {
  label: string;
  labelAr: string;
  met: boolean;
}

interface PasswordStrengthMeterProps {
  password: string;
  language?: 'en' | 'ar';
  minLength?: number;
  requireUppercase?: boolean;
  requireLowercase?: boolean;
  requireNumbers?: boolean;
  requireSpecialChars?: boolean;
}

export function PasswordStrengthMeter({
  password,
  language = 'en',
  minLength = 8,
  requireUppercase = true,
  requireLowercase = true,
  requireNumbers = true,
  requireSpecialChars = false,
}: PasswordStrengthMeterProps) {
  const [requirements, setRequirements] = useState<PasswordRequirement[]>([]);
  const [strength, setStrength] = useState<'weak' | 'fair' | 'good' | 'strong' | 'very-strong'>('weak');
  const [score, setScore] = useState(0);

  useEffect(() => {
    if (!password) {
      setRequirements([]);
      setStrength('weak');
      setScore(0);
      return;
    }

    let calculatedScore = 0;
    const newRequirements: PasswordRequirement[] = [];

    // Check minimum length
    const hasMinLength = password.length >= minLength;
    newRequirements.push({
      label: `At least ${minLength} characters`,
      labelAr: `على الأقل ${minLength} أحرف`,
      met: hasMinLength,
    });
    if (hasMinLength) calculatedScore += 20;

    // Check uppercase
    const hasUppercase = /[A-Z]/.test(password);
    if (requireUppercase) {
      newRequirements.push({
        label: 'At least one uppercase letter',
        labelAr: 'حرف واحد على الأقل بأحرف كبيرة',
        met: hasUppercase,
      });
      if (hasUppercase) calculatedScore += 15;
    }

    // Check lowercase
    const hasLowercase = /[a-z]/.test(password);
    if (requireLowercase) {
      newRequirements.push({
        label: 'At least one lowercase letter',
        labelAr: 'حرف واحد على الأقل بأحرف صغيرة',
        met: hasLowercase,
      });
      if (hasLowercase) calculatedScore += 15;
    }

    // Check numbers
    const hasNumbers = /[0-9]/.test(password);
    if (requireNumbers) {
      newRequirements.push({
        label: 'At least one number',
        labelAr: 'رقم واحد على الأقل',
        met: hasNumbers,
      });
      if (hasNumbers) calculatedScore += 20;
    }

    // Check special characters
    const hasSpecialChars = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
    if (requireSpecialChars) {
      newRequirements.push({
        label: 'At least one special character (!@#$%^&*)',
        labelAr: 'حرف خاص واحد على الأقل (!@#$%^&*)',
        met: hasSpecialChars,
      });
      if (hasSpecialChars) calculatedScore += 20;
    }

    // Deduct points for repeated characters
    if (/(.)\1{2,}/.test(password)) {
      calculatedScore = Math.max(0, calculatedScore - 10);
    }

    // Deduct points for sequential characters
    if (/(?:abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz|012|123|234|345|456|567|678|789)/i.test(password)) {
      calculatedScore = Math.max(0, calculatedScore - 10);
    }

    // Bonus for length
    if (password.length >= 12) calculatedScore += 5;
    if (password.length >= 16) calculatedScore += 5;

    calculatedScore = Math.max(0, Math.min(100, calculatedScore));
    setScore(calculatedScore);
    setRequirements(newRequirements);

    // Determine strength
    if (calculatedScore < 20) {
      setStrength('weak');
    } else if (calculatedScore < 40) {
      setStrength('fair');
    } else if (calculatedScore < 60) {
      setStrength('good');
    } else if (calculatedScore < 80) {
      setStrength('strong');
    } else {
      setStrength('very-strong');
    }
  }, [password, minLength, requireUppercase, requireLowercase, requireNumbers, requireSpecialChars]);

  const strengthColors = {
    weak: 'bg-red-500',
    fair: 'bg-orange-500',
    good: 'bg-yellow-500',
    strong: 'bg-lime-500',
    'very-strong': 'bg-green-500',
  };

  const strengthLabels = {
    en: {
      weak: 'Weak',
      fair: 'Fair',
      good: 'Good',
      strong: 'Strong',
      'very-strong': 'Very Strong',
    },
    ar: {
      weak: 'ضعيف',
      fair: 'مقبول',
      good: 'جيد',
      strong: 'قوي',
      'very-strong': 'قوي جداً',
    },
  };

  if (!password) return null;

  const isRTL = language === 'ar';

  return (
    <div className={`space-y-3 ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Strength Bar */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className={`text-sm font-medium ${isRTL ? 'text-right' : 'text-left'}`}>
            {language === 'en' ? 'Password Strength' : 'قوة كلمة المرور'}
          </span>
          <span className={`text-sm font-semibold ${
            strength === 'weak' ? 'text-red-600' :
            strength === 'fair' ? 'text-orange-600' :
            strength === 'good' ? 'text-yellow-600' :
            strength === 'strong' ? 'text-lime-600' :
            'text-green-600'
          }`}>
            {strengthLabels[language][strength]}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full ${strengthColors[strength]} transition-all duration-300`}
            style={{ width: `${score}%` }}
          />
        </div>
        <div className="text-xs text-gray-500 mt-1">
          {language === 'en' ? `Strength: ${score}%` : `القوة: ${score}%`}
        </div>
      </div>

      {/* Requirements Checklist */}
      {requirements.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-700">
            {language === 'en' ? 'Requirements:' : 'المتطلبات:'}
          </p>
          <div className="space-y-1">
            {requirements.map((req, index) => (
              <div key={index} className="flex items-center gap-2">
                {req.met ? (
                  <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                ) : (
                  <X className="w-4 h-4 text-red-600 flex-shrink-0" />
                )}
                <span className={`text-xs ${req.met ? 'text-green-700' : 'text-gray-600'}`}>
                  {language === 'en' ? req.label : req.labelAr}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
