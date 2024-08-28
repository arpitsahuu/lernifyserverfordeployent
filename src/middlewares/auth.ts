import { Request, Response, NextFunction } from "express";
import { catchAsyncError } from "./catchAsyncError";
import ErrorHandler from "../utils/errorHandler";
import jwt, { JwtPayload } from "jsonwebtoken";
import { redis } from "../models/redis";
import errorHandler from "../utils/errorHandler";
import { IUser } from "../models/userModel";
import { updateAccessToken } from "../controllers/userController";

declare global {
  namespace Express {
    interface Request {
      user?: IUser; // Define the user property on the Request object
      id?:string
    }
  }
}

const JWT_SECRET = process.env.ACCESS_TOKEN_SECRET as string;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined in environment variables");
}


// authenticated user
export const isAutheticated = catchAsyncError(
  async (req: Request<any>, res: Response, next: NextFunction) => {
    const accessToken = req.cookies.accessToken as string ;
    const refreshToken = req.cookies.refreshToken as string;
    console.log(req.cookies, "cookies");
    console.log(accessToken,"aToken");
    console.log(refreshToken,"rToken");
    console.log(JWT_SECRET)

    if (!accessToken) {
      return next(
        new ErrorHandler("Please login to access this resource", 400)
      );
    }

    const decoded = jwt.verify(accessToken, JWT_SECRET) as JwtPayload;

    console.log(decoded, "decodedtoken");

    if (!decoded) {
      return next(new ErrorHandler("access token is not valid", 400));
    }

    // check if the access token is expir
    if (decoded.exp && decoded.exp <= Date.now() / 1000 ) {
      try {
        await updateAccessToken(req, res, next);
      } catch (error) {
        return next(error);
      }
    } else {
      const user = await redis.get(decoded._id);
      if (!user) {
        return next(
          new ErrorHandler("Please login to access this resource", 400)
        );
      }
      const curruser = await JSON.parse(user)

      
      if(curruser && user){
        req.user = curruser
      }

      next();
    }
  }
);

// validate user role
export const authorizeRoles = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!roles.includes(req.user?.role || "")) {
      return next(
        new errorHandler(
          `Role: ${req.user?.role} is not allowed to access this resource`,
          403
        )
      );
    }
    next();
  };
};
