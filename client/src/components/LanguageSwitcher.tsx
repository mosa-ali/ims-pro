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
    <Button
      variant="outline"
      className="w-full justify-between"
    >
      <div className="flex items-center gap-2">
        <Globe className="h-4 w-4" />
        <span>{language.toUpperCase()}</span>
      </div>
    </Button>
  </DropdownMenuTrigger>

  <DropdownMenuContent className="w-full">
    <DropdownMenuItem onClick={() => changeLanguage('en')}>
      English
    </DropdownMenuItem>

    <DropdownMenuItem onClick={() => changeLanguage('ar')}>
      العربية
    </DropdownMenuItem>

    <DropdownMenuItem onClick={() => changeLanguage('it')}>
      Italiano
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
 );
}
