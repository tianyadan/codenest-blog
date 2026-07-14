import type { Article, QuestionBank, QuestionItem, SearchableContent } from '../types/content';

export const articles: Article[] = [
  {
    id: 'article-1',
    slug: 'spring-cache-consistency',
    title: 'Spring 缓存一致性实践',
    summary: '从旁路缓存、延迟双删到高并发兜底，梳理生产环境常用的缓存一致性方案。',
    author: 'CodeNest',
    category: 'learning',
    tags: ['Spring', 'Redis', '缓存', '并发'],
    createdAt: '2026-07-13',
    updatedAt: '2026-07-13',
    readingMinutes: 6,
    topOrder: 1,
    content: `# Spring 缓存一致性实践

## 为什么缓存一致性很难

缓存和数据库属于两套存储，任何双写方案都存在短暂不一致窗口。生产环境里不能追求绝对实时一致，而是要明确业务能接受的延迟范围。

## 旁路缓存模式

读请求先查 Redis，未命中再查 MySQL 并回填缓存。写请求先更新数据库，再删除缓存。

## 延迟双删

高并发场景下，删除缓存后可能被旧数据回填。延迟双删通过二次删除降低脏缓存留存概率。

## 落地建议

- 热点内容设置合理 TTL
- 写路径优先保证数据库成功
- 对关键内容增加异步校准任务
- 缓存 Key 使用业务前缀隔离`
  },
  {
    id: 'article-2',
    slug: 'static-blog-architecture',
    title: '把动态博客改造成静态知识库',
    summary: '拆掉不必要的后端，把文章和八股文沉淀成可构建、可搜索、可部署的静态资产。',
    author: 'CodeNest',
    category: 'work',
    tags: ['静态站点', '架构', 'Markdown'],
    createdAt: '2026-07-12',
    updatedAt: '2026-07-13',
    readingMinutes: 5,
    content: `# 把动态博客改造成静态知识库

## 核心取舍

静态化适合长期沉淀内容，不适合继续承载评论、点赞、登录和学习进度。

## 内容组织

文章放在 articles，题目放在 questions，构建期生成搜索索引。

## 部署方式

最终产物只有 dist 目录，可以直接交给 Nginx 或 CDN 托管。`
  },
  {
    id: 'article-3',
    slug: 'mysql-index-summary',
    title: 'MySQL 索引优化总结',
    summary: '聚簇索引、回表、覆盖索引、最左前缀匹配等核心知识梳理。',
    author: 'CodeNest',
    category: 'learning',
    tags: ['MySQL', '索引', '优化', 'SQL'],
    createdAt: '2026-07-08',
    updatedAt: '2026-07-08',
    readingMinutes: 7,
    content: `# MySQL 索引优化总结

## 索引设计原则

索引不是越多越好，核心是围绕查询条件、排序字段和返回字段建立组合索引。

## 常见风险

- 低区分度字段单独建索引收益有限
- 函数计算会破坏索引使用
- 过多索引会拖慢写入`
  },
  {
    id: 'article-4',
    slug: 'microservice-from-zero-to-one',
    title: '从 0 到 1 搭建微服务架构',
    summary: '服务拆分、注册配置中心、网关路由、OpenFeign 调用的完整实践。',
    author: 'CodeNest',
    category: 'work',
    tags: ['微服务', 'Nacos', 'Spring Cloud', '架构'],
    createdAt: '2026-07-06',
    updatedAt: '2026-07-06',
    readingMinutes: 10,
    content: `# 从 0 到 1 搭建微服务架构

## 拆分边界

服务拆分应围绕业务能力，而不是围绕技术分层。

## 基础设施

注册中心、配置中心、网关、链路追踪都需要提前规划。`
  },
  {
    id: 'article-5',
    slug: 'rewrite-blog-method',
    title: '把博客重新做减法',
    summary: '删掉没必要的功能，把博客重新变成一个长期积累的地方。',
    author: 'CodeNest',
    category: 'diary',
    tags: ['成长', '职业', '思考', '生活'],
    createdAt: '2026-07-10',
    updatedAt: '2026-07-10',
    readingMinutes: 4,
    content: `# 把博客重新做减法

## 为什么做减法

不是所有功能都值得长期维护。对个人站点来说，能稳定输出内容比功能复杂更重要。

## 保留什么

保留文章、题库、搜索和部署脚本。`
  }
];

export const questionBanks: QuestionBank[] = [
  {
    id: 'bank-java',
    slug: 'java',
    name: 'Java 基础',
    description: '覆盖集合、并发、JVM 等高频面试题。',
    tags: ['Java', 'JVM', '并发']
  },
  {
    id: 'bank-mysql',
    slug: 'mysql',
    name: 'MySQL',
    description: '覆盖索引、事务、锁、SQL 优化等核心知识。',
    tags: ['MySQL', '数据库', '索引']
  }
];

export const questions: QuestionItem[] = [
  {
    id: 'question-1',
    slug: 'java-hashmap-resize',
    bankSlug: 'java',
    title: 'HashMap 为什么线程不安全？',
    description: '从扩容、链表/红黑树、并发写入角度解释 HashMap 的风险。',
    answer: `## 核心原因

HashMap 没有同步控制，多线程同时 put 时可能覆盖数据，也可能在扩容迁移时产生结构异常。

## 生产建议

并发场景使用 ConcurrentHashMap。不要通过给 HashMap 外面随手加锁来替代并发容器，除非锁粒度和生命周期非常明确。`,
    tags: ['Java', '集合', '并发'],
    difficulty: 'medium',
    source: '手工整理'
  },
  {
    id: 'question-2',
    slug: 'mysql-index-invalid',
    bankSlug: 'mysql',
    title: 'MySQL 索引为什么会失效？',
    description: '解释函数计算、隐式转换、最左前缀和范围查询对索引命中的影响。',
    answer: `## 常见原因

- 对索引列使用函数
- 字符串字段发生隐式类型转换
- 不满足联合索引最左前缀
- 范围查询后面的列无法继续充分利用索引

## 排查方式

使用 EXPLAIN 查看 type、key、rows 和 Extra，重点关注是否出现全表扫描。`,
    tags: ['MySQL', '索引', 'SQL 优化'],
    difficulty: 'medium',
    source: '手工整理'
  }
];

export const searchableContent: SearchableContent[] = [
  ...articles.map((article) => ({
    id: article.id,
    type: 'article' as const,
    slug: article.slug,
    title: article.title,
    summary: article.summary,
    tags: article.tags,
    body: article.content
  })),
  ...questions.map((question) => ({
    id: question.id,
    type: 'question' as const,
    slug: question.slug,
    title: question.title,
    summary: question.description,
    tags: question.tags,
    body: question.answer
  }))
];
