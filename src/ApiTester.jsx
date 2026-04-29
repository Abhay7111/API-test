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
  const [view, setView] = useState('dashboard'); // 'dashboard', 'graphs', 'coderunner', 'usertesting', 'audit', 'utils'
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
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

  // User Testing State
  const [userCount, setUserCount] = useState(5);
  const [userResults, setUserResults] = useState([]);
  const [userTestingLoading, setUserTestingLoading] = useState(false);

  // Audit State
  const [auditResult, setAuditResult] = useState(null);
  const [auditLoading, setAuditLoading] = useState(false);

  // Bulk Request State
  const [bulkCount, setBulkCount] = useState(10);
  const [bulkDuration, setBulkDuration] = useState(1);
  const [bulkConcurrency, setBulkConcurrency] = useState(1);
  const [bulkDurationUnit, setBulkDurationUnit] = useState('seconds');
  const [isBulkRunning, setIsBulkRunning] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({
    completed: 0,
    total: 0,
    successes: 0,
    failures: 0,
    elapsed: 0,
    lastStatus: null,
    lastError: null,
    lastIndex: 0,
    countdown: 0,
  });
  const [bulkSummary, setBulkSummary] = useState(null);
  const [showCookieModal, setShowCookieModal] = useState(() => !localStorage.getItem('api_hub_cookies_accepted'));
  const [bulkHistory, setBulkHistory] = useState([]);

  // Utils State
  const [utilInput, setUtilInput] = useState('');
  const [utilOutput, setUtilOutput] = useState('');
  const [utilType, setUtilType] = useState('json-format');

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

    const savedBulk = localStorage.getItem('api_hub_bulk_history');
    if (savedBulk) {
      try {
        setBulkHistory(JSON.parse(savedBulk));
      } catch (err) {
        console.warn('api_hub_bulk_history parse error', err);
        localStorage.removeItem('api_hub_bulk_history');
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
  const bulkStats = bulkHistory.reduce((acc, curr) => {
    acc.totalRequests += curr.total;
    acc.totalSuccesses += curr.successes;
    acc.totalFailures += curr.failures;
    acc.totalTime += curr.totalTime;
    return acc;
  }, { totalRequests: 0, totalSuccesses: 0, totalFailures: 0, totalTime: 0 });

  const stats = {
    total: history.length + bulkStats.totalRequests,
    avgTime: (history.length + bulkStats.totalRequests) ? Math.round((history.reduce((acc, curr) => acc + (curr.time || 0), 0) + bulkStats.totalTime) / (history.length + bulkStats.totalRequests)) : 0,
    successRate: (history.length + bulkStats.totalRequests) ? Math.round(((history.filter(h => h.status >= 200 && h.status < 300).length + bulkStats.totalSuccesses) / (history.length + bulkStats.totalRequests)) * 100) : 0,
    statusCodes: history.reduce((acc, curr) => {
      acc[curr.status] = (acc[curr.status] || 0) + 1;
      return acc;
    }, {}),
    recentLatency: history.slice(0, 10).map(h => h.time).reverse(),
    bulkRuns: bulkHistory.length,
    bulkTotalRequests: bulkStats.totalRequests,
    bulkSuccessRate: bulkStats.totalRequests ? Math.round((bulkStats.totalSuccesses / bulkStats.totalRequests) * 100) : 0,
  };

  const sendRequestOnce = async (signal) => {
    const startTime = performance.now();

    // Validate and construct URL with params
    let urlObj;
    try {
      urlObj = new URL(url, window.location.origin);
    } catch (err) {
      return { result: null, error: 'Invalid URL. Please use a full URL or a valid path (e.g. https://api.example.com/posts).' };
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
      signal,
    };

    if (['POST', 'PUT', 'PATCH'].includes(method) && requestBody) {
      try {
        options.body = JSON.stringify(JSON.parse(requestBody));
      } catch (e) {
        return { result: null, error: 'Invalid JSON in Request Body' };
      }
    }

    try {
      const res = await fetch(urlObj.toString(), options);
      const endTime = performance.now();
      const contentType = res.headers.get('content-type');
      let data;
      let isHtml = false;

      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      } else {
        data = await res.text();
        isHtml = contentType?.includes('text/html');
      }

      const resHeaders = {};
      res.headers.forEach((v, k) => resHeaders[k] = v);

      const duration = Math.round(endTime - startTime);
      const size = (new TextEncoder().encode(typeof data === 'string' ? data : JSON.stringify(data)).length / 1024).toFixed(2);

      const result = {
        url: urlObj.toString(),
        method,
        body: requestBody,
        status: res.status,
        statusText: res.statusText,
        data,
        headers: resHeaders,
        time: duration,
        size,
        success: res.ok,
        isHtml,
      };

      return { result, error: null };
    } catch (err) {
      if (err.name === 'AbortError') {
        return { result: null, error: 'Request aborted' };
      }
      return { result: null, error: err.message || 'Request failed' };
    }
  };

  const handleSend = async () => {
    setLoading(true);
    setResponse(null);
    setError(null);

    const { result, error } = await sendRequestOnce();

    if (error) {
      setError(error);
      setLoading(false);
      return;
    }

    updateHistory({
      id: Date.now(),
      url: result.url,
      method: result.method,
      body: result.body,
      status: result.status,
      time: result.time,
      size: result.size,
    });

    setResponse(result);
    if (result.isHtml) {
      setActiveTab('preview');
    } else {
      setActiveTab('body');
    }
    setLoading(false);
  };

  const handleBulkSend = async () => {
    if (!url) {
      setError('Please provide a URL first');
      return;
    }

    setError(null);
    setBulkSummary(null);
    setIsBulkRunning(true);

    const windowMs = bulkDuration * (bulkDurationUnit === 'minutes' ? 60_000 : 1_000);
    const startTime = performance.now();
    const deadline = startTime + windowMs;
    setBulkProgress({ completed: 0, total: bulkCount, successes: 0, failures: 0, elapsed: 0, lastStatus: null, lastError: null, lastIndex: 0, countdown: Math.round(windowMs / 1000) });

    const intervalMs = bulkCount > 1 ? Math.max(0, Math.round(windowMs / (bulkCount - 1))) : 0;

    let successes = 0;
    let failures = 0;
    let firstFailureIndex = null;
    let firstFailureStatus = null;
    let firstFailureError = null;
    let lastResult = null;
    let lastErrorMsg = null;
    let canceled = false;
    const latencies = [];
    let requestIndex = 0;

    const worker = async () => {
      while (requestIndex < bulkCount && !canceled) {
        const i = requestIndex++;
        const batchIndex = i + 1;
        
        const now = performance.now();
        if (now >= deadline) {
          canceled = true;
          break;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), Math.max(0, deadline - performance.now()));
        
        const { result, error } = await sendRequestOnce(controller.signal);
        clearTimeout(timeoutId);

        if (error === 'Request aborted' || performance.now() >= deadline) {
          canceled = true;
          break;
        }

        if (result) {
          lastResult = result;
          latencies.push(result.time);
          if (result.success) {
            successes += 1;
          } else {
            failures += 1;
            if (firstFailureIndex === null) {
              firstFailureIndex = batchIndex;
              firstFailureStatus = result.status;
            }
          }
        } else {
          lastErrorMsg = error;
          failures += 1;
          if (firstFailureIndex === null) {
            firstFailureIndex = batchIndex;
            firstFailureError = error;
          }
        }

        // Throttled UI update
        if (batchIndex % Math.max(1, Math.floor(bulkCount / 20)) === 0 || batchIndex === bulkCount) {
          setBulkProgress((prev) => ({
            ...prev,
            completed: batchIndex,
            successes,
            failures,
            elapsed: Math.round(performance.now() - startTime),
            lastStatus: result ? result.status : prev.lastStatus,
            lastError: error || prev.lastError,
            lastIndex: batchIndex,
            countdown: Math.max(0, Math.round((deadline - performance.now()) / 1000)),
          }));
        }

        // Handle request interval spacing (only if serial/low concurrency)
        if (bulkConcurrency === 1 && i < bulkCount - 1 && intervalMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, intervalMs));
        }
      }
    };

    // Start workers
    const workers = Array.from({ length: Math.min(bulkConcurrency, bulkCount) }, () => worker());
    await Promise.all(workers);

    // Final state sync
    if (lastResult) setResponse(lastResult);
    if (lastErrorMsg) setError(lastErrorMsg);
    
    // Add a single history entry for the whole bulk run instead of flooding
    if (lastResult) {
      updateHistory({
        id: Date.now(),
        url: `[Bulk ${bulkCount}x] ${url}`,
        method,
        status: successes > 0 ? 200 : (firstFailureStatus || 500),
        time: Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) || 0,
        size: lastResult.size,
      });
    }

    const totalTime = Math.round(performance.now() - startTime);
    const summary = {
      id: Date.now(),
      url,
      method,
      total: bulkCount,
      successes,
      failures,
      totalTime,
      averageTime: bulkCount ? Math.round(totalTime / bulkCount) : 0,
      minTime: latencies.length ? Math.min(...latencies) : 0,
      maxTime: latencies.length ? Math.max(...latencies) : 0,
      throughput: totalTime > 0 ? ((successes + failures) / (totalTime / 1000)).toFixed(2) : 0,
      firstFailureIndex,
      firstFailureStatus,
      firstFailureError,
      canceled,
      timestamp: new Date().toISOString(),
    };
    setBulkSummary(summary);

    // Save to bulk history
    const updatedBulkHistory = [summary, ...bulkHistory].slice(0, 50); // Keep last 50
    setBulkHistory(updatedBulkHistory);
    localStorage.setItem('api_hub_bulk_history', JSON.stringify(updatedBulkHistory));

    setIsBulkRunning(false);
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
    // Return plain text without colors
    return code.replace(/&/g, '&amp;')
               .replace(/</g, '&lt;')
               .replace(/>/g, '&gt;')
               .replace(/"/g, '&quot;')
               .replace(/'/g, '&#39;');
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

  const runUserTest = async () => {
    if (!url) return alert("Please enter a URL first");
    setUserTestingLoading(true);
    setUserResults([]);
    
    const promises = Array.from({ length: userCount }).map(async (_, i) => {
      const { result, error } = await sendRequestOnce();
      return { id: i + 1, status: result?.status || 'Error', time: result?.time || 0, success: result?.success || false };
    });

    const results = await Promise.all(promises);
    setUserResults(results);
    setUserTestingLoading(false);
  };

  const runAudit = async () => {
    if (!url) return alert("Please enter a URL first");
    setAuditLoading(true);
    const { result } = await sendRequestOnce();
    
    if (result) {
      const secHeaders = [
        'content-security-policy',
        'strict-transport-security',
        'x-frame-options',
        'x-content-type-options',
        'referrer-policy'
      ];
      const found = Object.keys(result.headers).filter(h => secHeaders.includes(h.toLowerCase()));
      setAuditResult({
        https: url.toLowerCase().startsWith('https'),
        securityHeaders: found,
        totalSecHeaders: secHeaders.length,
        latency: result.time,
        status: result.status
      });
    }
    setAuditLoading(false);
  };

  const handleUtilAction = () => {
    try {
      if (utilType === 'json-format') {
        setUtilOutput(JSON.stringify(JSON.parse(utilInput), null, 2));
      } else if (utilType === 'base64-encode') {
        setUtilOutput(btoa(utilInput));
      } else if (utilType === 'base64-decode') {
        setUtilOutput(atob(utilInput));
      }
    } catch (err) {
      setUtilOutput('Error: ' + err.message);
    }
  };

  const NavItem = ({ id, label, icon }) => (
    <button 
      onClick={() => {
        setView(id);
        setIsSidebarOpen(false);
      }}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${view === id ? 'bg-gray-100 dark:bg-slate-800 text-gray-900 dark:text-slate-100' : 'hover:bg-gray-50 dark:hover:bg-slate-800/50 text-gray-700 dark:text-slate-400'}`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );

  return (
    <div className={`flex h-screen w-screen font-sans overflow-hidden ${appRootClass}`}>
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Dashboard Navigation */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-950 text-gray-700 dark:text-slate-400 flex-shrink-0 flex flex-col border-r border-gray-200 dark:border-slate-800
        transform transition-transform duration-300 md:relative md:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-4 border-b border-gray-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded flex items-center justify-center bg-gray-100 dark:bg-slate-800">
                <svg className="w-5 h-5 text-gray-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
              <span className="text-sm font-semibold text-gray-900 dark:text-slate-200">API Tester</span>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-1">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>
        <nav className="p-3 space-y-1 flex-grow">
          <NavItem id="dashboard" label="Dashboard" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>} />
          <NavItem id="graphs" label="Analytics" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2z" /></svg>} />
          <NavItem id="coderunner" label="Code Runner" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>} />
          <NavItem id="usertesting" label="User Testing" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>} />
          <NavItem id="audit" label="Security Audit" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>} />
          <NavItem id="utils" label="Utilities" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" /></svg>} />

          <button 
            onClick={() => setShowHistoryModal(true)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-gray-50 dark:hover:bg-slate-800/50 text-gray-700 dark:text-slate-400 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span>History</span>
          </button>
        </nav>
      </aside>

      {/* Cookie Consent Modal */}
      {showCookieModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-white dark:bg-slate-950 rounded-lg border border-gray-200 dark:border-slate-800 shadow-xl w-full max-w-md mx-auto">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Cookie Consent</h2>
              </div>
              <p className="text-sm text-gray-600 dark:text-slate-400 mb-6">
                This app uses local storage to save your request history, bulk data, and theme preferences. Do you consent to storing this data?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    localStorage.setItem('api_hub_cookies_accepted', 'true');
                    setShowCookieModal(false);
                  }}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-semibold text-sm transition-colors"
                >
                  Accept
                </button>
                <button
                  onClick={() => {
                    localStorage.clear();
                    setShowCookieModal(false);
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-300 rounded-md font-semibold text-sm transition-colors"
                >
                  Decline
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* History Modal Popup */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white dark:bg-slate-950 rounded-lg border border-gray-200 dark:border-slate-800 shadow-lg w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-slate-800 flex justify-between items-center">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-slate-100">History</h2>
              <button onClick={() => setShowHistoryModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded transition-colors text-gray-600 dark:text-slate-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="flex border-b border-gray-200 dark:border-slate-700">
              {['requests', 'bulk'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-3 text-sm font-medium transition-all capitalize ${
                    activeTab === tab ? 'border-b-2 border-blue-600 dark:border-slate-400 text-blue-600 dark:text-slate-200 bg-blue-50 dark:bg-slate-800/50' : 'border-b-2 border-transparent text-gray-600 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-900/30'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
            <div className="overflow-y-auto p-3 space-y-2 flex-grow">
              {activeTab === 'requests' ? (
                history.length === 0 ? (
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
                )
              ) : (
                bulkHistory.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 dark:text-slate-400 text-sm">No bulk runs found</div>
                ) : (
                  bulkHistory.map((item) => (
                    <div key={item.id} className="bg-gray-50 dark:bg-slate-900 p-3 rounded-lg border border-gray-200 dark:border-slate-800 hover:bg-gray-100 dark:hover:bg-slate-800/50 transition-colors">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="px-2 py-1 text-xs font-semibold rounded bg-cyan-100 dark:bg-cyan-900 text-cyan-700 dark:text-cyan-300">BULK</span>
                        <span className="text-xs font-mono text-gray-700 dark:text-slate-300 truncate">{item.url}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-[10px] text-gray-600 dark:text-slate-400">
                        <div>Total: <span className="font-semibold">{item.total}</span></div>
                        <div>Success: <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{item.successes}</span></div>
                        <div>Failures: <span className="text-red-600 dark:text-rose-400 font-semibold">{item.failures}</span></div>
                        <div>Time: <span className="text-blue-600 dark:text-blue-400 font-semibold">{item.totalTime}ms</span></div>
                      </div>
                      <div className="mt-2 text-[10px] text-gray-500 dark:text-slate-500">
                        {new Date(item.timestamp).toLocaleString()}
                      </div>
                    </div>
                  ))
                )
              )}
            </div>
            <div className="p-3 border-t border-gray-200 dark:border-slate-800 text-right">
              <button
                onClick={() => {
                  if (activeTab === 'requests') {
                    setHistory([]);
                    localStorage.removeItem('api_hub_history');
                  } else {
                    setBulkHistory([]);
                    localStorage.removeItem('api_hub_bulk_history');
                  }
                }}
                className="text-xs font-semibold text-red-600 dark:text-rose-400 hover:text-red-700 dark:hover:text-rose-500 transition-colors"
              >
                Clear {activeTab === 'requests' ? 'Request' : 'Bulk'} History
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className={`flex-grow flex flex-col min-w-0 overflow-auto ${mainContentClass}`}>
        <header className={`${headerClass} h-16 py-5 flex items-center justify-between px-6 border-b border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900`}>
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 text-gray-600 dark:text-slate-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
          <h1 className="text-sm font-semibold text-gray-900 dark:text-slate-100">API Tester</h1>
          </div>
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

                {/* Bulk Statistics Chart */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-800">
                   <h3 className="text-sm font-bold text-gray-600 dark:text-slate-300 uppercase mb-6 tracking-widest">Bulk Run Statistics</h3>
                   <div className="relative pt-1">
                      <div className="flex mb-2 items-center justify-between">
                        <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-cyan-600 dark:text-cyan-400 bg-cyan-100 dark:bg-cyan-950">Bulk Success</span>
                        <span className="text-xs font-semibold inline-block text-cyan-600 dark:text-cyan-400">{stats.bulkSuccessRate}%</span>
                      </div>
                      <div className="overflow-hidden h-4 mb-4 text-xs flex rounded-full bg-gray-200 dark:bg-slate-800">
                        <div style={{ width: `${stats.bulkSuccessRate}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-cyan-500 transition-all duration-1000"></div>
                      </div>
                   </div>
                   <div className="grid grid-cols-2 gap-4 mt-6">
                      <div className="p-4 bg-gray-100 dark:bg-slate-800/50 rounded-xl">
                         <div className="text-2xl font-black text-gray-900 dark:text-slate-100">{stats.bulkRuns}</div>
                         <div className="text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase">Bulk Runs</div>
                      </div>
                      <div className="p-4 bg-gray-100 dark:bg-slate-800/50 rounded-xl">
                         <div className="text-2xl font-black text-cyan-600 dark:text-cyan-400">{stats.bulkTotalRequests}</div>
                         <div className="text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase">Bulk Requests</div>
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
        ) : view === 'usertesting' ? (
          <div className="p-4 md:p-8 space-y-6 animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm">
              <h2 className="text-lg font-bold mb-4">Virtual User Simulator</h2>
              <div className="flex items-end gap-4 mb-8">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-gray-500 uppercase">Number of Users</label>
                  <input 
                    type="number" 
                    value={userCount} 
                    onChange={(e) => setUserCount(e.target.value)}
                    className="p-2 border rounded-md dark:bg-slate-800 dark:border-slate-700 w-32"
                  />
                </div>
                <button 
                  onClick={runUserTest}
                  disabled={userTestingLoading}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-md font-bold hover:bg-indigo-700 disabled:bg-indigo-400 transition-colors"
                >
                  {userTestingLoading ? 'Simulating...' : 'Run User Test'}
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {userResults.map(user => (
                  <div key={user.id} className="p-4 rounded-lg border border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 flex flex-col items-center gap-2">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${user.success ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
                    </div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase">User {user.id}</span>
                    <span className={`text-xs font-bold ${user.success ? 'text-emerald-500' : 'text-red-500'}`}>{user.status}</span>
                    <span className="text-[10px] text-gray-500">{user.time}ms</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : view === 'audit' ? (
          <div className="p-4 md:p-8 space-y-6 animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm">
              <h2 className="text-lg font-bold mb-4">Security & Health Audit</h2>
              <p className="text-sm text-gray-500 mb-6">Analyze the security posture and performance of your endpoint.</p>
              <button 
                onClick={runAudit}
                disabled={auditLoading}
                className="px-6 py-2 bg-emerald-600 text-white rounded-md font-bold hover:bg-emerald-700 disabled:bg-emerald-400 transition-colors mb-8"
              >
                {auditLoading ? 'Auditing...' : 'Start Audit'}
              </button>

              {auditResult && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="p-4 rounded-xl border border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-950">
                      <p className="text-[10px] font-bold text-gray-500 uppercase mb-2">HTTPS Compliance</p>
                      <div className={`text-lg font-bold ${auditResult.https ? 'text-emerald-500' : 'text-red-500'}`}>
                        {auditResult.https ? 'Secure (HTTPS)' : 'Insecure (HTTP)'}
                      </div>
                    </div>
                    <div className="p-4 rounded-xl border border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-950">
                      <p className="text-[10px] font-bold text-gray-500 uppercase mb-2">Security Headers</p>
                      <div className="text-lg font-bold text-blue-500">
                        {auditResult.securityHeaders.length} / {auditResult.totalSecHeaders}
                      </div>
                    </div>
                    <div className="p-4 rounded-xl border border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-950">
                      <p className="text-[10px] font-bold text-gray-500 uppercase mb-2">Latency Health</p>
                      <div className={`text-lg font-bold ${auditResult.latency < 500 ? 'text-emerald-500' : 'text-orange-500'}`}>
                        {auditResult.latency} ms
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-slate-950 p-4 rounded-lg border border-gray-100 dark:border-slate-800">
                    <h3 className="text-sm font-bold mb-4 uppercase text-gray-500 tracking-wider">Security Header Checklist</h3>
                    <div className="space-y-2">
                      {['Content-Security-Policy', 'Strict-Transport-Security', 'X-Frame-Options', 'X-Content-Type-Options', 'Referrer-Policy'].map(h => {
                        const found = auditResult.securityHeaders.some(sh => sh.toLowerCase() === h.toLowerCase());
                        return (
                          <div key={h} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-slate-900 last:border-0">
                            <span className="text-sm font-mono text-gray-700 dark:text-slate-300">{h}</span>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded ${found ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                              {found ? 'PRESENT' : 'MISSING'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : view === 'utils' ? (
          <div className="p-4 md:p-8 space-y-6 animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm">
              <h2 className="text-lg font-bold mb-4">Developer Utilities</h2>
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <select 
                  value={utilType}
                  onChange={(e) => setUtilType(e.target.value)}
                  className="p-2 border rounded-md dark:bg-slate-800 dark:border-slate-700 text-sm font-semibold"
                >
                  <option value="json-format">JSON Formatter</option>
                  <option value="base64-encode">Base64 Encode</option>
                  <option value="base64-decode">Base64 Decode</option>
                </select>
                <button 
                  onClick={handleUtilAction}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md font-bold hover:bg-blue-700 transition-colors"
                >
                  Process
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase">Input</label>
                  <textarea 
                    value={utilInput}
                    onChange={(e) => setUtilInput(e.target.value)}
                    className="w-full h-64 p-3 border rounded-md font-mono text-xs bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                    placeholder="Paste your content here..."
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase">Output</label>
                  <div className="relative group">
                    <textarea 
                      readOnly
                      value={utilOutput}
                      className="w-full h-64 p-3 border rounded-md font-mono text-xs bg-gray-50 dark:bg-slate-950 border-gray-300 dark:border-slate-800 focus:outline-none resize-none"
                    />
                    <button 
                      onClick={() => copyToClipboard(utilOutput)}
                      className="absolute top-2 right-2 p-1.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* DASHBOARD VIEW (BUILDER) */
          <div className="p-3 sm:p-4 md:p-8 space-y-4 sm:space-y-6 animate-in fade-in duration-300 bg-gray-50 dark:bg-slate-900/30">

        <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 flex-grow">
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
            <div className="p-2 sm:p-4 border-b border-gray-200 dark:border-slate-800 space-y-3 sm:space-y-4">
              <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3 items-stretch sm:items-end">
                <div className="relative w-full sm:w-auto">
                  <select 
                    value={method}
                    onChange={(e) => setMethod(e.target.value)}
                    className={`w-full sm:w-auto p-2 pr-10 border rounded-md font-semibold text-xs sm:text-sm bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700 text-gray-900 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all cursor-pointer`}
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
                  className="w-full sm:flex-grow p-2 border rounded-md font-mono text-xs sm:text-sm bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700 text-gray-900 dark:text-slate-200 placeholder-gray-500 dark:placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                />

                <button 
                  onClick={handleSend}
                  disabled={loading || isBulkRunning}
                  className="w-full sm:w-auto px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-md font-semibold text-xs sm:text-sm transition-all flex items-center justify-center gap-2"
                >
                  {loading && !isBulkRunning ? (
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  ) : (
                    'Send'
                  )}
                </button>

                <div className="w-full flex flex-col sm:flex-row gap-2 sm:gap-3 border-t sm:border-l sm:border-t-0 sm:pl-3 pt-2 sm:pt-0 border-gray-200 dark:border-slate-700">
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2 flex-grow">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] sm:text-xs font-semibold text-gray-600 dark:text-slate-400 uppercase">Requests</label>
                      <input 
                        type="number" 
                        value={bulkCount}
                        onChange={(e) => setBulkCount(Math.max(1, parseInt(e.target.value) || 1))}
                        title="Number of requests to perform"
                        className="w-full p-2 border rounded-md font-mono text-xs bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700 text-gray-900 dark:text-slate-200 focus:ring-1 focus:ring-purple-500 outline-none"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] sm:text-xs font-semibold text-gray-600 dark:text-slate-400 uppercase">Duration</label>
                      <input
                        type="number"
                        value={bulkDuration}
                        min={1}
                        onChange={(e) => setBulkDuration(Math.max(1, parseInt(e.target.value) || 1))}
                        title="Time window value"
                        className="w-full p-2 border rounded-md font-mono text-xs bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700 text-gray-900 dark:text-slate-200 focus:ring-1 focus:ring-cyan-500 outline-none"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] sm:text-xs font-semibold text-gray-600 dark:text-slate-400 uppercase">Workers</label>
                      <input 
                        type="number" 
                        value={bulkConcurrency}
                        onChange={(e) => setBulkConcurrency(Math.max(1, parseInt(e.target.value) || 1))}
                        title="Parallel concurrency level (higher is faster)"
                        className="w-full p-2 border rounded-md font-mono text-xs bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700 text-gray-900 dark:text-slate-200 focus:ring-1 focus:ring-orange-500 outline-none"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] sm:text-xs font-semibold text-gray-600 dark:text-slate-400 uppercase">Unit</label>
                      <div className="inline-flex rounded-md border border-gray-300 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-800 h-full">
                        <button
                          type="button"
                          onClick={() => setBulkDurationUnit('seconds')}
                          className={`flex-1 px-1 py-2 text-[10px] font-semibold transition ${bulkDurationUnit === 'seconds' ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900' : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700'}`}
                        >
                          sec
                        </button>
                        <button
                          type="button"
                          onClick={() => setBulkDurationUnit('minutes')}
                          className={`flex-1 px-1 py-2 text-[10px] font-semibold transition ${bulkDurationUnit === 'minutes' ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900' : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700'}`}
                        >
                          min
                        </button>
                      </div>
                    </div>

                    <div className="hidden md:flex flex-col gap-1 items-center justify-end text-[10px] text-gray-500 dark:text-slate-400">
                      <div>{bulkConcurrency} Workers</div>
                    </div>
                  </div>

                  <button 
                    onClick={handleBulkSend}
                    disabled={loading || isBulkRunning}
                    className="w-full sm:w-auto px-3 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-cyan-400 text-white rounded-md font-semibold text-xs sm:text-sm transition-all flex items-center justify-center gap-2"
                  >
                    {isBulkRunning ? (
                      <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    ) : null}
                    {isBulkRunning ? 'Running...' : 'Bulk Send'}
                  </button>
                </div>
              </div>
            </div>

            {['POST', 'PUT', 'PATCH'].includes(method) && (
              <div className="p-2 sm:p-4 border-t border-gray-200 dark:border-slate-800">
                <label className="text-xs sm:text-sm font-semibold text-gray-600 dark:text-slate-400 uppercase block mb-2 sm:mb-3">Request Body</label>
                <textarea 
                  ref={bodyInputRef}
                  value={requestBody}
                  onChange={(e) => setRequestBody(e.target.value)}
                  placeholder='{"key": "value"}'
                  className="w-full h-24 sm:h-28 p-2 sm:p-3 border rounded-md font-mono text-xs sm:text-sm bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700 text-gray-900 dark:text-slate-200 placeholder-gray-500 dark:placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all resize-none"
                />
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 dark:bg-slate-900 border border-red-200 dark:border-slate-800 text-red-600 dark:text-rose-400 p-2 sm:p-4 rounded-lg flex items-start gap-2 sm:gap-3">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
              <span className="font-medium text-xs sm:text-sm">{error}</span>
            </div>
          )}

          {(isBulkRunning || bulkSummary) && (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-3 sm:p-4 shadow-sm">
              <div className="flex flex-col gap-3 sm:gap-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-gray-500 dark:text-slate-400 font-bold">Completed</p>
                    <p className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-slate-100">{bulkProgress.completed}/{bulkProgress.total}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-gray-500 dark:text-slate-400 font-bold">Success</p>
                    <p className="text-xs sm:text-sm font-semibold text-emerald-600 dark:text-emerald-400">{bulkProgress.successes}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-gray-500 dark:text-slate-400 font-bold">Failed</p>
                    <p className="text-xs sm:text-sm font-semibold text-red-600 dark:text-rose-400">{bulkProgress.failures}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-gray-500 dark:text-slate-400 font-bold">Countdown</p>
                    <p className="text-xs sm:text-sm font-semibold text-cyan-600 dark:text-cyan-400">{bulkProgress.countdown}s</p>
                  </div>
                </div>
                <div className="w-full">
                  <div className="w-full h-2 rounded-full bg-gray-200 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 transition-all"
                      style={{ width: `${bulkProgress.total ? (bulkProgress.completed / bulkProgress.total) * 100 : 0}%` }}
                    />
                  </div>
                  <p className="mt-2 text-[10px] sm:text-[11px] text-gray-500 dark:text-slate-400">{bulkProgress.completed} of {bulkProgress.total} requests completed{isBulkRunning ? ` • ${bulkProgress.elapsed} ms elapsed` : ''}</p>
                </div>
              </div>

              {!isBulkRunning && bulkSummary && (
                <div className="mt-3 sm:mt-4 text-xs sm:text-sm text-gray-600 dark:text-slate-400 border-t border-gray-200 dark:border-slate-700 pt-2 sm:pt-3 space-y-1">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 py-2">
                    <p>Total Time: <span className="font-semibold text-gray-800 dark:text-slate-200">{bulkSummary.totalTime} ms</span></p>
                    <p>Avg Latency: <span className="font-semibold text-gray-800 dark:text-slate-200">{bulkSummary.averageTime} ms</span></p>
                    <p>Throughput: <span className="font-semibold text-cyan-600 dark:text-cyan-400">{bulkSummary.throughput} req/s</span></p>
                    <p>Min Latency: <span className="font-semibold text-emerald-600 dark:text-emerald-400">{bulkSummary.minTime} ms</span></p>
                    <p>Max Latency: <span className="font-semibold text-orange-600 dark:text-orange-400">{bulkSummary.maxTime} ms</span></p>
                  </div>
                  <div className="border-t border-gray-100 dark:border-slate-800 pt-2">
                  <p>
                    {bulkSummary.canceled
                      ? `Bulk run canceled after ${bulkDuration} ${bulkDurationUnit} because not all requests completed in time.`
                      : bulkSummary.failures === 0
                        ? 'All requests completed successfully.'
                        : `First failure at request ${bulkSummary.firstFailureIndex}${bulkSummary.firstFailureStatus ? ` (status ${bulkSummary.firstFailureStatus})` : ''}${bulkSummary.firstFailureError ? ` • ${bulkSummary.firstFailureError}` : ''}.`
                    }
                  </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Response Section */}
          {response ? (
            <div className="bg-white dark:bg-gradient-to-br dark:from-slate-800 dark:via-slate-900 dark:to-slate-800 rounded-xl shadow-2xl border border-gray-200 dark:border-slate-700 overflow-hidden flex flex-col">
              <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 bg-gray-50 dark:bg-slate-900/90 border-b border-gray-200 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-4">
                <div className="flex flex-wrap items-center gap-2 sm:gap-4 md:gap-6 w-full">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-gray-600 dark:text-slate-400 uppercase">Status</span>
                    <span className={`text-xs sm:text-sm font-extrabold ${response.status >= 200 && response.status < 300 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-rose-400'}`}>
                      {response.status} {response.statusText}
                    </span>
                  </div>
                  <div className="flex flex-col border-l border-gray-300 dark:border-slate-700 pl-2 sm:pl-4">
                    <span className="text-[10px] font-bold text-gray-600 dark:text-slate-400 uppercase">Time</span>
                    <span className="text-xs sm:text-sm font-bold text-gray-700 dark:text-slate-300">{response.time} ms</span>
                  </div>
                  <div className="flex flex-col border-l border-gray-300 dark:border-slate-700 pl-2 sm:pl-4">
                    <span className="text-[10px] font-bold text-gray-600 dark:text-slate-400 uppercase">Size</span>
                    <span className="text-xs sm:text-sm font-bold text-gray-700 dark:text-slate-300">{response.size} KB</span>
                  </div>
                </div>
                <button 
                  onClick={() => copyToClipboard(activeTab === 'body' ? response.data : response.headers)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-gray-500 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-300 flex-shrink-0"
                  title="Copy to Clipboard"
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                </button>
              </div>

              <div className="flex border-b border-gray-200 dark:border-slate-700 overflow-x-auto">
                {['body', 'headers', ...(response.isHtml ? ['preview'] : [])].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 sm:px-8 py-2 sm:py-3 text-xs sm:text-sm font-medium transition-all capitalize whitespace-nowrap ${
                      activeTab === tab ? 'border-b-2 border-blue-600 dark:border-slate-400 text-blue-600 dark:text-slate-200 bg-blue-50 dark:bg-slate-800/50' : 'border-b-2 border-transparent text-gray-600 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-900/30'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              
              <div className="bg-gray-50 dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-900 dark:to-slate-800 p-3 sm:p-6 min-h-[250px] sm:min-h-[300px] max-h-[400px] sm:max-h-[600px] overflow-auto shadow-inner border-t border-gray-200 dark:border-slate-700">
                <pre className="text-xs sm:text-sm font-mono">
                  {activeTab === 'body' ? (
                    <code 
                      className="whitespace-pre-wrap block"
                      dangerouslySetInnerHTML={{ 
                        __html: highlightCode(typeof response.data === 'string' ? response.data : JSON.stringify(response.data, null, 2)) 
                      }} 
                    />
                  ) : activeTab === 'preview' ? (
                    <iframe 
                      title="Response Preview"
                      srcDoc={response.data} 
                      className="w-full h-full bg-white rounded-lg border-0 min-h-[500px]"
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
              <div className="flex flex-col items-center justify-center py-12 sm:py-20 bg-gray-50 dark:bg-slate-900/50 border border-dashed border-gray-300 dark:border-slate-700 rounded-lg">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 dark:bg-slate-800/60 rounded-full flex items-center justify-center mb-3 sm:mb-4">
                  <svg className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" /></svg>
                </div>
                <h3 className="text-gray-600 dark:text-slate-300 font-medium text-sm">Ready for your first request</h3>
                <p className="text-gray-500 dark:text-slate-500 text-xs sm:text-sm">Configure the endpoint above and click Send</p>
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