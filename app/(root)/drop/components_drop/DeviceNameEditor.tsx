import { FC, useState } from 'react';
import { useStore } from '@/services/store';

const DeviceNameEditor: FC = () => {
  const store = useStore();
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState(store.client?.alias || '');

  const handleClick = () => {
    setIsEditing(true);
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (newName.trim() && store._proposingClient) {
      store._proposingClient.alias = newName.trim();
      if (store.client) {
        store.client.alias = newName.trim();
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur();
    }
  };

  if (!store.client) {
    return <p className="text-sm">Connecting...</p>;
  }

  return (
    <div className="relative">
      {isEditing ? (
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="text-sm bg-transparent border-b border-teal-500 focus:outline-none focus:border-teal-700 dark:focus:border-teal-300"
          autoFocus
        />
      ) : (
        <p className="text-sm cursor-pointer hover:text-teal-600 dark:hover:text-teal-400" onClick={handleClick}>
          You are: {store.client.alias}
        </p>
      )}
    </div>
  );
};

export default DeviceNameEditor; 