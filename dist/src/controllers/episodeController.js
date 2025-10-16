"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteEpisode = exports.updateEpisode = exports.getEpisode = exports.getAllEpisodes = exports.createEpisode = void 0;
const Episode_1 = __importDefault(require("../models/Episode"));
const get_audio_duration_1 = require("get-audio-duration");
const mongoose_1 = __importDefault(require("mongoose"));
const cloudinary_1 = require("../utils/cloudinary");
const cache = new Map();
const createEpisode = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { podcastId, title, description, members } = req.body;
        const files = req.files;
        if (!(files === null || files === void 0 ? void 0 : files.audio) || files.audio.length === 0) {
            return res.status(400).json({ message: "Audio file required" });
        }
        const audioFile = files.audio[0];
        const coverFile = (_b = (_a = req.files) === null || _a === void 0 ? void 0 : _a.coverImage) === null || _b === void 0 ? void 0 : _b[0];
        const episodeData = {
            podcastId,
            title,
            members,
            description,
            audioUrl: audioFile === null || audioFile === void 0 ? void 0 : audioFile.path,
            releaseDate: new Date(),
        };
        if (coverFile) {
            const uploadedUrl = coverFile.path ||
                coverFile.secure_url ||
                coverFile.url;
            if (uploadedUrl) {
                episodeData.coverImageUrl = uploadedUrl;
            }
            else {
                console.warn("No Cloudinary URL returned for cover image");
            }
        }
        ;
        const duration = yield (0, get_audio_duration_1.getAudioDurationInSeconds)(audioFile.path);
        episodeData.duration = duration;
        const episode = yield Episode_1.default.create(episodeData);
        res.status(201).json(episode);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error", err });
    }
});
exports.createEpisode = createEpisode;
const getAllEpisodes = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const search = req.query.search || "";
        const searchFilter = search
            ? {
                $or: [
                    { title: { $regex: search, $options: "i" } },
                    { description: { $regex: search, $options: "i" } },
                ],
            }
            : {};
        const totalEpisodes = yield Episode_1.default.countDocuments(searchFilter);
        const episodes = yield Episode_1.default.find(searchFilter)
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
    }
    catch (err) {
        console.error("Error fetching episodes:", err);
        res.status(500).json({ message: "Server error" });
    }
});
exports.getAllEpisodes = getAllEpisodes;
const getEpisode = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const episode = yield Episode_1.default.findById(req.params.id);
        if (!episode)
            return res.status(404).json({ message: "Episode not found" });
        res.json(episode);
    }
    catch (err) {
        res.status(500).json({ message: "Server error" });
    }
});
exports.getEpisode = getEpisode;
const updateEpisode = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    try {
        const episodeId = req.params.id;
        if (!mongoose_1.default.Types.ObjectId.isValid(episodeId)) {
            return res.status(400).json({ message: "Invalid episode ID format" });
        }
        const updateData = {};
        if (req.body.title)
            updateData.title = req.body.title.trim().substring(0, 200);
        if (req.body.members)
            updateData.members = req.body.members.trim().substring(0, 200);
        if (req.body.description)
            updateData.description = req.body.description.trim().substring(0, 2000);
        if (req.body.duration)
            updateData.duration = req.body.duration;
        if (req.body.releaseDate)
            updateData.releaseDate = req.body.releaseDate;
        const coverFile = (_b = (_a = req.files) === null || _a === void 0 ? void 0 : _a.coverImage) === null || _b === void 0 ? void 0 : _b[0];
        const audioFile = (_d = (_c = req.files) === null || _c === void 0 ? void 0 : _c.audioFile) === null || _d === void 0 ? void 0 : _d[0];
        if (coverFile) {
            const uploadedUrl = coverFile.path ||
                coverFile.secure_url ||
                coverFile.url;
            if (uploadedUrl)
                updateData.coverImageUrl = uploadedUrl;
            else
                console.warn("No Cloudinary URL returned for cover image");
        }
        if (audioFile) {
            const uploadedUrl = audioFile.path ||
                audioFile.secure_url ||
                audioFile.url;
            if (uploadedUrl)
                updateData.audioUrl = uploadedUrl;
            else
                console.warn("No Cloudinary URL returned for audio file");
        }
        const episode = yield Episode_1.default.findByIdAndUpdate(episodeId, updateData, {
            new: true,
            runValidators: true,
        })
            .select("title description coverImageUrl audioUrl duration releaseDate createdAt")
            .lean();
        if (!episode)
            return res.status(404).json({ message: "Episode not found" });
        if (typeof (cache === null || cache === void 0 ? void 0 : cache.clear) === "function")
            cache.clear();
        res.status(200).json({
            message: "Episode updated successfully",
            data: episode,
        });
    }
    catch (err) {
        console.error("Error updating episode:", err);
        res.status(500).json({ message: "Server error" });
    }
});
exports.updateEpisode = updateEpisode;
const deleteEpisode = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const episodeId = req.params.id;
        if (!mongoose_1.default.Types.ObjectId.isValid(episodeId)) {
            return res.status(400).json({ message: "Invalid episode ID format" });
        }
        const episode = yield Episode_1.default.findById(episodeId);
        if (!episode) {
            return res.status(404).json({ message: "Episode not found" });
        }
        const deleteFromCloudinary = (url) => __awaiter(void 0, void 0, void 0, function* () {
            try {
                if (!url)
                    return;
                const parts = url.split("/");
                const folderAndFile = parts.slice(-2).join("/");
                const publicId = folderAndFile.replace(/\.[^/.]+$/, "");
                let resourceType = "image";
                if (url.includes("/video/"))
                    resourceType = "video";
                else if (url.includes("/image/"))
                    resourceType = "image";
                else if (url.includes("/raw/"))
                    resourceType = "raw";
                else if (url.match(/\.(mp3|wav|webm|mp4)$/i))
                    resourceType = "video";
                yield cloudinary_1.cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
            }
            catch (err) {
                console.warn("Cloudinary deletion failed for:", url, err);
            }
        });
        if (episode.audioUrl)
            yield deleteFromCloudinary(episode.audioUrl);
        if (episode.coverImageUrl)
            yield deleteFromCloudinary(episode.coverImageUrl);
        yield Episode_1.default.findByIdAndDelete(episodeId);
        if (typeof (cache === null || cache === void 0 ? void 0 : cache.clear) === "function")
            cache.clear();
        res.json({
            message: "Episode deleted successfully",
            deletedEpisodeId: episodeId,
        });
    }
    catch (err) {
        console.error("Error deleting episode:", err);
        res.status(500).json({ message: "Server error" });
    }
});
exports.deleteEpisode = deleteEpisode;
