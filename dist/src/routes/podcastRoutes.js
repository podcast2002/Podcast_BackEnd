"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const podcastController_1 = require("../controllers/podcastController");
const cloudinary_1 = require("../utils/cloudinary");
const verifyAdmin_1 = require("../middleware/verifyAdmin");
const router = express_1.default.Router();
router.post("/", verifyAdmin_1.verifyAdmin, (req, res, next) => {
    cloudinary_1.upload.fields([{ name: "coverImage", maxCount: 1 }])(req, res, (err) => {
        if (err) {
            console.error("Multer error:", err);
            return res.status(400).json({ message: err.message });
        }
        next();
    });
}, podcastController_1.createPodcast);
router.get("/", podcastController_1.getAllPodcasts);
router.get('/getPodcastWithEpisodes/:id', podcastController_1.getPodcastWithEpisodes);
router.patch('/:id', verifyAdmin_1.verifyAdmin, cloudinary_1.upload.fields([{ name: "coverImage", maxCount: 1 }]), podcastController_1.updatePodcast);
router.delete('/:id', verifyAdmin_1.verifyAdmin, podcastController_1.deletePodcast);
exports.default = router;
