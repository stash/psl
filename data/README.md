This directory contains the code that builds and parses the official public suffix list from https://publicsuffix.org

# Building

In the main `psl` directory, run `yarn` (to install dependencies) then `yarn build` (to fetch and compile the list) then `yarn test`.

# Autobuilds

Autobuids are being done with TravisCI.

If you fork this repo and want to auto-publish to NPM & github, you'll need to set up the following.

Prerequisites:

* `travis` command-line tool
* npmjs.com account is set up and authenticated
* Log in to travisci.org and oauth authenticate with github. Fork this repo.

Repository Setup:

1. In `package.json`, change the name to a scoped name (e.g., `@example/psl`)
2. Also in `package.json`, change `repository` to your github fork (e.g., `git@github.com:example/psl.git`)
3. Run `travis setup releases`, which will prompt for your github credentials and fetch an encrypted oauth token with permission to push to this repository. *Be careful* about which branch you want to permit auto-publishing from.
4. Further constrain the auto-release to the latest node.js release (e.g., 9) in .travis.yml by appending `node: $version` to the `on:` section (see [Conditional releases with on:](https://docs.travis-ci.com/user/deployment#Conditional-Releases-with-on%3A) for more info).
5. Make a copy of .travis.yml because the next step can sometimes overwrite it (e.g., .travis.yml.bak)
6. Go to npmjs.com and get an API token with read/write permission
7. Run `travis setup npm` and fill in the API key


