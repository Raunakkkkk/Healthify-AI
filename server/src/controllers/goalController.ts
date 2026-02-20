import type { Response, NextFunction } from "express";
import type { AuthRequest } from "../middleware/auth.js";
import Goal from "../models/Goal.js";

export async function getGoals(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { date } = req.query;
    const userId = req.userId;

    if (date) {
      const d = new Date(date as string);
      const goal = await Goal.findOne({
        userId,
        startDate: { $lte: d },
        $or: [{ endDate: null }, { endDate: { $gte: d } }],
      }).sort({ startDate: -1 });

      res.json(goal || null);
      return;
    }

    const goals = await Goal.find({ userId }).sort({ startDate: -1 });
    res.json(goals);
  } catch (err) {
    next(err);
  }
}

export async function createGoal(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;

    // Close any currently open goal
    await Goal.updateMany(
      { userId, endDate: null },
      { endDate: new Date(req.body.startDate || Date.now()) }
    );

    const goal = await Goal.create({ ...req.body, userId });
    res.status(201).json(goal);
  } catch (err) {
    next(err);
  }
}

export async function updateGoal(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const goal = await Goal.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      req.body,
      { new: true, runValidators: true }
    );

    if (!goal) {
      res.status(404).json({ error: "Goal not found" });
      return;
    }

    res.json(goal);
  } catch (err) {
    next(err);
  }
}
