import express from 'express';
import { addReview, createQuestion, deltetCours, editCourse, generateVideoUrl, getAdminAllCourses, getAllCourses, getCourseByUser, getSingleCourse, getSingleCourseAdmin, searchCourses, uploadCourse } from '../controllers/courseController';
import {  authorizeRoles, isAutheticated } from '../middlewares/auth';
import {upload} from "../middlewares/multer"



const courseRouter = express.Router();

// USER REGISTRATION 
courseRouter.post("/getVdoCipherOTP",generateVideoUrl);


courseRouter.post(
    "/create-course",
    isAutheticated,
    uploadCourse
); 

courseRouter.post("/course", uploadCourse)

courseRouter.put("/course/:id",isAutheticated,authorizeRoles("admin"), editCourse)

courseRouter.get(
    "/admin/course/:id",
    isAutheticated,
    authorizeRoles("admin"),
    getSingleCourseAdmin
);





courseRouter.get("/get-course/:id", getSingleCourse);

courseRouter.get("/get-courses", getAllCourses);



courseRouter.get(
    "/get/admin/courses",
    isAutheticated,
    authorizeRoles("admin"),
    getAdminAllCourses
);

courseRouter.delete(
    "/course/:id",
    isAutheticated,
    authorizeRoles("admin"),
    deltetCours
);

courseRouter.get("/get-course-content/:id", isAutheticated, getCourseByUser);

courseRouter.get("/search/courses", searchCourses);


// Questions 

courseRouter.post("/questions", isAutheticated, createQuestion);


// review 

courseRouter.post("/review/:courseId", isAutheticated, addReview);

export default courseRouter;
