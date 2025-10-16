import Podcast from "../models/Podcast";
import Episode from "../models/Episode";
import { Request, Response } from "express";
import mongoose from "mongoose";
import { cloudinary } from "../utils/cloudinary";

const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; 

const getCachedData = (key: string) => {
    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data;
    }
    cache.delete(key);
    return null;
};

const setCachedData = (key: string, data: any) => {
    cache.set(key, { data, timestamp: Date.now() });
};

export const createPodcast = async (req: Request, res: Response) => {
    try {
        const { title, description } = req.body;

        if (!title?.trim() || !description?.trim()) {
            return res
                .status(400)
                .json({ message: "Please provide both title and description" });
        }

        const sanitizedTitle = title.trim().substring(0, 200);
        const sanitizedDescription = description.trim().substring(0, 2000);

        const coverFile =
            (req.files as { coverImage?: Express.Multer.File[] })?.coverImage?.[0];

        const podcastData: any = {
            title: sanitizedTitle,
            description: sanitizedDescription
        };

        if (coverFile) {
            const uploadedUrl =
                (coverFile as any).path ||
                (coverFile as any).secure_url ||
                (coverFile as any).url;

            if (uploadedUrl) {
                podcastData.coverImageUrl = uploadedUrl;
            } else {
                console.warn("No Cloudinary URL returned for cover image");
            }
        }

        const podcast = await Podcast.create(podcastData);

        cache.clear();

        return res.status(201).json({
            message: "Podcast created successfully",
            data: podcast,
        });
    } catch (err: any) {
        console.error("Error creating podcast:", err);
        return res.status(500).json({
            message: err.message || "Server error while creating podcast",
        });
    }
};


export const getAllPodcasts = async (req: Request, res: Response) => {
    try {
        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10));
        const skip = (page - 1) * limit;

        const search = (req.query.search as string)?.trim() || "";

        const cacheKey = `podcasts_${page}_${limit}_${search}`;

        const cachedResult = getCachedData(cacheKey);
        if (cachedResult) {
            return res.json(cachedResult);
        }

        const searchFilter = search
            ? {
                $or: [
                    { title: { $regex: search, $options: "i" } },
                    { description: { $regex: search, $options: "i" } },
                ],
            }
            : {};

        const [totalPodcasts, podcasts] = await Promise.all([
            Podcast.countDocuments(searchFilter),
            Podcast.find(searchFilter)
                .select('title description coverImageUrl createdAt')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean()
        ]);

        const totalPages = Math.ceil(totalPodcasts / limit);

        const result = {
            status: "success",
            currentPage: page,
            totalPages,
            totalPodcasts,
            count: podcasts.length,
            podcasts,
        };
        if (!search) {
            setCachedData(cacheKey, result);
        }

        res.json(result);
    } catch (err) {
        console.error("Error fetching podcasts:", err);
        res.status(500).json({ message: "Server error" });
    }
};


export const getPodcastWithEpisodes = async (req: Request, res: Response) => {
    try {

        const podcastId = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(podcastId)) {
            return res.status(400).json({ message: "Invalid podcast ID format" });
        }

        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const skip = (page - 1) * limit;

        const search = (req.query.search as string) || "";
        const sortBy = (req.query.sortBy as string) || "releaseDate";
        const order = (req.query.order as string) === "asc" ? 1 : -1;

        const searchFilter = search
            ? {
                podcastId,
                $or: [
                    { title: { $regex: search, $options: "i" } },
                    { description: { $regex: search, $options: "i" } },
                ],
            }
            : { podcastId };

        const [podcast, totalEpisodes, episodes] = await Promise.all([
            Podcast.findById(podcastId)
                .select("title description coverImageUrl createdAt")
                .lean(),
            Episode.countDocuments(searchFilter),
            Episode.find(searchFilter)
                .select("title description audioUrl duration releaseDate coverImageUrl")
                .sort({ [sortBy]: order })
                .skip(skip)
                .limit(limit)
                .lean(),
        ]);

        if (!podcast) {
            return res.status(404).json({ message: "Podcast not found" });
        }

        const totalPages = Math.ceil(totalEpisodes / limit);

        res.json({
            status: "success",
            podcast,
            pagination: {
                currentPage: page,
                totalPages,
                totalEpisodes,
                count: episodes.length,
            },
            filters: {
                search,
                sortBy,
                order,
            },
            episodes,
        });
    } catch (err) {
        console.error("Error fetching podcast with episodes:", err);
        res.status(500).json({ message: "Server error" });
    }
};


export const updatePodcast = async (req: Request, res: Response) => {
    try {

        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: "Invalid podcast ID format" });
        }

        const updateData: any = {};
        if (req.body.title) updateData.title = req.body.title.trim().substring(0, 200);
        if (req.body.description) updateData.description = req.body.description.trim().substring(0, 2000);

        const coverFile =
            (req.files as { coverImage?: Express.Multer.File[] })?.coverImage?.[0];

        if (coverFile) {
            const uploadedUrl =
                (coverFile as any).path ||
                (coverFile as any).secure_url ||
                (coverFile as any).url;

            if (uploadedUrl) {
                updateData.coverImageUrl = uploadedUrl;
            } else {
                console.warn("No Cloudinary URL returned for cover image");
            }
        }

        const podcast = await Podcast.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        ).select('title description coverImageUrl createdAt').lean();

        if (!podcast) return res.status(404).json({ message: "Podcast not found" });

        cache.clear();

        res.status(200).json(podcast);
    } catch (err) {
        console.error("Error updating podcast:", err);
        res.status(500).json({ message: "Server error" });
    }
};


export const deletePodcast = async (req: Request, res: Response) => {
    try {
        const podcastId = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(podcastId)) {
            return res.status(400).json({ message: "Invalid podcast ID format" });
        }

        const podcast = await Podcast.findById(podcastId);
        if (!podcast) {
            return res.status(404).json({ message: "Podcast not found" });
        }

        const episodes = await Episode.find({ podcastId });

        const deleteFromCloudinary = async (url: string) => {
            try {
                if (!url) return;

                const parts = url.split("/");
                const folderAndFile = parts.slice(-2).join("/");
                const publicId = folderAndFile.replace(/\.[^/.]+$/, "");

                let resourceType: "image" | "video" | "raw" = "image";
                if (url.includes("/video/")) resourceType = "video";
                else if (url.includes("/image/")) resourceType = "image";
                else if (url.includes("/raw/")) resourceType = "raw";
                else if (url.match(/\.(mp3|wav|webm|mp4)$/i)) resourceType = "video";

                await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
            } catch (err) {
                console.warn("Cloudinary deletion failed for:", url, err);
            }
        };

        for (const ep of episodes) {
            if (ep.audioUrl) await deleteFromCloudinary(ep.audioUrl);
            if (ep.coverImageUrl) await deleteFromCloudinary(ep.coverImageUrl);
        }

        if (podcast.coverImageUrl) await deleteFromCloudinary(podcast.coverImageUrl);

        await Promise.all([
            Podcast.findByIdAndDelete(podcastId),
            Episode.deleteMany({ podcastId }),
        ]);

        if (typeof cache?.clear === "function") cache.clear();

        res.json({
            message: "Podcast and all its episodes deleted successfully",
            deletedEpisodes: episodes.length,
        });
    } catch (err) {
        console.error("Error deleting podcast:", err);
        res.status(500).json({ message: "Server error" });
    }
};


export default {
    createPodcast,
    getAllPodcasts,
    getPodcastWithEpisodes,
    updatePodcast,
    deletePodcast
}