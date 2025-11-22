// routes/companies.js
const express = require('express');
const { ObjectId } = require('mongodb');
const { getDb } = require('../db/connect');
const { requiresAuth } = require('../middleware/auth'); // 🔐 NEW

const router = express.Router();
const COLLECTION = 'companies';

// ──────────────────────────────────────────────
//  Validation
// ──────────────────────────────────────────────
function validateCompany(body) {
  const errs = [];
  if (!body || typeof body !== 'object') errs.push('body required');
  if (!body.name || typeof body.name !== 'string') errs.push('name required (string)');
  if (body.domain && typeof body.domain !== 'string') errs.push('domain must be string');

  if (errs.length) {
    const e = new Error(errs.join('; '));
    e.status = 400; // 400 = bad request / validation error
    throw e;
  }
}

// ──────────────────────────────────────────────
//  Routes for /api/companies
// ──────────────────────────────────────────────

// GET /api/companies  (all) — public
router.get('/', async (_req, res) => {
  try {
    const docs = await getDb().collection(COLLECTION).find().toArray();
    res.status(200).json(docs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch companies' });
  }
});

// GET /api/companies/:id  (one) — public
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid company id' });
    }

    const doc = await getDb()
      .collection(COLLECTION)
      .findOne({ _id: new ObjectId(id) });

    if (!doc) {
      return res.status(404).json({ message: 'Company not found' });
    }

    res.status(200).json(doc);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch company' });
  }
});

// POST /api/companies  (create) — 🔐 protected
router.post('/', requiresAuth, async (req, res) => {
  try {
    validateCompany(req.body);

    const { insertedId } = await getDb()
      .collection(COLLECTION)
      .insertOne(req.body);

    const created = await getDb()
      .collection(COLLECTION)
      .findOne({ _id: insertedId });

    res.status(201).json(created);
  } catch (err) {
    console.error(err);
    res.status(err.status || 500).json({ message: err.message || 'Failed to create company' });
  }
});

// PUT /api/companies/:id  (update) — 🔐 protected
router.put('/:id', requiresAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid company id' });
    }

    validateCompany(req.body);

    const result = await getDb()
      .collection(COLLECTION)
      .findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: req.body },
        { returnDocument: 'after' }
      );

    if (!result.value) {
      return res.status(404).json({ message: 'Company not found' });
    }

    res.status(200).json(result.value);
  } catch (err) {
    console.error(err);
    res.status(err.status || 500).json({ message: err.message || 'Failed to update company' });
  }
});

// DELETE /api/companies/:id  (remove) — 🔐 protected
router.delete('/:id', requiresAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid company id' });
    }

    const result = await getDb()
      .collection(COLLECTION)
      .deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Company not found' });
    }

    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to delete company' });
  }
});

module.exports = router;
