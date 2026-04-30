import React, { useState } from 'react';

const StressTest = ({ runSingleRequest, currentUrl, updateHistory }) => {
  const [config, setConfig] = useState({
    count: 50,
    concurrency: 5,
    method: 'GET'
  });

  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState({
    completed: 0,
    total: 0,
    successes: 0,
    failures: 0,
    avgTime: 0,
    elapsed: 0
  });

  const startStressTest = async () => {
    if (!currentUrl) return alert("Please enter a URL in the dashboard first");
    
    setIsRunning(true);
    const startTime = performance.now();
    const latencies = [];
    let completed = 0;
    let successes = 0;
    let failures = 0;

    setProgress({ completed: 0, total: config.count, successes: 0, failures: 0, avgTime: 0, elapsed: 0 });

    const worker = async () => {
      while (completed < config.count) {
        const currentIndex = completed++; // Increment globally for the workers
        if (currentIndex >= config.count) break;

        const { result, error } = await runSingleRequest(currentUrl, config.method);
        
        if (result && result.success) {
          successes++;
          latencies.push(result.time);
        } else {
          failures++;
        }

        // Update progress UI
        const currentElapsed = performance.now() - startTime;
        setProgress({
          completed: successes + failures,
          total: config.count,
          successes,
          failures,
          avgTime: latencies.length ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0,
          elapsed: Math.round(currentElapsed)
        });
      }
    };

    // Launch workers based on concurrency
    const workers = Array.from({ length: Math.min(config.concurrency, config.count) }, () => worker());
    await Promise.all(workers);
    
    setIsRunning(false);
    
    updateHistory({
      id: Date.now(),
      url: `[Stress Test ${config.count}x] ${currentUrl}`,
      method: config.method,
      status: successes > 0 ? 200 : 500,
      time: Math.round(performance.now() - startTime),
      size: "N/A"
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-gray-200 dark:border-slate-800 shadow-xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Requests</label>
            <input type="number" value={config.count} onChange={e => setConfig({...config, count: parseInt(e.target.value) || 1})} 
              className="w-full p-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded text-sm font-mono" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Concurrency (Workers)</label>
            <input type="number" value={config.concurrency} onChange={e => setConfig({...config, concurrency: parseInt(e.target.value) || 1})} 
              className="w-full p-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded text-sm font-mono" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Method</label>
            <select value={config.method} onChange={e => setConfig({...config, method: e.target.value})} 
              className="w-full p-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded text-sm font-bold">
              <option>GET</option>
              <option>POST</option>
              <option>PUT</option>
              <option>DELETE</option>
            </select>
          </div>
        </div>

      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
          <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
        </div>
        <h2 className="text-xl font-bold">Stress Test Pro</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="p-4 bg-gray-50 dark:bg-slate-950 rounded-lg border border-gray-100 dark:border-slate-800">
          <p className="text-[10px] font-bold text-gray-500 uppercase">Success Rate</p>
          <p className="text-2xl font-black text-emerald-500">{progress.total > 0 ? Math.round((progress.successes / progress.completed) * 100) || 0 : 0}%</p>
        </div>
        <div className="p-4 bg-gray-50 dark:bg-slate-950 rounded-lg border border-gray-100 dark:border-slate-800">
          <p className="text-[10px] font-bold text-gray-500 uppercase">Avg Response</p>
          <p className="text-2xl font-black text-blue-500">{progress.avgTime || 0}ms</p>
        </div>
        <div className="p-4 bg-gray-50 dark:bg-slate-950 rounded-lg border border-gray-100 dark:border-slate-800">
          <p className="text-[10px] font-bold text-gray-500 uppercase">Req / Sec</p>
          <p className="text-2xl font-black text-purple-500">{progress.elapsed > 0 ? (progress.completed / (progress.elapsed / 1000)).toFixed(1) : 0}</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="relative h-4 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div 
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-red-500 to-orange-500 transition-all duration-300"
            style={{ width: `${progress.total > 0 ? (progress.completed / progress.total) * 100 : 0}%` }}
          />
        </div>
        <button 
          onClick={startStressTest}
          disabled={isRunning}
          className="w-full py-4 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl font-black uppercase tracking-widest hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50"
        >
          {isRunning ? 'Executing Stress Test...' : 'Launch Stress Test'}
        </button>
      </div>
      </div>
    </div>
  );
};

export default StressTest;
