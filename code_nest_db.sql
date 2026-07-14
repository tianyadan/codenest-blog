/*
 Navicat Premium Dump SQL

 Source Server         : localhost
 Source Server Type    : MySQL
 Source Server Version : 90300 (9.3.0)
 Source Host           : localhost:3306
 Source Schema         : code_nest_db

 Target Server Type    : MySQL
 Target Server Version : 90300 (9.3.0)
 File Encoding         : 65001

 Date: 13/07/2026 21:15:29
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for abnormal_ip_log
-- ----------------------------
DROP TABLE IF EXISTS `abnormal_ip_log`;
CREATE TABLE `abnormal_ip_log` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `ip` varchar(45) NOT NULL COMMENT 'IP地址（支持IPv4/IPv6）',
  `record_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '记录时间',
  `is_blocked` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否封禁（0=未封禁，1=已封禁）',
  `ban_type` tinyint NOT NULL DEFAULT '0' COMMENT '封禁类型（0=未封禁，1=临时封禁，2=永久封禁）',
  `ban_reason` varchar(255) DEFAULT NULL COMMENT '封禁原因',
  `ban_start_time` datetime DEFAULT NULL COMMENT '封禁开始时间',
  `ban_end_time` datetime DEFAULT NULL COMMENT '封禁结束时间（临时封禁使用，永久封禁为空）',
  `blocked_by` bigint DEFAULT NULL COMMENT '封禁操作管理员ID',
  `unblock_time` datetime DEFAULT NULL COMMENT '解封时间',
  `unblock_by` bigint DEFAULT NULL COMMENT '解封操作管理员ID',
  `last_hit_time` datetime DEFAULT NULL COMMENT '最近一次命中封禁时间',
  `hit_count` int NOT NULL DEFAULT '0' COMMENT '命中封禁次数',
  `source` varchar(50) DEFAULT NULL COMMENT '记录来源（ABNORMAL_SCAN/ONLINE_ADMIN/GATEWAY_BLOCK）',
  `remark` varchar(255) DEFAULT NULL COMMENT '备注',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_abnormal_ip_log_ip` (`ip`),
  KEY `idx_ip` (`ip`),
  KEY `idx_record_date` (`record_date`),
  KEY `idx_abnormal_ip_log_ip` (`ip`),
  KEY `idx_abnormal_ip_log_blocked` (`is_blocked`,`ban_type`,`ban_end_time`),
  KEY `idx_abnormal_ip_log_record_date` (`record_date`),
  KEY `idx_abnormal_ip_log_last_hit_time` (`last_hit_time`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='异常IP记录表';

-- ----------------------------
-- Table structure for ai_business_config
-- ----------------------------
DROP TABLE IF EXISTS `ai_business_config`;
CREATE TABLE `ai_business_config` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `biz_type` varchar(50) NOT NULL COMMENT '业务类型（如 exam_generate）',
  `model_name` varchar(50) NOT NULL COMMENT '当前使用模型',
  `fallback_model` varchar(50) DEFAULT NULL COMMENT '备用模型（降级用）',
  `status` tinyint NOT NULL DEFAULT '1' COMMENT '状态：1=启用，0=禁用',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_biz_type` (`biz_type`)
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='AI业务模型配置表';

-- ----------------------------
-- Table structure for ai_model_config
-- ----------------------------
DROP TABLE IF EXISTS `ai_model_config`;
CREATE TABLE `ai_model_config` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `model_name` varchar(50) NOT NULL COMMENT '模型名称（如 qwen3.5-27b）',
  `total_quota` bigint NOT NULL DEFAULT '0' COMMENT '总额度（token）',
  `used_quota` bigint NOT NULL DEFAULT '0' COMMENT '已使用额度（token）',
  `expire_time` datetime DEFAULT NULL COMMENT '过期时间',
  `status` tinyint NOT NULL DEFAULT '1' COMMENT '状态：1=可用，0=停用',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_model_name` (`model_name`)
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='AI模型资源表';

-- ----------------------------
-- Table structure for ai_usage_log
-- ----------------------------
DROP TABLE IF EXISTS `ai_usage_log`;
CREATE TABLE `ai_usage_log` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `user_id` char(36) NOT NULL COMMENT '用户ID',
  `business_type` varchar(50) NOT NULL COMMENT '业务类型：默认 exam_generate ',
  `related_id` bigint DEFAULT NULL COMMENT '关联ID（如试卷ID exam_paper.id）',
  `model_name` varchar(50) NOT NULL COMMENT '模型名称（deepseek/gpt-4等）',
  `prompt_tokens` int DEFAULT '0' COMMENT '输入token数',
  `completion_tokens` int DEFAULT '0' COMMENT '输出token数',
  `total_tokens` int DEFAULT '0' COMMENT '总token数',
  `cost` decimal(10,6) DEFAULT '0.000000' COMMENT '本次调用成本（美元或人民币）',
  `currency` varchar(10) DEFAULT 'USD' COMMENT '币种',
  `status` tinyint DEFAULT '1' COMMENT '状态：1=成功，0=失败',
  `error_message` varchar(500) DEFAULT NULL COMMENT '错误信息',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_business_type` (`business_type`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=2126 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='AI调用计费日志表';

-- ----------------------------
-- Table structure for anon_user
-- ----------------------------
DROP TABLE IF EXISTS `anon_user`;
CREATE TABLE `anon_user` (
  `id` char(36) NOT NULL COMMENT '匿名用户ID（UUID）',
  `device_id` varchar(64) NOT NULL COMMENT '设备ID（随机字符串）',
  `fingerprint_hash` varchar(128) DEFAULT NULL COMMENT '轻指纹哈希',
  `last_ip` varchar(45) DEFAULT NULL COMMENT '最后访问IP',
  `last_user_agent` varchar(255) DEFAULT NULL COMMENT '最后一次User-Agent',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_device_id` (`device_id`),
  KEY `idx_fingerprint_hash` (`fingerprint_hash`),
  KEY `idx_last_ip` (`last_ip`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='匿名用户';

-- ----------------------------
-- Table structure for anon_user_device
-- ----------------------------
DROP TABLE IF EXISTS `anon_user_device`;
CREATE TABLE `anon_user_device` (
  `id` char(36) NOT NULL COMMENT 'UUID 主键',
  `user_id` char(36) NOT NULL COMMENT '关联的 anon_user.id',
  `device_id` varchar(255) NOT NULL COMMENT '前端生成的设备 ID',
  `fingerprint` varchar(512) DEFAULT NULL COMMENT '指纹 Hash，可为空',
  `last_ip` varchar(45) DEFAULT NULL COMMENT '上次访问 IP',
  `user_agent` varchar(512) DEFAULT NULL COMMENT '上次访问 UA',
  `updated_at` datetime NOT NULL COMMENT '记录更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_user_device` (`user_id`),
  KEY `idx_device_fp` (`device_id`,`fingerprint`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='匿名用户历史设备表';

-- ----------------------------
-- Table structure for article
-- ----------------------------
DROP TABLE IF EXISTS `article`;
CREATE TABLE `article` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `title` varchar(255) NOT NULL COMMENT '文章名称',
  `content` text NOT NULL COMMENT '文章内容',
  `author` varchar(100) NOT NULL COMMENT '创建人',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '编辑时间',
  `likes` int unsigned DEFAULT '0' COMMENT '点赞数量(废弃)',
  `views` int unsigned DEFAULT '0' COMMENT '阅览数量(废弃)',
  `status` tinyint DEFAULT '1' COMMENT '文章状态：1=正常，0=删除 ，2=隐藏',
  `summary` varchar(500) DEFAULT NULL COMMENT '文章摘要',
  `tags` varchar(255) DEFAULT NULL COMMENT '标签，逗号分隔',
  `top_order` int DEFAULT NULL COMMENT '默认为空，数值越小越靠前',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2044684701315207170 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='文章记录表';

-- ----------------------------
-- Table structure for career_resume
-- ----------------------------
DROP TABLE IF EXISTS `career_resume`;
CREATE TABLE `career_resume` (
  `id` bigint NOT NULL COMMENT '主键ID，使用雪花算法生成，对应 MyBatis-Plus ASSIGN_ID',
  `anon_user_id` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '匿名用户ID，未登录或未绑定 openId 时用于恢复简历数据',
  `open_id` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '微信 openId，用户绑定后用于跨设备恢复简历数据',
  `title` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '我的简历' COMMENT '简历标题，例如：我的简历、后端开发简历',
  `template_key` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'default_clean' COMMENT '简历模板标识，第一版固定为 default_clean，预留后续模板扩展',
  `content_json` longtext COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '简历主体内容JSON，存储基本信息、教育经历、专业技能、项目经历、工作经历、个人作品、荣誉奖项、自我评价等完整编辑数据',
  `style_json` longtext COLLATE utf8mb4_unicode_ci COMMENT '简历样式配置JSON，第一版可为空或使用默认值，预留主题色、字号、字体、间距等配置',
  `module_json` longtext COLLATE utf8mb4_unicode_ci COMMENT '简历模块配置JSON，存储模块开关、模块排序、自定义模块名称等信息',
  `status` tinyint NOT NULL DEFAULT '0' COMMENT '简历状态：0草稿，1已完成，2已归档',
  `is_default` tinyint NOT NULL DEFAULT '1' COMMENT '是否默认简历：0否，1是；第一版默认每个用户一份简历',
  `save_version` int NOT NULL DEFAULT '1' COMMENT '保存版本号，每次保存递增，用于自动保存和并发编辑冲突判断',
  `last_saved_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '最近保存时间，用于前端展示自动保存状态',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `is_deleted` tinyint NOT NULL DEFAULT '0' COMMENT '逻辑删除：0未删除，1已删除',
  PRIMARY KEY (`id`),
  KEY `idx_anon_user_id` (`anon_user_id`),
  KEY `idx_open_id` (`open_id`),
  KEY `idx_open_default` (`open_id`,`is_default`,`is_deleted`),
  KEY `idx_anon_default` (`anon_user_id`,`is_default`,`is_deleted`),
  KEY `idx_updated_at` (`updated_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='普通简历表：用于保存在线简历编辑器的结构化简历内容、模块配置、样式配置和恢复数据';

-- ----------------------------
-- Table structure for career_resume_evidence_optimize_record
-- ----------------------------
DROP TABLE IF EXISTS `career_resume_evidence_optimize_record`;
CREATE TABLE `career_resume_evidence_optimize_record` (
  `id` bigint NOT NULL COMMENT '主键ID，建议由后端雪花算法生成，避免分布式场景下依赖数据库自增',
  `resume_id` bigint NOT NULL COMMENT '关联在线简历ID，对应 career_resume.id',
  `anon_user_id` varchar(64) NOT NULL COMMENT '匿名用户ID，用于未登录/匿名体系下的数据归属',
  `open_id` varchar(128) DEFAULT NULL COMMENT '登录用户唯一标识，如微信 openId；匿名用户可为空',
  `optimize_mode` varchar(32) NOT NULL DEFAULT 'evidence' COMMENT '优化模式：evidence=能力证据优化',
  `status` tinyint NOT NULL DEFAULT '0' COMMENT '任务状态：0=生成中，1=成功，2=失败',
  `use_learning_evidence` tinyint NOT NULL DEFAULT '0' COMMENT '用户是否授权使用学习数据反馈：0=否，1=是',
  `use_wrong_question_evidence` tinyint NOT NULL DEFAULT '0' COMMENT '用户是否授权使用错题反馈：0=否，1=是',
  `use_interview_report_evidence` tinyint NOT NULL DEFAULT '0' COMMENT '用户是否授权使用面试反馈：0=否，1=是',
  `learning_available` tinyint NOT NULL DEFAULT '0' COMMENT '本次优化时学习数据是否可用：0=不可用，1=可用',
  `wrong_question_available` tinyint NOT NULL DEFAULT '0' COMMENT '本次优化时错题数据是否可用：0=不可用，1=可用',
  `interview_report_available` tinyint NOT NULL DEFAULT '0' COMMENT '本次优化时面试报告是否可用：0=不可用，1=可用',
  `jd_file_name` varchar(255) DEFAULT NULL COMMENT '用户上传的JD文件名，仅用于追踪和问题排查',
  `jd_content_type` varchar(100) DEFAULT NULL COMMENT '用户上传的JD文件MIME类型，如 application/pdf、image/png',
  `jd_summary` longtext COMMENT 'AI解析后的JD摘要，包含岗位职责、必备技能、加分项、风险点等',
  `target_count` int NOT NULL DEFAULT '0' COMMENT '本次参与优化的简历文本块数量，不包含基本信息',
  `request_snapshot_json` longtext COMMENT '请求快照JSON，保存contentJson、moduleJson、targets、禁用关键词、重点关键词等必要上下文',
  `availability_snapshot_json` longtext COMMENT '证据可用性检测快照JSON，保存三类证据是否可用及前端展示摘要',
  `evidence_profile_json` longtext COMMENT '能力证据画像JSON，聚合学习数据、错题风险、面试报告亮点与短板；禁止直接展示给招聘方',
  `result_content_json` longtext COMMENT '优化后的简历内容JSON，可保存每个target的最终文本，便于回溯',
  `result_reason_json` longtext COMMENT '优化理由JSON，保存每个target对应的写作理由、证据来源、风险等级、题库学习链接等',
  `model_name` varchar(100) DEFAULT NULL COMMENT '本次能力证据优化使用的AI模型名称',
  `prompt_tokens` int NOT NULL DEFAULT '0' COMMENT '输入token数，冗余保存便于按任务快速排查',
  `completion_tokens` int NOT NULL DEFAULT '0' COMMENT '输出token数，冗余保存便于按任务快速排查',
  `total_tokens` int NOT NULL DEFAULT '0' COMMENT '总token数，冗余保存便于按任务快速排查',
  `fail_reason` varchar(1000) DEFAULT NULL COMMENT '失败原因，status=2时记录异常信息或AI返回异常摘要',
  `completed_at` datetime DEFAULT NULL COMMENT '任务完成时间，成功或失败时写入',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `is_deleted` tinyint NOT NULL DEFAULT '0' COMMENT '逻辑删除：0=未删除，1=已删除',
  PRIMARY KEY (`id`),
  KEY `idx_resume_status_created` (`resume_id`,`status`,`created_at`) COMMENT '按简历查询最近一次成功优化记录',
  KEY `idx_user_created` (`anon_user_id`,`created_at`) COMMENT '按用户查询能力证据优化历史',
  KEY `idx_status_created` (`status`,`created_at`) COMMENT '后台排查生成中、失败任务',
  KEY `idx_model_created` (`model_name`,`created_at`) COMMENT '后台按模型统计和排查'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='在线简历能力证据优化记录表';

-- ----------------------------
-- Table structure for content_visit_log
-- ----------------------------
DROP TABLE IF EXISTS `content_visit_log`;
CREATE TABLE `content_visit_log` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `visit_date` date NOT NULL COMMENT '访问日期（方便按天统计）',
  `ip_address` varchar(64) NOT NULL COMMENT '访客IP地址',
  `user_agent` varchar(255) DEFAULT NULL COMMENT '浏览器或设备信息',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '访问时间',
  `article_id` bigint DEFAULT NULL COMMENT '访问的文章ID',
  `question_bank_id` bigint DEFAULT NULL COMMENT '访问的题库ID',
  `question_id` bigint DEFAULT NULL COMMENT '访问的题目ID',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1142 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='内容访问日志表';

-- ----------------------------
-- Table structure for exam_paper
-- ----------------------------
DROP TABLE IF EXISTS `exam_paper`;
CREATE TABLE `exam_paper` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '试卷ID',
  `user_id` char(36) NOT NULL COMMENT '用户ID（对应 anon_user.id）',
  `question_bank_id` bigint NOT NULL COMMENT '题库ID',
  `title` varchar(255) DEFAULT NULL COMMENT '试卷名称（如：Spring专项测试）',
  `total_questions` int DEFAULT '0' COMMENT '题目数量',
  `score` int DEFAULT '0' COMMENT '总分（满分）',
  `user_score` int DEFAULT NULL COMMENT '用户得分',
  `status` tinyint DEFAULT '0' COMMENT '状态：0=未完成，1=已完成',
  `ai_model` varchar(50) DEFAULT NULL COMMENT '使用的AI模型,用于分析出题质量',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_question_bank_id` (`question_bank_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2060678006048890883 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='试卷表';

-- ----------------------------
-- Table structure for exam_question
-- ----------------------------
DROP TABLE IF EXISTS `exam_question`;
CREATE TABLE `exam_question` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `paper_id` bigint DEFAULT NULL,
  `original_question_id` bigint DEFAULT NULL COMMENT '原题ID（questions.id）',
  `question` text NOT NULL COMMENT 'AI生成后的题目',
  `options` json NOT NULL COMMENT '选项（A/B/C/D）JSON格式',
  `correct_answer` varchar(10) NOT NULL COMMENT '正确答案',
  `analysis` text COMMENT '解析',
  `sort_order` int DEFAULT '0' COMMENT '题目顺序',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `difficulty` tinyint NOT NULL DEFAULT '2' COMMENT '难度：1简单 2中等 3困难',
  `is_imported` tinyint NOT NULL DEFAULT '0' COMMENT '是否已导入系统题库：0否 1是',
  `imported_at` datetime DEFAULT NULL COMMENT '导入系统题库时间',
  PRIMARY KEY (`id`),
  KEY `idx_paper_id` (`paper_id`)
) ENGINE=InnoDB AUTO_INCREMENT=803 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='试卷题目表（AI生成）';

-- ----------------------------
-- Table structure for featured_content
-- ----------------------------
DROP TABLE IF EXISTS `featured_content`;
CREATE TABLE `featured_content` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL COMMENT '名称',
  `image` text COMMENT '图片（base64或其他格式）',
  `description` varchar(500) DEFAULT NULL COMMENT '描述',
  `content` text COMMENT '内容',
  `type` enum('tool','website','article') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '类型',
  `status` tinyint DEFAULT '1' COMMENT '状态（1=上架，0=下架，2=草稿）',
  `sort_order` int DEFAULT '0' COMMENT '排序值，数字越小越靠前',
  `created_by` varchar(100) DEFAULT NULL COMMENT '创建人',
  `link_url` varchar(500) DEFAULT NULL COMMENT '跳转链接',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '修改时间',
  PRIMARY KEY (`id`),
  KEY `idx_type_status` (`type`,`status`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='首页精选内容表';

-- ----------------------------
-- Table structure for feedback
-- ----------------------------
DROP TABLE IF EXISTS `feedback`;
CREATE TABLE `feedback` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `title` varchar(100) NOT NULL COMMENT '问题标题',
  `contact` varchar(50) DEFAULT NULL COMMENT '联系方式（手机号、邮箱等）',
  `detail` text NOT NULL COMMENT '问题详情',
  `source` tinyint NOT NULL COMMENT '问题来源（1=web，2=miniprogram）',
  `status` tinyint NOT NULL DEFAULT '0' COMMENT '处理状态（0=未处理，1=处理中，2=已解决，3=已忽略）',
  `category` varchar(50) DEFAULT NULL COMMENT '问题分类（功能问题/UI反馈/Bug/建议等）',
  `feedback_time` datetime NOT NULL COMMENT '反馈时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=29 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='用户反馈表';

-- ----------------------------
-- Table structure for graph_admin_operation_log
-- ----------------------------
DROP TABLE IF EXISTS `graph_admin_operation_log`;
CREATE TABLE `graph_admin_operation_log` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '日志ID',
  `bank_id` bigint DEFAULT NULL COMMENT '题库ID',
  `graph_id` bigint DEFAULT NULL COMMENT '图谱ID',
  `operation_type` varchar(64) NOT NULL COMMENT '操作类型',
  `target_id` bigint DEFAULT NULL COMMENT '操作目标ID',
  `before_json` text COMMENT '操作前数据',
  `after_json` text COMMENT '操作后数据',
  `operator_id` varchar(128) DEFAULT NULL COMMENT '操作者ID',
  `created_at` datetime NOT NULL COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_graph_created` (`graph_id`,`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ----------------------------
-- Table structure for graph_rebuild_job
-- ----------------------------
DROP TABLE IF EXISTS `graph_rebuild_job`;
CREATE TABLE `graph_rebuild_job` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '任务ID',
  `bank_id` bigint NOT NULL COMMENT '题库ID',
  `status` varchar(32) NOT NULL COMMENT '任务状态',
  `current_stage` varchar(64) DEFAULT NULL COMMENT '当前阶段：INIT/EXTRACTING/DEDUP_REVIEW/BUILDING_GRAPH/PUBLISHING',
  `stage_message` varchar(255) DEFAULT NULL COMMENT '阶段说明',
  `trigger_source` varchar(32) DEFAULT 'manual' COMMENT '触发来源',
  `model_name` varchar(128) DEFAULT NULL COMMENT '使用的大模型名称',
  `fallback_model` varchar(128) DEFAULT NULL COMMENT '备用模型名称',
  `total_tasks` int DEFAULT '0' COMMENT '总任务数',
  `progress_current` int DEFAULT '0' COMMENT '当前已处理进度',
  `progress_total` int DEFAULT '0' COMMENT '总进度',
  `success_tasks` int DEFAULT '0' COMMENT '成功任务数',
  `failed_tasks` int DEFAULT '0' COMMENT '失败任务数',
  `last_progress_at` datetime DEFAULT NULL COMMENT '最近进度更新时间',
  `error_message` varchar(1000) DEFAULT NULL COMMENT '错误信息',
  `published_graph_id` bigint DEFAULT NULL COMMENT '发布的图谱ID',
  `created_at` datetime NOT NULL COMMENT '创建时间',
  `updated_at` datetime NOT NULL COMMENT '更新时间',
  `finished_at` datetime DEFAULT NULL COMMENT '完成时间',
  PRIMARY KEY (`id`),
  KEY `idx_bank_created` (`bank_id`,`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ----------------------------
-- Table structure for identity_bind
-- ----------------------------
DROP TABLE IF EXISTS `identity_bind`;
CREATE TABLE `identity_bind` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '主键',
  `open_id` varchar(128) NOT NULL COMMENT '微信小程序 openid',
  `anon_user_id` char(36) NOT NULL COMMENT '绑定目标匿名用户ID',
  `status` tinyint NOT NULL DEFAULT '1' COMMENT '1=有效 0=失效',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_open_id` (`open_id`),
  KEY `idx_anon_user_id` (`anon_user_id`),
  KEY `idx_updated_at` (`updated_at`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='微信openid与匿名用户绑定关系';

-- ----------------------------
-- Table structure for interview_message
-- ----------------------------
DROP TABLE IF EXISTS `interview_message`;
CREATE TABLE `interview_message` (
  `id` bigint NOT NULL COMMENT '主键ID',
  `session_id` bigint NOT NULL COMMENT '所属面试会话ID',
  `role` varchar(16) NOT NULL COMMENT '角色（user=用户，assistant=AI面试官）',
  `question_no` int DEFAULT NULL COMMENT '题目编号（第几题）',
  `content` text COMMENT '消息内容（问题或回答）',
  `sort_order` int NOT NULL COMMENT '排序字段（保证消息顺序）',
  `created_at` datetime NOT NULL COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_session_sort` (`session_id`,`sort_order`) COMMENT '会话+顺序索引'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='面试问答消息表';

-- ----------------------------
-- Table structure for interview_report
-- ----------------------------
DROP TABLE IF EXISTS `interview_report`;
CREATE TABLE `interview_report` (
  `id` bigint NOT NULL COMMENT '主键ID',
  `session_id` bigint NOT NULL COMMENT '面试会话ID',
  `status` tinyint NOT NULL DEFAULT '0' COMMENT '报告状态（0=生成中，1=成功，2=失败）',
  `total_score` int DEFAULT NULL COMMENT '综合评分（0-100）',
  `report_json` longtext COMMENT '完整报告内容（JSON格式，包括优缺点、建议等）',
  `fail_reason` varchar(512) DEFAULT NULL COMMENT '生成失败原因',
  `pdf_url` varchar(512) DEFAULT NULL COMMENT 'PDF报告下载地址',
  `created_at` datetime NOT NULL COMMENT '创建时间',
  `updated_at` datetime NOT NULL COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_session_id` (`session_id`) COMMENT '一个会话只能有一份报告'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='面试评估报告表';

-- ----------------------------
-- Table structure for interview_session
-- ----------------------------
DROP TABLE IF EXISTS `interview_session`;
CREATE TABLE `interview_session` (
  `id` bigint NOT NULL COMMENT '主键ID（雪花算法或分布式ID）',
  `anon_user_id` varchar(64) NOT NULL COMMENT '匿名用户ID（用于未登录用户标识）',
  `open_id` varchar(128) NOT NULL COMMENT '用户唯一标识（登录用户，如微信openId或系统用户ID）',
  `position` varchar(64) DEFAULT NULL COMMENT '目标岗位（如：Java后端开发）',
  `work_years` varchar(32) DEFAULT NULL COMMENT '工作年限（如：应届 / 1-3年 / 3-5年）',
  `salary_range` varchar(64) DEFAULT NULL COMMENT '期望薪资范围（如：10k-20k）',
  `resume_file_url` varchar(512) DEFAULT NULL COMMENT '简历原文件 OSS 地址',
  `tech_stack_json` text COMMENT '技术栈配置（JSON格式，如Java, SpringBoot, MySQL等）',
  `config_snapshot_json` text COMMENT '面试配置快照（JSON，记录当时生成的面试规则）',
  `status` tinyint NOT NULL DEFAULT '0' COMMENT '面试状态（0=未开始，1=进行中，2=已完成，3=异常结束）',
  `current_question_no` int NOT NULL DEFAULT '1' COMMENT '当前进行到第几题',
  `max_question_no` int NOT NULL DEFAULT '10' COMMENT '最大题目数（默认10题）',
  `used_seconds` int NOT NULL DEFAULT '0' COMMENT '已使用时长（单位：秒）',
  `resume_summary` text COMMENT '简历摘要（AI提取或用户输入）',
  `started_at` datetime DEFAULT NULL COMMENT '面试开始时间',
  `finished_at` datetime DEFAULT NULL COMMENT '面试结束时间',
  `created_at` datetime NOT NULL COMMENT '创建时间',
  `updated_at` datetime NOT NULL COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_openid_created` (`open_id`,`created_at`) COMMENT '用户+创建时间索引'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='面试会话表';

-- ----------------------------
-- Table structure for knowledge_edge
-- ----------------------------
DROP TABLE IF EXISTS `knowledge_edge`;
CREATE TABLE `knowledge_edge` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '边ID',
  `graph_id` bigint NOT NULL COMMENT '图谱ID',
  `source_node_id` bigint NOT NULL COMMENT '源节点ID',
  `target_node_id` bigint NOT NULL COMMENT '目标节点ID',
  `relation_type` varchar(64) DEFAULT '关联' COMMENT '关系类型：考察/属于/依赖/对比/实现/基于',
  `strength` double DEFAULT '1' COMMENT '关系强度',
  `created_at` datetime NOT NULL COMMENT '创建时间',
  `updated_at` datetime NOT NULL COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_graph` (`graph_id`),
  KEY `idx_source_target` (`source_node_id`,`target_node_id`)
) ENGINE=InnoDB AUTO_INCREMENT=521 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ----------------------------
-- Table structure for knowledge_graph
-- ----------------------------
DROP TABLE IF EXISTS `knowledge_graph`;
CREATE TABLE `knowledge_graph` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `bank_id` bigint NOT NULL COMMENT '题库/业务ID',
  `version_no` int NOT NULL COMMENT '版本号',
  `status` varchar(32) NOT NULL COMMENT '图谱状态：building/ready/failed等',
  `trigger_source` varchar(32) DEFAULT 'manual' COMMENT '触发来源：manual/auto',
  `build_started_at` datetime DEFAULT NULL COMMENT '构建开始时间',
  `build_finished_at` datetime DEFAULT NULL COMMENT '构建完成时间',
  `created_at` datetime NOT NULL COMMENT '创建时间',
  `updated_at` datetime NOT NULL COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_bank_status` (`bank_id`,`status`),
  KEY `idx_bank_version` (`bank_id`,`version_no`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ----------------------------
-- Table structure for knowledge_graph_rollback_log
-- ----------------------------
DROP TABLE IF EXISTS `knowledge_graph_rollback_log`;
CREATE TABLE `knowledge_graph_rollback_log` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `bank_id` bigint NOT NULL COMMENT '题库ID',
  `from_graph_id` bigint DEFAULT NULL COMMENT '源图谱ID',
  `to_graph_id` bigint NOT NULL COMMENT '目标图谱ID（回滚到）',
  `operator_id` varchar(128) DEFAULT NULL COMMENT '操作者ID',
  `reason` varchar(1000) DEFAULT NULL COMMENT '回滚原因',
  `created_at` datetime NOT NULL COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_bank_created` (`bank_id`,`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ----------------------------
-- Table structure for knowledge_node
-- ----------------------------
DROP TABLE IF EXISTS `knowledge_node`;
CREATE TABLE `knowledge_node` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '节点ID',
  `graph_id` bigint NOT NULL COMMENT '图谱ID',
  `bank_id` bigint NOT NULL COMMENT '题库ID',
  `node_key` varchar(255) NOT NULL COMMENT '节点唯一标识（业务key）',
  `node_name` varchar(255) NOT NULL COMMENT '节点名称',
  `description` varchar(1000) DEFAULT NULL COMMENT '节点描述',
  `node_type` varchar(64) DEFAULT NULL COMMENT '节点类型（概念/知识点/技能等）',
  `weight` double DEFAULT '1' COMMENT '节点权重',
  `color_level` varchar(64) DEFAULT 'green' COMMENT '难度/掌握颜色等级',
  `created_at` datetime NOT NULL COMMENT '创建时间',
  `updated_at` datetime NOT NULL COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_graph_node_key` (`graph_id`,`node_key`),
  KEY `idx_graph` (`graph_id`)
) ENGINE=InnoDB AUTO_INCREMENT=306 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ----------------------------
-- Table structure for knowledge_node_question_rel
-- ----------------------------
DROP TABLE IF EXISTS `knowledge_node_question_rel`;
CREATE TABLE `knowledge_node_question_rel` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `graph_id` bigint NOT NULL COMMENT '图谱ID',
  `node_id` bigint NOT NULL COMMENT '节点ID',
  `question_id` bigint NOT NULL COMMENT '题目ID',
  `relevance_score` double DEFAULT '1' COMMENT '关联相关度评分',
  `source_type` varchar(32) DEFAULT 'ai' COMMENT '来源类型：ai/manual',
  `created_at` datetime NOT NULL COMMENT '创建时间',
  `updated_at` datetime NOT NULL COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_graph_node_question` (`graph_id`,`node_id`,`question_id`),
  KEY `idx_graph_node` (`graph_id`,`node_id`)
) ENGINE=InnoDB AUTO_INCREMENT=222 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ----------------------------
-- Table structure for like_record
-- ----------------------------
DROP TABLE IF EXISTS `like_record`;
CREATE TABLE `like_record` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint DEFAULT '0' COMMENT 'ç‚¹èµžç”¨æˆ· ID',
  `target_type` int DEFAULT NULL COMMENT 'ç‚¹èµžç±»åž‹ï¼š1=æ–‡ç« , 2=é¢˜ç›®, 3=å·¥å…·, 4=ç½‘ç«™',
  `target_id` bigint DEFAULT NULL COMMENT 'è¢«ç‚¹èµžå¯¹è±¡ ID',
  `is_like` tinyint DEFAULT NULL COMMENT 'ç‚¹èµžçŠ¶æ€ï¼š1=ç‚¹èµž, 0=å–æ¶ˆ',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT 'åˆ›å»ºæ—¶é—´',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'æ›´æ–°æ—¶é—´',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=291 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='ç‚¹èµžè®°å½•è¡¨';

-- ----------------------------
-- Table structure for merge_job
-- ----------------------------
DROP TABLE IF EXISTS `merge_job`;
CREATE TABLE `merge_job` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '主键',
  `from_anon_user_id` char(36) NOT NULL COMMENT '源匿名用户ID（小程序侧）',
  `to_anon_user_id` char(36) NOT NULL COMMENT '目标匿名用户ID（PC侧）',
  `bind_token` varchar(64) NOT NULL COMMENT '绑定token',
  `idempotency_key` varchar(128) NOT NULL COMMENT '幂等键',
  `status` varchar(16) NOT NULL COMMENT 'PENDING/RUNNING/SUCCESS/FAILED',
  `retry_count` int NOT NULL DEFAULT '0' COMMENT '重试次数',
  `error_message` varchar(512) DEFAULT NULL COMMENT '失败原因',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_idempotency_key` (`idempotency_key`),
  KEY `idx_bind_token` (`bind_token`),
  KEY `idx_status_updated` (`status`,`updated_at`),
  KEY `idx_from_to` (`from_anon_user_id`,`to_anon_user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='异步数据合并任务';

-- ----------------------------
-- Table structure for message_board
-- ----------------------------
DROP TABLE IF EXISTS `message_board`;
CREATE TABLE `message_board` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `parent_id` bigint unsigned NOT NULL DEFAULT '0' COMMENT '父评论ID，0表示顶级评论',
  `user_id` bigint unsigned DEFAULT NULL COMMENT '用户ID，可与用户表关联',
  `commenter_name` varchar(50) DEFAULT NULL COMMENT '评论人名称（冗余存储）',
  `avatar_url` varchar(255) DEFAULT NULL COMMENT '评论人头像地址（冗余存储）',
  `comment_content` text NOT NULL COMMENT '评论内容',
  `comment_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '评论时间',
  `is_deleted` tinyint(1) NOT NULL DEFAULT '0' COMMENT '逻辑删除标记：0=正常，1=已删除',
  `like_count` int unsigned NOT NULL DEFAULT '0' COMMENT '点赞数',
  `status` tinyint NOT NULL DEFAULT '0' COMMENT '审核状态：0=待审核，1=通过，2=不通过',
  `comment_source` varchar(50) DEFAULT NULL COMMENT '评论来源',
  `ip_address` varchar(45) DEFAULT NULL COMMENT '评论人IP地址',
  `location` varchar(100) DEFAULT NULL COMMENT '基于IP解析的地理位置',
  `user_agent` varchar(255) DEFAULT NULL COMMENT '用户设备信息（UA）',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_parent_id` (`parent_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_comment_time` (`comment_time`)
) ENGINE=InnoDB AUTO_INCREMENT=28 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='留言板';

-- ----------------------------
-- Table structure for mq_message_record
-- ----------------------------
DROP TABLE IF EXISTS `mq_message_record`;
CREATE TABLE `mq_message_record` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `message_id` varchar(128) NOT NULL COMMENT '业务消息ID，由生产方生成，用于幂等定位',
  `business_type` varchar(64) NOT NULL COMMENT '业务类型：ADMIN_AI_QUESTION_GENERATE / INTERVIEW_REPORT_GENERATE',
  `business_name` varchar(128) DEFAULT NULL COMMENT '业务名称，用于后台展示',
  `biz_id` varchar(128) DEFAULT NULL COMMENT '业务ID，如知识点ID、报告ID',
  `topic` varchar(128) DEFAULT NULL COMMENT '原始业务Topic',
  `dlq_topic` varchar(128) DEFAULT NULL COMMENT '业务死信Topic，V1为手动投递的业务DLQ',
  `consumer_group` varchar(128) DEFAULT NULL COMMENT '消费者组',
  `payload` text COMMENT '原始消息体JSON，用于详情查看与手动重试',
  `status` tinyint NOT NULL COMMENT '状态：0待消费 1成功 2失败 3死信 4已重试 5已忽略 6已删除',
  `retry_count` int NOT NULL DEFAULT '0' COMMENT '当前消息已失败/重试次数',
  `max_retry_count` int NOT NULL DEFAULT '3' COMMENT '最大重试次数，超过后进入业务死信',
  `error_message` text COMMENT '最近一次失败原因或人工处理说明',
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '软删除标记：0未删除 1已删除',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `success_at` datetime DEFAULT NULL COMMENT '消费成功时间',
  `dead_letter_at` datetime DEFAULT NULL COMMENT '进入业务死信时间',
  `ignored_at` datetime DEFAULT NULL COMMENT '标记忽略时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_message_id` (`message_id`),
  KEY `idx_business_status_time` (`business_type`,`status`,`created_at`),
  KEY `idx_biz_id` (`biz_id`),
  KEY `idx_deleted_status_time` (`deleted`,`status`,`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='MQ消息记录与业务死信治理表';

-- ----------------------------
-- Table structure for project
-- ----------------------------
DROP TABLE IF EXISTS `project`;
CREATE TABLE `project` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '项目ID',
  `name` varchar(255) NOT NULL COMMENT '项目名称',
  `description` text COMMENT '项目简介',
  `thumbnail_url` varchar(500) DEFAULT NULL COMMENT '项目缩略图URL',
  `content_url` varchar(500) DEFAULT NULL COMMENT '项目内容链接（第三方文档地址）',
  `view_count` int DEFAULT '0' COMMENT '项目浏览数量',
  `like_count` int DEFAULT '0' COMMENT '项目点赞数量',
  `project_type` int NOT NULL COMMENT '项目类型（数字标识，例如 1=软件，2=硬件）',
  `project_tag` int DEFAULT NULL COMMENT '项目标签（数字标识，例如 1=前端，2=后端，3=AI）',
  `status` tinyint DEFAULT '1' COMMENT '项目状态（1 可见，0 不可见）',
  `deleted` tinyint DEFAULT '0' COMMENT '逻辑删除标识（0 正常，1 删除）',
  `progress` tinyint DEFAULT '0' COMMENT '项目进度（0 规划中，1 进行中，2 已完成）',
  `creator_id` bigint DEFAULT NULL COMMENT '创建人ID',
  `created_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updater_id` bigint DEFAULT NULL COMMENT '修改人ID',
  `updated_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '修改时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='项目表';

-- ----------------------------
-- Table structure for project_tag
-- ----------------------------
DROP TABLE IF EXISTS `project_tag`;
CREATE TABLE `project_tag` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `type_id` bigint NOT NULL COMMENT '所属项目类型ID',
  `tag_name` varchar(100) NOT NULL COMMENT '项目标签名称',
  `enabled` tinyint NOT NULL DEFAULT '1' COMMENT '是否启用（1 启用，0 禁用）',
  PRIMARY KEY (`id`),
  KEY `idx_tag_type` (`type_id`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='项目标签表';

-- ----------------------------
-- Table structure for project_type
-- ----------------------------
DROP TABLE IF EXISTS `project_type`;
CREATE TABLE `project_type` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `type_name` varchar(100) NOT NULL COMMENT '项目类型名称',
  `enabled` tinyint NOT NULL DEFAULT '1' COMMENT '是否启用（1 启用，0 禁用）',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='项目类型表（精简版）';

-- ----------------------------
-- Table structure for question_bank
-- ----------------------------
DROP TABLE IF EXISTS `question_bank`;
CREATE TABLE `question_bank` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `name` varchar(255) NOT NULL COMMENT '题库名称',
  `description` text COMMENT '题库描述',
  `image_url` varchar(500) DEFAULT NULL COMMENT '题库封面图片URL',
  `created_by` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '创建人',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `status` tinyint DEFAULT '1' COMMENT '状态：1=启用，0=禁用',
  `total_questions` int unsigned DEFAULT '0' COMMENT '题库中题目总数',
  `tags` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '所属标签',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=117 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='题库表';

-- ----------------------------
-- Table structure for question_bank_questions
-- ----------------------------
DROP TABLE IF EXISTS `question_bank_questions`;
CREATE TABLE `question_bank_questions` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `question_bank_id` bigint NOT NULL COMMENT '题库ID',
  `question_id` bigint NOT NULL COMMENT '题目ID',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `created_by` varchar(100) DEFAULT NULL COMMENT '创建人',
  `status` tinyint DEFAULT '1' COMMENT '状态，1=有效，0=无效',
  `sort_order` int DEFAULT '0' COMMENT '排序字段',
  PRIMARY KEY (`id`),
  KEY `idx_question_bank_id` (`question_bank_id`),
  KEY `idx_question_id` (`question_id`)
) ENGINE=InnoDB AUTO_INCREMENT=227 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='题库与题目关联表';

-- ----------------------------
-- Table structure for questions
-- ----------------------------
DROP TABLE IF EXISTS `questions`;
CREATE TABLE `questions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `name` varchar(255) NOT NULL COMMENT '题目名称',
  `description` text COMMENT '题目背景',
  `image_url` varchar(500) DEFAULT NULL COMMENT '题目图片URL',
  `animation_images` json DEFAULT NULL COMMENT '知识点动漫图片 OSS URL JSON 数组，按展示顺序存储',
  `answer` text NOT NULL COMMENT '题目答案',
  `tags` varchar(255) DEFAULT NULL COMMENT '题目标签，逗号分隔',
  `created_by` varchar(100) NOT NULL COMMENT '创建人',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `status` tinyint NOT NULL DEFAULT '1' COMMENT '题目状态，1=启用，0=禁用',
  `difficulty` enum('easy','medium','hard') NOT NULL DEFAULT 'medium' COMMENT '题目难度',
  `view_count` int unsigned NOT NULL DEFAULT '0' COMMENT '查看次数',
  `source` varchar(255) DEFAULT NULL COMMENT '题目来源',
  `remarks` varchar(500) DEFAULT NULL COMMENT '备注',
  `update_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_tags` (`tags`),
  KEY `idx_created_by` (`created_by`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=998230594593 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='题库表';

-- ----------------------------
-- Table structure for questions_copy1
-- ----------------------------
DROP TABLE IF EXISTS `questions_copy1`;
CREATE TABLE `questions_copy1` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `name` varchar(255) NOT NULL COMMENT '题目名称',
  `description` text COMMENT '题目背景',
  `image_url` varchar(500) DEFAULT NULL COMMENT '题目图片URL',
  `answer` text NOT NULL COMMENT '题目答案',
  `tags` varchar(255) DEFAULT NULL COMMENT '题目标签，逗号分隔',
  `created_by` varchar(100) NOT NULL COMMENT '创建人',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `status` tinyint NOT NULL DEFAULT '1' COMMENT '题目状态，1=启用，0=禁用',
  `difficulty` enum('easy','medium','hard') NOT NULL DEFAULT 'medium' COMMENT '题目难度',
  `view_count` int unsigned NOT NULL DEFAULT '0' COMMENT '查看次数',
  `source` varchar(255) DEFAULT NULL COMMENT '题目来源',
  `remarks` varchar(500) DEFAULT NULL COMMENT '备注',
  `update_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_tags` (`tags`),
  KEY `idx_created_by` (`created_by`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=997637739520 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='题库表';

-- ----------------------------
-- Table structure for site_visit_log
-- ----------------------------
DROP TABLE IF EXISTS `site_visit_log`;
CREATE TABLE `site_visit_log` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键',
  `visit_date` date NOT NULL COMMENT '访问日期',
  `ip_address` varchar(45) DEFAULT NULL COMMENT '访客IP地址',
  `user_agent` varchar(511) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT '浏览器或设备信息',
  `page_path` varchar(255) DEFAULT NULL COMMENT '访问的页面路径',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '访问时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1714 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='网站访问记录表';

-- ----------------------------
-- Table structure for sys_question
-- ----------------------------
DROP TABLE IF EXISTS `sys_question`;
CREATE TABLE `sys_question` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `source_question_id` bigint DEFAULT NULL COMMENT '来源AI题目ID（exam_question.id）',
  `question_bank_id` bigint NOT NULL COMMENT '题库ID（如：MySQL题库、Spring题库）',
  `question` text NOT NULL COMMENT '题目内容',
  `options` json NOT NULL COMMENT '选项（A/B/C/D）',
  `correct_answer` varchar(10) NOT NULL COMMENT '正确答案',
  `analysis` text COMMENT '解析',
  `difficulty` tinyint NOT NULL DEFAULT '2' COMMENT '难度：1简单 2中等 3困难',
  `status` tinyint NOT NULL DEFAULT '1' COMMENT '状态：1启用 0禁用',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_source_question` (`source_question_id`),
  KEY `idx_bank_difficulty` (`question_bank_id`,`difficulty`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=105 DEFAULT CHARSET=utf8mb3 COMMENT='系统题库表';

-- ----------------------------
-- Table structure for tool_info
-- ----------------------------
DROP TABLE IF EXISTS `tool_info`;
CREATE TABLE `tool_info` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `name` varchar(255) NOT NULL COMMENT '工具名称',
  `image_url` varchar(500) DEFAULT NULL COMMENT '工具图片URL',
  `description` text COMMENT '工具描述',
  `content` text COMMENT '工具内容',
  `redirect_url` varchar(500) NOT NULL COMMENT '工具实际跳转链接',
  `version` varchar(50) DEFAULT '1.0' COMMENT '工具版本号',
  `usage_count` int unsigned DEFAULT '0' COMMENT '工具使用次数',
  `created_by` varchar(100) NOT NULL COMMENT '创建人',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更改时间',
  `status` tinyint DEFAULT '1' COMMENT '是否启用，1=启用，0=禁用',
  `tags` varchar(255) DEFAULT NULL COMMENT '标签（归属类别，逗号分隔）',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='工具信息表';

-- ----------------------------
-- Table structure for undo_log
-- ----------------------------
DROP TABLE IF EXISTS `undo_log`;
CREATE TABLE `undo_log` (
  `branch_id` bigint NOT NULL COMMENT 'branch transaction id',
  `xid` varchar(128) COLLATE utf8mb4_general_ci NOT NULL COMMENT 'global transaction id',
  `context` varchar(128) COLLATE utf8mb4_general_ci NOT NULL COMMENT 'undo_log context',
  `rollback_info` longblob NOT NULL COMMENT 'rollback info',
  `log_status` int NOT NULL COMMENT '0: normal status, 1: defense status',
  `log_created` datetime(6) NOT NULL COMMENT 'create datetime',
  `log_modified` datetime(6) NOT NULL COMMENT 'modify datetime',
  `ext` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT 'extended field',
  PRIMARY KEY (`branch_id`,`xid`),
  KEY `idx_log_status` (`log_status`),
  KEY `idx_log_created` (`log_created`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='AT transaction mode undo table';

-- ----------------------------
-- Table structure for user_benefit_grant
-- ----------------------------
DROP TABLE IF EXISTS `user_benefit_grant`;
CREATE TABLE `user_benefit_grant` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `anon_user_id` char(36) NOT NULL COMMENT '匿名用户ID，对应 anno_user.id',
  `open_id` varchar(128) DEFAULT NULL COMMENT '微信小程序 openid',
  `benefit_code` varchar(64) NOT NULL COMMENT '权益编码：mock_interview/resume_ai_optimize/resume_create',
  `grant_count` int NOT NULL COMMENT '赠送次数',
  `used_count` int NOT NULL DEFAULT '0' COMMENT '已使用赠送次数',
  `expire_at` datetime DEFAULT NULL COMMENT '赠送权益过期时间，NULL表示不过期',
  `source_type` tinyint NOT NULL DEFAULT '1' COMMENT '来源：1=管理员赠送，2=激活码兑换，3=活动奖励',
  `source_ref` varchar(128) DEFAULT NULL COMMENT '来源标识，例如激活码或活动ID',
  `remark` varchar(255) DEFAULT NULL COMMENT '备注',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_user_benefit` (`anon_user_id`,`benefit_code`),
  KEY `idx_open_id` (`open_id`),
  KEY `idx_expire_at` (`expire_at`),
  KEY `idx_source_ref` (`source_ref`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='用户权益赠送额度表';

-- ----------------------------
-- Table structure for user_benefit_rule
-- ----------------------------
DROP TABLE IF EXISTS `user_benefit_rule`;
CREATE TABLE `user_benefit_rule` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `benefit_code` varchar(64) NOT NULL COMMENT '权益编码：mock_interview/resume_create/resume_ai_optimize',
  `benefit_name` varchar(64) NOT NULL COMMENT '权益名称：模拟面试/在线简历创建/简历AI优化',
  `user_type` tinyint NOT NULL COMMENT '用户类型：0=非会员，1=会员',
  `period_type` tinyint NOT NULL COMMENT '周期类型：0=永久，1=每天，2=每周，3=每月',
  `limit_count` int NOT NULL COMMENT '周期内可用次数，0表示不可用',
  `enabled` tinyint NOT NULL DEFAULT '1' COMMENT '是否启用：1=启用，0=禁用',
  `remark` varchar(255) DEFAULT NULL COMMENT '备注',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_benefit_user_type` (`benefit_code`,`user_type`),
  KEY `idx_benefit_code` (`benefit_code`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='用户权益规则配置表';

-- ----------------------------
-- Table structure for user_benefit_usage
-- ----------------------------
DROP TABLE IF EXISTS `user_benefit_usage`;
CREATE TABLE `user_benefit_usage` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `anon_user_id` char(36) NOT NULL COMMENT '匿名用户ID，对应 anno_user.id',
  `open_id` varchar(128) DEFAULT NULL COMMENT '微信小程序 openid',
  `benefit_code` varchar(64) NOT NULL COMMENT '权益编码：mock_interview/resume_create/resume_ai_optimize',
  `period_type` tinyint NOT NULL COMMENT '周期类型：0=永久，1=每天，2=每周，3=每月',
  `period_key` varchar(32) NOT NULL COMMENT '周期标识：lifetime/2026-05-04/2026-W19/2026-05',
  `used_count` int NOT NULL DEFAULT '0' COMMENT '已使用次数',
  `limit_count` int NOT NULL COMMENT '当前周期限制次数快照',
  `reset_at` datetime DEFAULT NULL COMMENT '周期重置时间',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_benefit_period` (`anon_user_id`,`benefit_code`,`period_key`),
  KEY `idx_open_id` (`open_id`),
  KEY `idx_benefit_code` (`benefit_code`),
  KEY `idx_reset_at` (`reset_at`)
) ENGINE=InnoDB AUTO_INCREMENT=38 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='用户权益使用次数表';

-- ----------------------------
-- Table structure for user_daily_learning_plan
-- ----------------------------
DROP TABLE IF EXISTS `user_daily_learning_plan`;
CREATE TABLE `user_daily_learning_plan` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `anon_user_id` varchar(64) NOT NULL COMMENT '匿名用户ID',
  `plan_date` date NOT NULL COMMENT '计划日期',
  `plan_type` varchar(32) NOT NULL COMMENT '计划类型：LEARN新学，REVIEW复习',
  `knowledge_base_id` bigint NOT NULL COMMENT '知识库ID',
  `knowledge_id` bigint NOT NULL COMMENT '知识点ID',
  `plan_score` int NOT NULL DEFAULT '0' COMMENT '生成计划时的推荐评分',
  `sort_order` int NOT NULL DEFAULT '0' COMMENT '排序号',
  `plan_status` varchar(32) NOT NULL DEFAULT 'PENDING' COMMENT '计划状态：PENDING待完成，DONE已完成，SKIPPED跳过，EXPIRED过期',
  `generated_type` varchar(32) NOT NULL DEFAULT 'SCHEDULED' COMMENT '生成方式：SCHEDULED定时任务，MANUAL_REFRESH手动刷新',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_date_knowledge` (`anon_user_id`,`plan_date`,`knowledge_id`),
  KEY `idx_user_date_status` (`anon_user_id`,`plan_date`,`plan_status`),
  KEY `idx_user_date_type` (`anon_user_id`,`plan_date`,`plan_type`),
  KEY `idx_plan_date` (`plan_date`)
) ENGINE=InnoDB AUTO_INCREMENT=209 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='用户每日学习推荐计划表';

-- ----------------------------
-- Table structure for user_daily_wrong_review_plan
-- ----------------------------
DROP TABLE IF EXISTS `user_daily_wrong_review_plan`;
CREATE TABLE `user_daily_wrong_review_plan` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `anon_user_id` varchar(64) NOT NULL COMMENT '匿名用户ID',
  `plan_date` date NOT NULL COMMENT '计划日期',
  `wrong_question_id` bigint NOT NULL COMMENT '错题记录ID',
  `question_id` bigint NOT NULL COMMENT '题目ID',
  `question_bank_id` bigint DEFAULT NULL COMMENT '题库ID',
  `review_score` int NOT NULL DEFAULT '0' COMMENT '生成计划时的推荐分数',
  `sort_order` int NOT NULL DEFAULT '0' COMMENT '排序号',
  `plan_status` varchar(32) NOT NULL DEFAULT 'PENDING' COMMENT '计划状态：PENDING待复习，DONE已完成，WRONG_AGAIN再次错误，EXPIRED过期',
  `generated_type` varchar(32) NOT NULL DEFAULT 'SCHEDULED' COMMENT '生成方式：SCHEDULED定时任务，MANUAL_REFRESH手动刷新',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_date_wrong` (`anon_user_id`,`plan_date`,`wrong_question_id`),
  KEY `idx_user_date_status` (`anon_user_id`,`plan_date`,`plan_status`),
  KEY `idx_user_score` (`anon_user_id`,`review_score`),
  KEY `idx_plan_date` (`plan_date`)
) ENGINE=InnoDB AUTO_INCREMENT=69 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='用户每日错题复习计划表';

-- ----------------------------
-- Table structure for user_exam_answer
-- ----------------------------
DROP TABLE IF EXISTS `user_exam_answer`;
CREATE TABLE `user_exam_answer` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `user_id` char(36) NOT NULL COMMENT '用户ID',
  `paper_id` bigint NOT NULL COMMENT '试卷ID',
  `question_id` bigint NOT NULL COMMENT '试卷题目ID',
  `user_answer` varchar(10) NOT NULL COMMENT '用户答案',
  `is_correct` tinyint DEFAULT NULL COMMENT '是否正确',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_paper_id` (`paper_id`)
) ENGINE=InnoDB AUTO_INCREMENT=314 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='用户答题记录表';

-- ----------------------------
-- Table structure for user_knowledge_learning_state
-- ----------------------------
DROP TABLE IF EXISTS `user_knowledge_learning_state`;
CREATE TABLE `user_knowledge_learning_state` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `anon_user_id` varchar(64) NOT NULL COMMENT '匿名用户ID',
  `knowledge_base_id` bigint NOT NULL COMMENT '知识库ID',
  `knowledge_id` bigint NOT NULL COMMENT '知识点ID',
  `learning_status` varchar(32) NOT NULL DEFAULT 'NOT_STARTED' COMMENT '学习状态：NOT_STARTED未开始，LEARNING学习中，REVIEWING待复习，MASTERED已掌握',
  `review_level` varchar(32) DEFAULT NULL COMMENT '复习等级：FORGOT忘记，VAGUE模糊，FAMILIAR熟悉，MASTERED掌握',
  `learn_score` int NOT NULL DEFAULT '0' COMMENT '推荐学习评分，分数越高越优先学习',
  `review_score` int NOT NULL DEFAULT '0' COMMENT '推荐复习评分，分数越高越优先复习',
  `next_review_at` datetime DEFAULT NULL COMMENT '下次应复习时间，未开始学习的知识点允许为空',
  `first_learn_at` datetime DEFAULT NULL COMMENT '首次学习时间',
  `last_learn_at` datetime DEFAULT NULL COMMENT '最近学习时间',
  `last_review_at` datetime DEFAULT NULL COMMENT '最近复习时间',
  `last_assessment_type` varchar(32) DEFAULT NULL COMMENT '上次评估类型：TEST测试，SELF自评，MIXED测试加自评',
  `last_accuracy` decimal(5,2) DEFAULT NULL COMMENT '上次测试正确率，0-100',
  `last_question_count` int NOT NULL DEFAULT '0' COMMENT '上次参与评估的题目数量',
  `last_self_rating` varchar(32) DEFAULT NULL COMMENT '上次用户自评：FORGOT，VAGUE，FAMILIAR',
  `learn_count` int NOT NULL DEFAULT '0' COMMENT '累计学习次数',
  `review_count` int NOT NULL DEFAULT '0' COMMENT '累计复习次数',
  `wrong_count` int NOT NULL DEFAULT '0' COMMENT '累计错误数',
  `correct_count` int NOT NULL DEFAULT '0' COMMENT '累计正确数',
  `continuous_mastered_count` int NOT NULL DEFAULT '0' COMMENT '连续掌握次数',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_knowledge` (`anon_user_id`,`knowledge_id`),
  KEY `idx_user_base_status_learn` (`anon_user_id`,`knowledge_base_id`,`learning_status`,`learn_score`),
  KEY `idx_user_base_review_due` (`anon_user_id`,`knowledge_base_id`,`learning_status`,`next_review_at`,`review_score`),
  KEY `idx_due_review` (`next_review_at`),
  KEY `idx_updated_at` (`updated_at`)
) ENGINE=InnoDB AUTO_INCREMENT=437 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='用户知识点学习状态表';

-- ----------------------------
-- Table structure for user_knowledge_node_state
-- ----------------------------
DROP TABLE IF EXISTS `user_knowledge_node_state`;
CREATE TABLE `user_knowledge_node_state` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `anon_user_id` varchar(128) NOT NULL COMMENT '匿名用户ID',
  `graph_id` bigint NOT NULL COMMENT '图谱ID',
  `node_id` bigint NOT NULL COMMENT '节点ID',
  `last_learn_at` datetime DEFAULT NULL COMMENT '最近学习时间',
  `decay_score` double DEFAULT '0' COMMENT '遗忘/衰减分数',
  `color_level` varchar(64) DEFAULT 'gray' COMMENT '掌握等级颜色',
  `created_at` datetime NOT NULL COMMENT '创建时间',
  `updated_at` datetime NOT NULL COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_graph_node` (`anon_user_id`,`graph_id`,`node_id`),
  KEY `idx_graph` (`graph_id`)
) ENGINE=InnoDB AUTO_INCREMENT=195 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ----------------------------
-- Table structure for user_learning_preference
-- ----------------------------
DROP TABLE IF EXISTS `user_learning_preference`;
CREATE TABLE `user_learning_preference` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `anon_user_id` varchar(64) NOT NULL COMMENT '匿名用户ID',
  `daily_plan_count` int NOT NULL DEFAULT '10' COMMENT '每日推荐知识点数量',
  `daily_learn_count` int NOT NULL DEFAULT '5' COMMENT '每日推荐新学习知识点数量',
  `daily_wrong_review_count` int NOT NULL DEFAULT '5' COMMENT '每日推荐错题复习数量',
  `last_plan_generated_date` date DEFAULT NULL COMMENT '最近一次生成计划日期',
  `scope_version` int NOT NULL DEFAULT '1' COMMENT '用户选择知识库版本号，范围变更时递增',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_anon_user_id` (`anon_user_id`),
  KEY `idx_updated_at` (`updated_at`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='用户学习推荐偏好表';

-- ----------------------------
-- Table structure for user_learning_scope
-- ----------------------------
DROP TABLE IF EXISTS `user_learning_scope`;
CREATE TABLE `user_learning_scope` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `anon_user_id` varchar(64) NOT NULL COMMENT '匿名用户ID',
  `knowledge_base_id` bigint NOT NULL COMMENT '用户选择的知识库ID',
  `selected` tinyint NOT NULL DEFAULT '1' COMMENT '是否当前选中：1选中，0取消',
  `last_state_sync_at` datetime DEFAULT NULL COMMENT '最近一次同步该知识库下知识点状态的时间',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_knowledge_base` (`anon_user_id`,`knowledge_base_id`),
  KEY `idx_user_selected` (`anon_user_id`,`selected`),
  KEY `idx_knowledge_base_id` (`knowledge_base_id`),
  KEY `idx_last_state_sync_at` (`last_state_sync_at`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='用户学习知识库选择表';

-- ----------------------------
-- Table structure for user_membership
-- ----------------------------
DROP TABLE IF EXISTS `user_membership`;
CREATE TABLE `user_membership` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `anon_user_id` char(36) NOT NULL COMMENT '匿名用户ID，对应 anno_user.id',
  `open_id` varchar(128) NOT NULL COMMENT '微信小程序 openid',
  `member_status` tinyint NOT NULL DEFAULT '1' COMMENT '会员状态：1=有效，0=失效',
  `start_at` datetime NOT NULL COMMENT '会员开始时间',
  `expire_at` datetime NOT NULL COMMENT '会员到期时间',
  `trial_granted` tinyint NOT NULL DEFAULT '0' COMMENT '是否已赠送试用会员：1=已赠送，0=未赠送',
  `source_type` tinyint NOT NULL DEFAULT '1' COMMENT '开通来源：1=绑定微信赠送，2=激活码，3=后台手动开通',
  `remark` varchar(255) DEFAULT NULL COMMENT '备注',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_anon_user_id` (`anon_user_id`),
  KEY `idx_open_id` (`open_id`),
  KEY `idx_expire_at` (`expire_at`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='用户会员表';

-- ----------------------------
-- Table structure for user_question_progress
-- ----------------------------
DROP TABLE IF EXISTS `user_question_progress`;
CREATE TABLE `user_question_progress` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '主键',
  `anon_user_id` char(36) NOT NULL COMMENT '匿名用户ID（UUID）',
  `question_id` bigint unsigned NOT NULL COMMENT '题目ID',
  `question_bank_id` bigint unsigned NOT NULL COMMENT '题库ID',
  `count` int unsigned NOT NULL DEFAULT '1' COMMENT '访问次数',
  `first_view_at` datetime NOT NULL COMMENT '首次学习时间',
  `last_view_at` datetime NOT NULL COMMENT '最后一次学习时间',
  `last_view_source` varchar(16) DEFAULT NULL COMMENT '最后学习来源：pc/weapp',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_question` (`anon_user_id`,`question_id`),
  KEY `idx_user_bank` (`anon_user_id`,`question_bank_id`),
  KEY `idx_question` (`question_id`),
  KEY `idx_last_view` (`last_view_at`)
) ENGINE=InnoDB AUTO_INCREMENT=77 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='匿名用户题目学习进度';

-- ----------------------------
-- Table structure for user_study_progress_summary
-- ----------------------------
DROP TABLE IF EXISTS `user_study_progress_summary`;
CREATE TABLE `user_study_progress_summary` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `user_id` char(36) NOT NULL COMMENT '匿名用户ID，对应 anon_user.id',
  `learned_count` int NOT NULL DEFAULT '0' COMMENT '已学习知识点数量，按 question_id 去重统计',
  `total_question_count` int NOT NULL DEFAULT '0' COMMENT '统计时的知识点总数，对应 question 表总知识点数快照',
  `progress_rate` decimal(6,2) NOT NULL DEFAULT '0.00' COMMENT '学习进度百分比，learned_count / total_question_count * 100',
  `last_learn_time` datetime DEFAULT NULL COMMENT '最后学习时间',
  `last_learn_question_id` bigint DEFAULT NULL COMMENT '最后学习的知识点ID，对应 question.id',
  `rank_score` decimal(12,4) NOT NULL DEFAULT '0.0000' COMMENT '排行榜排序分，用于后续扩展加权排序',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_id` (`user_id`),
  KEY `idx_rank_score` (`rank_score` DESC,`learned_count` DESC,`last_learn_time` DESC),
  KEY `idx_progress_rate` (`progress_rate` DESC,`learned_count` DESC),
  KEY `idx_last_learn_time` (`last_learn_time` DESC)
) ENGINE=InnoDB AUTO_INCREMENT=816 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='用户学习进度汇总表';

-- ----------------------------
-- Table structure for users
-- ----------------------------
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT '用户ID，主键，自增',
  `username` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '用户名，登录用，唯一',
  `password` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '密码，存储哈希后的值',
  `phone` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '手机号，可唯一，可为空',
  `email` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '邮箱，可唯一，可为空',
  `nickname` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '昵称，博客展示用',
  `avatar` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '头像URL，可为空，默认头像',
  `role` enum('user','admin') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'user' COMMENT '用户角色，默认user',
  `sex` enum('male','female','other') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '性别，可选',
  `age` tinyint unsigned DEFAULT NULL COMMENT '年龄，可选',
  `status` tinyint DEFAULT '0' COMMENT '用户状态：0-正常，1-禁用',
  `create_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间，自动更新',
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `phone` (`phone`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_role` (`role`) COMMENT '按角色查询索引',
  KEY `idx_create_at` (`create_at`) COMMENT '按创建时间查询索引'
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='博客用户表，存储注册用户信息，包含登录信息、基本资料及状态';

-- ----------------------------
-- Table structure for wrong_question
-- ----------------------------
DROP TABLE IF EXISTS `wrong_question`;
CREATE TABLE `wrong_question` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `user_id` char(36) NOT NULL COMMENT '用户ID',
  `question_id` bigint NOT NULL COMMENT '试卷题目ID',
  `source_paper_id` bigint DEFAULT NULL COMMENT '来源试卷ID',
  `wrong_count` int DEFAULT '1' COMMENT '错误次数',
  `last_wrong_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '最后错误时间',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `redo_count` int NOT NULL DEFAULT '0' COMMENT '重做次数',
  `mastery_status` tinyint NOT NULL DEFAULT '0' COMMENT '掌握状态：0=未掌握，1=已掌握，2=需加强',
  `is_deleted` tinyint NOT NULL DEFAULT '0' COMMENT '掌握移出标记：0=未移出错题池，1=已掌握后移出未掌握池',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_question` (`user_id`,`question_id`),
  KEY `idx_wrong_question_user_status_time` (`user_id`,`mastery_status`,`last_wrong_time`),
  KEY `idx_wrong_question_user_deleted_time` (`user_id`,`is_deleted`,`last_wrong_time`)
) ENGINE=InnoDB AUTO_INCREMENT=180 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='错题本';

SET FOREIGN_KEY_CHECKS = 1;
