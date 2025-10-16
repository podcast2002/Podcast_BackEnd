import mongoose, { Schema, Document } from "mongoose";

export interface IEpisode extends Document {
    podcastId: mongoose.Types.ObjectId;
    title: string;
    members: string;
    description: string;
    audioUrl: string;
    duration?: number;
    releaseDate: Date;
    coverImageUrl: string
}

const EpisodeSchema: Schema = new Schema({
    podcastId: { type: Schema.Types.ObjectId, ref: "Podcast", required: true },
    title: { type: String, required: true },
    members: { type: String },
    description: { type: String },
    audioUrl: { type: String, required: true },
    duration: { type: Number },
    releaseDate: { type: Date, default: Date.now },
    coverImageUrl: { type: String }
});

export default mongoose.model<IEpisode>("Episode", EpisodeSchema);
