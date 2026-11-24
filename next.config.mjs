import {fileURLToPath} from 'node:url';

const backend = process.env.BACKEND_URL ?? 'http://127.0.0.1:8000';
const root = fileURLToPath(new URL('.', import.meta.url));
const android = process.env.USTA_ANDROID_BUILD === '1';

export default {
  turbopack: {root},
  outputFileTracingRoot: root,
  ...(android ? {output:'export', distDir:'.apk-web'} : {
    async rewrites() {
      return [{source:'/api/:path*', destination:backend + '/api/:path*'}];
    },
  }),
};
