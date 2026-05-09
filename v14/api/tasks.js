'use strict';

// Route dispatcher: GET /api/tasks → list, POST → create, PUT → update
const list   = require('./tasks/list');
const create = require('./tasks/create');
const update = require('./tasks/update');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-rbtr-auth, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  if (req.method === 'GET')  return list(req, res);
  if (req.method === 'POST') return create(req, res);
  if (req.method === 'PUT')  return update(req, res);

  res.status(405).json({ error: 'Method not allowed' });
};
