import React, { useState } from 'react';

const statusCodes = [
  { code: 100, phrase: 'Continue', description: 'The server has received the request headers and the client should proceed to send the request body.', category: 'Informational' },
  { code: 101, phrase: 'Switching Protocols', description: 'The requester has asked the server to switch protocols and the server has agreed to do so.', category: 'Informational' },
  { code: 200, phrase: 'OK', description: 'The request has succeeded.', category: 'Success' },
  { code: 201, phrase: 'Created', description: 'The request has been fulfilled and resulted in a new resource being created.', category: 'Success' },
  { code: 202, phrase: 'Accepted', description: 'The request has been accepted for processing, but the processing has not been completed.', category: 'Success' },
  { code: 204, phrase: 'No Content', description: 'The server successfully processed the request and is not returning any content.', category: 'Success' },
  { code: 300, phrase: 'Multiple Choices', description: 'Indicates multiple options for the resource from which the client or user can choose.', category: 'Redirection' },
  { code: 301, phrase: 'Moved Permanently', description: 'This and all future requests should be directed to the given URI.', category: 'Redirection' },
  { code: 302, phrase: 'Found', description: 'The resource was found temporarily under a different URI.', category: 'Redirection' },
  { code: 304, phrase: 'Not Modified', description: 'Indicates that the resource has not been modified since the version specified by the request headers If-Modified-Since or If-None-Match.', category: 'Redirection' },
  { code: 400, phrase: 'Bad Request', description: 'The server cannot or will not process the request due to an apparent client error.', category: 'Client Error' },
  { code: 401, phrase: 'Unauthorized', description: 'Authentication is required and has failed or has not yet been provided.', category: 'Client Error' },
  { code: 403, phrase: 'Forbidden', description: 'The request was a valid request, but the server is refusing to respond to it.', category: 'Client Error' },
  { code: 404, phrase: 'Not Found', description: 'The requested resource could not be found but may be available in the future.', category: 'Client Error' },
  { code: 405, phrase: 'Method Not Allowed', description: 'A request method is not supported for the requested resource.', category: 'Client Error' },
  { code: 408, phrase: 'Request Timeout', description: 'The server timed out waiting for the request.', category: 'Client Error' },
  { code: 429, phrase: 'Too Many Requests', description: 'The user has sent too many requests in a given amount of time.', category: 'Client Error' },
  { code: 500, phrase: 'Internal Server Error', description: 'A generic error message, given when an unexpected condition was encountered and no more specific message is suitable.', category: 'Server Error' },
  { code: 501, phrase: 'Not Implemented', description: 'The server either does not recognize the request method, or it lacks the ability to fulfill the request.', category: 'Server Error' },
  { code: 502, phrase: 'Bad Gateway', description: 'The server was acting as a gateway or proxy and received an invalid response from the upstream server.', category: 'Server Error' },
  { code: 503, phrase: 'Service Unavailable', description: 'The server is currently unavailable (because it is overloaded or down for maintenance).', category: 'Server Error' },
  { code: 504, phrase: 'Gateway Timeout', description: 'The server was acting as a gateway or proxy and did not receive a timely response from the upstream server.', category: 'Server Error' },
];

const HttpStatusCodeReference = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCodes = statusCodes.filter(
    (code) =>
      code.code.toString().includes(searchTerm) ||
      code.phrase.toLowerCase().includes(searchTerm.toLowerCase()) ||
      code.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      code.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getCategoryColor = (category) => {
    switch (category) {
      case 'Informational': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'Success': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300';
      case 'Redirection': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      case 'Client Error': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'Server Error': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-xl overflow-hidden">
      {/* Toolbar */}
      <div className="p-4 border-b border-gray-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 bg-gray-50 dark:bg-slate-950">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" /></svg>
          </div>
          <h2 className="font-bold text-gray-900 dark:text-slate-100 uppercase tracking-widest text-sm">HTTP Status Reference</h2>
        </div>
        <input
          type="text"
          placeholder="Search status codes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="p-2 border rounded-md dark:bg-slate-800 dark:border-slate-700 text-sm w-full sm:w-auto"
        />
      </div>

      <div className="flex-grow p-4 overflow-y-auto">
        {filteredCodes.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-slate-400 py-8">No matching status codes found.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCodes.map((code) => (
              <div
                key={code.code}
                className="bg-gray-50 dark:bg-slate-950 p-4 rounded-lg border border-gray-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-lg font-bold text-gray-900 dark:text-slate-100">{code.code} {code.phrase}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getCategoryColor(code.category)}`}>
                    {code.category}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-slate-400">{code.description}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HttpStatusCodeReference;