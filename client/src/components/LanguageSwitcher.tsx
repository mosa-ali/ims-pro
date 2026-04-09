import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
 DropdownMenu,
 DropdownMenuContent,
 DropdownMenuItem,
 DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLanguage } from '@/contexts/LanguageContext';

export function LanguageSwitcher() {
 const { language, changeLanguage } = useLanguage();

 return (
 <DropdownMenu>
 <DropdownMenuTrigger asChild>
 <Button variant="outline" size="icon">
 <Globe className="h-[1.2rem] w-[1.2rem]" />
 <span className="sr-only">Switch language</span>
 </Button>
 </DropdownMenuTrigger>
 <DropdownMenuContent align="end">
 <DropdownMenuItem
 onClick={() => changeLanguage('en')}
 className={language === 'en' ? 'bg-accent' : ''}
 >
 English
 </DropdownMenuItem>
 <DropdownMenuItem
 onClick={() => changeLanguage('ar')}
 className={language === 'ar' ? 'bg-accent' : ''}
 >
 العربية
 </DropdownMenuItem>
 </DropdownMenuContent>
 </DropdownMenu>
 );
}
