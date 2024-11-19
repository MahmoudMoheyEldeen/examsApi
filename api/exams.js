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

// Serve static files (for images or other assets)
app.use('/assets', express.static('public/assets'));

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
      _id: { type: String, required: true }, // Each question has its own unique _id
      question: { type: String, required: true },
      choices: [{ type: String, required: true }],
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

// GET route to retrieve a specific exam by _id (as a string)
app.get('/exams/:_id', async (req, res) => {
  try {
    const exam = await Exam.findOne({ _id: req.params._id }); // Query by string
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
    res.status(201).json({ message: 'Exam created successfully', newExam });
  } catch (err) {
    res
      .status(400)
      .json({ message: 'Failed to create exam', error: err.message });
  }
});

// PUT route to update an exam by _id (as a string)
app.put('/exams/:_id', async (req, res) => {
  try {
    const updatedExam = await Exam.findOneAndUpdate(
      { _id: req.params._id }, // Match _id as a string
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );
    if (!updatedExam)
      return res.status(404).json({ message: 'Exam not found' });
    res.status(200).json(updatedExam);
  } catch (err) {
    res
      .status(400)
      .json({ message: 'Failed to update exam', error: err.message });
  }
});

// DELETE route to remove an exam by _id (as a string)
app.delete('/exams/:_id', async (req, res) => {
  try {
    const deletedExam = await Exam.findOneAndDelete({ _id: req.params._id }); // Match _id as a string
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
