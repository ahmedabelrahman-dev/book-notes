import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import axios from "axios";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.set("view engine", "ejs");

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "Book notes",
  password: "00000000",
  port: 5432,
});
db.connect();

app.get("/", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM books ORDER BY id ASC");
    res.render("index.ejs", { books: result.rows });
  } catch (err) {
    console.error("Error loading books:", err);
    res.send("Error loading books");
  }
});

app.post("/add", async (req, res) => {
  const query = req.body.query.trim();
  try {
    const apiRes = await axios.get(`https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=1`);
    const bookData = apiRes.data.docs[0];
    if (!bookData) {
      return res.send("No book found.");
  
    }
    console.log(
      "title:", bookData.title,
      "author_name:", bookData.author_name,
      "cover_i:", bookData.cover_i
    );
    const title = bookData.title || "Untitled";
    const author = bookData.author_name ? bookData.author_name[0] : "Unknown Author";
    const coverId = bookData.cover_i;
    const coverUrl = coverId ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg` : "";

    await db.query(
      "INSERT INTO books (title, author, cover_url) VALUES ($1, $2, $3)",
      [title, author, coverUrl]
    );
    res.redirect("/");
  } catch (err) {
    console.error("Error adding book from API:", err);
    res.send("Error adding book from API");
  }
});

app.post("/delete", async (req, res) => {
  const bookId = req.body.bookId; // ✅ match the form
  try {
    await db.query("DELETE FROM books WHERE id = $1", [bookId]);
    res.redirect("/");
  } catch (err) {
    console.error("Error deleting book:", err);
    res.send("Error deleting book");
  }
});

app.post("/edit", async (req, res) => {
  const id = req.body.bookId;       // ✅ match the form field
  const title = req.body.newTitle;  // ✅ match the form field
  try {
    await db.query("UPDATE books SET title = $1 WHERE id = $2", [title, id]);
    res.redirect("/");
  } catch (err) {
    console.error("Error editing book:", err);
    res.send("Error editing book");
  }
});

app.listen(port, () => {
  console.log(`✅ Server running on http://localhost:${port}`);
});
