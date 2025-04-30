import { FC, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';

const LanguageSwitcher: FC = () => {
  const router = useRouter();
  const { i18n } = useTranslation();
  const [switchWidth, setSwitchWidth] = useState(0);
  const switchWidthRef = useRef<HTMLSelectElement>(null);

  const changeLocale = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const locale = e.target.value;
    router.push(router.pathname, router.asPath, { locale });
    
    setTimeout(() => {
      if (switchWidthRef.current) {
        setSwitchWidth(switchWidthRef.current.offsetWidth);
      }
    }, 100);
  };

  const currLocaleName = i18n.languages.find(
    (l) => l === i18n.language
  );

  return (
    <>
      <div className="flex items-center">
        <span className="material-symbols-translate me-1 dark:text-white" />
        <select
          value={i18n.language}
          className="rounded-lg text-black dark:text-white bg-gray-200 dark:bg-gray-900"
          style={{ width: `${switchWidth}px` }}
          onChange={changeLocale}
        >
          {i18n.languages.map((locale, index) => (
            <option key={index} value={locale}>
              {locale}
            </option>
          ))}
        </select>
      </div>

      <div className="absolute top-0 pointer-events-none">
        <select ref={switchWidthRef} style={{ visibility: 'hidden' }}>
          <option>{currLocaleName}</option>
        </select>
      </div>
    </>
  );
};

export default LanguageSwitcher;