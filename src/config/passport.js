const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const LocalStrategy = require("passport-local").Strategy;
const User = require("../models/user.model");
const JwtStrategy = require("passport-jwt").Strategy;
const ExtractJwt = require("passport-jwt").ExtractJwt;
const bcrypt = require("bcryptjs");

// Local Strategy (username/password)
passport.use(
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
    },
    async (email, password, done) => {
      try {
        // Find the user by email
        const user = await User.findOne({ email });

        // If user doesn't exist
        if (!user) {
          return done(null, false, { message: "Incorrect email or password" });
        }

        // Check if user is verified
        if (!user.isVerified) {
          return done(null, false, {
            message: "Please verify your email first",
          });
        }

        // Check if user has a password (OAuth users might not have one)
        if (!user.password) {
          return done(null, false, { message: "Incorrect email or password" });
        }

        // Check if password is correct
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
          return done(null, false, { message: "Incorrect email or password" });
        }

        // Return user if authentication is successful
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  )
);

// JWT Strategy
const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET,
};

passport.use(
  new JwtStrategy(jwtOptions, async (jwtPayload, done) => {
    try {
      // Find the user by ID
      const user = await User.findById(jwtPayload.id);

      if (!user) {
        return done(null, false);
      }

      return done(null, user);
    } catch (error) {
      return done(error, false);
    }
  })
);

// Google OAuth Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      // callbackURL: process.env.GOOGLE_CALLBACK_URL,
      callbackURL:
        process.env.GOOGLE_CALLBACK_URL || "/api/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        console.log("Google Profile:", profile);
        // Check if user already exists
        let user = await User.findOne({ googleId: profile.id });

        if (user) {
          return done(null, user);
        }

        // Check if user exists with the same email
        user = await User.findOne({ email: profile.emails[0].value });

        if (user) {
          // Update existing user with Google ID
          // user.googleId = profile.id;
          // user.isVerified = true; // Google accounts are already verified
          // await user.save();
          // return done(null, user);

          // Update user's Google profile data
          user.oauthProfiles.google = {
            id: profile.id,
            email: profile.emails[0].value,
            name: profile.displayName,
            picture: profile.photos[0].value,
            verified_email: profile.emails[0].verified || true,
          };

          // Update profile picture if not set
          if (!user.profilePicture && profile.photos[0]) {
            user.profilePicture = profile.photos[0].value;
          }

          await user.save();
          return done(null, user);
        }

        // Create new user
        // const newUser = new User({
        //   email: profile.emails[0].value,
        //   firstName: profile.name.givenName,
        //   lastName: profile.name.familyName,
        //   googleId: profile.id,
        //   isVerified: true, // Google accounts are already verified
        //   password: await bcrypt.hash(Math.random().toString(36).slice(-8), 10), // Generate random password
        // });


        const newUser = new User({
          googleId: profile.id,
          email: profile.emails[0].value,
          firstName: profile.name.givenName,
          lastName: profile.name.familyName,
          profilePicture: profile.photos[0] ? profile.photos[0].value : null,
          isVerified: true, // Auto-verify Google users
          oauthProfiles: {
            google: {
              id: profile.id,
              email: profile.emails[0].value,
              name: profile.displayName,
              picture: profile.photos[0] ? profile.photos[0].value : null,
              verified_email: profile.emails[0].verified || true,
            }
          }
        });

        await newUser.save();
        return done(null, newUser);
      } catch (error) {
        return done(error, false);
      }
    }
  )
);

module.exports = passport;
