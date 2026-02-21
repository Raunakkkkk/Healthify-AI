import type { Response, NextFunction } from "express";
import type { AuthRequest } from "../middleware/auth.js";
import Goal from "../models/Goal.js";

export async function getGoals(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { date, page = "1", limit = "10" } = req.query;
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

    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string)));
    const skip = (pageNum - 1) * limitNum;

    const [goals, total] = await Promise.all([
      Goal.find({ userId }).sort({ startDate: -1 }).skip(skip).limit(limitNum),
      Goal.countDocuments({ userId }),
    ]);

    res.json({
      goals,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function createGoal(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;
    // Allow multiple active goals; do not close existing ones
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

export async function deleteGoal(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const goal = await Goal.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!goal) {
      res.status(404).json({ error: "Goal not found" });
      return;
    }

    res.json({ message: "Goal deleted" });
  } catch (err) {
    next(err);
  }
}
