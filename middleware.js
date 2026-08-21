import process from 'node:process';
import worker from './src/index.js';

export const config = {
  runtime: 'nodejs'
};

export default function middleware(request) {
  const env = {};
  if (process.env.BACKEND_ORIGIN) env.BACKEND_ORIGIN = process.env.BACKEND_ORIGIN;
  if (process.env.CONSOLE_UI_ORIGIN) env.CONSOLE_UI_ORIGIN = process.env.CONSOLE_UI_ORIGIN;
  return worker.fetch(request, env);
}
