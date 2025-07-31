import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import axios from "axios";
import session from "express-session";
import dotenv from 'dotenv'

dotenv.config();


const app = express();
app.set("view engine", "ejs");
const port = 3000
const API_URL = "https://openlibrary.org/search.json?q="

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}));

const db = new pg.Client({
    user: "postgres",
    host: "localhost",
    database: "books",
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"))



let items = []

function requireAuth(req, res, next) {
  if (req.session.authenticated) {
    return next();
  }
  res.redirect('/login');
}

app.get("/", async (req, res) =>{
    try { 
        const result = await db.query("SELECT * FROM books ORDER BY date_read DESC");
        items = result.rows;

        res.render("home.ejs", {books: items, session: req.session})
    } catch (err) {
        console.error("failed to load books", err);
        res.status(500).send("error loading books.")
    }
})

app.get("/add", requireAuth, (req, res) => {
  res.render("add.ejs");
});

app.get("/edit/:id", requireAuth, async (req, res) => {
  const bookId = req.params.id;

  try {
    const result = await db.query("SELECT * FROM books WHERE id = $1", [bookId]);
    const book = result.rows[0];
    res.render("edit.ejs", { book });
  } catch (err) {
    console.error("Failed to load book for editing:", err);
    res.status(500).send("Error loading book.");
  }
});

app.get('/login', (req, res) => {
  res.render('login', { error: null });
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});


app.post('/login', (req, res) => {
  const { password } = req.body;
  const correctPassword = process.env.SESSION_PASSWORD;

  if (password === correctPassword) {
    req.session.authenticated = true;
    res.redirect('/');
  } else {
    res.render('login', { error: 'Incorrect password' });
  }
});

app.post("/add", requireAuth, async (req, res) => {
  const title = req.body.title_input;
  const rating = req.body.rating;
  const date = req.body.date_read;
  const notes = req.body.notes;

  let cover_url = null;
  let author = null;

  try {
    // Fetch cover and author info from Open Library
    const response = await axios.get(`${API_URL}${encodeURIComponent(title)}`);
    const bookData = response.data.docs[0];

    if (bookData) {
      if (bookData.cover_i) {
        cover_url = `https://covers.openlibrary.org/b/id/${bookData.cover_i}-M.jpg`;
      }
      if (bookData.author_name && bookData.author_name.length > 0) {
        author = bookData.author_name[0];
      }
    }

    // Insert all fields into database
    await db.query(
      "INSERT INTO books (title, author, rating, date_read, notes, cover_url) VALUES ($1, $2, $3, $4, $5, $6)",
      [title, author, rating, date, notes, cover_url]
    );

    res.redirect("/");
  } catch (err) {
    console.error("Failed to add book:", err);
    res.status(500).send("Error adding book.");
  }
});


app.post("/delete", requireAuth, async (req, res) => {
  const bookId = req.body.id;

  try {
    await db.query("DELETE FROM books WHERE id = $1", [bookId]);
    res.redirect("/");
  } catch (err) {
    console.error("Failed to delete book:", err);
    res.status(500).send("Error deleting book.");
  }
});

app.post("/edit", requireAuth, async (req, res) => {
  const { id, title, rating, date_read, notes } = req.body;

  try {
    await db.query(
      "UPDATE books SET title = $1, rating = $2, date_read = $3, notes = $4 WHERE id = $5",
      [title, rating, date_read, notes, id]
    );
    res.redirect("/");
  } catch (err) {
    console.error("Failed to update book:", err);
    res.status(500).send("Error updating book.");
  }
});



app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});