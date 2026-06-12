import React, { useState } from 'react';

const DataShare = ({ data, endpoint = 'http://localhost:4001/share' }) => {
  const [loading, setLoading] = useState(false);
  const [link, setLink] = useState('');
  const [error, setError] = useState('');

  const handleShare = async () => {
    setError('');
    setLink('');
    let payload = data;
    if (!payload) {
      setError('No data to share');
      return;
    }
    // If string, try to parse as JSON
    if (typeof payload === 'string') {
      try {
        payload = JSON.parse(payload);
      } catch {
        setError('Invalid JSON');
        return;
      }
    }
    setLoading(true);
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (res.ok) {
        setLink(body.url || body.id && `${endpoint.replace(/\/share$/,'')}/data/${body.id}`);
      } else {
        setError(body.error || 'Share failed');
      }
    } catch (err) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={handleShare} disabled={loading} className="px-3 py-1 bg-emerald-600 text-white rounded text-xs">
        {loading ? 'Sharing...' : 'Share'}
      </button>
      {link ? (
        <div className="flex items-center gap-2">
          <input readOnly value={link} className="p-1 text-xs font-mono border rounded w-80" />
          <button type="button" onClick={() => navigator.clipboard.writeText(link)} className="px-2 py-1 bg-gray-200 rounded text-xs">Copy</button>
        </div>
      ) : null}
      {error ? <div className="text-red-600 text-xs">{error}</div> : null}
    </div>
  );
};

export default DataShare;
