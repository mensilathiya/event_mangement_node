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


const updateProfile = async (req, res) => {
    try {
        // Admin identity always comes from the authenticated token,
        // never from the request body (req.body.id / req.body.adminId ignored)
        const adminId = req.user.id;
        const { name, email, mobile } = req.body;

        const admin = await Admin.findById(adminId);

        if (!admin) {
            return res.status(404).json({
                success:false,
                message:"Admin not found",
            });
        }

        // Email must be unique, but not clash with the admin's own current email
        const emailTaken = await Admin.findOne({
            email,
            _id:{ $ne:adminId },
        });

        if (emailTaken) {
            return res.status(400).json({
                success:false,
                message:"Email is already in use by another admin",
            });
        }

        // Same uniqueness check for mobile
        const mobileTaken = await Admin.findOne({
            mobile,
            _id:{ $ne:adminId },
        });

        if (mobileTaken) {
            return res.status(400).json({
                success:false,
                message:"Mobile number is already in use by another admin",
            });
        }

        // Only these 3 fields are ever touched here.
        // _id, password, role, status are never assigned from req.body.
        admin.name = name;
        admin.email = email;
        admin.mobile = mobile;

        await admin.save();

        const updatedAdmin = admin.toObject();
        delete updatedAdmin.password;

        return res.status(200).json({
            success:true,
            message:"Profile updated successfully",
            data:updatedAdmin,
        });

    } catch(error) {
        return res.status(500).json({
            success:false,
            message:error.message,
        });
    }
};


const resetPassword = async (req, res) => {
    try {
        // Admin identity always comes from the authenticated token,
        // never from req.body (adminId / userId / _id are ignored)
        const adminId = req.user.id;
        const { currentPassword, newPassword, confirmPassword } = req.body;

        // newPassword === confirmPassword is already enforced by
        // resetPasswordValidation, this is just a defensive re-check
        if (newPassword !== confirmPassword) {
            return res.status(400).json({
                success:false,
                message:"New password and confirm password do not match",
            });
        }

        // password has select:false on the schema, so it must be
        // explicitly requested here
        const admin = await Admin.findById(adminId).select("+password");

        if (!admin) {
            return res.status(404).json({
                success:false,
                message:"Admin not found",
            });
        }

        const isCurrentPasswordMatch = await bcrypt.compare(
            currentPassword,
            admin.password
        );

        if (!isCurrentPasswordMatch) {
            return res.status(401).json({
                success:false,
                message:"Current password is incorrect",
            });
        }

        const isSameAsCurrentPassword = await bcrypt.compare(
            newPassword,
            admin.password
        );

        if (isSameAsCurrentPassword) {
            return res.status(400).json({
                success:false,
                message:"New password must be different from current password",
            });
        }

        // Do NOT hash here — the Admin schema's pre("save") middleware
        // already hashes password on save. Hashing again here would
        // double-hash it.
        admin.password = newPassword;
        await admin.save();

        return res.status(200).json({
            success:true,
            message:"Password reset successfully",
        });

    } catch(error) {
        return res.status(500).json({
            success:false,
            message:error.message,
        });
    }
};


const logout = async (req, res) => {
    try {
        // Stateless JWT: there is no server-side session/token record to
        // clear. The token remains technically valid until it expires
        // (expiresIn: "1d") — the frontend is responsible for discarding
        // it from wherever it's stored (localStorage/cookie/etc).
        return res.status(200).json({
            success:true,
            message:"Logout successful",
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
    updateProfile,
    resetPassword,
    logout,
};
