// routes/people.js
const express = require('express');
const { ObjectId } = require('mongodb');
const { getDb } = require('../db/connect');
const { requiresAuth } = require('../middleware/auth'); // 🔐 NEW

const router = express.Router();

// ──────────────────────────────────────────────
//  PEOPLE COLLECTION (7+ fields for rubric)
// ──────────────────────────────────────────────
const COLLECTION = 'people';
const REQUIRED = [
  'firstName',
  'lastName',
  'email',
  'favoriteColor',
  'birthday',
  'phone',
  'address',
  'jobTitle'
];

// ---------- Validation ----------
const isEmail = (s) => typeof s === 'string' && /\S+@\S+\.\S+/.test(s);
// Accepts "YYYY-MM-DD" or any Date.parse-able string
const isISODate = (s) => typeof s === 'string' && !isNaN(Date.parse(s));

function validatePerson(body) {
  const errs = [];
  if (!body || typeof body !== 'object') errs.push('body required');

  // presence of required fields
  for (const k of REQUIRED) {
    if (!(k in body)) errs.push(`${k} is required`);
  }

  // types / formats
  if (body.firstName && typeof body.firstName !== 'string') errs.push('firstName must be string');
  if (body.lastName && typeof body.lastName !== 'string') errs.push('lastName must be string');
  if (body.email && !isEmail(body.email)) errs.push('email must be valid');
  if (body.favoriteColor && typeof body.favoriteColor !== 'string') errs.push('favoriteColor must be string');
  if (body.birthday && !isISODate(body.birthday)) errs.push('birthday must be a valid date (e.g., YYYY-MM-DD)');

  if (body.phone && typeof body.phone !== 'string') errs.push('phone must be string');
  if (body.address && typeof body.address !== 'string') errs.push('address must be string');
  if (body.jobTitle && typeof body.jobTitle !== 'string') errs.push('jobTitle must be string');

  if (errs.length) {
    const e = new Error(errs.join('; '));
    e.status = 400; // rubric: return 400 for validation failures
    throw e;
  }
}

// ──────────────────────────────────────────────
//  Routes for /api/people
// ──────────────────────────────────────────────

// GET /api/people  (all) — public
router.get('/', async (_req, res) => {
  try {
    const docs = await getDb().collection(COLLECTION).find().toArray();
    res.status(200).json(docs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch people' });
  }
});

// GET /api/people/:id  (one) — public
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid person id' });
    }

    const doc = await getDb().collection(COLLECTION).findOne({ _id: new ObjectId(id) });
    if (!doc) return res.status(404).json({ message: 'Person not found' });

    res.status(200).json(doc);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch person' });
  }
});

// POST /api/people  (create) — 🔐 protected
router.post('/', requiresAuth, async (req, res) => {
  try {
    validatePerson(req.body);

    const { insertedId } = await getDb().collection(COLLECTION).insertOne(req.body);
    const created = await getDb().collection(COLLECTION).findOne({ _id: insertedId });

    res.status(201).json(created); // 201 on create
  } catch (err) {
    console.error(err);
    res.status(err.status || 500).json({ message: err.message || 'Failed to create person' });
  }
});

// PUT /api/people/:id  (update) — public (you can protect this too if you want)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid person id' });
    }

    validatePerson(req.body);

    const updateData = {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      email: req.body.email,
      favoriteColor: req.body.favoriteColor,
      birthday: req.body.birthday,
      phone: req.body.phone,
      address: req.body.address,
      jobTitle: req.body.jobTitle
    };

    const result = await getDb()
      .collection(COLLECTION)
      .findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: updateData },
        { returnDocument: 'after' }
      );

    if (!result.value) {
      return res.status(404).json({ message: 'Person not found' });
    }

    return res.status(200).json(result.value);
  } catch (err) {
    console.error(err);
    return res.status(err.status || 500).json({ message: err.message || 'Failed to update person' });
  }
});

// DELETE /api/people/:id  (remove) — public (optional to protect)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid person id' });
    }

    const result = await getDb()
      .collection(COLLECTION)
      .deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Person not found' });
    }

    return res.status(204).send(); // 204 No Content
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to delete person' });
  }
});

module.exports = router;
