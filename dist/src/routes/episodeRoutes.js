"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const episodeController_1 = require("../controllers/episodeController");
const cloudinary_1 = require("../utils/cloudinary");
const verifyAdmin_1 = require("../middleware/verifyAdmin");
const router = express_1.default.Router();
router.post("/", verifyAdmin_1.verifyAdmin, cloudinary_1.upload.fields([
    { name: "audio", maxCount: 1 },
    { name: "coverImage", maxCount: 1 }
]), episodeController_1.createEpisode);
router.get('/', episodeController_1.getAllEpisodes);
router.get('/:id', episodeController_1.getEpisode);
router.patch('/:id', verifyAdmin_1.verifyAdmin, cloudinary_1.upload.fields([
    { name: "audio", maxCount: 1 },
    { name: "coverImage", maxCount: 1 }
]), episodeController_1.updateEpisode);
router.delete('/:id', verifyAdmin_1.verifyAdmin, episodeController_1.deleteEpisode);
exports.default = router;
