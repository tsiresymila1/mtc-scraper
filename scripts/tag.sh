#!/usr/bin/env bash
# Create tag <version> on HEAD and push it. Deletes it first (local + remote) if it exists.
# The tag push triggers the release workflow.   Usage: scripts/tag.sh v0.1.0 ["message"]
set -euo pipefail

tag="${1:?usage: scripts/tag.sh vX.Y.Z [message]}"
message="${2:-Release $tag}"
[[ "$tag" == v* ]] || { echo "tag must start with 'v' (workflow trigger): $tag" >&2; exit 1; }

if [[ -n "$(git status --porcelain)" ]]; then
  echo "warning: uncommitted changes are not part of the tag" >&2
fi

git tag -d "$tag" 2>/dev/null && echo "deleted local tag $tag" || true
if git ls-remote --exit-code --tags origin "refs/tags/$tag" >/dev/null 2>&1; then
  git push origin ":refs/tags/$tag"
  echo "deleted remote tag $tag"
fi

git tag -a "$tag" -m "$message"
git push origin "$tag"
echo "pushed $tag ($(git rev-parse --short HEAD))"
