import type { Response, NextFunction } from "express";
import type { AuthRequest } from "../middleware/auth.js";
import {
  getWeeklyCalories,
  getMacroBreakdown,
  getMicronutrientSummary,
  getGoalVsActual,
} from "../services/reportService.js";

export async function weeklyCalories(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await getWeeklyCalories(req.userId!);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function macros(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { start, end } = req.query;
    const data = await getMacroBreakdown(
      req.userId!,
      start ? new Date(start as string) : undefined,
      end ? new Date(end as string) : undefined
    );
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function micronutrients(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { start, end } = req.query;
    const data = await getMicronutrientSummary(
      req.userId!,
      start ? new Date(start as string) : undefined,
      end ? new Date(end as string) : undefined
    );
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function goalVsActual(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { start, end } = req.query;
    const data = await getGoalVsActual(
      req.userId!,
      start ? new Date(start as string) : undefined,
      end ? new Date(end as string) : undefined
    );
    res.json(data);
  } catch (err) {
    next(err);
  }
}
