import type { Language } from '../i18n';
import { CustomSelect } from './CustomSelect';

interface LanguageSelectorProps {
  label: string;
  currentLanguage: Language;
  options: Array<{ value: Language; label: string }>;
  onChange: (language: Language) => void;
}

export function LanguageSelector({
  label,
  currentLanguage,
  options,
  onChange
}: LanguageSelectorProps) {
  return (
    <label className="language-select">
      <span>{label}</span>
      <CustomSelect<Language>
        value={currentLanguage}
        onChange={onChange}
        options={options}
        ariaLabel={label}
      />
    </label>
  );
}
