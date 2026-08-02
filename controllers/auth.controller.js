const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const Admin = require("../models/admin.model");

const login = async (req, res) => {
    try {
        const { login, password } = req.body;

        if (!login || !password) {
            return res.status(400).json({
                success:false,
                message:"Login and password are required",
            });
        }

        const admin = await Admin.findOne({
            $or:[
                { email:login.toLowerCase() },
                { mobile:login }
            ]
        }).select("+password");

        if (!admin) {
            return res.status(401).json({
                success:false,
                message:"Invalid email/mobile or password",
            });
        }

        const isPasswordMatch = await bcrypt.compare(
            password,
            admin.password
        );

        if (!isPasswordMatch) {
            return res.status(401).json({
                success:false,
                message:"Invalid email/mobile or password",
            });
        }

        const token = jwt.sign(
            {
                id:admin._id,
                role:"admin",
            },
            process.env.JWT_SECRET,
            {
                expiresIn:"1d",
            }
        );

        return res.status(200).json({
            success:true,
            message:"Login successful",
            token,
            user:{
                id:admin._id,
                name:admin.name,
                email:admin.email,
                mobile:admin.mobile,
                role:"admin",
            },
        });

    } catch(error) {
        return res.status(500).json({
            success:false,
            message:error.message,
        });
    }
};


const getProfile = async (req,res) => {
    try {
        const admin = await Admin.findById(req.user.id)
            .select("-password");

        if (!admin) {
            return res.status(404).json({
                success:false,
                message:"Admin not found",
            });
        }

        return res.status(200).json({
            success:true,
            data:admin,
        });

    } catch(error) {
        return res.status(500).json({
            success:false,
            message:error.message,
        });
    }
};


module.exports = {
    login,
    getProfile,
};