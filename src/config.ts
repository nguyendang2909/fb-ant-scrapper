export const FB_COOKIE = process.env.FB_COOKIE;
export const MONGO_URI = process.env.MONGO_URI || 'mongodb://10.10.20.91:27017/fbAnt';
export const AI_API = process.env.AI_API || 'http://117.2.240.66:5908/predict';
export const RABBIT_URL = process.env.RABBIT_URL;

// Database
export const FB_ANT_DB_USER: string = process.env.FB_ANT_DB_USER;
export const FB_ANT_DB_PASS: string = process.env.FB_ANT_DB_PASS;
export const FB_ANT_DB_NAME: string = process.env.FB_ANT_DB_NAME;
export const FB_ANT_FB_POST_COLLECTION_NAME = 'fbPosts';

// Browser
export const DEFAULT_FB_PAGE_SCROLL = 2000;
export const DEFAULT_BROWSER_SLOWMO = 50;

export const FB_ANT_FB_USER = process.env.FB_ANT_FB_USER;

export const FB_ANT_FB_PASS = process.env.FB_ANT_FB_PASS;

// Bot Id
export const FB_ANT_BOT_ID = process.env.FB_ANT_BOT_ID;
export const FB_ANT_TOKEN = process.env.FB_ANT_TOKEN;
