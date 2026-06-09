import { supabase } from "../lib/supabase.js";

let _cache = null;
let _cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000;

export async function getPlatformConfig() {
  if (_cache && Date.now() - _cacheTime < CACHE_TTL) return _cache;

  const { data, error } = await supabase
    .from("platform_config")
    .select("key, value");

  if (error) throw error;

  const config = {};
  for (const row of data || []) {
    config[row.key] = row.value;
  }

  _cache = config;
  _cacheTime = Date.now();
  return config;
}

export async function getSessionPrice() {
  const config = await getPlatformConfig();
  return Number(config.session_price || process.env.SESSION_PRICE || 80);
}

export async function getPayoutDay() {
  const config = await getPlatformConfig();
  return Number(config.payout_day || 27);
}

export async function getPayoutCalcDay() {
  const config = await getPlatformConfig();
  return Number(config.payout_calc_day || 25);
}

export async function getPlatformCommission() {
  const config = await getPlatformConfig();
  return Number(config.platform_commission || process.env.PLATFORM_COMMISSION || 0.30);
}

export async function getTeacherShare() {
  const config = await getPlatformConfig();
  return Number(config.teacher_share || process.env.TEACHER_SHARE || 0.70);
}

export async function getMinWithdrawal() {
  const config = await getPlatformConfig();
  return Number(config.min_withdrawal || 50);
}

export function isPayoutCalcDay(date = new Date()) {
  return date.getDate() === 25;
}

export function isWithinPayoutWindow(date = new Date()) {
  const day = date.getDate();
  return day === 26 || day === 27;
}

export function isPayoutDay(date = new Date()) {
  return date.getDate() === 27;
}

export function getCurrentPayoutMonth(date = new Date()) {
  return date.toISOString().slice(0, 7);
}

export function getPreviousMonth(date = new Date()) {
  const d = new Date(date);
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 7);
}
