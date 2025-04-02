import { FC, ReactNode } from 'react';

interface DialogProps {
  visible: boolean;
  children: ReactNode;
}

const Dialog: FC<DialogProps> = ({ visible, children }) => {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div
        className="bg-white w-full max-w-lg mx-4 rounded shadow-md text-black"
        role="dialog"
        aria-modal="true"
      >
        {children}
      </div>
    </div>
  );
};

export default Dialog;