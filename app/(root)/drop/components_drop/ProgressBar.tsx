import { FC } from 'react';

interface ProgressBarProps {
  progress: number;
}

const ProgressBar: FC<ProgressBarProps> = ({ progress }) => {
  return (
    <div className="w-full h-2 bg-gray-200 rounded-lg mt-1">
      <div
        className="h-full bg-teal-500 rounded-lg"
        style={{ width: `${progress * 100}%` }}
      />
    </div>
  );
};

export default ProgressBar;