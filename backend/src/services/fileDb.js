const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../../data');
const locks = {};

function readJson(filename) {
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) return [];
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return [];
  }
}

function readJsonObject(filename) {
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) return {};
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return {};
  }
}

function writeJson(filename, data) {
  const filePath = path.join(DATA_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

// Ghi có lock: serialize tất cả write vào cùng một file để tránh race condition
async function appendJson(filename, item, { maxItems } = {}) {
  if (!locks[filename]) locks[filename] = Promise.resolve();
  const op = locks[filename].then(() => {
    const arr = readJson(filename);
    arr.push(item);
    const toWrite = maxItems && arr.length > maxItems ? arr.slice(arr.length - maxItems) : arr;
    writeJson(filename, toWrite);
  });
  locks[filename] = op.catch(() => {});
  return op;
}

module.exports = { readJson, writeJson, readJsonObject, appendJson };
