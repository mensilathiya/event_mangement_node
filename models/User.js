const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const { Schema } = mongoose;

const SALT_ROUNDS = 10;

/**
 * User Model
 * Represents "checker" users created by an Admin inside the Event Management CRM.
 * Admin accounts are handled by a separate Admin model / auth flow (already implemented).
 */
const userSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters long'],
      maxlength: [100, 'Name must not exceed 100 characters'],
    },

    profileImage: {
      type: String, // stored path/URL of the uploaded image
      default: null,
      trim: true,
    },

    mobile: {
      type: String,
      required: [true, 'Mobile number is required'],
      trim: true,
      unique: true,
      match: [/^[0-9]{10}$/, 'Mobile number must be a valid 10-digit number'],
    },

    email: {
      type: String,
      required: false,
      trim: true,
      lowercase: true,
      default: null,
      // allows multiple docs with null/undefined email while still enforcing
      // uniqueness whenever an email value is actually provided
      unique: true,
      sparse: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        'Please enter a valid email address',
      ],
    },

    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters long'],
      select: false, // never return password by default on queries
    },

    role: {
      type: String,
      enum: {
        values: ['checker'],
        message: 'Role can only be "checker" for users created via User Management',
      },
      default: 'checker',
      immutable: true, // prevents role from being changed after creation
    },

    status: {
      type: String,
      enum: {
        values: ['active', 'inactive'],
        message: 'Status must be either "active" or "inactive"',
      },
      default: 'active',
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'Admin', // reference to the Admin model used for JWT authentication
      required: [true, 'createdBy (admin id) is required'],
    },
  },
  {
    timestamps: true, // adds createdAt and updatedAt
    versionKey: false,
  }
);

/* -------------------------------------------------------------------------- */
/* Indexes                                                                     */
/* -------------------------------------------------------------------------- */
userSchema.index({ mobile: 1 }, { unique: true });
userSchema.index({ email: 1 }, { unique: true, sparse: true });

/* -------------------------------------------------------------------------- */
/* Hooks                                                                       */
/* -------------------------------------------------------------------------- */

// Hash the password before saving, only if it has been modified (or is new)
userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Also hash password on findOneAndUpdate / findByIdAndUpdate if it's being updated
userSchema.pre('findOneAndUpdate', async function hashPasswordOnUpdate(next) {
  const update = this.getUpdate() || {};
  const password = update.password || (update.$set && update.$set.password);

  if (!password) return next();

  try {
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    const hashed = await bcrypt.hash(password, salt);

    if (update.password) {
      update.password = hashed;
    } else {
      update.$set.password = hashed;
    }

    // Role must never be changed via update either
    if (update.role) delete update.role;
    if (update.$set && update.$set.role) delete update.$set.role;

    this.setUpdate(update);
    next();
  } catch (err) {
    next(err);
  }
});

/* -------------------------------------------------------------------------- */
/* Instance methods                                                           */
/* -------------------------------------------------------------------------- */

// Compare a plain text password against the stored hash
userSchema.methods.comparePassword = async function comparePassword(candidatePassword) {
  // password field has select:false, so make sure it's loaded on `this`
  return bcrypt.compare(candidatePassword, this.password);
};

/* -------------------------------------------------------------------------- */
/* JSON output                                                                */
/* -------------------------------------------------------------------------- */

// Ensure password is never leaked even if select('+password') was used somewhere
userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.password;
    return ret;
  },
});

userSchema.set('toObject', {
  transform: (_doc, ret) => {
    delete ret.password;
    return ret;
  },
});

const User = mongoose.model('User', userSchema);

module.exports = User;