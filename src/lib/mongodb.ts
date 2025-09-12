import mongoose from "mongoose";
const MONGODB_URI = process.env.MONGODB_URI as string;

if (!MONGODB_URI) {
  throw new Error("Please add your Mongo URI to .env.local");
}

const connectDb = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("mongodb has connected ...");
  } catch (err) {
    console.log(err);
    process.exit(1);
  }
};
export default connectDb;
