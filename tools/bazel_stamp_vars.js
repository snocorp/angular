/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

// tslint:disable:no-console
// Generates the data used by the stamping feature in bazel.
// See the section on stamping in docs / BAZEL.md
// This script must be a NodeJS script in order to be cross-platform.
// See https://github.com/bazelbuild/bazel/issues/5958
// Note: git operations, especially git status, take a long time inside mounted docker volumes
// in Windows or OSX hosts (https://github.com/docker/for-win/issues/188).
// To bypass this script use `--workspace_status_command=`, in the command line or in a rc file.
const execSync = require('child_process').execSync;
const _exec = (str => execSync(str).toString().trim());

console.error('Running', process.argv.join(' '));

function onError() {
  console.log('Failed to execute:,', process.argv.join(' '));
  console.log('');
}

// Setup crash handler
process.on('uncaughtException', onError);

const BUILD_SCM_HASH = _exec(`git rev-parse HEAD`);
console.log(`BUILD_SCM_HASH ${BUILD_SCM_HASH}`);

if (_exec(`git rev-parse HEAD`) == '') {
  console.log(`No git tags found, can't stamp the build.`);
  console.log('Either fetch the tags:');
  console.log('       git fetch git@github.com:angular/angular.git --tags');
  console.log('or build without stamping by giving an empty workspace_status_command:');
  console.log('       yarn bazel build --workspace_status_command= ...');
  console.log('');
}

// Find out if there are any uncommitted local changes
// TODO(i): is it ok to use '--untracked-files=no' to ignore untracked files since they should not
// affect anything?
const LOCAL_CHANGES = _exec(`git status --untracked-files=no --porcelain`) != '';
console.log(`BUILD_SCM_LOCAL_CHANGES ${LOCAL_CHANGES}`);

// Only match the latest tag that is a version such as 6.0.0, 6.0.0-rc.5, etc...
// This will ignore non-version tags which would break unit tests expecting a valid version
// number in the package headers
const BUILD_SCM_VERSION_RAW =
    _exec(`git describe --match [0-9].[0-9].[0-9]* --abbrev=7 --tags HEAD`);

// Reformat `git describe` version string into a more semver-ish string
//   From:   5.2.0-rc.0-57-g757f886
//   To:     5.2.0-rc.0+57.sha-757f886
//   Or:     5.2.0-rc.0+57.sha-757f886.with-local-changes
const BUILD_SCM_VERSION = BUILD_SCM_VERSION_RAW.replace(/-([0-9]+)-g/, '+$1.sha-') +
    (LOCAL_CHANGES ? '.with-local-changes' : '');
console.log(`BUILD_SCM_VERSION ${BUILD_SCM_VERSION}`);
