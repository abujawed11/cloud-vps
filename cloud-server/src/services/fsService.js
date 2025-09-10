import fs from 'node:fs/promises';

export async function copyRecursive(src, dest) {
  await fs.cp(src, dest, { recursive: true, force: true });
}

export async function moveCrossFsSafe(src, dest) {
  try {
    await fs.rename(src, dest);
  } catch {
    await fs.cp(src, dest, { recursive: true });
    await fs.rm(src, { recursive: true, force: true });
  }
}
