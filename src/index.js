const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const Connection = require('./db/Connection');
const router = require('./routes/web')
const app = express();
const port = 3001;
require('dotenv').config();

app.use(cookieParser())
app.use(express.json());
app.use(cors({
  credentials: true,
  origin: [
    process.env.FRONTEND_URL
  ]
}));
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(router);

new Connection()

app.get('/', (req, res) => {
  res.send('hello to phone shop server')
})

app.listen(port, () => {
  console.log(`App listening on port ${port}`)
})
