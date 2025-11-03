const express = require("express");
const router = express.Router();
const Journalist = require("../models/journalist");

// CREATE (POST)
router.post("/", async (req, res) => {
    try {
        const journalist = new Journalist(req.body);
        await journalist.save();
        res.status(201).json(journalist);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// READ ALL (GET)
router.get("/", async (req, res) => {
    try {
        const journalists = await Journalist.find();
        res.json(journalists);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// READ ONE (GET by ID)
router.get("/:id", async (req, res) => {
    try {
        const journalist = await Journalist.findById(req.params.id);
        if (!journalist) return res.status(404).json({ message: "Journalist not found" });
        res.json(journalist);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// UPDATE (PUT)
router.put("/:id", async (req, res) => {
    try {
        const journalist = await Journalist.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
        });
        if (!journalist) return res.status(404).json({ message: "Journalist not found" });
        res.json(journalist);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// DELETE (DELETE)
router.delete("/:id", async (req, res) => {
    try {
        const deletedJournalist = await Journalist.findByIdAndDelete(req.params.id);
        if (!deletedJournalist) return res.status(404).json({ message: "Journalist not found" });
        res.json({ message: "Journalist deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
