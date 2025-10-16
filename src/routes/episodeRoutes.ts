import express from "express";
import { createEpisode, deleteEpisode, getAllEpisodes, getEpisode, updateEpisode } from "../controllers/episodeController";
import { upload } from "../utils/cloudinary";
import { verifyAdmin } from "../middleware/verifyAdmin";

const router = express.Router();

router.post(
  "/",
  verifyAdmin,
  upload.fields([
    { name: "audio", maxCount: 1 },
    { name: "coverImage", maxCount: 1 }
  ]),
  createEpisode
);


router.get('/', getAllEpisodes);

router.get('/:id', getEpisode);

router.patch('/:id', verifyAdmin,
  upload.fields([
    { name: "audio", maxCount: 1 },
    { name: "coverImage", maxCount: 1 }
  ]),
  updateEpisode)
  ;

router.delete('/:id', verifyAdmin, deleteEpisode);

export default router;
