"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const courseController_1 = require("../controllers/courseController");
const auth_1 = require("../middlewares/auth");
const courseRouter = express_1.default.Router();
// USER REGISTRATION 
courseRouter.post("/getVdoCipherOTP", courseController_1.generateVideoUrl);
courseRouter.post("/create-course", auth_1.isAutheticated, courseController_1.uploadCourse);
courseRouter.post("/course", courseController_1.uploadCourse);
courseRouter.put("/course/:id", auth_1.isAutheticated, (0, auth_1.authorizeRoles)("admin"), courseController_1.editCourse);
courseRouter.get("/admin/course/:id", auth_1.isAutheticated, (0, auth_1.authorizeRoles)("admin"), courseController_1.getSingleCourseAdmin);
courseRouter.get("/get-course/:id", courseController_1.getSingleCourse);
courseRouter.get("/get-courses", courseController_1.getAllCourses);
courseRouter.get("/get/admin/courses", auth_1.isAutheticated, (0, auth_1.authorizeRoles)("admin"), courseController_1.getAdminAllCourses);
courseRouter.delete("/course/:id", auth_1.isAutheticated, (0, auth_1.authorizeRoles)("admin"), courseController_1.deltetCours);
courseRouter.get("/get-course-content/:id", auth_1.isAutheticated, courseController_1.getCourseByUser);
courseRouter.get("/search/courses", courseController_1.searchCourses);
// Questions 
courseRouter.post("/questions", auth_1.isAutheticated, courseController_1.createQuestion);
// review 
courseRouter.post("/review/:courseId", auth_1.isAutheticated, courseController_1.addReview);
exports.default = courseRouter;
