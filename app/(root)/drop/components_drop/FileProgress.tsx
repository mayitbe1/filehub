import { FC } from 'react';
import { formatBytes } from '@/utils/fileSize';
import { FileState } from '@/services/store';
import ProgressBar from './ProgressBar';

interface FileProgressProps {
  state: FileState;
  className?: string;
}

const FileProgress: FC<FileProgressProps> = ({ state, className = '' }) => {
  const totalBytesFormatted = formatBytes(state.total);

  return (
    <div className={className}>
      <div className="flex">
        <span className="flex-1 truncate">{state.name}</span>
        <span>{totalBytesFormatted}</span>
      </div>
      <ProgressBar progress={state.curr / state.total} />
    </div>
  );
};

export default FileProgress;