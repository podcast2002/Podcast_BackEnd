
import Episode from "../models/Episode";
import { Request, Response } from "express";
import mongoose from "mongoose";
import { cloudinary } from "../utils/cloudinary";

const cache = new Map<string, { data: any; timestamp: number }>();

import https from "https";

async function getDurationFromUrl(audioUrl: string, bitrateKbps = 128): Promise<number> {
    return new Promise((resolve, reject) => {
        https
            .get(audioUrl, (res) => {
                const length = res.headers["content-length"];
                if (!length) return reject("No content-length header");
                const fileSizeInBytes = parseInt(length, 10);
                const duration = (fileSizeInBytes * 8) / (bitrateKbps * 1000);
                resolve(duration);
            })
            .on("error", reject);
    });
}


export const createEpisode = async (req: Request, res: Response) => {
    try {
        const { podcastId, title, description, members } = req.body;

        const files = req.files as {
            audio?: Express.Multer.File[];
            imageCover?: Express.Multer.File[];
        };

        if (!files?.audio || files.audio.length === 0) {
            return res.status(400).json({ message: "Audio file required" });
        }

        const audioFile = files.audio[0];
        const coverFile =
            (req.files as { coverImage?: Express.Multer.File[] })?.coverImage?.[0];

        const episodeData: any = {
            podcastId,
            title,
            members,
            description,
            audioUrl: audioFile?.path,
            releaseDate: new Date(),
        };

        if (coverFile) {
            const uploadedUrl =
                (coverFile as any).path ||
                (coverFile as any).secure_url ||
                (coverFile as any).url;

            if (uploadedUrl) {
                episodeData.coverImageUrl = uploadedUrl;
            } else {
                console.warn("No Cloudinary URL returned for cover image");
            }
        }

        let duration = 0;
        try {
            duration = await getDurationFromUrl(audioFile.path);
        } catch (err) {
            console.warn("Failed to calculate duration:", err);
        }

        episodeData.duration = Math.round(duration);
        const episode = await Episode.create(episodeData);

        res.status(201).json(episode);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error", err });
    }
};




export const getAllEpisodes = async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const skip = (page - 1) * limit;

        const search = (req.query.search as string) || "";

        const searchFilter = search
            ? {
                $or: [
                    { title: { $regex: search, $options: "i" } },
                    { description: { $regex: search, $options: "i" } },
                ],
            }
            : {};

        const totalEpisodes = await Episode.countDocuments(searchFilter);

        const episodes = await Episode.find(searchFilter)
            .sort({ releaseDate: -1 })
            .skip(skip)
            .limit(limit);

        const totalPages = Math.ceil(totalEpisodes / limit);

        res.json({
            status: "success",
            currentPage: page,
            totalPages,
            totalEpisodes,
            count: episodes.length,
            episodes,
        });
    } catch (err) {
        console.error("Error fetching episodes:", err);
        res.status(500).json({ message: "Server error" });
    }
};

export const getEpisode = async (req: Request, res: Response) => {
    try {
        const episode = await Episode.findById(req.params.id);
        if (!episode) return res.status(404).json({ message: "Episode not found" });
        res.json(episode);
    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
};

export const updateEpisode = async (req: Request, res: Response) => {
    try {
        const episodeId = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(episodeId)) {
            return res.status(400).json({ message: "Invalid episode ID format" });
        }

        const updateData: any = {};

        if (req.body.title) updateData.title = req.body.title.trim().substring(0, 200);
        if (req.body.members) updateData.members = req.body.members.trim().substring(0, 200);
        if (req.body.description)
            updateData.description = req.body.description.trim().substring(0, 2000);
        if (req.body.duration) updateData.duration = req.body.duration;
        if (req.body.releaseDate) updateData.releaseDate = req.body.releaseDate;

        const coverFile =
            (req.files as { coverImage?: Express.Multer.File[] })?.coverImage?.[0];
        const audioFile =
            (req.files as { audioFile?: Express.Multer.File[] })?.audioFile?.[0];

        if (coverFile) {
            const uploadedUrl =
                (coverFile as any).path ||
                (coverFile as any).secure_url ||
                (coverFile as any).url;
            if (uploadedUrl) updateData.coverImageUrl = uploadedUrl;
            else console.warn("No Cloudinary URL returned for cover image");
        }

        if (audioFile) {
            const uploadedUrl =
                (audioFile as any).path ||
                (audioFile as any).secure_url ||
                (audioFile as any).url;
            if (uploadedUrl) updateData.audioUrl = uploadedUrl;
            else console.warn("No Cloudinary URL returned for audio file");
        }

        const episode = await Episode.findByIdAndUpdate(episodeId, updateData, {
            new: true,
            runValidators: true,
        })
            .select("title description coverImageUrl audioUrl duration releaseDate createdAt")
            .lean();

        if (!episode) return res.status(404).json({ message: "Episode not found" });

        if (typeof cache?.clear === "function") cache.clear();

        res.status(200).json({
            message: "Episode updated successfully",
            data: episode,
        });
    } catch (err) {
        console.error("Error updating episode:", err);
        res.status(500).json({ message: "Server error" });
    }
};

export const deleteEpisode = async (req: Request, res: Response) => {
    try {
        const episodeId = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(episodeId)) {
            return res.status(400).json({ message: "Invalid episode ID format" });
        }

        const episode = await Episode.findById(episodeId);
        if (!episode) {
            return res.status(404).json({ message: "Episode not found" });
        }

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

        if (episode.audioUrl) await deleteFromCloudinary(episode.audioUrl);
        if (episode.coverImageUrl) await deleteFromCloudinary(episode.coverImageUrl);

        await Episode.findByIdAndDelete(episodeId);

        if (typeof cache?.clear === "function") cache.clear();

        res.json({
            message: "Episode deleted successfully",
            deletedEpisodeId: episodeId,
        });
    } catch (err) {
        console.error("Error deleting episode:", err);
        res.status(500).json({ message: "Server error" });
    }
};

