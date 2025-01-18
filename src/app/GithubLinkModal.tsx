import React, { useState } from 'react';

const GithubLinkModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (url: string) => void;
}> = ({ isOpen, onClose, onSubmit }) => {
  const [url, setUrl] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      onSubmit(url);
      onClose();
      setUrl('');
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#fff',
          padding: '20px',
          borderRadius: '8px',
          maxWidth: '400px',
          width: '80%',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ marginBottom: '16px' }}>Add GitHub Repository Link</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Enter GitHub repository link"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            style={{
              width: '100%',
              padding: '8px',
              fontSize: '16px',
              marginBottom: '16px',
              borderRadius: '4px',
              border: '1px solid #ccc',
            }}
          />
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                backgroundColor: '#fff',
                border: '1px solid #ccc',
                padding: '8px 16px',
                marginRight: '8px',
                borderRadius: '4px',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                backgroundColor: '#007bff',
                color: '#fff',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GithubLinkModal;