import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
 DropdownMenu,
 DropdownMenuContent,
 DropdownMenuItem,
 DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLanguage } from '@/contexts/LanguageContext';


interface LanguageSwitcherProps {
  variant?: 'default' | 'header';
}

export function LanguageSwitcher({ variant = 'default' }: LanguageSwitcherProps) {
 const { language, changeLanguage } = useLanguage();

 const isHeaderVariant = variant === 'header';

 if (isHeaderVariant) {
   return (
     <DropdownMenu>
       <DropdownMenuTrigger asChild>
         <button
           className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/20 hover:bg-white/10 transition-colors text-white text-sm font-medium"
         >
           <Globe className="h-4 w-4" />
           <span>{language.toUpperCase()}</span>
         </button>
       </DropdownMenuTrigger>

       <DropdownMenuContent align="end" className="w-32">
         <DropdownMenuItem onClick={() => changeLanguage('en')}>
           <span>English</span>
         </DropdownMenuItem>

         <DropdownMenuItem onClick={() => changeLanguage('ar')}>
           <span>العربية</span>
         </DropdownMenuItem>

         <DropdownMenuItem onClick={() => changeLanguage('it')}>
           <span>Italiano</span>
         </DropdownMenuItem>
       </DropdownMenuContent>
     </DropdownMenu>
   );
 }

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
