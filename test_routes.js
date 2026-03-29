
import app from './server.js';

function print(path, layer) {
  if (layer.route) {
    layer.route.stack.forEach(print.bind(null, path + (layer.route.path || '')));
  } else if (layer.name === 'router' && layer.handle.stack) {
    layer.handle.stack.forEach(print.bind(null, path + (layer.regexp.source || '')));
  } else if (layer.method) {
    console.log('%s /%s', layer.method.toUpperCase(), path.split('/').filter(Boolean).join('/'));
  }
}

console.log('--- REGISTERED ROUTES ---');
app._router.stack.forEach(print.bind(null, ''));
process.exit(0);
