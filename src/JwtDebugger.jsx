import React, { useState, useEffect } from 'react';

const JwtDebugger = () => {
  const [token, setToken] = useState('');
  const [decoded, setDecoded] = useState({ header: null, payload: null, signature: null, error: null });

  useEffect(() => {
    if (!token.trim()) {
      setDecoded({ header: null, payload: null, signature: null, error: null });
      return;
    }

    try {
      const parts = token.split('.');
      if (parts.length !== 3) throw new Error('Invalid JWT format: Token must have 3 parts separated by dots');

      const decodePart = (str) => JSON.parse(atob(str.replace(/-/g, '+').replace(/_/g, '/')));
      
      setDecoded({
        header: decodePart(parts[0]),
        payload: decodePart(parts[1]),
        signature: parts[2],
        error: null
      });
    } catch (err) {
      setDecoded({ header: null, payload: null, signature: null, error: err.message });
    }
  }, [token]);

  const isExpired = (payload) => {
    if (!payload?.exp) return false;
    return Date.now() >= payload.exp * 1000;
  };

  const PartBox = ({ label, data, colorClass, error }) => (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-800 overflow-hidden shadow-sm group">
      <div className={`p-2 px-4 border-b border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 flex justify-between items-center ${colorClass}`}>
        <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
        {label === 'Payload' && data && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isExpired(data) ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                {isExpired(data) ? 'EXPIRED' : 'ACTIVE'}
            </span>
        )}
      </div>
      <div className="flex-grow p-4 overflow-auto">
        {error ? (
          <p className="text-xs text-red-500 font-mono italic">{error}</p>
        ) : data ? (
          <pre className="text-xs font-mono dark:text-slate-300">{JSON.stringify(data, null, 2)}</pre>
        ) : (
          <p className="text-xs text-gray-400 italic">No token provided</p>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 h-full flex flex-col">
      {/* Input Section */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-gray-200 dark:border-slate-800 shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
          </div>
          <h2 className="font-bold text-gray-900 dark:text-slate-100 uppercase tracking-widest text-sm">JWT Debugger</h2>
        </div>
        
        <textarea 
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Paste your JWT here (header.payload.signature)..."
          className="w-full h-24 p-4 font-mono text-xs border rounded-lg dark:bg-slate-950 border-gray-300 dark:border-slate-800 focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all resize-none shadow-inner"
        />
      </div>

      {/* Decoded Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-grow overflow-hidden">
        <PartBox 
          label="Header" 
          data={decoded.header} 
          colorClass="text-red-600 dark:text-red-400" 
          error={decoded.error}
        />
        <PartBox 
          label="Payload" 
          data={decoded.payload} 
          colorClass="text-purple-600 dark:text-purple-400" 
          error={decoded.error}
        />
      </div>

      {/* Details Bar */}
      {decoded.payload && !decoded.error && (
        <div className="bg-gray-100 dark:bg-slate-950 p-4 rounded-lg border border-gray-200 dark:border-slate-800 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Algorithm</p>
            <p className="text-xs font-bold text-gray-700 dark:text-slate-300">{decoded.header?.alg || 'Unknown'}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Issued At</p>
            <p className="text-xs font-bold text-gray-700 dark:text-slate-300">{decoded.payload?.iat ? new Date(decoded.payload.iat * 1000).toLocaleString() : 'N/A'}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Expires</p>
            <p className={`text-xs font-bold ${isExpired(decoded.payload) ? 'text-red-500' : 'text-gray-700 dark:text-slate-300'}`}>
                {decoded.payload?.exp ? new Date(decoded.payload.exp * 1000).toLocaleString() : 'Never'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default JwtDebugger;