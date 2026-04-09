import { useState, useRef, useEffect } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useLanguage } from '@/contexts/LanguageContext';

interface MicrosoftUser {
  id: string;
  email: string;
  displayName: string;
  jobTitle?: string;
  officeLocation?: string;
}

interface MicrosoftDirectorySearchFieldProps {
  value: string;
  email: string;
  organizationId: number;
  onNameChange: (name: string) => void;
  onUserSelect: (user: MicrosoftUser) => void;
  isRTL: boolean;
  placeholder?: string;
  label?: string;
}

export function MicrosoftDirectorySearchField({
  value,
  email,
  organizationId,
  onNameChange,
  onUserSelect,
  isRTL,
  placeholder = 'Enter full name or email',
  label = 'Full Name',
}: MicrosoftDirectorySearchFieldProps) {
  const { language } = useLanguage();
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchTerm, setSearchTerm] = useState(value);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Search Microsoft 365 directory with debounce
  const searchQuery = trpc.auth.searchMicrosoft365Users.useQuery(
    { searchTerm: searchTerm.trim(), organizationId, limit: 10 },
    {
      enabled: searchTerm.trim().length >= 2,
      staleTime: 5000,
    }
  );

  const users = searchQuery.data?.users || [];
  const isLoading = searchQuery.isLoading;

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);
    onNameChange(newValue);
    setShowDropdown(true);
    setSelectedIndex(-1);
  };

  // Handle user selection from dropdown
  const handleSelectUser = (user: MicrosoftUser) => {
    setSearchTerm(user.displayName);
    onNameChange(user.displayName);
    onUserSelect(user);
    setShowDropdown(false);
    setSelectedIndex(-1);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || users.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => (prev < users.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && users[selectedIndex]) {
          handleSelectUser(users[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowDropdown(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && dropdownRef.current) {
      const items = dropdownRef.current.querySelectorAll('[data-user-item]');
      if (items[selectedIndex]) {
        items[selectedIndex].scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  return (
    <div className="relative">
      <label className={`text-sm font-medium text-gray-700 mb-1 block ${isRTL ? 'text-end' : ''}`}>
        {label}
      </label>
      
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Search className="w-4 h-4" />
          )}
        </div>

        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => searchTerm.trim().length >= 2 && setShowDropdown(true)}
          placeholder={placeholder}
          className={`w-full border border-gray-200 rounded-lg px-3 py-2 pl-9 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            isRTL ? 'text-end pr-9 pl-3' : ''
          }`}
        />

        {searchTerm && (
          <button
            onClick={() => {
              setSearchTerm('');
              onNameChange('');
              setShowDropdown(false);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Dropdown with Microsoft 365 search results */}
      {showDropdown && searchTerm.trim().length >= 2 && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto"
        >
          {isLoading ? (
            <div className="p-4 text-center text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin mx-auto mb-2" />
              <p className="text-sm">Searching Microsoft 365 directory...</p>
            </div>
          ) : users.length > 0 ? (
            <ul className="py-1">
              {users.map((user, index) => (
                <li
                  key={user.id}
                  data-user-item
                  onClick={() => handleSelectUser(user)}
                  className={`px-4 py-2 cursor-pointer transition-colors ${
                    index === selectedIndex
                      ? 'bg-blue-100 text-blue-900'
                      : 'hover:bg-gray-50 text-gray-900'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{user.displayName}</p>
                      <p className="text-xs text-gray-500 truncate">{user.email}</p>
                      {user.jobTitle && (
                        <p className="text-xs text-gray-400 truncate">{user.jobTitle}</p>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-4 text-center text-gray-500">
              <p className="text-sm">No users found matching "{searchTerm}"</p>
            </div>
          )}
        </div>
      )}

      {/* Show hint when typing */}
      {searchTerm.trim().length > 0 && searchTerm.trim().length < 2 && (
        <p className="text-xs text-gray-400 mt-1">
          {language === 'en' ? 'Type at least 2 characters to search' : 'اكتب حرفين على الأقل للبحث'}
        </p>
      )}
    </div>
  );
}
