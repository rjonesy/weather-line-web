import {fileURLToPath} from 'node:url';
import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
 base:'/weather-line-web/',
 plugins:[react()],
 resolve:{alias:{'@':fileURLToPath(new URL('.',import.meta.url))}},
 server:{proxy:{'/api':{
  target:'https://weather-line-recreated.ryan-jones-3545.chatgpt.site',
  changeOrigin:true,
  configure(proxy){proxy.on('proxyReq',request=>request.removeHeader('origin'));},
 }}},
});
