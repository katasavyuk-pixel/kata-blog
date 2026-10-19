#!/usr/bin/env bash
# Race-safe publish of the daily Noticias files straight onto main.
#
# Between checkout and push, someone else (a human merge, youtube-nuevo.yml, a
# second run) may have moved main. A bare `git push` then fails; a force push
# would overwrite their work. This script instead:
#
#   1. commits only the given files,
#   2. fetches the remote branch and rebases the commit on top of it,
#   3. pushes without --force; if the push is rejected because the remote moved
#      again, it loops (bounded) — each round re-fetches and re-rebases.
#
# On a rebase conflict it aborts the rebase, leaves the remote untouched and
# exits 2: a human resolves it. It never uses --force, --force-with-lease or reset.
#
# Usage: publish-safe.sh "<commit message>" <file>...
# Env:   PUBLISH_REMOTE (default origin), PUBLISH_BRANCH (default main),
#        PUBLISH_MAX_ATTEMPTS (default 4)
set -euo pipefail

remote="${PUBLISH_REMOTE:-origin}"
branch="${PUBLISH_BRANCH:-main}"
max_attempts="${PUBLISH_MAX_ATTEMPTS:-4}"

if [ "$#" -lt 2 ]; then
  echo "Usage: publish-safe.sh \"<commit message>\" <file>..." >&2
  exit 64
fi
message="$1"
shift

git add -- "$@"
if git diff --cached --quiet; then
  echo "Nothing to publish (no staged changes in: $*)."
  exit 0
fi
git commit -m "$message"

attempt=1
while [ "$attempt" -le "$max_attempts" ]; do
  git fetch "$remote" "$branch"
  if ! git rebase "$remote/$branch"; then
    git rebase --abort || true
    echo "CONFLICT: rebasing onto $remote/$branch failed. Nothing was pushed; resolve by hand." >&2
    exit 2
  fi
  if git push "$remote" "HEAD:$branch"; then
    echo "Published on attempt $attempt."
    exit 0
  fi
  echo "Push rejected (attempt $attempt/$max_attempts): $remote/$branch moved; syncing again." >&2
  attempt=$((attempt + 1))
done

echo "GAVE UP: $max_attempts pushes were rejected. Nothing was forced; re-run the workflow." >&2
exit 3
