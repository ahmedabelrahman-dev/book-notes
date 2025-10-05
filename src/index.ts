import express, { Request, Response } from "express";
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
const port = Number(process.env.PORT || 3000);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.set("view engine", "ejs");

const db = new pg.Client({
  user: process.env.DB_USER || "postgres",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "Book notes",
  password: process.env.DB_PASSWORD || "00000000",
  port: Number(process.env.DB_PORT || 5432),
});
db.connect();

app.get("/", async (req: Request, res: Response) => {
  try {
    const result = await db.query("SELECT * FROM books ORDER BY id ASC");
    res.render("index.ejs", { books: result.rows });
  } catch (err) {
    console.error("Error loading books:", err);
    res.status(500).send("Error loading books");
  }
});

app.post("/add", async (req: Request, res: Response) => {
  const query = (req.body.query || "").toString().trim();
  try {
    const apiRes = await axios.get(`https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=1`);
    const bookData = apiRes.data.docs && apiRes.data.docs[0];
    if (!bookData) {
      return res.send("No book found.");
    }

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
    res.status(500).send("Error adding book from API");
  }
});

app.post("/delete", async (req: Request, res: Response) => {
  const bookId = req.body.bookId; // ✅ match the form
  try {
    await db.query("DELETE FROM books WHERE id = $1", [bookId]);
    res.redirect("/");
  } catch (err) {
    console.error("Error deleting book:", err);
    res.status(500).send("Error deleting book");
  }
});

app.post("/edit", async (req: Request, res: Response) => {
  const id = req.body.bookId; // ✅ match the form field
  const title = req.body.newTitle; // ✅ match the form field
  try {
    await db.query("UPDATE books SET title = $1 WHERE id = $2", [title, id]);
    res.redirect("/");
  } catch (err) {
    console.error("Error editing book:", err);
    res.status(500).send("Error editing book");
  }
});

app.listen(port, () => {
  console.log(`✅ Server running on http://localhost:${port}`);
});
