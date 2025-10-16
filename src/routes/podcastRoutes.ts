import express from "express";
import { createPodcast, deletePodcast, getAllPodcasts, getPodcastWithEpisodes, updatePodcast } from "../controllers/podcastController";
import { upload } from "../utils/cloudinary";
import { verifyAdmin } from "../middleware/verifyAdmin";

const router = express.Router();

router.post(
  "/",
  verifyAdmin,
  (req, res, next) => {
    upload.fields([{ name: "coverImage", maxCount: 1 }])(req, res, (err) => {
      if (err) {
        console.error("Multer error:", err);
        return res.status(400).json({ message: err.message });
      }
      next();
    });
  },
  createPodcast
);

router.get("/", getAllPodcasts);

router.get('/getPodcastWithEpisodes/:id', getPodcastWithEpisodes);

router.patch(
  '/:id',
  verifyAdmin,
  upload.fields([{ name: "coverImage", maxCount: 1 }]),
  updatePodcast
);

router.delete('/:id', verifyAdmin, deletePodcast);

export default router;
