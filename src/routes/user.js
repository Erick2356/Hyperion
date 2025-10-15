const express = require("express");
const userSchema = require("../models/user");

const router = express.Router();

//create user
router.post('/users', (req, res) => {
    const user = userSchema(req.body);

    user.save().then((data) => res.json(data)).catch((error) => res.json({ message: error }));

})

//get users
router.get('/users', (req, res) => {

    userSchema.find().then((data) => res.json(data)).catch((error) => res.json({ message: error }));

})

//get a user
router.get('/users/:id', (req, res) => {
    const { id } = req.params;

    userSchema.findById(id).then((data) => res.json(data)).catch((error) => res.json({ message: error }));

})

//uptade user
router.put('/users/:id', (req, res) => {
    const { id } = req.params;
    const { nombre, email, contraseña, rol } = req.body;

    userSchema.updateOne({ _id: id }, { $set: { nombre, email, contraseña, rol } }).then((data) => res.json(data)).catch((error) => res.json({ message: error }));

})

//delete user
router.delete('/users/:id', (req, res) => {
    const { id } = req.params;


    userSchema.deleteOne({ _id: id }).then((data) => res.json(data)).catch((error) => res.json({ message: error }));

})




module.exports = router;