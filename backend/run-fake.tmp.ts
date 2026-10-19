import path from 'path';
process.env.JWT_SECRET = 'verification-secret-longer-than-16';
const root = '/home/claude/out/my-app/backend/src';
const fakeMod = require(path.join('/home/claude/out/my-app/backend/tests/fakePrisma.ts'));
const key = require.resolve(path.join(root, 'lib/prisma.ts'));
require.cache[key] = { id: key, filename: key, loaded: true, exports: { prisma: fakeMod.createFakePrisma() } } as unknown as NodeJS.Module;
const { app } = require(path.join(root, 'app.ts'));
app.listen(3999, () => console.log('fake api up'));
