import mongoose, { Document, Schema } from "mongoose";
import { IUser } from "../userModel";
import { ICourse } from "./courseModel";
import { ICourseData } from "./courseData";

interface IQuery extends Document {
  user: IUser["_id"];
  question: string;
  reply: string;
  courseId: ICourse["_id"];
  contentId: ICourseData["_id"];

}

const querySchema: Schema<IQuery> = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: "user",
    required: true
  },
  question: {
    type: String,
    required: true
  },
  reply: String,
  courseId:{
    type: Schema.Types.ObjectId,
    ref: "Course",
    required: true
  },
  contentId: {
    type: Schema.Types.ObjectId,
    ref: "courseData",
    required: true
  }
});

const Query = mongoose.model<IQuery>("Query", querySchema);

export default Query;
