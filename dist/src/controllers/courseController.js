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
exports.addReview = exports.createQuestion = exports.searchCourses = exports.getAdminAllCourses = exports.getCourseByUser = exports.getSingleCourseAdmin = exports.getAllCourses = exports.getSingleCourse = exports.deltetCours = exports.editCourse = exports.uploadCourse = exports.generateVideoUrl = void 0;
const catchAsyncError_1 = require("../middlewares/catchAsyncError");
const errorHandler_1 = __importDefault(require("../utils/errorHandler"));
const axios_1 = __importDefault(require("axios"));
const courseModel_1 = __importDefault(require("../models/coureModels/courseModel"));
const cloudinary_1 = __importDefault(require("cloudinary"));
const redis_1 = require("../models/redis");
const courseData_1 = __importDefault(require("../models/coureModels/courseData"));
const questionModel_1 = __importDefault(require("../models/coureModels/questionModel"));
const reviewModel_1 = __importDefault(require("../models/coureModels/reviewModel"));
const mongoose_1 = __importDefault(require("mongoose"));
cloudinary_1.default.v2.config({
    cloud_name: "dcj2gzytt",
    api_key: process.env.CLOUDINARY_PUBLIC_KEY,
    api_secret: process.env.CLOUDINARY_SECRET_KEY,
});
// GENERATE THE VIDEOURL
exports.generateVideoUrl = (0, catchAsyncError_1.catchAsyncError)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { videoId } = req.body;
        const response = yield axios_1.default.post(`https://dev.vdocipher.com/api/videos/${videoId}/otp`, { ttl: 300 }, {
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                Authorization: `Apisecret ${process.env.VDOCIPHER_API_SECRET}`,
            },
        });
        res.json(response.data);
    }
    catch (error) {
        return next(new errorHandler_1.default(error.message, 500));
    }
}));
// CREATE NEW COURSE
exports.uploadCourse = (0, catchAsyncError_1.catchAsyncError)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let { name, description, price, categories, estimatedPrice, thumbnail, tags, level, demoUrl, benefits, prerequisites, reviews, rating, purchased, totalVideos, courseData, } = req.body;
        const data = req.body;
        console.log(data);
        const courseDataIds = [];
        if (courseData && courseData.length > 0) {
            for (const data of courseData) {
                const newCourseData = new courseData_1.default(data);
                const savedCourseData = yield newCourseData.save();
                courseDataIds.push(savedCourseData._id);
            }
        }
        const ismg = req.file;
        if (thumbnail) {
            const myCloud = yield cloudinary_1.default.v2.uploader.upload(thumbnail, {
                folder: "courses",
            });
            thumbnail = {
                public_id: myCloud.public_id,
                url: myCloud.secure_url,
            };
        }
        // Create a new course instance with the created CourseData ObjectIds
        const newCourse = new courseModel_1.default({
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
        const savedCourse = yield newCourse.save();
        const courses = yield courseModel_1.default.find().select("-courseData.videoUrl -courseData.suggestion -courseData.questions -courseData.links");
        yield redis_1.redis.set("courses", JSON.stringify(courses));
        res.status(201).json({
            success: true,
            course: savedCourse,
        });
    }
    catch (error) {
        console.log(error);
        return next(new errorHandler_1.default(error.message, 500));
    }
}));
//EDIT COURSE
exports.editCourse = (0, catchAsyncError_1.catchAsyncError)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const data = req.body;
        const thumbnail = data.thumbnail;
        const courseId = req.params.id;
        const courseData = (yield courseModel_1.default.findById(courseId));
        if (thumbnail && !thumbnail.startsWith("https")) {
            yield cloudinary_1.default.v2.uploader.destroy(courseData.thumbnail.public_id);
            const myCloud = yield cloudinary_1.default.v2.uploader.upload(thumbnail, {
                folder: "courses",
            });
            data.thumbnail = {
                public_id: myCloud.public_id,
                url: myCloud.secure_url,
            };
        }
        if (thumbnail.startsWith("https")) {
            data.thumbnail = {
                public_id: courseData === null || courseData === void 0 ? void 0 : courseData.thumbnail.public_id,
                url: courseData === null || courseData === void 0 ? void 0 : courseData.thumbnail.url,
            };
        }
        const course = yield courseModel_1.default.findByIdAndUpdate(courseId, {
            $set: data,
        }, { new: true });
        const courses = yield courseModel_1.default.find().populate({
            path: "reviews",
            populate: {
                path: "user",
                select: "name email",
            },
        }).select("-courseData.videoUrl -courseData.suggestion -courseData.questions -courseData.links");
        yield redis_1.redis.set("courses", JSON.stringify(courses));
        yield redis_1.redis.set(courseId, JSON.stringify(course)); // update course in redis
        res.status(201).json({
            success: true,
            course,
        });
    }
    catch (error) {
        return next(new errorHandler_1.default(error.message, 500));
    }
}));
//EDIT COURSE
exports.deltetCours = (0, catchAsyncError_1.catchAsyncError)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = req.params.id;
        const course = yield courseModel_1.default.findById(id);
        if (!course) {
            return next(new errorHandler_1.default("Indalid course ID", 401));
        }
        if (course === null || course === void 0 ? void 0 : course.thumbnail) {
            const thumbnail = course.thumbnail;
            yield cloudinary_1.default.v2.uploader.destroy(thumbnail.public_id);
        }
        yield courseModel_1.default.findByIdAndDelete(id);
        res.status(201).json({
            success: true,
            message: "succesfully deleted",
        });
    }
    catch (error) {
        return next(new errorHandler_1.default(error.message, 500));
    }
}));
//Get Single Course
exports.getSingleCourse = (0, catchAsyncError_1.catchAsyncError)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const courseId = req.params.id;
        console.log(courseId);
        // Check Redis cache for the course data
        const isCacheExist = yield redis_1.redis.get(courseId);
        if (isCacheExist) {
            const course = JSON.parse(isCacheExist);
            res.status(200).json({
                success: true,
                course,
            });
        }
        // Fetch course from the database and populate reviews and user inside reviews
        const course = yield courseModel_1.default.findById(courseId)
            .populate("courseData")
            .select("-courseData.videoUrl -courseData.suggestion -courseData.questions -courseData.links").populate({
            path: "reviews",
            populate: { path: "user", select: "name email" } // Populate user details inside reviews
        });
        // Cache the course data in Redis for 7 days (604800 seconds)
        yield redis_1.redis.set(courseId, JSON.stringify(course), "EX", 604800);
        res.status(200).json({
            success: true,
            course,
        });
    }
    catch (error) {
        return next(new errorHandler_1.default(error.message, 500));
    }
}));
//Get All Courses
exports.getAllCourses = (0, catchAsyncError_1.catchAsyncError)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const coursesString = yield redis_1.redis.get("courses");
        if (coursesString) {
            console.log("reids");
            const courses = yield JSON.parse(coursesString);
            res.status(200).json({
                success: true,
                courses,
            });
        }
        else {
            const courses = yield courseModel_1.default.find().populate({
                path: "reviews",
                populate: {
                    path: "user",
                    select: "name email",
                },
            }).select("-courseData.videoUrl -courseData.suggestion -courseData.questions -courseData.links");
            yield redis_1.redis.set("courses", JSON.stringify(courses));
            res.status(200).json({
                success: true,
                courses,
            });
        }
    }
    catch (error) {
        return next(new errorHandler_1.default(error.message, 500));
    }
}));
exports.getSingleCourseAdmin = (0, catchAsyncError_1.catchAsyncError)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const courseId = req.params.id;
        console.log(courseId);
        const course = yield courseModel_1.default.findById(req.params.id)
            .populate("courseData").exec();
        yield redis_1.redis.set(courseId, JSON.stringify(course), "EX", 604800); // 7days
        res.status(200).json({
            success: true,
            course,
        });
    }
    catch (error) {
        return next(new errorHandler_1.default(error.message, 500));
    }
}));
//get course content -- only for valid user
exports.getCourseByUser = (0, catchAsyncError_1.catchAsyncError)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userCourseList = (_a = req.user) === null || _a === void 0 ? void 0 : _a.courses;
        const courseId = req.params.id;
        // Check if the user has access to the course
        const courseExists = userCourseList === null || userCourseList === void 0 ? void 0 : userCourseList.find((course) => course._id.toString() === courseId);
        if (!courseExists) {
            return next(new errorHandler_1.default("You are not eligible to access this course", 404));
        }
        // Fetch the course from MongoDB with populated fields
        const course = yield courseModel_1.default.findById(courseId)
            .populate("courseData")
            .populate({
            path: "reviews",
            populate: {
                path: "user",
                select: "name email", // Only populate specific user fields if needed
            },
        });
        const content = course === null || course === void 0 ? void 0 : course.courseData;
        res.status(200).json({
            success: true,
            content,
            reviews: course === null || course === void 0 ? void 0 : course.reviews, // Add populated reviews with user details
        });
    }
    catch (error) {
        return next(new errorHandler_1.default(error.message, 500));
    }
}));
// get all courses --- only for admin
exports.getAdminAllCourses = (0, catchAsyncError_1.catchAsyncError)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const courses = yield courseModel_1.default.find().sort({ createdAt: -1 });
        res.status(201).json({
            success: true,
            courses,
        });
    }
    catch (error) {
        return next(new errorHandler_1.default(error.message, 400));
    }
}));
//Search Courses
exports.searchCourses = (0, catchAsyncError_1.catchAsyncError)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    function searchCourses(query) {
        return __awaiter(this, void 0, void 0, function* () {
            const searchRegex = new RegExp(query, "i"); // 'i' for case-insensitive
            const queryObj = {
                name: { $regex: searchRegex },
            };
            return courseModel_1.default.find(queryObj).select('name price thumbnail level categories');
        });
    }
    try {
        const searchQuery = req.query.q;
        if (!searchQuery) {
            return next(new errorHandler_1.default("Provide search Text", 401));
        }
        const courses = yield searchCourses(searchQuery);
        console.log(courses);
        res.status(201).json({
            success: true,
            courses,
        });
    }
    catch (error) {
        return next(new errorHandler_1.default(error.message, 500));
    }
}));
exports.createQuestion = (0, catchAsyncError_1.catchAsyncError)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { user, question, courseId, contentId } = req.body;
        console.log(req.body);
        // Validation
        if (!user || !question || !courseId || !contentId) {
            return next(new errorHandler_1.default("Please provide all required fields", 400));
        }
        // Create a new question instance
        const newQuery = new questionModel_1.default({
            user,
            question,
            courseId,
            contentId,
        });
        // Save to database
        const savedQuery = yield newQuery.save();
        // Send response
        res.status(201).json({
            message: "Question created successfully",
            data: savedQuery,
        });
    }
    catch (error) {
        return next(new errorHandler_1.default(error.message, 500));
    }
}));
exports.addReview = (0, catchAsyncError_1.catchAsyncError)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { courseId } = req.params;
        const user = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        const { rating, review } = req.body;
        // Validate input data
        if (!rating || !review || !user) {
            return next(new errorHandler_1.default("Rating, review, and user are required.", 400));
        }
        // Check if the course exists
        const course = yield courseModel_1.default.findById(courseId);
        if (!course) {
            return next(new errorHandler_1.default("Course not found.", 404));
        }
        // Create a new review
        const newReview = new reviewModel_1.default({
            course: new mongoose_1.default.Types.ObjectId(courseId),
            rating,
            review,
            user: new mongoose_1.default.Types.ObjectId(user)
        });
        // Save the review
        const savedReview = yield newReview.save();
        // Add the review to the course
        course.reviews.push(savedReview._id);
        // Recalculate the course rating
        const allReviews = yield reviewModel_1.default.find({ course: courseId });
        const totalRating = allReviews.reduce((acc, curr) => acc + curr.rating, 0);
        course.rating = totalRating / allReviews.length;
        // Save the updated course
        yield course.save();
        const courses = yield courseModel_1.default.find().populate({
            path: "reviews",
            populate: {
                path: "user",
                select: "name email",
            },
        }).select("-courseData.videoUrl -courseData.suggestion -courseData.questions -courseData.links");
        yield redis_1.redis.set("courses", JSON.stringify(courses));
        const currCourse = yield courseModel_1.default.findById(courseId)
            .populate("courseData")
            .select("-courseData.videoUrl -courseData.suggestion -courseData.questions -courseData.links").populate({
            path: "reviews",
            populate: { path: "user", select: "name email" } // Populate user details inside reviews
        });
        // Cache the course data in Redis for 7 days (604800 seconds)
        yield redis_1.redis.set(courseId, JSON.stringify(course), "EX", 604800);
        res.status(201).json({
            message: "Review added successfully",
            data: savedReview
        });
    }
    catch (error) {
        return next(new errorHandler_1.default(error.message, 500));
    }
}));
