require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();

// Apply unrestricted CORS
app.use(cors()); // Allow all origins

// Middleware to handle JSON data
app.use(express.json());

// MongoDB connection
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch((err) => {
    console.error('Failed to connect to MongoDB:', err.message);
    process.exit(1);
  });

// Define the Exam Schema
const examSchema = new mongoose.Schema({
  division: { type: String, required: true },
  level: { type: String, required: true },
  term: { type: String, required: true },
  subject: { type: String, required: true },
  year: { type: String, required: true },
  exam: [
    {
      _id: false, // Disable automatic ObjectId generation for subdocuments
      question: { type: String, required: true },
      choices: {
        type: [String],
        validate: [
          (val) => val.length >= 2,
          'At least two choices are required',
        ],
      },
      image: { type: String }, // Optional local image path
    },
  ],
});

const Exam = mongoose.model('Exam', examSchema, 'exams');

// API Routes

// Root route
app.get('/', (req, res) => {
  res.send('Exams API is running');
});

// GET: Retrieve all exams
app.get('/exams', async (req, res) => {
  try {
    const exams = await Exam.find();
    res.status(200).json(exams);
  } catch (err) {
    res
      .status(500)
      .json({ message: 'Failed to retrieve exams', error: err.message });
  }
});

// GET: Retrieve a specific exam by ID
app.get('/exams/:id', async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) return res.status(404).json({ message: 'Exam not found' });
    res.status(200).json(exam);
  } catch (err) {
    res
      .status(500)
      .json({ message: 'Failed to retrieve exam', error: err.message });
  }
});

// POST: Add a new exam
app.post('/exams', async (req, res) => {
  const { division, level, term, subject, year, exam } = req.body;

  if (!division || !level || !term || !subject || !year || !exam) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  const newExam = new Exam({
    division,
    level,
    term,
    subject,
    year,
    exam,
  });

  try {
    await newExam.save();
    res.status(201).json({ message: 'Exam created successfully' });
  } catch (err) {
    res
      .status(400)
      .json({ message: 'Failed to create exam', error: err.message });
  }
});

// PUT: Add a question to an existing exam
app.put('/exams/add-question', async (req, res) => {
  const { division, level, term, subject, year, question, choices } = req.body;

  if (
    !division ||
    !level ||
    !term ||
    !subject ||
    !year ||
    !question ||
    !choices
  ) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    const updatedExam = await Exam.findOneAndUpdate(
      { division, level, term, subject, year },
      { $push: { exam: { question, choices } } },
      { new: true, runValidators: true }
    );

    if (!updatedExam)
      return res.status(404).json({ message: 'Exam document not found' });

    res
      .status(200)
      .json({ message: 'Question added successfully', updatedExam });
  } catch (err) {
    res
      .status(500)
      .json({ message: 'Failed to add question', error: err.message });
  }
});

// DELETE: Remove a question by index
app.delete('/exams/remove-question', async (req, res) => {
  const { division, level, term, subject, year, index } = req.body;

  if (
    !division ||
    !level ||
    !term ||
    !subject ||
    !year ||
    index === undefined
  ) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    const exam = await Exam.findOne({ division, level, term, subject, year });
    if (!exam)
      return res.status(404).json({ message: 'Exam document not found' });

    if (index < 0 || index >= exam.exam.length) {
      return res.status(400).json({ message: 'Invalid question index' });
    }

    exam.exam.splice(index, 1);
    await exam.save();

    res.status(200).json({ message: 'Question removed successfully', exam });
  } catch (err) {
    res
      .status(500)
      .json({ message: 'Failed to remove question', error: err.message });
  }
});

// PUT: Update an exam by ID
app.put('/exams/:id', async (req, res) => {
  try {
    const updatedExam = await Exam.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!updatedExam)
      return res.status(404).json({ message: 'Exam not found' });
    res.status(200).json(updatedExam);
  } catch (err) {
    res
      .status(400)
      .json({ message: 'Failed to update exam', error: err.message });
  }
});

// DELETE: Remove an exam by ID
app.delete('/exams/:id', async (req, res) => {
  try {
    const deletedExam = await Exam.findByIdAndDelete(req.params.id);
    if (!deletedExam)
      return res.status(404).json({ message: 'Exam not found' });
    res.status(204).send();
  } catch (err) {
    res
      .status(500)
      .json({ message: 'Failed to delete exam', error: err.message });
  }
});

// Set the port dynamically
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

module.exports = app;
