import User from "../models/user.model.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { sendWelcomeEmail } from "../emails/emailHandlers.js";

export const signup = async(req, res) => {
    try {
        const {name, username, email, password} = req.body;

        if(!name || !username || !email || !password) {
            return res.status(400).json({message: "All fields are required"});
        }

        const existingEmail = await User.findOne({email});
        if(existingEmail) {
            return res.status(400).json({message: "Email already exists"});
        }

        const existingUsername = await User.findOne({username});
        if(existingUsername) {
            return res.status(400).json({message: "Username already exists"});
        }

        if(password.length < 6) {
            return res.status(400).json({message: "Password must be at least 6 characters"});
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = await User.create({
            name,
            username,
            email,
            password: hashedPassword        
        });

        await user.save();

        const token = jwt.sign({userId: user._id}, process.env.JWT_SECRET, {expiresIn: "3d"});
        
        res.cookie("jwt-linkedin", token, {
            httpOnly: true, //prevent XSS attack
            maxAge: 3 * 24 * 60 * 60 * 1000,    
            sameSite: "strict", //prevent CSRF attacks
            secure: process.env.NODE_ENV === "production" //prevents man-in-the-middle attacks
        });  

        res.status(201).json({message: "User registered successfully!"});
        
        const profileUrl = process.env.CLIENT_URL + "/profile/" + user.username;

        try {
            await sendWelcomeEmail(user.email, user.name, profileUrl);
        } catch (emailError) {
            console.log("Error in sending email: ", emailError);
        }

    } catch (error) {
        console.log("Error in Sign up: ", error.message);
        res.status(500).json({message: "Internal server error"});
    }
};

export const signin = (req, res) => {
    res.send("signin");
};

export const signout = async(req, res) => {
  res.clearCookie("jwt-linkedin");
  res.status(200).json({message: "User signed out successfully"});  
};              