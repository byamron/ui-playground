---
name: link
description: Start a dev server on a clean port and print a verified localhost link. Use after completing a visual change to share a working URL.
allowed-tools: Bash(lsof *) Bash(curl *) Bash(kill *) Bash(npm *) Bash(pnpm *) Bash(yarn *) Bash(bun *)
---

# Dev Server Link

Start a dev server for the current project on a clean port and verify it before sharing the URL.

## Steps

1. Check which ports are in use: `lsof -iTCP:5173-5178 -sTCP:LISTEN -P -n`.
2. If this project already has a running server (check the PID's working directory), kill only that process and reuse its port. Do not kill servers belonging to other projects.
3. If no existing server for this project, pick the first free port in 5173-5178.
4. Start the dev server with the appropriate package manager command, specifying the chosen port (e.g., `--port <port>`).
5. Verify the server is responding (`curl -s -o /dev/null -w '%{http_code}' http://localhost:<port>`) before printing the link.
6. Print the verified localhost URL.
