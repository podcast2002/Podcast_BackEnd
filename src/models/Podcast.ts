import mongoose, { Schema, Document } from "mongoose";

export interface IPodcast extends Document {
    title: string;
    description: string;
    coverImageUrl: string;
    createdAt: Date;
}

const PodcastSchema: Schema = new Schema({
    title: { type: String, required: true },
    description: { type: String },
    coverImageUrl: { type: String },
    createdAt: { type: Date, default: Date.now },
}
);

export default mongoose.model<IPodcast>("Podcast", PodcastSchema);
