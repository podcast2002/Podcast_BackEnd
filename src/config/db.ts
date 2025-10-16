import mongoose from "mongoose";


const connectDB = async (): Promise<void> =>{
    try {
        await mongoose.connect(process.env.DATABASE_URL!);
        console.log("Database Connected Successfully")
    } catch(error:any) {
        console.error(" MongoDB Connection Error:", error.message);
        process.exit(1);
    }
     
}

export default connectDB