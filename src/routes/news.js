const express = require("express");
const newsSchema = require("../models/news")

const router = express.Router();

//create news
router.post('/news', (req, res) => {
    const news = newsSchema(req.body);

    news.save().then((data) => res.json(data)).catch((error) => res.json({ message: error }));

})

//get news
router.get('/news', (req, res) => {

    newsSchema.find().then((data) => res.json(data)).catch((error) => res.json({ message: error }));

})

//get a news
router.get('/news/:id', (req, res) => {
    const { id } = req.params;

    newsSchema.findById(id).then((data) => res.json(data)).catch((error) => res.json({ message: error }));

})

//uptade news

router.put('/news/:id', (req, res) => {
    const { id } = req.params;

    newsSchema.updateOne({ _id: id }, { $set: req.body })
        .then((data) => res.json(data))
        .catch((error) => res.json({ message: error }));
});

//delete news
router.delete('/news/:id', (req, res) => {
    const { id } = req.params;


    newsSchema.deleteOne({ _id: id }).then((data) => res.json(data)).catch((error) => res.json({ message: error }));

})

module.exports = router;