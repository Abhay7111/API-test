# Data Share Service

Lightweight, dependency-free Node service to share JSON objects via a generated link.

Usage:

1. Start the server:

```bash
node data-share/server.js
```

2. POST a JSON object to `/share`:

```bash
curl -X POST http://localhost:4001/share -H "Content-Type: application/json" -d '{"name":"Alice","age":30}'
```

Response:

```json
{ "id": "...", "url": "http://localhost:4001/data/<id>" }
```

3. GET the data:

```bash
curl http://localhost:4001/data/<id>
```
