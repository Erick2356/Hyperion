const express = require("express");
const mongoose = require('mongoose');
require("dotenv").config();
const userRoutes = require("./routes/user");
const newsRoutes = require("./routes/news");




const app = express();
const port = process.env.PORT || 9000;

//middleware
app.use(express.json());
app.use('/api', userRoutes);
app.use('/api', newsRoutes);
//routes
app.get('/', (req, res) => {

    res.send("API");

})

//mongodbC
mongoose.connect(process.env.MONGODB_URI).then(() => console.log("Connected to MongoDB")).catch((error) => console.error(error));


app.listen(port, () => console.log("server listening on the port", port));