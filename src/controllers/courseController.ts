import { NextFunction, Request, Response } from "express";
import { catchAsyncError } from "../middlewares/catchAsyncError";
import errorHandler from "../utils/errorHandler";
import axios from "axios";
import Course, { ICourse } from "../models/coureModels/courseModel";

import cloudinary from "cloudinary";
import { redis } from "../models/redis";
import CourseData from "../models/coureModels/courseData";
import Query from "../models/coureModels/questionModel";
import Review from "../models/coureModels/reviewModel";
import mongoose from "mongoose";

cloudinary.v2.config({
  cloud_name: "dcj2gzytt",
  api_key: process.env.CLOUDINARY_PUBLIC_KEY,
  api_secret: process.env.CLOUDINARY_SECRET_KEY,
});

// GENERATE THE VIDEOURL
export const generateVideoUrl = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { videoId } = req.body;
      const response = await axios.post(
        `https://dev.vdocipher.com/api/videos/${videoId}/otp`,
        { ttl: 300 },
        {
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Apisecret ${process.env.VDOCIPHER_API_SECRET}`,
          },
        }
      );
      res.json(response.data);
    } catch (error: any) {
      return next(new errorHandler(error.message, 500));
    }
  }
);

// CREATE NEW COURSE
export const uploadCourse = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      let {
        name,
        description,
        price,
        categories,
        estimatedPrice,
        thumbnail,
        tags,
        level,
        demoUrl,
        benefits,
        prerequisites,
        reviews,
        rating,
        purchased,
        totalVideos,
        courseData,
      } = req.body;
      const data = req.body;
      console.log(data);
      const courseDataIds = [];
      if (courseData && courseData.length > 0) {
        for (const data of courseData) {
          const newCourseData = new CourseData(data);
          const savedCourseData = await newCourseData.save();
          courseDataIds.push(savedCourseData._id);
        }
      }
      const ismg = req.file;
      if (thumbnail) {
        const myCloud = await cloudinary.v2.uploader.upload(thumbnail, {
          folder: "courses",
        });
        thumbnail = {
          public_id: myCloud.public_id,
          url: myCloud.secure_url,
        };
      }
      // Create a new course instance with the created CourseData ObjectIds
      const newCourse = new Course({
        name,
        description,
        price,
        categories,
        estimatedPrice,
        thumbnail,
        tags,
        level,
        demoUrl,
        benefits,
        prerequisites,
        reviews,
        rating,
        purchased,
        totalVideos,
        courseData: courseDataIds,
      });

      // Save the course to the database
      const savedCourse = await newCourse.save();

      const courses = await Course.find().select(
        "-courseData.videoUrl -courseData.suggestion -courseData.questions -courseData.links"
      );

      await redis.set("courses", JSON.stringify(courses));
      
      res.status(201).json({
        success: true,
        course: savedCourse,
      });
    } catch (error: any) {
      console.log(error);
      return next(new errorHandler(error.message, 500));
    }
  }
);

//EDIT COURSE
export const editCourse = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = req.body;

      const thumbnail = data.thumbnail;

      const courseId = req.params.id;

      const courseData = (await Course.findById(courseId)) as any;

      if (thumbnail && !thumbnail.startsWith("https")) {
        await cloudinary.v2.uploader.destroy(courseData.thumbnail.public_id);

        const myCloud = await cloudinary.v2.uploader.upload(thumbnail, {
          folder: "courses",
        });

        data.thumbnail = {
          public_id: myCloud.public_id,
          url: myCloud.secure_url,
        };
      }

      if (thumbnail.startsWith("https")) {
        data.thumbnail = {
          public_id: courseData?.thumbnail.public_id,
          url: courseData?.thumbnail.url,
        };
      }

      const course = await Course.findByIdAndUpdate(
        courseId,
        {
          $set: data,
        },
        { new: true }
      );
      const courses = await Course.find().populate({
        path: "reviews",
        populate: {
          path: "user",
          select: "name email", 
        },
      }).select(
        "-courseData.videoUrl -courseData.suggestion -courseData.questions -courseData.links"
      );
      await redis.set("courses", JSON.stringify(courses));
      await redis.set(courseId, JSON.stringify(course)); // update course in redis
      res.status(201).json({
        success: true,
        course,
      });
    } catch (error: any) {
      return next(new errorHandler(error.message, 500));
    }
  }
);

//EDIT COURSE
export const deltetCours = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id;
      const course = await Course.findById(id);
      if (!course) {
        return next(new errorHandler("Indalid course ID", 401));
      }
      if (course?.thumbnail) {
        const thumbnail = course.thumbnail;
        await cloudinary.v2.uploader.destroy(thumbnail.public_id);
      }
      await Course.findByIdAndDelete(id);

      res.status(201).json({
        success: true,
        message: "succesfully deleted",
      });
    } catch (error: any) {
      return next(new errorHandler(error.message, 500));
    }
  }
);

//Get Single Course
export const getSingleCourse = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const courseId = req.params.id;
      console.log(courseId);

      // Check Redis cache for the course data
      const isCacheExist = await redis.get(courseId);
      if (isCacheExist) {
        const course = JSON.parse(isCacheExist);
         res.status(200).json({
          success: true,
          course,
        });
      } 

      // Fetch course from the database and populate reviews and user inside reviews
      const course = await Course.findById(courseId)
        .populate("courseData")
        .select("-courseData.videoUrl -courseData.suggestion -courseData.questions -courseData.links").populate({
          path: "reviews",
          populate: { path: "user", select: "name email" } // Populate user details inside reviews
        });

      // Cache the course data in Redis for 7 days (604800 seconds)
      await redis.set(courseId, JSON.stringify(course), "EX", 604800);

      res.status(200).json({
        success: true,
        course,
      });

    } catch (error: any) {
      return next(new errorHandler(error.message, 500));
    }
  }
);

//Get All Courses
export const getAllCourses = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {

      const coursesString = await redis.get("courses");
      if(coursesString){
        console.log("reids")
        const courses = await JSON.parse(coursesString);
        res.status(200).json({
          success: true,
          courses,
        });
      } else {
        const courses = await Course.find().populate({
          path: "reviews",
          populate: {
            path: "user",
            select: "name email", 
          },
        }).select(
          "-courseData.videoUrl -courseData.suggestion -courseData.questions -courseData.links"
        );

        await redis.set("courses", JSON.stringify(courses));
  
        res.status(200).json({
          success: true,
          courses,
        });

      }

    } catch (error: any) {
      return next(new errorHandler(error.message, 500));
    }
  }
);

export const getSingleCourseAdmin = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const courseId = req.params.id;
      console.log(courseId)

    
        const course = await Course.findById(req.params.id)
          .populate("courseData").exec();

        await redis.set(courseId, JSON.stringify(course), "EX", 604800); // 7days

        res.status(200).json({
          success: true,
          course,
        });
      
    } catch (error: any) {
      return next(new errorHandler(error.message, 500));
    }
  }
);

//get course content -- only for valid user
export const getCourseByUser = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userCourseList = req.user?.courses;
      const courseId = req.params.id;

      // Check if the user has access to the course
      const courseExists = userCourseList?.find(
        (course: any) => course._id.toString() === courseId
      );

      if (!courseExists) {
        return next(
          new errorHandler("You are not eligible to access this course", 404)
        );
      }

      // Fetch the course from MongoDB with populated fields
      const course = await Course.findById(courseId)
        .populate("courseData")
        .populate({
          path: "reviews",
          populate: {
            path: "user",
            select: "name email", // Only populate specific user fields if needed
          },
        });

      const content = course?.courseData;

      res.status(200).json({
        success: true,
        content,
        reviews: course?.reviews, // Add populated reviews with user details
      });
    } catch (error: any) {
      return next(new errorHandler(error.message, 500));
    }
  }
);

// get all courses --- only for admin
export const getAdminAllCourses = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const courses = await Course.find().sort({ createdAt: -1 });

      
      res.status(201).json({
        success: true,
        courses,
      });
    } catch (error: any) {
      return next(new errorHandler(error.message, 400));
    }
  }
);

//Search Courses
export const searchCourses = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    async function searchCourses(query: string) {
      const searchRegex = new RegExp(query, "i"); // 'i' for case-insensitive

      const queryObj = {
        name: { $regex: searchRegex },
      };

      return Course.find(queryObj).select('name price thumbnail level categories');
    }
    try {
      const searchQuery = req.query.q  ;
      if(!searchQuery){
        return next(new errorHandler("Provide search Text",401))
      }

      const courses = await searchCourses(searchQuery as string)
      console.log(courses)

      res.status(201).json({
        success:true,
        courses,
      })

    } catch (error: any) {
      return next(new errorHandler(error.message, 500));
    }
  }
);



export const createQuestion = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { user, question, courseId, contentId } = req.body;
      console.log(req.body)

    // Validation
    if (!user || !question || !courseId || !contentId) {
      return next(new errorHandler("Please provide all required fields", 400));
    }

    // Create a new question instance
    const newQuery = new Query({
      user,
      question,
      courseId,
      contentId,
    });

    // Save to database
    const savedQuery = await newQuery.save();

    // Send response
    res.status(201).json({
      message: "Question created successfully",
      data: savedQuery,
    });
    } catch (error: any) {
      return next(new errorHandler(error.message, 500));
    }
  }
);


export const addReview = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { courseId } = req.params;
      const user = req.user?._id;
    const { rating, review } = req.body;

    // Validate input data
    if (!rating || !review || !user) {
      return next(new errorHandler("Rating, review, and user are required.", 400));
    }

    // Check if the course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return next(new errorHandler("Course not found.", 404));
    }

    // Create a new review
    const newReview = new Review({
      course: new mongoose.Types.ObjectId(courseId),
      rating,
      review,
      user: new mongoose.Types.ObjectId(user)
    });

    // Save the review
    const savedReview = await newReview.save();

    // Add the review to the course
    course.reviews.push(savedReview._id);

    // Recalculate the course rating
    const allReviews = await Review.find({ course: courseId });
    const totalRating = allReviews.reduce((acc, curr) => acc + curr.rating, 0);
    course.rating = totalRating / allReviews.length;

    // Save the updated course
    await course.save();

    const courses = await Course.find().populate({
      path: "reviews",
      populate: {
        path: "user",
        select: "name email", 
      },
    }).select(
      "-courseData.videoUrl -courseData.suggestion -courseData.questions -courseData.links"
    );

    await redis.set("courses", JSON.stringify(courses));

    const currCourse = await Course.findById(courseId)
        .populate("courseData")
        .select("-courseData.videoUrl -courseData.suggestion -courseData.questions -courseData.links").populate({
          path: "reviews",
          populate: { path: "user", select: "name email" } // Populate user details inside reviews
        });

      // Cache the course data in Redis for 7 days (604800 seconds)
      await redis.set(courseId, JSON.stringify(course), "EX", 604800);

    res.status(201).json({
      message: "Review added successfully",
      data: savedReview
    });
    } catch (error: any) {
      return next(new errorHandler(error.message, 500));
    }
  }
);