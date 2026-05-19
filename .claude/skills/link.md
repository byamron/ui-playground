---
name: link
description: Start a dev server on a clean port and print a verified localhost link
---

1. Check which ports are in use: `lsof -iTCP:5173-5178 -sTCP:LISTEN -P -n`
2. If this project already has a running server (check the PID's working directory), kill only that process and reuse its port.
3. If no existing server for this project, pick the first free port in 5173-5178. Do not kill servers belonging to other projects.
4. Start the dev server with the appropriate package manager command, specifying the chosen port (e.g., `--port <port>`).
5. Verify the server is responding (e.g., `curl -s -o /dev/null -w '%{http_code}' http://localhost:<port>`) before printing the link.
6. Print the verified localhost URL.
