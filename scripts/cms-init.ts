import { getSqlite } from "../db/index";

const sqlite = getSqlite();
const stats = sqlite.prepare(`
  SELECT
    (SELECT COUNT(*) FROM users) AS users,
    (SELECT COUNT(*) FROM categories) AS categories,
    (SELECT COUNT(*) FROM posts) AS posts
`).get() as { users: number; categories: number; posts: number };

process.stdout.write(
  `CMS initialized: ${stats.users} users, ${stats.categories} categories, ${stats.posts} posts\n`,
);
