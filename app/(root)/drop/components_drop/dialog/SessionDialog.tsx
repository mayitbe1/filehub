import { FC } from 'react';
import { SessionState, useStore } from '@/services/store';
import { formatBytes } from '@/utils/fileSize';
import Dialog from './Dialog';
import FileProgress from '../FileProgress';
import ProgressBar from '../ProgressBar';

const SessionDialog: FC = () => {
  const store = useStore();

  const totalCurr = formatBytes(store.session.curr);
  const totalTotal = formatBytes(store.session.total);

  return (
    <Dialog visible={store.session.state !== SessionState.idle}>
      <div className="mt-4 mx-4">
        <h1 className="text-xl text-center mb-4">
          {store.session.state === SessionState.sending
            ? 'Sending Files...'
            : 'Receiving Files...'}
        </h1>

        <div className="flex">
          <span className="flex-1 font-bold">Total:</span>
          <span>{totalCurr} / {totalTotal}</span>
        </div>
        <ProgressBar progress={store.session.curr / store.session.total} />

        <p className="mt-4 font-bold">Files:</p>
      </div>

      <div className="pl-4 pt-2 pr-4 max-h-[300px] overflow-y-auto">
        {Object.values(store.session.fileState).map((file) => (
          <FileProgress key={file.id} state={file} className="mb-4" />
        ))}
      </div>
    </Dialog>
  );
};

export default SessionDialog;