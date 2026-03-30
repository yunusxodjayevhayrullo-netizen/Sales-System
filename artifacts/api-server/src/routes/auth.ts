import { Router } from "express";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";

if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  throw new Error("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set in env");
}

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: "https://sales-system-uz.onrender.com/auth/google/callback",
}, async (accessToken, refreshToken, profile, done) => {
  if (profile.emails && profile.emails[0].value === "admin@example.com") {
    const user = { id: profile.id, email: profile.emails[0].value };
    done(null, user);
  } else {
    done(null, false);
  }
}));

passport.serializeUser((user: any, done) => done(null, user.id));
passport.deserializeUser((id: any, done) => done(null, { id }));

const router = Router();

router.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));

router.get("/auth/google/callback", passport.authenticate("google", { failureRedirect: "/auth/failure" }),
  (_req, res) => res.json({ message: "Authenticated successfully" })
);

router.get("/auth/failure", (_req, res) => res.status(403).json({ error: "Access denied. Only admin allowed." }));

router.get("/auth/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    res.json({ message: "Logged out successfully" });
  });
});

router.get("/auth/me", (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Not authenticated" });
  res.json({ user: req.user });
});

export default router;
