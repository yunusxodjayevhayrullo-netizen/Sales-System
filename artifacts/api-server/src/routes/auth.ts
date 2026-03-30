import { Router, type IRouter } from "express";
import passport from "passport";

const router: IRouter = Router();

router.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] }),
);

router.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/auth/failure" }),
  (_req, res) => {
    res.json({ message: "Authenticated successfully" });
  },
);

router.get("/auth/failure", (_req, res) => {
  res.status(403).json({ error: "Access denied. Only the admin user is allowed." });
});

router.get("/auth/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    res.json({ message: "Logged out successfully" });
  });
});

router.get("/auth/me", (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  res.json({ user: req.user });
});

export default router;
