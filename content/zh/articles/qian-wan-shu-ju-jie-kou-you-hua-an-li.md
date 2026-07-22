---
title: 千万数据接口优化案例
summary: 随着用户日活量的增长，系统运行时间的累积，相关数据表的规模可能达到千万级甚至更高。为了评估接口在大数据量下的性能，我们进行了压力测试——向数据库表中插入了...
author: evan
category: work
tags: [工作总结]
createdAt: 2025-09-10 17:07:18
updatedAt: 2025-09-10 17:07:18
readingMinutes: 15
---
# 千万数据接口优化案例

## 🙋问题描述：

随着用户日活量的增长，系统运行时间的累积，相关数据表的规模可能达到千万级甚至更高。为了评估接口在大数据量下的性能，我们进行了压力测试——向数据库表中插入了约 **1000 万**条数据并执行查询操作。测试结果显示，当前接口在这种数据量下存在严重性能瓶颈，**多次测试均出现超时或无响应情况**。因此，迫切需要对接口进行性能优化，以保证在大数据量场景下的稳定性和响应速度。

**旧 code：**

```
@Override
    public ResultSpecial<LineChartVO> getDataAnalysis(Integer day) {
        //1.1获取当前时间
        LocalDateTime now = LocalDateTime.now();
        //2.查询 7 天内有哪些角色问了问题  要去重复
        Set<String> roleSet = new HashSet<>(dataAnalysisMapper.getQuestionRole(now, day));
        //3.将今天时间减去 6 天放在数组中
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");
        List<LocalDateTime> localDateTimes = new ArrayList<>();
        List<String> dateList = new ArrayList<>();
        for (int i = day - 1; i >= 0; i--) { // 从最早到最近
            localDateTimes.add(now.minusDays(i).toLocalDate().atStartOfDay());
            dateList.add(localDateTimes.get(localDateTimes.size() - 1).format(formatter));
        }
        // 4. 构建每个角色的完整数据
        List<LincChartSeriesData> seriesDataList = new ArrayList<>();
        //5.遍历每个角色
        for (String role : roleSet) {
            List<Integer> questionCountList = new ArrayList<>();

            for (LocalDateTime date : localDateTimes) {
                // 查询某一天某角色的问题数量
                Integer count = dataAnalysisMapper.getEveryQuestionNumber(role, LocalDate.from(date));
                questionCountList.add(count == null ? 0 : count); // 防止 null
            }
            seriesDataList.add(new LincChartSeriesData(role, questionCountList));
        }
        return ResultSpecial.success(new LineChartVO(roleSet, dateList, seriesDataList));
    }
```

**对应 sql1：**

```
 @Select("SELECT user_role FROM conversation_record WHERE create_time >= #{now} - interval '${startTime} day' ")
    List<String> getQuestionRole(@Param("now") LocalDateTime now, @Param("startTime") Integer startTime) ;
```

**sql2：**

```
 Integer getEveryQuestionNumber( @Param("role") String role, @Param("date") LocalDate date);
```

**sql2 对应的 XML：**

```
 <select id="getEveryQuestionNumber" resultType="java.lang.Integer">
        SELECT COUNT(*)
        FROM conversation_record
        WHERE user_role = #{role}
          AND DATE(create_time) = DATE(#{date})
    </select>
```

### 性能瓶颈 ——难怪在 1000 万数据量、90 天范围内直接卡死。逐步拆解：

**🔍 性能瓶颈点**

**1. 循环 + 单条 SQL 查询**

```
    for (String role : roleSet) {
    for (LocalDateTime date : localDateTimes) {
        dataAnalysisMapper.getEveryQuestionNumber(role, LocalDate.from(date));
    }
}
```
- 这里是 角色数 × 天数 次查询。
- 假设有 20 个角色，90 天 → 20 × 90 = 1800 次 SQL。
- 每次 SQL 都要在 1000 万行大表里扫一遍，90 天肯定炸掉。

**2. SQL 粒度太细**
- 逐天逐角色查 count，而数据库非常擅长 一次聚合。
- 现在相当于聚合逻辑放在 Java 层循环里，这就是性能灾难。

## ✅ 解决方案：

**要把多次小查询 → 一次大查询，利用数据库的聚合能力。**
1. 一次性查出所有角色、所有日期的数据，直接返回所有角色和天数的统计结果，再由 Java 补齐。
 
**SQL 思路：**
   
```
 @Select("""
        SELECT user_role AS role,
               DATE(create_time) AS day,
               COUNT(*) AS cnt
        FROM conversation_record
        WHERE invalid = 0
          AND create_time >= DATE_SUB(CURDATE(), INTERVAL #{day} DAY)
        GROUP BY user_role, DATE(create_time)
    """)
    List<RoleDayCount> getRoleDayCount(@Param("day") Integer day);
```

**2. Java 改动：**

```
    @Override
    public ResultSpecial<LineChartVO> newGetDataAnalysis(Integer day) {
        // 1. 日期范围
        LocalDate now = LocalDate.now();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");

        List<String> dateList = new ArrayList<>();
        for (int i = day - 1; i >= 0; i--) {
            dateList.add(now.minusDays(i).format(formatter));
        }

        // 2. 聚合查询
        List<RoleDayCountDTO> dbResults = dataAnalysisMapper.getRoleDayCount(day);

        // 3. 转换为 Map
        Map<String, Map<String, Integer>> roleDayCount = new HashMap<>();
        Set<String> roleSet = new HashSet<>();

        for (RoleDayCountDTO r : dbResults) {
            roleSet.add(r.getRole());
            roleDayCount
                    .computeIfAbsent(r.getRole(), k -> new HashMap<>())
                    .put(r.getDay(), r.getCnt());
        }

        // 4. 组装 series
        List<LincChartSeriesData> seriesDataList = new ArrayList<>();
        for (String role : roleSet) {
            List<Integer> counts = new ArrayList<>();
            for (String dateStr : dateList) {
                counts.add(
                        roleDayCount
                                .getOrDefault(role, Collections.emptyMap())
                                .getOrDefault(dateStr, 0)
                );
            }
            seriesDataList.add(new LincChartSeriesData(role, counts));
        }

        // 5. 返回 VO
        return ResultSpecial.success(new LineChartVO(roleSet, dateList, seriesDataList));
    }
```

**改动效果：**

- 减少 SQL 调用次数 → 从 N×M 次 → 1 次。
- 数据库本身做聚合，利用索引更高效。
- Java 只做内存映射和整理。
- 快速查找每个角色每天的数量。内存操作效率高，比每次访问数据库快得多。
- 直接得到字符串日期，用作 Map key，减少类型转换。更直观，也便于前端展示。

**3. 然后再给表加索引（此处索引效果提升不是很大，约 1 秒）:**

```
CREATE INDEX idx_role_create_day
ON conversation_record (user_role, date_trunc('day', create_time))
WHERE invalid = 0;
```

过滤条件：invalid = 0 和 create_time >= ...

分组字段：user_role + TO_CHAR(create_time, 'YYYY-MM-DD')

user_role：普通字段，直接索引。

date_trunc('day', create_time)：表达式索引，不是直接字段，而是函数处理后的值。

date_trunc('day', create_time) 会把 create_time 的时间截断到 天，比如 '2025-09-10 15:23:45' → '2025-09-10 00:00:00'。

这样做的目的是为了统计查询 GROUP BY user_role, TO_CHAR(create_time, 'YYYY-MM-DD') 能直接利用索引。WHERE invalid = 0

→ 这是 部分索引（Partial Index）
只对 invalid = 0 的行建立索引

**优点：**
	1.	索引更小，查询更快
	2.	插入时索引更新量少（无效数据不进索引）

## 实测结果
从 **接口超时** 到修改之后数据响应 **7 秒**。
如果想达到秒级响应，可以在 Redis 做缓存。
也可以实行分表、建立一个统一的计数表。按日预聚合，每天凌晨统计一次，保存conversation_record_day_stat 表里。查询时只读这个表，1000 万条数据只要聚合成几万条，几毫秒就能返回。

## ❤️ 性能优化思路总结
1. 先考虑 SQL 聚合能力，减少循环查询。
2. 尽量一次性拿到所有数据，Java 只做内存整理。
3. 优化索引，针对查询字段和过滤条件。
4. 考虑缓存或预计算，减少重复计算。
5. 长期大表策略：分表、分区、统计表，保证接口响应稳定。
