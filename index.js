import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import axios from "axios";
import env from "dotenv";


const app = express();
const port = 4000;
env.config();

const CLIENT_ID = process.env.CLIENT_ID;
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;


const db = new pg.Client({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT),
});

db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

app.get("/", async (req,res) => {
  const {gameId} = req.query;

  let reviews = [];

  try {
    const result = await db.query(`
      SELECT id, game_id, game_name, review_text, score, created_at
      FROM reviews
      ORDER BY game_name, created_at DESC
    `);

    const gamesMap = {};

    result.rows.forEach((review) => {
      if (!gamesMap[review.game_id]) {
        gamesMap[review.game_id] = {
          game_id: review.game_id,
          game_name: review.game_name,
          reviews: []
        };
      }

      gamesMap[review.game_id].reviews.push(review);
    });

    const games = Object.values(gamesMap);

    res.render("index.ejs", { games });

  } catch (err) {
    console.error(err);
    res.render("index.ejs", { games: [] });
  }
});

app.post("/search", async (req, res) => {
  const inputGame = req.body.game?.trim();

  if (!inputGame) {
    return res.render("index.ejs", { searchedGame: [] });
  }

  try {
    const response = await axios({
      method: "post",
      url: "https://api.igdb.com/v4/games",
      headers: {
        "Client-ID": CLIENT_ID,
        "Authorization": `Bearer ${ACCESS_TOKEN}`,
        "Content-Type": "text/plain",
      },
      data: `
        search "${inputGame}";
        fields
          id,
          name,
          cover.image_id,
          first_release_date,
          game_type,
          involved_companies.publisher,
          involved_companies.company.name;
        where
          game_type = 0
          & involved_companies.publisher = true
          & first_release_date != null;
        limit 50;
      `,
    });

    res.render("index.ejs", { searchedGame: response.data });

  } catch (error) {
    console.error("IGDB error:", error.response?.data || error.message);
  }
});

app.post("/select", async (req, res) => {
  const { gameId, gameName, imageId } = req.body;

  const reviewsResult = await db.query(
    `
    SELECT id, review_text, score, created_at
    FROM reviews
    WHERE game_id = $1
    ORDER BY created_at DESC
    `,
    [gameId]
  );

  res.render("index.ejs", {
    selectedGame: {
      id: gameId,
      name: gameName,
      imageUrl: imageId
        ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${imageId}.jpg`
        : null,
    },
    searchedGame: null,
    reviews: reviewsResult.rows
  });
});

app.post("/review", async (req, res) => {
  const { gameId, gameName, reviewText, score } = req.body;

  try {
    await db.query(
      `
      INSERT INTO reviews (game_id, game_name, review_text, score)
      VALUES ($1, $2, $3, $4)
      `,
      [gameId, gameName, reviewText, score]
    );

    res.redirect(`/?gameId=${gameId}`);
  } catch (error) {
    console.error(error);
    res.redirect("/");
  }
});

app.post("/delete-review", async (req, res) => {
  const { reviewId, gameId } = req.body;
  
  try {
    await db.query(
      `
      DELETE FROM reviews
      WHERE id = $1
      `,
      [reviewId]
    );

    res.redirect(`/?gameId=${gameId}`);

  } catch (error) {
    console.error(error);
    res.redirect("/");
  }
});

app.post("/edit-review", async (req, res) => {
  const {reviewId} = req.body;
  try {
    const result = await db.query(
      `
      SELECT * FROM reviews WHERE id = $1
      `,
      [reviewId]
    );
    res.render("edit-review.ejs", { review: result.rows[0] });

  } catch (error) {
    console.error(error);
    res.redirect("/");
  }
});

app.post("/update-review", async (req, res) => {
  const {reviewId, reviewText, score, gameId} = req.body;
  try {
    await db.query(
      `
      UPDATE reviews
      SET review_text = $1, 
      score = $2
      WHERE id = $3
      `,
      [reviewText, score, reviewId]
    );

    res.redirect(`/?gameId=${gameId}`);
    
  } catch (error) {
    console.error(error);
    res.redirect("/");
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});