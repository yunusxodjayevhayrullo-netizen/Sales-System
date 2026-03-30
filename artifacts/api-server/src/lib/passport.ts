import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";

const ADMIN_EMAIL = "admin@example.com";

export interface AdminUser {
  id: string;
  email: string;
  displayName: string;
}

passport.serializeUser((user, done) => {
  done(null, (user as AdminUser).id);
});

passport.deserializeUser((id: string, done) => {
  done(null, { id } as AdminUser);
});

const clientID = process.env["GOOGLE_CLIENT_ID"];
const clientSecret = process.env["GOOGLE_CLIENT_SECRET"];

if (!clientID || !clientSecret) {
  throw new Error(
    "GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables must be set.",
  );
}

passport.use(
  new GoogleStrategy(
    {
      clientID,
      clientSecret,
      callbackURL: "https://sales-system-uz.onrender.com/auth/google/callback",
    },
    (_accessToken, _refreshToken, profile, done) => {
      const email = profile.emails?.[0]?.value;

      if (email !== ADMIN_EMAIL) {
        return done(null, false);
      }

      const user: AdminUser = {
        id: profile.id,
        email,
        displayName: profile.displayName,
      };

      return done(null, user);
    },
  ),
);

export default passport;
