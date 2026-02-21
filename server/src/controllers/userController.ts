import type { Response, NextFunction } from "express";
import type { AuthRequest } from "../middleware/auth.js";
import User from "../models/User.js";

export async function getProfile(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const user = await User.findById(req.userId).select("-passwordHash");
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateProfile(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const { name, email, currentPassword, newPassword } = req.body;

    if (name) user.name = name;

    if (email && email !== user.email) {
      const exists = await User.findOne({ email, _id: { $ne: user._id } });
      if (exists) {
        res.status(409).json({ error: "Email already in use" });
        return;
      }
      user.email = email;
    }

    if (newPassword) {
      if (!currentPassword) {
        res.status(400).json({ error: "Current password is required to set a new password" });
        return;
      }
      const valid = await user.comparePassword(currentPassword);
      if (!valid) {
        res.status(401).json({ error: "Current password is incorrect" });
        return;
      }
      user.passwordHash = newPassword;
    }

    await user.save();

    const updated = { id: user._id, name: user.name, email: user.email };

    res.json(updated);
  } catch (err) {
    next(err);
  }
}
