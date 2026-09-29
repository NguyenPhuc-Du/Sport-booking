const express = require('express');
const bodyParser = require("body-parser");
const methodOverride = require("method-override");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const flash = require("express-flash");
const routeAdmin = require("./routes/admin/index.route");


require("dotenv").config();

const database = require("./config/database");
database.connect();

const app = express();
const port = process.env.PORT;

app.use(methodOverride("_method"));

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({extended: false}));

app.set("views","./views");
app.set("view engine","pug");

//Flash
app.use(cookieParser("GEIWGEPQINGEQP"));
app.use(session({
  secret: "GEIWGEPQINGEQP",
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 60000 }
}));
app.use(flash());
//End Flash

app.use(express.static(`${__dirname}/public`));

//Routes
routeAdmin(app);


app.listen(port, () => {
  console.log(`app listening on port ${port}`);
});