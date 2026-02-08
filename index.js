import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import axios from "axios";

const app = express();
const port = 4000;

const CLIENT_ID = '9njidm9ekkmmk2c3wbaarn7z0opfq9';
const ACCESS_TOKEN = '8jp1uikfy3to4ftlgxty9vjcjvpv2d';


const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "permalist",
  password: "botan4912",
  port: 5432,
});

db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

app.get("/", (req,res) => {
    res.render("index.ejs");
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

  if (!gameId) {
    return res.redirect("/");
  }

  const selectedGame = {
    id: gameId,
    name: gameName,
    imageUrl: imageId
      ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${imageId}.jpg`
      : null,
  };

  res.render("index.ejs", {
    selectedGame,
    searchedGame: null
  });
});

app.post("/review", async (req, res) => {
  const { gameId, gameName, reviewText, score } = req.body;

  console.log({
    gameId,
    gameName,
    reviewText,
    score,
  });

  // Later: save to PostgreSQL
  res.redirect("/");
});


app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});