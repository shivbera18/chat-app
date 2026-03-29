const fs = require('fs');
let code = fs.readFileSync('src/redis/redis.js', 'utf8');
code = code.replace('export { client };', 'export { client, redisUrl, isOptional };');
fs.writeFileSync('src/redis/redis.js', code);
