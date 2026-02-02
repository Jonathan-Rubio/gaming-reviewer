import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import axios from "axios";

const app = express();
const port = 4000;

const CLIENT_ID = '9njidm9ekkmmk2c3wbaarn7z0opfq9';
const ACCESS_TOKEN = 'Bearer 8jp1uikfy3to4ftlgxty9vjcjvpv2d';


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
    console.log(req.body);
    const inputGame = req.body.game.toString();
      try {
        const response = await axios({
            method: 'post',
            url: 'https://api.igdb.com/v4/games',
            headers: {
                'Client-ID': CLIENT_ID,
                'Authorization': ACCESS_TOKEN,
            },
            data: `search "${inputGame}"; fields name, cover.url; limit 50;`, 
        });
        console.log(response.data);
    } catch (error) {
        console.error(error);
  }
    res.render("index.ejs");
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});