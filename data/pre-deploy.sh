#!/usr/bin/env bash
set -e
set -x

if [[ -n `git ls-files --exclude-standard --modified -- data/* dist/*` ]]; then
  git add -u data dist
  git commit -m 'autobuild'
  npm version patch
fi
