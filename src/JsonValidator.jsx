import React, { useState } from 'react';
import Ajv from 'ajv';

const JsonValidator = () => {
  const [schema, setSchema] = useState('{\n  "type": "object",\n  "properties": {\n    "foo": { "type": "number" }\n  }\n}');
  const [data, setData] = useState('{\n  "foo": 1\n}');
  const [result, setResult] = useState(null);

  const validate = () => {
    const ajv = new Ajv({ allErrors: true, strict: false, logger: false });
    try {
      const parsedSchema = JSON.parse(schema);
      const parsedData = JSON.parse(data);
      const validateFn = ajv.compile(parsedSchema);
      const valid = validateFn(parsedData);
      setResult(valid ? { success: true } : { success: false, errors: validateFn.errors });
    } catch (err) {
      setResult({ success: false, errors: [{ message: err.message }] });
    }
  };

  const formatJson = (type) => {
    try {
      if (type === 'schema') setSchema(JSON.stringify(JSON.parse(schema), null, 2));
      else if (type === 'data') setData(JSON.stringify(JSON.parse(data), null, 2));
    } catch (err) {
      alert('Invalid JSON: ' + err.message);
    }
  };

  const loadExample = () => {
    setSchema(JSON.stringify({
      type: "object",
      properties: {
        name: { type: "string" },
        age: { type: "number", minimum: 0 },
        email: { type: "string", format: "email" }
      },
      required: ["name", "email"]
    }, null, 2));
    setData(JSON.stringify({
      name: "John Doe",
      age: 25,
      email: "invalid-email"
    }, null, 2));
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-xl overflow-hidden">
      {/* Toolbar */}
      <div className="p-4 border-b border-gray-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 bg-gray-50 dark:bg-slate-950">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <h2 className="font-bold text-gray-900 dark:text-slate-100 uppercase tracking-wider text-sm">JSON Schema Validator</h2>
        </div>
        <div className="flex gap-2">
          <button onClick={loadExample} className="px-3 py-1.5 text-xs font-bold text-gray-600 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-800 rounded transition-colors border border-gray-300 dark:border-slate-700 uppercase">Load Example</button>
          <button onClick={() => { setSchema(''); setData(''); setResult(null); }} className="px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 rounded transition-colors border border-red-200 dark:border-red-900/30 uppercase">Clear All</button>
        </div>
      </div>

      <div className="flex-grow grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x border-gray-200 dark:divide-slate-800 h-[60vh]">
        {/* Editor 1: Schema */}
        <div className="flex flex-col group h-full">
          <div className="p-2 px-4 flex justify-between items-center bg-gray-50/50 dark:bg-slate-900/50 border-b border-gray-200 dark:border-slate-800">
            <span className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest">JSON Schema</span>
            <button onClick={() => formatJson('schema')} className="text-[10px] font-bold text-blue-500 hover:text-blue-600 uppercase opacity-0 group-hover:opacity-100 transition-opacity">Auto-Format</button>
          </div>
          <textarea 
            value={schema} 
            onChange={(e) => setSchema(e.target.value)} 
            placeholder='{"type": "object", ...}'
            className="flex-grow p-4 font-mono text-xs bg-transparent dark:text-blue-300 placeholder-gray-400 focus:outline-none resize-none selection:bg-blue-100 dark:selection:bg-blue-900/50" 
          />
        </div>

        {/* Editor 2: Data */}
        <div className="flex flex-col group h-full">
          <div className="p-2 px-4 flex justify-between items-center bg-gray-50/50 dark:bg-slate-900/50 border-b border-gray-200 dark:border-slate-800">
            <span className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest">Input Data</span>
            <button onClick={() => formatJson('data')} className="text-[10px] font-bold text-blue-500 hover:text-blue-600 uppercase opacity-0 group-hover:opacity-100 transition-opacity">Auto-Format</button>
          </div>
          <textarea 
            value={data} 
            onChange={(e) => setData(e.target.value)} 
            placeholder='{"name": "John", ...}'
            className="flex-grow p-4 font-mono text-xs bg-transparent dark:text-emerald-300 placeholder-gray-400 focus:outline-none resize-none selection:bg-emerald-100 dark:selection:bg-emerald-900/50" 
          />
        </div>
      </div>

      {/* Action Footer */}
      <div className="p-4 border-t border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950">
        <button onClick={validate} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-black uppercase tracking-[0.2em] shadow-lg shadow-blue-500/20 active:scale-[0.99] transition-all">Execute Validation</button>
      
      {result && (
        <div className={`mt-4 p-4 rounded-lg border animate-in slide-in-from-top-2 duration-300 ${result.success ? 'bg-emerald-50/50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800' : 'bg-red-50/50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800'}`}>
          <h3 className="font-black text-xs uppercase tracking-wider mb-2 flex items-center gap-2">
            {result.success ? '✓ Validation Successful' : '✗ Schema Violation Detected'}
          </h3>
          {!result.success && (
            <ul className="list-disc list-inside space-y-1">
              {result.errors.map((err, i) => (
                <li key={i} className="text-xs font-mono">
                  <span className="font-bold">{err.instancePath || 'root'}</span>: {err.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      </div>
    </div>
  );
};

export default JsonValidator;