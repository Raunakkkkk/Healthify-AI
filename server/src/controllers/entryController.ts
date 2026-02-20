import type { Response, NextFunction } from "express";
import type { AuthRequest } from "../middleware/auth.js";
import FoodEntry from "../models/FoodEntry.js";

export async function getEntries(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;
    const {
      start,
      end,
      meal,
      page = "1",
      limit = "20",
      sort = "-timestamp",
    } = req.query;

    const filter: any = { userId };

    if (start || end) {
      filter.timestamp = {};
      if (start) filter.timestamp.$gte = new Date(start as string);
      if (end) filter.timestamp.$lte = new Date(end as string);
    }
    if (meal) filter.mealType = meal;

    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
    const skip = (pageNum - 1) * limitNum;

    const sortField = (sort as string).startsWith("-")
      ? { [(sort as string).slice(1)]: -1 as const }
      : { [sort as string]: 1 as const };

    const [entries, total] = await Promise.all([
      FoodEntry.find(filter).sort(sortField).skip(skip).limit(limitNum),
      FoodEntry.countDocuments(filter),
    ]);

    res.json({
      entries,
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

export async function createEntry(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const entry = await FoodEntry.create({ ...req.body, userId: req.userId });
    res.status(201).json(entry);
  } catch (err) {
    next(err);
  }
}

export async function updateEntry(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const entry = await FoodEntry.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      req.body,
      { new: true, runValidators: true }
    );

    if (!entry) {
      res.status(404).json({ error: "Entry not found" });
      return;
    }

    res.json(entry);
  } catch (err) {
    next(err);
  }
}

export async function deleteEntry(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const entry = await FoodEntry.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!entry) {
      res.status(404).json({ error: "Entry not found" });
      return;
    }

    res.json({ message: "Entry deleted" });
  } catch (err) {
    next(err);
  }
}
