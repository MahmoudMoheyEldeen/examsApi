require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');

// Create an Express application
const app = express();

// CORS configuration
const corsOptions = {
  origin: ['http://localhost:4200', 'https://your-angular-app-url'], // Replace with your Angular app URL
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};

// Apply CORS with specific options
app.use(cors(corsOptions));

// Middleware to handle JSON data
app.use(express.json());

// Serve static files (uploaded images)
app.use('/uploads', express.static('public/uploads'));

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
      choices: [{ type: String, required: true }],
      image: { type: String }, // Image path
    },
  ],
});

// Create the Exam model from the schema
const Exam = mongoose.model('Exam', examSchema, 'exams');

// Configure storage for Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads'); // Directory where files will be saved
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname)); // Unique file name
  },
});

// Initialize Multer with storage configuration
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Limit file size to 5 MB
  fileFilter: (req, file, cb) => {
    const fileTypes = /jpeg|jpg|png|gif/;
    const extname = fileTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimeType = fileTypes.test(file.mimetype);
    if (extname && mimeType) {
      cb(null, true);
    } else {
      cb(new Error('Only images are allowed'));
    }
  },
});

// API Routes

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

// POST route to add a new exam with image upload
app.post('/exams', upload.single('image'), async (req, res) => {
  const { division, level, term, subject, year, exam } = req.body;

  if (!division || !level || !term || !subject || !year || !exam) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    const examArray = JSON.parse(exam).map((item) => {
      if (req.file && item.question) {
        item.image = `/uploads/${req.file.filename}`;
      }
      return item;
    });

    const newExam = new Exam({
      division,
      level,
      term,
      subject,
      year,
      exam: examArray,
    });

    await newExam.save();
    res
      .status(201)
      .json({ message: 'Exam created successfully', exam: newExam });
  } catch (err) {
    res
      .status(400)
      .json({ message: 'Failed to create exam', error: err.message });
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
