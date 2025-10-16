const express = require('express');
const auth = require('../middleware/auth');
const Note = require('../models/Note');

const router = express.Router();

// Create note - POST /api/notes
router.post('/', auth, async (req, res, next) => {
  try {
    const { title, content, tags } = req.body;
    if (!title || !content) return res.status(400).json({ message: 'Title and content are required' });

    const note = new Note({
      owner: req.user._id,
      title,
      content,
      tags: Array.isArray(tags) ? tags : (typeof tags === 'string' && tags.length ? tags.split(',').map(t => t.trim()) : [])
    });

    await note.save();
    res.status(201).json(note);
  } catch (err) {
    next(err);
  }
});

// GET /api/notes?tag=work&search=project
// GET /api/notes?tag=work&search=project
// GET /api/notes?tag=work&search=project
router.get('/', auth, async (req, res, next) => {
  try {
    const { tag, search, page = 1, limit = 20 } = req.query;

    const filter = {};

    // 🔍 Filter by tag if provided
    if (tag) {
      filter.tags = { $in: [new RegExp('^' + tag + '$', 'i')] };
    }

    // 🔍 Search in title/content if provided
    if (search) {
      const q = new RegExp(search, 'i');
      filter.$or = [{ title: q }, { content: q }];
    }

    const skip = (Math.max(1, parseInt(page)) - 1) * Math.max(1, parseInt(limit));
    const notes = await Note.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Note.countDocuments(filter);
    res.json({ total, page: parseInt(page), limit: parseInt(limit), notes });
  } catch (err) {
    next(err);
  }
});


// GET single note - GET /api/notes/:id
router.get('/:id', auth, async (req, res, next) => {
  try {
    const note = await Note.findOne({ _id: req.params.id, owner: req.user._id });
    if (!note) return res.status(404).json({ message: 'Note not found' });
    res.json(note);
  } catch (err) {
    next(err);
  }
});

// Update note - PUT /api/notes/:id
router.put('/:id', auth, async (req, res, next) => {
  try {
    const { title, content, tags } = req.body;
    const note = await Note.findOne({ _id: req.params.id, owner: req.user._id });
    if (!note) return res.status(404).json({ message: 'Note not found or unauthorized' });

    if (title !== undefined) note.title = title;
    if (content !== undefined) note.content = content;
    if (tags !== undefined) {
      note.tags = Array.isArray(tags) ? tags : (typeof tags === 'string' && tags.length ? tags.split(',').map(t => t.trim()) : []);
    }

    await note.save();
    res.json(note);
  } catch (err) {
    next(err);
  }
});

// Delete note - DELETE /api/notes/:id
router.delete('/:id', auth, async (req, res, next) => {
  try {
    const note = await Note.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
    if (!note) return res.status(404).json({ message: 'Note not found or unauthorized' });
    res.json({ message: 'Note deleted' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
// working fine