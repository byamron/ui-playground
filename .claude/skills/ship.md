---
name: ship
description: Commit all staged changes, push the current branch, and open a pull request against main.
user_invocable: true
---

Commit all staged changes with a conventional-style commit message derived from recent work. Push the current branch to origin. Then open a pull request against `main` using the GitHub CLI (`gh pr create`).

Use the most recent feature or fix description as the PR title. Do not squash or amend previous commits. Follow the standard commit and PR conventions already defined in the system prompt.
