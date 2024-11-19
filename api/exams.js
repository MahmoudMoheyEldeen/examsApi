require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();

// CORS configuration
const corsOptions = {
  origin: ['http://localhost:4200', 'https://your-angular-app-url'], // Replace with your Angular app URL
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());

// MongoDB connection using environment variable for the URI
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch((err) => {
    console.error('Failed to connect to MongoDB:', err.message);
    process.exit(1);
  });

// Define the Exam Schema with validation
const examSchema = new mongoose.Schema({
  division: { type: String, required: true },
  level: { type: String, required: true },
  term: { type: String, required: true },
  subject: { type: String, required: true },
  year: { type: String, required: true },
  exam: [
    {
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

// Root route
app.get('/', (req, res) => {
  res.send('Exams API is running');
});

// GET route to retrieve all exams
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

// GET route to retrieve a specific exam by ID
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

// POST route to add a new exam
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

// PUT route to add a question to the exam array based on criteria
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
      { division, level, term, subject, year }, // Match the document
      { $push: { exam: { question, choices } } }, // Push the new question and choices
      { new: true, runValidators: true } // Return the updated document
    );

    if (!updatedExam) {
      return res.status(404).json({ message: 'Exam document not found' });
    }

    res
      .status(200)
      .json({ message: 'Question added successfully', updatedExam });
  } catch (err) {
    res
      .status(500)
      .json({ message: 'Failed to add question', error: err.message });
  }
});

// PUT route to update an exam by ID
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

// DELETE route to remove an exam by ID
app.delete('/exams/:id', async (req, res) => {
  try {
    const deletedExam = await Exam.findByIdAndDelete(req.params.id);
    if (!deletedExam)
      return res.status(404).json({ message: 'Exam not found' });
    res.status(204).send(); // No content response on successful deletion
  } catch (err) {
    res
      .status(500)
      .json({ message: 'Failed to delete exam', error: err.message });
  }
});

// Set the port dynamically or fallback to 3000
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

module.exports = app;
