import { FC } from 'react';
import { ClientInfo } from '@/services/signaling';

interface PeerCardProps {
  peer: ClientInfo;
  onClick: () => void;
}

const PeerCard: FC<PeerCardProps> = ({ peer, onClick }) => {
  const getIconName = () => {
    switch (peer.deviceType) {
      case 'mobile':
        return 'material-symbols:smartphone';
      case 'desktop':
        return 'material-symbols:computer';
      case 'web':
        return 'material-symbols:language';
      case 'headless':
        return 'material-symbols:terminal';
      case 'server':
        return 'material-symbols:dns';
      default:
        return 'material-symbols:help';
    }
  };

  return (
    <div
      className="flex py-2 text-white drop-shadow-lg rounded-lg bg-teal-700 hover:bg-teal-600 cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-center justify-center px-2">
        <span className={`size-10 ${getIconName()}`} />
      </div>
      <div className="flex-1">
        <p className="text-xl">{peer.alias}</p>
        <p className="text-xs mt-1 mb-1">
          <span className="bg-teal-900 px-1 py-0.5 rounded">
            {peer.deviceModel ?? 'Unknown'}
          </span>
          <span className="ml-2 bg-teal-900 px-1 py-0.5 rounded">WebRTC</span>
        </p>
      </div>
    </div>
  );
};

export default PeerCard;