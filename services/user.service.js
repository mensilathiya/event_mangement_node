const User = require("../models/User");
const AppError = require("../utils/AppError");
// create user
const createUser = async (admin, data) => {

  if (!admin || admin.role !== "admin") {
    throw new AppError("Only Admin can create users", 403);
  }

  const {
    name,
    mobile,
    email,
    password,
    confirmPassword,
    profileImage
  } = data;

  if (!name || !mobile || !password || !confirmPassword) {
    throw new AppError("All required fields are mandatory", 400);
  }

  if (password !== confirmPassword) {
    throw new AppError("Password and Confirm Password do not match", 400);
  }

  const mobileExist = await User.findOne({ mobile });

  if (mobileExist) {
    throw new AppError("Mobile already exists", 409);
  }

  if (email) {
    const emailExist = await User.findOne({ email });

    if (emailExist) {
      throw new AppError("Email already exists", 409);
    }
  }

  const user = await User.create({
    name,
    mobile,
    email,
    password,
    profileImage,
    role: "checker",
    createdBy: admin._id
  });

  return user;
};
// get user
const getUsers = async (query) => {
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 10;
  const search = query.search || "";

  const skip = (page - 1) * limit;

  const filter = {
    role: "checker",
      status: "active",

  };

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { mobile: { $regex: search, $options: "i" } },
    ];
  }

  const users = await User.find(filter)
    .select("-password")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await User.countDocuments(filter);

  return {
    users,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};
// update user
const updateUser = async (id, data) => {
  const {
    name,
    mobile,
    email,
    password,
    status,
  } = data;

  const user = await User.findById(id);

  if (!user) {
    throw new AppError("User not found", 404);
  }

  // Mobile Duplicate Check
  if (mobile && mobile !== user.mobile) {
    const mobileExists = await User.findOne({
      mobile,
      _id: { $ne: id },
    });

    if (mobileExists) {
      throw new AppError("Mobile already exists", 409);
    }
  }

  // Email Duplicate Check
  if (email && email !== user.email) {
    const emailExists = await User.findOne({
      email,
      _id: { $ne: id },
    });

    if (emailExists) {
      throw new AppError("Email already exists", 409);
    }
  }

  const updatedUser = await User.findByIdAndUpdate(
    id,
    {
      name,
      mobile,
      email,
      status,
      ...(password && { password }),
    },
    {
      new: true,
      runValidators: true,
    }
  ).select("-password");

  return updatedUser;
};
// delete
const deleteUser = async (id) => {
  const user = await User.findById(id);

  if (!user) {
    throw new AppError("User not found", 404);
  }

  user.status = "inactive";
  await user.save();

  return user;
};
module.exports = {
  createUser,
  getUsers,
  updateUser,
  deleteUser
};