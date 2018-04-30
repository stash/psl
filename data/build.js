'use strict';

//
// Deps
//
const Fs = require('fs');
const Path = require('path');
const Crypto = require('crypto');
const Request = require('request');
const EventStream = require('event-stream');
const JSONStream = require('JSONStream');

const internals = {};


//
// Download URL and path to rules.json file.
//
internals.src = 'https://publicsuffix.org/list/public_suffix_list.dat';
internals.dest = Path.join(__dirname, 'rules.json');
internals.destTmp = Path.join(__dirname, 'rules.json.tmp');
internals.metaFile = Path.join(__dirname, 'meta.json');
internals.metaFileTmp = Path.join(__dirname, 'meta.json.tmp');
internals.hashAlgo = 'sha512';

//
// Parse line (trim and ignore empty lines and comments).
//
internals.parseLine = function (line, cb) {

  const trimmed = line.trim();

  // Ignore empty lines and comments.
  if (!trimmed || (trimmed.charAt(0) === '/' && trimmed.charAt(1) === '/')) {
    return cb();
  }

  // Only read up to first whitespace char.
  const rule = trimmed.split(' ')[0];
  return cb(null, rule);

  const item = [rule];

  const suffix = rule.replace(/^(\*\.|\!)/, '');
  const wildcard = rule.charAt(0) === '*';
  const exception = rule.charAt(0) === '!';

  // If rule has no wildcard or exception we can get away with only one
  // element in the `item` array.
  if (suffix === rule && !wildcard && !exception) {
    return cb(null, item);
  }

  item.push(suffix);

  if (wildcard) {
    item.push(true);
  }

  if (exception) {
    item.push(true);
  }

  cb(null, item);
};

//
// Download rules and create rules.json file.
//
internals.downloadAndCreate = function (cb) {

  var headers;
  var srcHash = Crypto.createHash(internals.hashAlgo);
  srcHash.setEncoding('hex');

  var finished = 0;
  var finish = () => {

    if ((++finished) < 2) { // wait for both callbacks
      return;
    }

    var srcChecksum = internals.hashAlgo + '-' + srcHash.read();
    cb(null, headers, srcChecksum);
  };

  var req = Request.get(internals.src);

  // calculate stream checksum
  req.pipe(srcHash)
    .on('finish', finish);

  // process the stream into JSON
  req.on('response', (response) => {

    headers = response.headers;
  })
    .pipe(EventStream.split())
    .pipe(EventStream.map(internals.parseLine))
    .pipe(JSONStream.stringify('[', ',', ']'))
    .pipe(Fs.createWriteStream(internals.destTmp))
    .on('error', cb)
    .on('finish', finish);

};

internals.checksumFileSync = function (filename) {

  var oldHash = Crypto.createHash(internals.hashAlgo);
  oldHash.update(Fs.readFileSync(filename));
  return internals.hashAlgo + '-' + oldHash.digest('hex');
};

internals.commitIfChanged = function (headers, srcChecksum, cb) {

  var metadata = { checksum: '', src: '' };
  try {
    metadata = JSON.parse(Fs.readFileSync(internals.metaFile,'utf8'));
  }
  catch (e) {
    // just proceed with defaults
    console.error('Unable to read old metadata: ' + e.message);
  }

  var oldChecksum = internals.checksumFileSync(internals.dest);
  var newChecksum = internals.checksumFileSync(internals.destTmp);

  if (
    metadata.src === internals.src && // same URL
    metadata.srcChecksum === srcChecksum && // same raw data checksum
    metadata.checksum === oldChecksum && // same compiled JSON checksum
    oldChecksum === newChecksum // written JSON also the same
  ) {
    return cb(new Error('Rules file unchanged'));
  }

  metadata.src = internals.src;
  metadata.srcChecksum = srcChecksum;
  metadata.checksum = newChecksum;
  metadata.responseHeaders = headers;
  metadata.timestamp = new Date().toISOString();

  try {
    Fs.writeFileSync(internals.metaFileTmp, JSON.stringify(metadata) + '\n');
    Fs.renameSync(internals.metaFileTmp, internals.metaFile);
    Fs.renameSync(internals.destTmp, internals.dest);
  }
  catch (e) {
    console.error(e);
    return cb(new Error('Incomplete write of rules & metadata'));
  }

  console.log('Built list and saved to ' + internals.dest);
  console.log('Metadata:');
  console.log(metadata);
  cb(null);
};

internals.downloadAndCreate((err, headers, srcChecksum) => {

  if (err) {
    console.error(err);
    return process.exit(1);
  }

  internals.commitIfChanged(headers, srcChecksum, (err) => {

    if (err) {
      console.error(err);
      return process.exit(1);
    }
    process.exit(0);
  });
});
