import { FC } from 'react';
import { useTheme } from 'next-themes';

const ThemeSwitcher: FC = () => {
  const { theme, setTheme } = useTheme();

  return (
    <button
      className="text-black dark:text-white"
      onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
    >
      <span className="flex w-fit items-center space-x-2">
        {theme === 'light' ? (
          <span className="material-symbols-light-mode-outline size-5 text-black dark:text-white" />
        ) : (
          <span className="material-symbols-dark-mode-outline size-5 text-black dark:text-white" />
        )}
        <span className="sr-only">{theme} mode</span>
      </span>
    </button>
  );
};

export default ThemeSwitcher;