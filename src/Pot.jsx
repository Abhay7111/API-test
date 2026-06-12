import React, { useState, useEffect, useCallback } from 'react';
import DataShare from './DataShare';

const normalizeSlug = (value) =>
  value
    .trim()
    .replace(/[^a-zA-Z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/(^-|-$)/g, '')
    .toLowerCase();

const Pot = () => {
  const [slug, setSlug] = useState('pot-object');
  const [potMode, setPotMode] = useState('builder');
  const [potDataRaw, setPotDataRaw] = useState('{\n  "key": "value"\n}');
  const [postFields, setPostFields] = useState([
    { id: 'field-0', key: 'key', value: 'value', type: 'text', enabled: true, children: [] },
  ]);
  const [endpoint, setEndpoint] = useState('');
  const [mocks, setMocks] = useState([]);
  const [fetchResult, setFetchResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [deletingSlug, setDeletingSlug] = useState('');
  const [success, setSuccess] = useState('');

  const apiBase = window.location.origin;

  const loadMocks = useCallback(async () => {
    try {
      const res = await fetch(`${apiBase}/api/mocks`);
      if (!res.ok) return;
      const data = await res.json();
      setMocks(data);
    } catch {
      // ignore during start, backend may not be ready
    }
  }, [apiBase]);

  useEffect(() => {
    loadMocks();
  }, [loadMocks]);

  const createMock = async () => {
    setError('');
    setSuccess('');
    setFetchResult(null);

    const normalized = normalizeSlug(slug || 'pot-object');
    if (!normalized) {
      setError('Enter a valid slug for the mock endpoint.');
      return;
    }

    let body;
    try {
      body = JSON.parse(potDataRaw);
    } catch {
      setError('Invalid JSON body. Fix the JSON and try again.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/mocks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: normalized, body }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Unable to create mock endpoint.');
        return;
      }
      setEndpoint(data.endpoint);
      setSuccess('Mock endpoint created successfully.');
      setMocks((prev) => [{ slug: normalized }, ...prev.filter((item) => item.slug !== normalized)]);
    } catch (err) {
      setError(err.message || 'Network error while creating mock endpoint.');
    } finally {
      setLoading(false);
    }
  };

  const fetchMock = async (url) => {
    setError('');
    setSuccess('');
    setFetchResult(null);
    const target = url || endpoint;
    if (!target) {
      setError('Create a mock endpoint first.');
      return;
    }
    setFetching(true);
    try {
      const res = await fetch(target);
      const text = await res.text();
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = text;
      }
      setFetchResult({ status: res.status, data: parsed });
      if (!res.ok) {
        setError(`Fetch failed: ${res.status}`);
      } else {
        setSuccess('Fetched mock object successfully.');
      }
    } catch (err) {
      setError(err.message || 'Unable to fetch mock endpoint.');
    } finally {
      setFetching(false);
    }
  };

  const fieldsToJSON = useCallback((fields) => {
    const obj = {};
    fields.forEach((f) => {
      if (f.enabled && f.key) {
        obj[f.key] = f.type === 'object' ? fieldsToJSON(f.children || []) : f.value;
      }
    });
    return obj;
  }, []);

  const parsePotJsonToFields = useCallback(() => {
    try {
      const parsed = JSON.parse(potDataRaw);
      const entries = Object.entries(parsed || {});
      const nextFields = entries.map(([key, value], index) => {
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          return {
            id: `field-${index}`,
            key,
            type: 'object',
            enabled: true,
            children: Object.entries(value).map(([childKey, childValue], childIndex) => ({
              id: `field-${index}-${childIndex}`,
              key: childKey,
              value: String(childValue),
              type: 'text',
              enabled: true,
              children: [],
            })),
          };
        }
        return {
          id: `field-${index}`,
          key,
          value: String(value),
          type: 'text',
          enabled: true,
          children: [],
        };
      });
      setPostFields(nextFields);
    } catch {
      // ignore invalid JSON while switching modes
    }
  }, [potDataRaw]);

  useEffect(() => {
    if (potMode === 'builder') {
      parsePotJsonToFields();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [potMode]);

  useEffect(() => {
    if (potMode === 'builder') {
      setPotDataRaw(JSON.stringify(fieldsToJSON(postFields), null, 2));
    }
  }, [postFields, potMode, fieldsToJSON]);

  const addPostField = (parentId = null, type = 'text') => {
    const newField = { id: Date.now().toString(), key: '', value: '', type, enabled: true, children: [] };
    if (!parentId) {
      setPostFields([...postFields, newField]);
      return;
    }
    const addRecursive = (list) => list.map((f) => {
      if (f.id === parentId) return { ...f, children: [...(f.children || []), newField] };
      if (f.children) return { ...f, children: addRecursive(f.children) };
      return f;
    });
    setPostFields(addRecursive(postFields));
  };

  const updatePostField = (id, field, value) => {
    const updateRecursive = (list) => list.map((f) => {
      if (f.id === id) return { ...f, [field]: value };
      if (f.children) return { ...f, children: updateRecursive(f.children) };
      return f;
    });
    setPostFields(updateRecursive(postFields));
  };

  const removePostField = (id) => {
    const removeRecursive = (list) => list.filter((f) => f.id !== id).map((f) => ({
      ...f,
      children: f.children ? removeRecursive(f.children) : [],
    }));
    setPostFields(removeRecursive(postFields));
  };

  const getValuePlaceholder = (field, depth) => {
    const keyLower = (field.key || '').toLowerCase();
    if (depth === 0) {
      if (keyLower.includes('answer')) return 'Answer';
      return 'Value';
    }
    if (depth === 1) {
      if (keyLower.includes('answer')) return 'Sub Answer';
      return 'Sub Value';
    }
    return 'Value';
  };

  const deleteMock = async (mockSlug) => {
    setError('');
    setSuccess('');
    setDeletingSlug(mockSlug);

    try {
      const res = await fetch(`${apiBase}/api/mocks/${encodeURIComponent(mockSlug)}`, {
        method: 'DELETE',
      });
      const text = await res.text();
      let data = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = {};
      }

      if (!res.ok) {
        setError(data.message || 'Unable to delete mock.');
        return;
      }

      setMocks((prev) => prev.filter((item) => item.slug !== mockSlug));
      if (endpoint.endsWith(`/mock-api/${mockSlug}`)) {
        setEndpoint('');
      }
      if (slug === mockSlug) {
        setSlug('pot-object');
      }
      setSuccess(data.message || 'Mock deleted successfully.');
    } catch (err) {
      setError(err.message || 'Unable to delete mock endpoint.');
    } finally {
      setDeletingSlug('');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-200 dark:border-slate-800 overflow-hidden shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-5">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Pot / Mock Object</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-2">Create a mock endpoint, then fetch it to verify the object response.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={createMock}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-semibold disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Mock'}
            </button>
            <button
              type="button"
              onClick={() => fetchMock()}
              disabled={fetching || !endpoint}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-sm font-semibold disabled:opacity-50"
            >
              {fetching ? 'Fetching...' : 'Fetch Mock'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4">
          <div>
            <label className="text-xs font-semibold uppercase text-gray-500 dark:text-slate-400">Endpoint slug</label>
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="pot-object"
              className="w-full p-3 mt-2 border rounded-md bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700 text-sm text-gray-900 dark:text-slate-100 font-mono"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-gray-500 dark:text-slate-400">Shared JSON data</label>
            <div className="mt-2">
              <DataShare data={potDataRaw} />
            </div>
          </div>
        </div>

        <div className="mt-4 p-4 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl">
          <div className="flex border-b border-gray-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setPotMode('builder')}
              className={`flex-1 px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${potMode === 'builder' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 dark:text-slate-400'}`}
            >
              Form Builder
            </button>
            <button
              type="button"
              onClick={() => setPotMode('raw')}
              className={`flex-1 px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${potMode === 'raw' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 dark:text-slate-400'}`}
            >
              Raw JSON
            </button>
          </div>

          {potMode === 'builder' ? (
            <div className="p-4 space-y-4 bg-gray-50/50 dark:bg-slate-900/50">
              <div className="space-y-3">
                {postFields.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-slate-400">No fields yet. Add a root field or object to begin.</p>
                ) : (
                  (() => {
                    const renderFields = (fields, depth = 0) => {
                      return fields.map((field) => (
                        <div key={field.id} className="space-y-2">
                          <div className="flex gap-2 items-center" style={{ marginLeft: `${depth * 20}px` }}>
                            <input
                              type="checkbox"
                              checked={field.enabled}
                              onChange={(e) => updatePostField(field.id, 'enabled', e.target.checked)}
                              className="rounded dark:bg-slate-800"
                            />
                            <input
                              value={field.key}
                              onChange={(e) => updatePostField(field.id, 'key', e.target.value)}
                              className="flex-1 p-2 border rounded bg-white dark:bg-slate-800 text-[11px] font-mono"
                              placeholder="Key"
                            />
                            {field.type === 'text' ? (
                              <input
                                value={field.value}
                                onChange={(e) => updatePostField(field.id, 'value', e.target.value)}
                                className="flex-1 p-2 border rounded bg-white dark:bg-slate-800 text-[11px] font-mono"
                                placeholder={getValuePlaceholder(field, depth)}
                              />
                            ) : (
                              <div className="flex-1 flex gap-1">
                                <button
                                  onClick={() => addPostField(field.id, 'text')}
                                  className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 text-[9px] font-bold rounded uppercase"
                                >
                                  + Field
                                </button>
                                <button
                                  onClick={() => addPostField(field.id, 'object')}
                                  className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-600 text-[9px] font-bold rounded uppercase"
                                >
                                  + Object
                                </button>
                              </div>
                            )}
                            <button
                              onClick={() => removePostField(field.id)}
                              className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                          {field.type === 'object' && field.children && (
                            <div className="border-l-2 border-gray-200 dark:border-slate-800 ml-1">
                              {renderFields(field.children, depth + 1)}
                            </div>
                          )}
                        </div>
                      ));
                    };
                    return renderFields(postFields);
                  })()
                )}
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => addPostField(null, 'text')}
                  className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
                >
                  + Add Root Field
                </button>
                <button
                  type="button"
                  onClick={() => addPostField(null, 'object')}
                  className="text-[10px] font-bold text-purple-600 dark:text-purple-400 hover:underline"
                >
                  + Add Root Object
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-4">
              <label className="text-xs font-semibold uppercase text-gray-500 dark:text-slate-400">Raw JSON body</label>
              <textarea
                value={potDataRaw}
                onChange={(e) => setPotDataRaw(e.target.value)}
                className="w-full h-48 p-3 mt-2 border rounded-md font-mono text-xs bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700 text-gray-900 dark:text-slate-100 resize-none"
              />
            </div>
          )}
        </div>

        {endpoint && (
          <div className="mt-4 p-4 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl">
            <p className="text-xs font-semibold uppercase text-gray-500 dark:text-slate-400">Mock endpoint</p>
            <p className="mt-2 text-sm text-blue-700 dark:text-blue-300 break-all font-mono">{endpoint}</p>
          </div>
        )}

        {(error || success) && (
          <div className={`mt-4 p-4 rounded-lg ${error ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
            <p className="text-sm font-medium">{error || success}</p>
          </div>
        )}

        {fetchResult && (
          <div className="mt-4 p-4 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-gray-500 dark:text-slate-400 font-semibold">Fetch result</p>
                <p className="text-sm text-gray-700 dark:text-slate-300">Status {fetchResult.status}</p>
              </div>
            </div>
            <pre className="text-xs sm:text-sm font-mono whitespace-pre-wrap break-words text-gray-900 dark:text-slate-100">
              {typeof fetchResult.data === 'string' ? fetchResult.data : JSON.stringify(fetchResult.data, null, 2)}
            </pre>
          </div>
        )}

        {mocks.length > 0 && (
          <div className="mt-6 p-4 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs uppercase tracking-[0.16em] text-gray-500 dark:text-slate-400 font-semibold">Existing mocks</p>
              <button
                type="button"
                onClick={loadMocks}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-100"
              >
                Refresh
              </button>
            </div>
            <div className="space-y-3">
              {mocks.map((item) => (
                <div key={item.slug} className="rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">{item.slug}</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400 break-all">{`${apiBase}/mock-api/${item.slug}`}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEndpoint(`${apiBase}/mock-api/${item.slug}`);
                        setSlug(item.slug);
                        fetchMock(`${apiBase}/mock-api/${item.slug}`);
                      }}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-100"
                    >
                      Use endpoint
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteMock(item.slug)}
                      disabled={deletingSlug === item.slug}
                      className="text-xs font-semibold text-rose-600 hover:text-rose-800 dark:text-rose-400 dark:hover:text-rose-200"
                    >
                      {deletingSlug === item.slug ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Pot;
