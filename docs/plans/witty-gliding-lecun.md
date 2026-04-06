# Plan: Commit all working changes

## Context

User needs a clean working branch. Commit all current modifications and untracked files.

## Approach

1. Run `git status`, `git diff`, `git log` in parallel to survey changes and match commit style.
2. Group changes into logical commits if they span clearly separable concerns; otherwise a single commit is fine given the user's explicit "commit all" ask.
3. Stage files by name (avoid `-A`/`.` to prevent accidental secret inclusion). Skip anything that looks like `.env` / credentials and warn the user if present.
4. Write commit message(s) in the repo's conventional style, focused on _why_.
5. Do not push. Report final `git status` to confirm clean tree.

## Verification

- `git status` shows clean working tree after commit(s).
- `git log -1` shows the new commit.
