import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Languages } from "lucide-react";
import { useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { saveLanguagePreference } from "@/lib/languageDetection";

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const updateLanguageMutation = trpc.auth.updateLanguagePreference.useMutation();

  // Apply RTL direction when Arabic is selected
  useEffect(() => {
    const dir = i18n.language === "ar" ? "rtl" : "ltr";
    document.documentElement.dir = dir;
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  const changeLanguage = async (lng: 'en' | 'ar') => {
    // Change UI language immediately
    await i18n.changeLanguage(lng);
    
    // Save to localStorage for immediate persistence
    saveLanguagePreference(lng);
    
    // Save to database for long-term persistence
    try {
      await updateLanguageMutation.mutateAsync({ language: lng });
    } catch (error) {
      console.error('Failed to save language preference:', error);
      toast.error('Failed to save language preference');
    }
  };

  const currentLanguage = i18n.language === "ar" ? "العربية" : "English";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Languages className="h-4 w-4" />
          <span>{currentLanguage}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => changeLanguage("en")}>
          <span className="mr-2">🇬🇧</span>
          English
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => changeLanguage("ar")}>
          <span className="mr-2">🇸🇦</span>
          العربية
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
