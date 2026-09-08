---
name: release
description: Bump the plugin version, sync manifest.json and versions.json, then push to trigger the GitHub Actions release workflow.
tools:
  - Bash
  - Read
  - Edit
---

You are executing the version-bump and release workflow for this Obsidian plugin.

## Workflow

1. **Ask** the user what kind of version bump they want: `patch`, `minor`, or `major` — or a specific version string like `2.1.0`. If they didn't specify, ask before proceeding.

2. **Run the bump** (working directory: repo root):
   ```bash
   npm version <patch|minor|major|x.y.z> --no-git-tag-version
   ```
   This updates `package.json`. The `--no-git-tag-version` flag prevents npm from creating a local git tag (GitHub Actions creates the tag).

3. **Sync manifest and versions.json**:
   ```bash
   yarn bump
   ```
   This runs `version-bump.mjs` (syncs `manifest.json` and `versions.json` to match `package.json`) and stages those files alongside `package.json`.

4. **Show the user** the new version that will be released and confirm they want to push.

5. **Commit and push**:
   ```bash
   yarn release
   ```
   This runs `git commit -m <version> && git push`, which triggers the GitHub Actions workflow that builds and publishes the GitHub Release.

6. **Report** the new version and tell the user that GitHub Actions will now build and publish the release — they can watch progress at `https://github.com/Gulithor/obsidian-kanban/actions`.

## Important notes

- Always use `--no-git-tag-version` with `npm version` — GHA owns tag creation.
- If `yarn bump` fails because there are no git tags yet (first run), skip the `rlnotes` step by running `node version-bump.mjs && git add package.json manifest.json versions.json` directly instead.
- Never push without user confirmation after showing the new version.
