import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Link } from 'react-router-dom';

const ApiTester = () => {
  const urlInputRef = useRef(null);
  const bodyInputRef = useRef(null);
  const sendRef = useRef(() => {});
  const [url, setUrl] = useState('');
  const [method, setMethod] = useState('GET');
  const [requestBody, setRequestBody] = useState('');
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('body');
  const [history, setHistory] = useState([]);
  const [view, setView] = useState('dashboard'); // 'dashboard' or 'graphs'
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('api_hub_theme') || 'light');

  // Advanced Request Tools State
  const [requestTab, setRequestTab] = useState('params');
  const [headers, setHeaders] = useState([{ key: 'Content-Type', value: 'application/json', enabled: true }, { key: '', value: '', enabled: true }]);
  const [params, setParams] = useState([{ key: '', value: '', enabled: true }]);
  const [authToken, setAuthToken] = useState('');
  const [authType, setAuthType] = useState('none');

  // Code Runner State
  const [codeRunnerLanguage, setCodeRunnerLanguage] = useState('javascript');
  const [codeRunnerCode, setCodeRunnerCode] = useState('console.log("Hello, World!");');
  const [codeRunnerOutput, setCodeRunnerOutput] = useState('');
  const [codeRunnerLoading, setCodeRunnerLoading] = useState(false);
  const [codeRunnerError, setCodeRunnerError] = useState('');
  const [codeRunnerExecutionTime, setCodeRunnerExecutionTime] = useState(0);
  const [editorHeight, setEditorHeight] = useState(192); // h-48 = 192px

  // Load history from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem('api_hub_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (err) {
        console.warn('api_hub_history parse error', err);
        localStorage.removeItem('api_hub_history');
      }
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('api_hub_theme', theme);
  }, [theme]);

  useEffect(() => {
    let ctrlAltTriggered = false;

    const onKeyDown = (event) => {
      // Enter sends request. Except when editing body as multiline text.
      if ((event.key === 'Enter' || event.code === 'NumpadEnter') && !event.ctrlKey && !event.altKey) {
        const active = document.activeElement;
        if (active && active.tagName === 'TEXTAREA') return;
        event.preventDefault();
        sendRef.current();
        return;
      }

      // Ctrl + Enter focuses URL input
      if ((event.key === 'Enter' || event.code === 'NumpadEnter') && event.ctrlKey && !event.altKey) {
        event.preventDefault();
        if (urlInputRef.current) {
          urlInputRef.current.focus();
        }
        return;
      }

      // Ctrl shortcuts to switch methods
      if (event.ctrlKey && !event.altKey && !event.shiftKey) {
        const key = event.key.toLowerCase();
        if (key === 'g') {
          event.preventDefault();
          setMethod('GET');
          if (urlInputRef.current) urlInputRef.current.focus();
          return;
        }
        if (key === 'o') {
          event.preventDefault();
          setMethod('POST');
          if (bodyInputRef.current) bodyInputRef.current.focus();
          return;
        }
        if (key === 'u') {
          event.preventDefault();
          setMethod('PUT');
          if (bodyInputRef.current) bodyInputRef.current.focus();
          return;
        }
        if (key === 'd') {
          event.preventDefault();
          setMethod('DELETE');
          return;
        }
        if (key === ' ') {
          event.preventDefault();
          setMethod('GET');
          if (urlInputRef.current) urlInputRef.current.focus();
          return;
        }
      }

      if (event.ctrlKey && event.altKey && event.key.toLowerCase() === 'a') {
        event.preventDefault();
        setMethod('PATCH');
        if (bodyInputRef.current) bodyInputRef.current.focus();
        return;
      }

      // Fallback: preserve previous control flow for enter / action keys
      const isCtrlAltCombo = event.ctrlKey && event.altKey;
      if (!isCtrlAltCombo) {
        ctrlAltTriggered = false;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', () => {
      ctrlAltTriggered = false;
    });

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', () => {
        ctrlAltTriggered = false;
      });
    };
  }, []);

  const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

  const methodColors = {
    GET: 'text-green-600 bg-green-50 border-green-200',
    POST: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    PUT: 'text-blue-600 bg-blue-50 border-blue-200',
    PATCH: 'text-purple-600 bg-purple-50 border-purple-200',
    DELETE: 'text-red-600 bg-red-50 border-red-200',
  };

  const appRootClass = theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-gray-100 text-gray-900';
  const mainContentClass = theme === 'dark' ? 'bg-slate-900' : 'bg-gray-50';
  const headerClass = theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-b';

  const updateHistory = (newEntry) => {
    const updatedHistory = [newEntry, ...history].slice(0, 100); 
    setHistory(updatedHistory);
    localStorage.setItem('api_hub_history', JSON.stringify(updatedHistory));
  };

  // Analytics Logic
  const stats = {
    total: history.length,
    avgTime: history.length ? Math.round(history.reduce((acc, curr) => acc + (curr.time || 0), 0) / history.length) : 0,
    successRate: history.length ? Math.round((history.filter(h => h.status >= 200 && h.status < 300).length / history.length) * 100) : 0,
    statusCodes: history.reduce((acc, curr) => {
      acc[curr.status] = (acc[curr.status] || 0) + 1;
      return acc;
    }, {}),
    recentLatency: history.slice(0, 10).map(h => h.time).reverse()
  };

  const handleSend = async () => {
    setLoading(true);
    setResponse(null);
    setError(null);
    const startTime = performance.now();

    // Validate and construct URL with params
    let urlObj;
    try {
      urlObj = new URL(url, window.location.origin);
    } catch (err) {
      setError('Invalid URL. Please use a full URL or a valid path (e.g. https://api.example.com/posts).');
      setLoading(false);
      return;
    }

    params.forEach(p => {
      if (p.enabled && p.key) urlObj.searchParams.append(p.key, p.value);
    });

    // Construct Headers
    const headerObj = {};
    headers.forEach(h => {
      if (h.enabled && h.key) headerObj[h.key] = h.value;
    });

    if (authType === 'bearer' && authToken) {
      headerObj['Authorization'] = `Bearer ${authToken}`;
    }

    const options = {
      method,
      headers: headerObj,
    };

    if (['POST', 'PUT', 'PATCH'].includes(method) && requestBody) {
      try {
        options.body = JSON.stringify(JSON.parse(requestBody));
      } catch (e) {
        setError('Invalid JSON in Request Body');
        setLoading(false);
        return;
      }
    }

    try {
      const res = await fetch(urlObj.toString(), options);
      const endTime = performance.now();
      
      const contentType = res.headers.get('content-type');
      let data;
      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      } else {
        data = await res.text();
      }

      const resHeaders = {};
      res.headers.forEach((v, k) => resHeaders[k] = v);

      const duration = Math.round(endTime - startTime);

      updateHistory({
        id: Date.now(),
        url: urlObj.toString(),
        method,
        body: requestBody,
        status: res.status,
        time: duration,
        size: (new TextEncoder().encode(typeof data === 'string' ? data : JSON.stringify(data)).length / 1024).toFixed(2)
      });

      setResponse({
        status: res.status,
        statusText: res.statusText,
        data,
        headers: resHeaders,
        time: duration,
        size: (new TextEncoder().encode(typeof data === 'string' ? data : JSON.stringify(data)).length / 1024).toFixed(2)
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    sendRef.current = handleSend;
  }, [handleSend]);


  const loadFromHistory = (item) => {
    setUrl(item.url);
    setMethod(item.method);
    setRequestBody(item.body || '');
    setError(null);
    setShowHistoryModal(false);
    setView('dashboard');
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(typeof text === 'object' ? JSON.stringify(text, null, 2) : text);
    alert('Copied to clipboard!');
  };

  const highlightCode = (code) => {
    if (codeRunnerLanguage === 'javascript') {
      let html = code
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

      // Comments
      html = html.replace(/(\/\/.*?$|\/\*[\s\S]*?\*\/)/gm, '<span class="text-slate-500 italic">$&</span>');

      // Keywords
      const keywords = ['const', 'let', 'var', 'function', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'return', 'class', 'import', 'export', 'async', 'await', 'try', 'catch', 'finally', 'throw', 'new', 'this', 'super', 'extends', 'typeof', 'instanceof', 'default', 'delete', 'in', 'of', 'yield', 'static', 'get', 'set', 'true', 'false', 'null', 'undefined'];
      keywords.forEach(kw => {
        const regex = new RegExp(`\\b${kw}\\b`, 'g');
        html = html.replace(regex, `<span class="text-pink-500 font-bold">${kw}</span>`);
      });

      // Function definitions and calls
      html = html.replace(/\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(?=\()/g, '<span class="text-sky-400 font-semibold">$1</span>');

      // Floats (decimals)
      html = html.replace(/\b(\d+\.\d+(?:[eE][+-]?\d+)?)\b/g, '<span class="text-purple-400">$1</span>');

      // Integers
      html = html.replace(/\b(\d+)\b/g, '<span class="text-purple-400">$1</span>');

      // Strings (single/double quotes - must be after numbers)
      html = html.replace(/(['"`])((?:\\.|(?!\1).)*?)\1/g, '<span class="text-amber-200">$&</span>');

      // Object properties and variables
      html = html.replace(/\.([a-zA-Z_$][a-zA-Z0-9_$]*)/g, '.<span class="text-sky-200">$1</span>');

      // Array access and variable names
      html = html.replace(/\[([a-zA-Z_$][a-zA-Z0-9_$]*)\]/g, '[<span class="text-sky-200">$1</span>]');

      return html;
    } else if (codeRunnerLanguage === 'html') {
      let html = code
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

      // Tags
      html = html.replace(/&lt;(\/?[\w-]+)/g, '<span class="text-rose-500 font-bold">&lt;$1</span>');
      html = html.replace(/&gt;/g, '<span class="text-rose-500 font-bold">&gt;</span>');

      // Attributes
      html = html.replace(/ ([\w-]+)=/g, ' <span class="text-amber-400 italic">$1</span>=');

      // Attribute values
      html = html.replace(/=(&quot;[^&]*?&quot;|&#39;[^&#]*?&#39;)/g, '=<span class="text-emerald-400">$1</span>');

      // Comments
      html = html.replace(/(&lt;!--.*?--&gt;)/g, '<span class="text-slate-500 italic">$1</span>');

      return html;
    } else if (codeRunnerLanguage === 'css') {
      let html = code
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

      // Selectors
      html = html.replace(/^\s*([^{]*?)\s*{/gm, '<span class="text-emerald-400 font-bold">$1</span> {');

      // Properties (before colons)
      html = html.replace(/\b([\w-]+):/g, '<span class="text-sky-300">$1</span>:');

      // Values (colors, strings, numbers)
      html = html.replace(/(#[0-9a-fA-F]{3,6}|rgb\([^)]*\)|rgba\([^)]*\)|hsl\([^)]*\)|hsla\([^)]*\))/g, '<span class="text-amber-300">$1</span>');

      // Strings
      html = html.replace(/(['"`])(.*?)\1/g, '<span class="text-emerald-400">$&</span>');

      // Numbers and units
      html = html.replace(/\b(\d+(?:\.\d+)?)(px|em|rem|%|vh|vw|s|ms)\b/g, '<span class="text-purple-400">$1$2</span>');

      // Comments
      html = html.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="text-slate-500 italic">$1</span>');

      return html;
    }

    return code;
  };

  const executeCode = async () => {
    if (!codeRunnerCode.trim()) {
      setCodeRunnerError('Please enter some code to execute');
      return;
    }

    setCodeRunnerLoading(true);
    setCodeRunnerError('');
    setCodeRunnerOutput('');
    const startTime = performance.now();

    try {
      if (codeRunnerLanguage === 'javascript') {
        // Capture console.log output
        const logs = [];
        const originalLog = console.log;
        console.log = (...args) => {
          logs.push(args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' '));
          originalLog(...args);
        };

        try {
          const result = new Function(codeRunnerCode)();
          if (result !== undefined) {
            logs.push('Result: ' + (typeof result === 'object' ? JSON.stringify(result, null, 2) : result));
          }
          setCodeRunnerOutput(logs.join('\n'));
        } finally {
          console.log = originalLog;
        }
      } else if (codeRunnerLanguage === 'html' || codeRunnerLanguage === 'css') {
        setCodeRunnerOutput(codeRunnerCode);
      } else {
        setCodeRunnerError(`${codeRunnerLanguage} execution not yet supported`);
      }
    } catch (err) {
      setCodeRunnerError(err.message);
    } finally {
      const endTime = performance.now();
      setCodeRunnerExecutionTime(Math.round(endTime - startTime));
      setCodeRunnerLoading(false);
    }
  };

  return (
    <div className={`flex h-screen w-screen font-sans overflow-hidden ${appRootClass}`}>
      {/* Sidebar - Dashboard Navigation */}
      <aside className="w-64 bg-white dark:bg-slate-950 text-gray-700 dark:text-slate-400 flex-shrink-0 flex flex-col border-r border-gray-200 dark:border-slate-800 hidden md:flex">
        <div className="p-4 border-b border-gray-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded flex items-center justify-center bg-gray-100 dark:bg-slate-800">
              <svg className="w-5 h-5 text-gray-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
            <span className="text-sm font-semibold text-gray-900 dark:text-slate-200">API Tester</span>
          </div>
        </div>
        <nav className="p-3 space-y-1 flex-grow">
          <button 
            onClick={() => setView('dashboard')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${view === 'dashboard' ? 'bg-gray-100 dark:bg-slate-800 text-gray-900 dark:text-slate-100' : 'hover:bg-gray-50 dark:hover:bg-slate-800/50 text-gray-700 dark:text-slate-400'}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
            <span>Dashboard</span>
          </button>
          <button 
            onClick={() => setView('graphs')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${view === 'graphs' ? 'bg-gray-100 dark:bg-slate-800 text-gray-900 dark:text-slate-100' : 'hover:bg-gray-50 dark:hover:bg-slate-800/50 text-gray-700 dark:text-slate-400'}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2z" /></svg>
            <span>Analytics</span>
          </button>
          <button 
            onClick={() => setShowHistoryModal(true)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-gray-50 dark:hover:bg-slate-800/50 text-gray-700 dark:text-slate-400 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span>History</span>
          </button>
          <button 
            onClick={() => setView('coderunner')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${view === 'coderunner' ? 'bg-gray-100 dark:bg-slate-800 text-gray-900 dark:text-slate-100' : 'hover:bg-gray-50 dark:hover:bg-slate-800/50 text-gray-700 dark:text-slate-400'}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
            <span>Code Runner</span>
          </button>
        </nav>
      </aside>

      {/* History Modal Popup */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white dark:bg-slate-950 rounded-lg border border-gray-200 dark:border-slate-800 shadow-lg w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-slate-800 flex justify-between items-center">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-slate-100">Request History</h2>
              <button onClick={() => setShowHistoryModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded transition-colors text-gray-600 dark:text-slate-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="overflow-y-auto p-3 space-y-2 flex-grow">
              {history.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-slate-400 text-sm">No requests found</div>
              ) : (
                history.map((item) => (
                  <div key={item.id} className="bg-gray-50 dark:bg-slate-900 p-3 rounded-lg border border-gray-200 dark:border-slate-800 flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-slate-800/50 transition-colors group">
                    <span className={`px-2 py-1 text-xs font-semibold rounded ${methodColors[item.method]}`}>{item.method}</span>
                    <div className="flex-grow min-w-0">
                      <p className="text-xs font-mono text-gray-700 dark:text-slate-300 truncate">{item.url}</p>
                      <div className="flex gap-3 mt-1 text-[10px] text-gray-600 dark:text-slate-400">
                        <span>Status: <span className={item.status >= 200 && item.status < 300 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-rose-400'}>{item.status}</span></span>
                        <span>Time: <span className="text-blue-600 dark:text-blue-400">{item.time}ms</span></span>
                      </div>
                    </div>
                    <button 
                      onClick={() => loadFromHistory(item)}
                      className="px-2 py-1 text-xs font-semibold rounded bg-gray-200 dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-300 dark:hover:bg-slate-700 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      Restore
                    </button>
                  </div>
                ))
              )}
            </div>
            <div className="p-3 border-t border-gray-200 dark:border-slate-800 text-right">
              <button 
                onClick={() => { setHistory([]); localStorage.removeItem('api_hub_history'); }}
                className="text-xs font-semibold text-red-600 dark:text-rose-400 hover:text-red-700 dark:hover:text-rose-500 transition-colors"
              >
                Clear History
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className={`flex-grow flex flex-col min-w-0 overflow-auto ${mainContentClass}`}>
        <header className={`${headerClass} h-16 py-5 flex items-center justify-between px-6 border-b border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900`}>
          <h1 className="text-sm font-semibold text-gray-900 dark:text-slate-100">API Tester</h1>
          <div className="flex items-center gap-3">
            {view === 'dashboard' && (
              <button onClick={() => setView('graphs')} className="text-xs font-semibold text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-300 transition-colors">
                View Analytics
              </button>
            )}
            <button
              onClick={() => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}
              className="px-3 py-1.5 text-xs font-semibold rounded-md border border-gray-300 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
            >
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
          </div>
        </header>

        {view === 'graphs' ? (
          /* PERFORMANCE VIEW (GRAPHS) */
          <div className="p-4 md:p-8 space-y-8 animate-in slide-in-from-bottom-4 duration-300 bg-gray-50 dark:bg-slate-900/30">
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Success Rate Chart */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-800">
                   <h3 className="text-sm font-bold text-gray-600 dark:text-slate-300 uppercase mb-6 tracking-widest">Health & Success Rate</h3>
                   <div className="relative pt-1">
                      <div className="flex mb-2 items-center justify-between">
                        <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-950">Success</span>
                        <span className="text-xs font-semibold inline-block text-green-600 dark:text-green-400">{stats.successRate}%</span>
                      </div>
                      <div className="overflow-hidden h-4 mb-4 text-xs flex rounded-full bg-gray-200 dark:bg-slate-800">
                        <div style={{ width: `${stats.successRate}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-green-500 transition-all duration-1000"></div>
                      </div>
                   </div>
                   <div className="grid grid-cols-2 gap-4 mt-6">
                      <div className="p-4 bg-gray-100 dark:bg-slate-800/50 rounded-xl">
                         <div className="text-2xl font-black text-gray-900 dark:text-slate-100">{stats.total}</div>
                         <div className="text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase">Tests Run</div>
                      </div>
                      <div className="p-4 bg-gray-100 dark:bg-slate-800/50 rounded-xl">
                         <div className="text-2xl font-black text-blue-600 dark:text-blue-400">{stats.avgTime}ms</div>
                         <div className="text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase">Avg Latency</div>
                      </div>
                   </div>
                </div>

                {/* Latency Trend Graph (SVG) */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-800">
                   <h3 className="text-sm font-bold text-gray-600 dark:text-slate-300 uppercase mb-6 tracking-widest">Recent Latency Trend</h3>
                   <div className="h-32 flex items-end gap-2 px-2">
                      {stats.recentLatency.map((val, idx) => {
                        const height = Math.max(12, Math.min(100, (val / (Math.max(stats.avgTime, 1000) || 1000)) * 100));
                        return (
                          <div key={idx} className="flex-1 rounded-t-md relative group" style={{ height: `${height}%`, background: 'linear-gradient(180deg, #22c55e, #0f766e)' }}>
                             <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 dark:bg-slate-800 text-cyan-600 dark:text-cyan-300 text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">{val} ms</div>
                          </div>
                        );
                      })}
                   </div>
                   <div className="border-t border-gray-200 dark:border-slate-700 mt-2 flex justify-between text-[10px] font-bold text-gray-600 dark:text-slate-400 uppercase pt-2">
                      <span>Older</span>
                      <span>Newest Requests</span>
                   </div>
                </div>

                {/* Status Code Distribution */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-800 lg:col-span-2">
                   <h3 className="text-sm font-bold text-gray-600 dark:text-slate-300 uppercase mb-6 tracking-widest">Status Code Breakdown</h3>
                   <div className="space-y-3">
                      {Object.entries(stats.statusCodes).map(([code, count]) => {
                        const ratio = stats.total ? (count / stats.total) * 100 : 0;
                        const base = code.startsWith('2') ? 'from-emerald-500 to-teal-400' : 'from-rose-500 to-orange-500';
                        return (
                          <div key={code} className="grid grid-cols-[auto_1fr_auto] gap-4 items-center">
                             <span className="w-12 text-xs font-bold text-gray-700 dark:text-slate-300">{code}</span>
                             <div className="h-2 rounded-full bg-gray-300 dark:bg-slate-700 overflow-hidden border border-gray-400 dark:border-slate-600">
                                <div className={`h-full bg-gradient-to-r ${base}`} style={{ width: `${Math.max(ratio, 3)}%` }} />
                             </div>
                             <span className="text-xs font-bold text-gray-700 dark:text-slate-300">{count}</span>
                          </div>
                        );
                      })}
                   </div>
                </div>
             </div>
             <div className="text-center">
                <button onClick={() => setView('dashboard')} className="bg-gray-800 dark:bg-slate-800 hover:bg-gray-700 dark:hover:bg-slate-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg transition-all">
                  Back to Request Builder
                </button>
             </div>
          </div>
        ) : view === 'coderunner' ? (
          /* CODE RUNNER VIEW */
          <div className="p-4 md:p-8 space-y-6 animate-in fade-in duration-300 bg-gray-50 dark:bg-slate-900/30">
            <div className="p-6 space-y-6">
              <div className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-800 overflow-hidden">
                <div className="p-4 border-b border-gray-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center gap-3">
                    <label className="text-xs font-semibold text-gray-600 dark:text-slate-400 uppercase">Language:</label>
                    <select 
                      value={codeRunnerLanguage}
                      onChange={(e) => setCodeRunnerLanguage(e.target.value)}
                      className="p-2 pr-3 border rounded-md font-semibold text-xs bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700 text-gray-900 dark:text-slate-200 cursor-pointer"
                    >
                      <option value="javascript">JavaScript</option>
                      <option value="html">HTML</option>
                      <option value="css">CSS</option>
                    </select>
                    <button 
                      onClick={executeCode}
                      disabled={codeRunnerLoading}
                      className="ml-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-md font-semibold text-xs transition-all flex items-center justify-center gap-2"
                    >
                      {codeRunnerLoading ? (
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      ) : (
                        'Run'
                      )}
                    </button>
                  </div>
                </div>

                <div className="p-4 border-b border-gray-200 dark:border-slate-800">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-xs font-semibold text-gray-600 dark:text-slate-400 uppercase">Code Editor</label>
                    <button
                      onClick={() => copyToClipboard(codeRunnerCode)}
                      className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                      title="Copy Code"
                    >
                      Copy
                    </button>
                  </div>
                  <div className="relative group">
                    <textarea 
                      value={codeRunnerCode}
                      onChange={(e) => setCodeRunnerCode(e.target.value)}
                      placeholder="// Write your code here"
                      className="w-full p-3 border rounded-md font-mono text-xs bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700 text-gray-900 dark:text-slate-200 placeholder-gray-500 dark:placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all resize-none"
                      style={{ height: `${editorHeight}px` }}
                    />
                    {/* Resize Handle */}
                    <div
                      onMouseDown={(e) => {
                        const startY = e.clientY;
                        const startHeight = editorHeight;
                        const onMouseMove = (moveEvent) => {
                          const delta = moveEvent.clientY - startY;
                          setEditorHeight(Math.max(120, startHeight + delta));
                        };
                        const onMouseUp = () => {
                          document.removeEventListener('mousemove', onMouseMove);
                          document.removeEventListener('mouseup', onMouseUp);
                        };
                        document.addEventListener('mousemove', onMouseMove);
                        document.addEventListener('mouseup', onMouseUp);
                      }}
                      className="absolute bottom-0 left-0 right-0 h-1 bg-gray-300 dark:bg-slate-600 cursor-ns-resize hover:bg-blue-400 dark:hover:bg-blue-500 transition-colors"
                      title="Drag to resize editor height"
                    />
                  </div>
                  
                  {/* Syntax Highlighted Display */}
                  {/* <div className="mt-3 p-3 border rounded-md font-mono text-xs bg-white dark:bg-slate-950 border-gray-300 dark:border-slate-700 text-gray-900 dark:text-slate-200 overflow-auto max-h-48 rounded-md">
                    <pre className="whitespace-pre-wrap break-words">
                      <code dangerouslySetInnerHTML={{ __html: highlightCode(codeRunnerCode) }} />
                    </pre>
                  </div> */}
                </div>

                {codeRunnerError && (
                  <div className="p-4 border-b border-red-200 dark:border-slate-800 bg-red-50 dark:bg-slate-900">
                    <div className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-red-600 dark:text-rose-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                      <div>
                        <h3 className="text-sm font-semibold text-red-600 dark:text-rose-400">Error</h3>
                        <p className="text-xs text-red-700 dark:text-rose-300 mt-1 font-mono">{codeRunnerError}</p>
                      </div>
                    </div>
                  </div>
                )}

                {codeRunnerOutput && (
                  <div className="p-4 border-b border-gray-200 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <label className="text-xs font-semibold text-gray-600 dark:text-slate-400 uppercase">Output</label>
                        <p className="text-xs text-gray-600 dark:text-slate-400 mt-1">Executed in {codeRunnerExecutionTime}ms</p>
                      </div>
                      <button
                        onClick={() => copyToClipboard(codeRunnerOutput)}
                        className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                        title="Copy Output"
                      >
                        Copy
                      </button>
                    </div>
                    <div className="bg-gray-50 dark:bg-slate-950 p-3 rounded-md border border-gray-200 dark:border-slate-700 min-h-[100px] max-h-[300px] overflow-auto">
                      <pre className="text-xs font-mono whitespace-pre-wrap break-words">
                        {codeRunnerOutput.split('\n').map((line, idx) => {
                          // Highlight different types of output
                          let highlighted = line;
                          const isResult = line.startsWith('Result:');
                          const className = isResult 
                            ? 'text-blue-600 dark:text-blue-400 font-semibold'
                            : 'text-gray-800 dark:text-slate-300';
                          
                          return (
                            <div key={idx} className={className}>
                              {/* Highlight strings and numbers in output */}
                              {highlighted.split(/(['"`].*?['"`]|\b\d+\b)/g).map((part, i) => {
                                if (!part) return null;
                                if (/^(['"`]).*\1$/.test(part)) {
                                  return <span key={i} className="text-emerald-600 dark:text-emerald-400">{part}</span>;
                                }
                                if (/^\d+$/.test(part)) {
                                  return <span key={i} className="text-blue-600 dark:text-blue-400">{part}</span>;
                                }
                                return part;
                              })}
                            </div>
                          );
                        })}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="p-6 text-center">
              <button onClick={() => setView('dashboard')} className="text-xs font-semibold text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-300 transition-colors">
                Back to Dashboard
              </button>
            </div>
          </div>
        ) : (
          /* DASHBOARD VIEW (BUILDER) */
          <div className="p-4 md:p-8 space-y-6 animate-in fade-in duration-300 bg-gray-50 dark:bg-slate-900/30">

        <div className="p-6 space-y-6 flex-grow">
          {/* Statistics Cards */}
          {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-gray-200 dark:border-slate-800 hover:border-gray-300 dark:hover:border-slate-700 transition-colors">
              <div className="text-xs font-semibold text-gray-600 dark:text-slate-400 uppercase mb-3">Total Requests</div>
              <div className="text-3xl font-bold text-gray-900 dark:text-slate-100">{stats.total}</div>
              <p className="text-xs text-gray-600 dark:text-slate-500 mt-2">API calls made</p>
            </div>
            <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-gray-200 dark:border-slate-800 hover:border-gray-300 dark:hover:border-slate-700 transition-colors">
              <div className="text-xs font-semibold text-gray-600 dark:text-slate-400 uppercase mb-3">Avg Latency</div>
              <div className="text-3xl font-bold text-gray-900 dark:text-slate-100">{stats.avgTime}<span className="text-sm font-normal text-gray-600 dark:text-slate-500 ml-1">ms</span></div>
              <p className="text-xs text-gray-600 dark:text-slate-500 mt-2">Response time</p>
            </div>
            <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-gray-200 dark:border-slate-800 hover:border-gray-300 dark:hover:border-slate-700 transition-colors">
              <div className="text-xs font-semibold text-gray-600 dark:text-slate-400 uppercase mb-3">Success Rate</div>
              <div className="text-3xl font-bold text-gray-900 dark:text-slate-100">{stats.successRate}<span className="text-sm font-normal text-gray-600 dark:text-slate-500 ml-1">%</span></div>
              <p className="text-xs text-gray-600 dark:text-slate-500 mt-2">2xx responses</p>
            </div>
          </div> */}

          {/* Request Card */}
          <div className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-800 overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-slate-800 space-y-4">
              <div className="flex flex-wrap gap-3 items-end">
                <div className="relative w-full sm:w-auto">
                  <select 
                    value={method}
                    onChange={(e) => setMethod(e.target.value)}
                    className={`p-2 pr-10 border rounded-md font-semibold text-xs bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700 text-gray-900 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all cursor-pointer`}
                  >
                    {methods.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
                  </div>
                </div>

                <input 
                  ref={urlInputRef}
                  type="text" 
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://api.example.com/v1/endpoint"
                  className="flex-grow p-2 border rounded-md font-mono text-xs bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700 text-gray-900 dark:text-slate-200 placeholder-gray-500 dark:placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                />

                <button 
                  onClick={handleSend}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-md font-semibold text-xs transition-all flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  ) : (
                    'Send'
                  )}
                </button>
              </div>
            </div>

            {['POST', 'PUT', 'PATCH'].includes(method) && (
              <div className="p-4 border-t border-gray-200 dark:border-slate-800">
                <label className="text-xs font-semibold text-gray-600 dark:text-slate-400 uppercase block mb-3">Request Body</label>
                <textarea 
                  ref={bodyInputRef}
                  value={requestBody}
                  onChange={(e) => setRequestBody(e.target.value)}
                  placeholder='{"key": "value"}'
                  className="w-full h-28 p-3 border rounded-md font-mono text-xs bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700 text-gray-900 dark:text-slate-200 placeholder-gray-500 dark:placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all resize-none"
                />
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 dark:bg-slate-900 border border-red-200 dark:border-slate-800 text-red-600 dark:text-rose-400 p-4 rounded-lg flex items-center gap-3">
              <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
              <span className="font-medium text-sm">{error}</span>
            </div>
          )}

          {/* Response Section */}
          {response ? (
            <div className="bg-white dark:bg-gradient-to-br dark:from-slate-800 dark:via-slate-900 dark:to-slate-800 rounded-xl shadow-2xl border border-gray-200 dark:border-slate-700 overflow-hidden flex flex-col">
              <div className="px-4 md:px-6 py-4 bg-gray-50 dark:bg-slate-900/90 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center">
                <div className="flex flex-wrap items-center gap-4 md:gap-6">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-gray-600 dark:text-slate-400 uppercase">Status</span>
                    <span className={`text-sm font-extrabold ${response.status >= 200 && response.status < 300 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-rose-400'}`}>
                      {response.status} {response.statusText}
                    </span>
                  </div>
                  <div className="flex flex-col border-l border-gray-300 dark:border-slate-700 pl-4 md:pl-6">
                    <span className="text-[10px] font-bold text-gray-600 dark:text-slate-400 uppercase">Time</span>
                    <span className="text-sm font-bold text-gray-700 dark:text-slate-300">{response.time} ms</span>
                  </div>
                  <div className="flex flex-col border-l border-gray-300 dark:border-slate-700 pl-4 md:pl-6">
                    <span className="text-[10px] font-bold text-gray-600 dark:text-slate-400 uppercase">Size</span>
                    <span className="text-sm font-bold text-gray-700 dark:text-slate-300">{response.size} KB</span>
                  </div>
                </div>
                <button 
                  onClick={() => copyToClipboard(activeTab === 'body' ? response.data : response.headers)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-gray-500 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-300"
                  title="Copy to Clipboard"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                </button>
              </div>

              <div className="flex border-b border-gray-200 dark:border-slate-700">
                {['body', 'headers'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-8 py-3 text-sm font-medium transition-all capitalize ${
                      activeTab === tab ? 'border-b-2 border-blue-600 dark:border-slate-400 text-blue-600 dark:text-slate-200 bg-blue-50 dark:bg-slate-800/50' : 'border-b-2 border-transparent text-gray-600 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-900/30'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              
              <div className="bg-gray-50 dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-900 dark:to-slate-800 p-6 min-h-[300px] max-h-[600px] overflow-auto shadow-inner border-t border-gray-200 dark:border-slate-700">
                <pre className="text-sm font-mono">
                  {activeTab === 'body' ? (
                    <code 
                      className="whitespace-pre-wrap block"
                      dangerouslySetInnerHTML={{ 
                        __html: highlightCode(typeof response.data === 'string' ? response.data : JSON.stringify(response.data, null, 2)) 
                      }} 
                    />
                  ) : (
                    <div className="grid grid-cols-[auto_1fr] gap-x-8 gap-y-2">
                      {Object.entries(response.headers).map(([key, value]) => (
                        <React.Fragment key={key}>
                          <span className="text-blue-600 dark:text-teal-300 font-semibold uppercase text-[11px]">{key}</span>
                          <span className="text-gray-700 dark:text-slate-200 text-xs break-all">{value}</span>
                        </React.Fragment>
                      ))}
                    </div>
                  )}
                </pre>
              </div>
            </div>
          ) : (
            !loading && (
              <div className="flex flex-col items-center justify-center py-20 bg-gray-50 dark:bg-slate-900/50 border border-dashed border-gray-300 dark:border-slate-700 rounded-lg">
                <div className="w-16 h-16 bg-gray-100 dark:bg-slate-800/60 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-gray-400 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" /></svg>
                </div>
                <h3 className="text-gray-600 dark:text-slate-300 font-medium">Ready for your first request</h3>
                <p className="text-gray-500 dark:text-slate-500 text-sm">Configure the endpoint above and click Send</p>
              </div>
            )
          )}      
        </div>    
        </div>    
      )}          
      </main>
    </div>
  );
};

export default ApiTester