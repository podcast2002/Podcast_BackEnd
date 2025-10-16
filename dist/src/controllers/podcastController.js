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
exports.deletePodcast = exports.updatePodcast = exports.getPodcastWithEpisodes = exports.getAllPodcasts = exports.createPodcast = void 0;
const Podcast_1 = __importDefault(require("../models/Podcast"));
const Episode_1 = __importDefault(require("../models/Episode"));
const mongoose_1 = __importDefault(require("mongoose"));
const cloudinary_1 = require("../utils/cloudinary");
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000;
const getCachedData = (key) => {
    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data;
    }
    cache.delete(key);
    return null;
};
const setCachedData = (key, data) => {
    cache.set(key, { data, timestamp: Date.now() });
};
const createPodcast = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { title, description } = req.body;
        if (!(title === null || title === void 0 ? void 0 : title.trim()) || !(description === null || description === void 0 ? void 0 : description.trim())) {
            return res
                .status(400)
                .json({ message: "Please provide both title and description" });
        }
        const sanitizedTitle = title.trim().substring(0, 200);
        const sanitizedDescription = description.trim().substring(0, 2000);
        const coverFile = (_b = (_a = req.files) === null || _a === void 0 ? void 0 : _a.coverImage) === null || _b === void 0 ? void 0 : _b[0];
        const podcastData = {
            title: sanitizedTitle,
            description: sanitizedDescription
        };
        if (coverFile) {
            const uploadedUrl = coverFile.path ||
                coverFile.secure_url ||
                coverFile.url;
            if (uploadedUrl) {
                podcastData.coverImageUrl = uploadedUrl;
            }
            else {
                console.warn("No Cloudinary URL returned for cover image");
            }
        }
        const podcast = yield Podcast_1.default.create(podcastData);
        cache.clear();
        return res.status(201).json({
            message: "Podcast created successfully",
            data: podcast,
        });
    }
    catch (err) {
        console.error("Error creating podcast:", err);
        return res.status(500).json({
            message: err.message || "Server error while creating podcast",
        });
    }
});
exports.createPodcast = createPodcast;
const getAllPodcasts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
        const skip = (page - 1) * limit;
        const search = ((_a = req.query.search) === null || _a === void 0 ? void 0 : _a.trim()) || "";
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
        const [totalPodcasts, podcasts] = yield Promise.all([
            Podcast_1.default.countDocuments(searchFilter),
            Podcast_1.default.find(searchFilter)
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
    }
    catch (err) {
        console.error("Error fetching podcasts:", err);
        res.status(500).json({ message: "Server error" });
    }
});
exports.getAllPodcasts = getAllPodcasts;
const getPodcastWithEpisodes = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const podcastId = req.params.id;
        if (!mongoose_1.default.Types.ObjectId.isValid(podcastId)) {
            return res.status(400).json({ message: "Invalid podcast ID format" });
        }
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const search = req.query.search || "";
        const sortBy = req.query.sortBy || "releaseDate";
        const order = req.query.order === "asc" ? 1 : -1;
        const searchFilter = search
            ? {
                podcastId,
                $or: [
                    { title: { $regex: search, $options: "i" } },
                    { description: { $regex: search, $options: "i" } },
                ],
            }
            : { podcastId };
        const [podcast, totalEpisodes, episodes] = yield Promise.all([
            Podcast_1.default.findById(podcastId)
                .select("title description coverImageUrl createdAt")
                .lean(),
            Episode_1.default.countDocuments(searchFilter),
            Episode_1.default.find(searchFilter)
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
    }
    catch (err) {
        console.error("Error fetching podcast with episodes:", err);
        res.status(500).json({ message: "Server error" });
    }
});
exports.getPodcastWithEpisodes = getPodcastWithEpisodes;
const updatePodcast = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        if (!mongoose_1.default.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: "Invalid podcast ID format" });
        }
        const updateData = {};
        if (req.body.title)
            updateData.title = req.body.title.trim().substring(0, 200);
        if (req.body.description)
            updateData.description = req.body.description.trim().substring(0, 2000);
        const coverFile = (_b = (_a = req.files) === null || _a === void 0 ? void 0 : _a.coverImage) === null || _b === void 0 ? void 0 : _b[0];
        if (coverFile) {
            const uploadedUrl = coverFile.path ||
                coverFile.secure_url ||
                coverFile.url;
            if (uploadedUrl) {
                updateData.coverImageUrl = uploadedUrl;
            }
            else {
                console.warn("No Cloudinary URL returned for cover image");
            }
        }
        const podcast = yield Podcast_1.default.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true }).select('title description coverImageUrl createdAt').lean();
        if (!podcast)
            return res.status(404).json({ message: "Podcast not found" });
        cache.clear();
        res.status(200).json(podcast);
    }
    catch (err) {
        console.error("Error updating podcast:", err);
        res.status(500).json({ message: "Server error" });
    }
});
exports.updatePodcast = updatePodcast;
const deletePodcast = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const podcastId = req.params.id;
        if (!mongoose_1.default.Types.ObjectId.isValid(podcastId)) {
            return res.status(400).json({ message: "Invalid podcast ID format" });
        }
        const podcast = yield Podcast_1.default.findById(podcastId);
        if (!podcast) {
            return res.status(404).json({ message: "Podcast not found" });
        }
        const episodes = yield Episode_1.default.find({ podcastId });
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
        for (const ep of episodes) {
            if (ep.audioUrl)
                yield deleteFromCloudinary(ep.audioUrl);
            if (ep.coverImageUrl)
                yield deleteFromCloudinary(ep.coverImageUrl);
        }
        if (podcast.coverImageUrl)
            yield deleteFromCloudinary(podcast.coverImageUrl);
        yield Promise.all([
            Podcast_1.default.findByIdAndDelete(podcastId),
            Episode_1.default.deleteMany({ podcastId }),
        ]);
        if (typeof (cache === null || cache === void 0 ? void 0 : cache.clear) === "function")
            cache.clear();
        res.json({
            message: "Podcast and all its episodes deleted successfully",
            deletedEpisodes: episodes.length,
        });
    }
    catch (err) {
        console.error("Error deleting podcast:", err);
        res.status(500).json({ message: "Server error" });
    }
});
exports.deletePodcast = deletePodcast;
exports.default = {
    createPodcast: exports.createPodcast,
    getAllPodcasts: exports.getAllPodcasts,
    getPodcastWithEpisodes: exports.getPodcastWithEpisodes,
    updatePodcast: exports.updatePodcast,
    deletePodcast: exports.deletePodcast
};
