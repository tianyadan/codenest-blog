---
title: An API Optimization Case for Tens of Millions of Records
summary: This case study shows how an API that timed out against a table with around 10 million rows was optimized by replacing repeated per-role, per-day queries with a single aggregation query.
author: evan
category: work
tags: [Work Notes]
createdAt: 2025-09-10 17:07:18
updatedAt: 2025-09-10 17:07:18
readingMinutes: 15
---
# An API Optimization Case for Tens of Millions of Records

## Problem description

As daily active users grow and the system runs longer, related tables can easily reach tens of millions of rows or more. To evaluate API performance under large datasets, we ran a stress test by inserting about **10 million** rows into the database table and executing queries against it. The results showed a serious performance bottleneck in the current API. **Repeated tests either timed out or became unresponsive**. Because of that, the API urgently needed optimization to ensure stability and response speed in large-data scenarios.

**Old code:**

```java
@Override
public ResultSpecial<LineChartVO> getDataAnalysis(Integer day) {
    // 1.1 Get the current time
    LocalDateTime now = LocalDateTime.now();
    // 2. Query which roles asked questions within the past N days, and deduplicate them
    Set<String> roleSet = new HashSet<>(dataAnalysisMapper.getQuestionRole(now, day));
    // 3. Subtract days from today and store the dates in an array
    DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    List<LocalDateTime> localDateTimes = new ArrayList<>();
    List<String> dateList = new ArrayList<>();
    for (int i = day - 1; i >= 0; i--) { // From earliest to latest
        localDateTimes.add(now.minusDays(i).toLocalDate().atStartOfDay());
        dateList.add(localDateTimes.get(localDateTimes.size() - 1).format(formatter));
    }
    // 4. Build full data for each role
    List<LincChartSeriesData> seriesDataList = new ArrayList<>();
    // 5. Iterate through each role
    for (String role : roleSet) {
        List<Integer> questionCountList = new ArrayList<>();

        for (LocalDateTime date : localDateTimes) {
            // Query the question count for a specific role on a specific day
            Integer count = dataAnalysisMapper.getEveryQuestionNumber(role, LocalDate.from(date));
            questionCountList.add(count == null ? 0 : count); // Prevent null
        }
        seriesDataList.add(new LincChartSeriesData(role, questionCountList));
    }
    return ResultSpecial.success(new LineChartVO(roleSet, dateList, seriesDataList));
}
```

**Corresponding sql1:**

```java
@Select("SELECT user_role FROM conversation_record WHERE create_time >= #{now} - interval '${startTime} day' ")
List<String> getQuestionRole(@Param("now") LocalDateTime now, @Param("startTime") Integer startTime) ;
```

**sql2:**

```java
Integer getEveryQuestionNumber(@Param("role") String role, @Param("date") LocalDate date);
```

**XML for sql2:**

```xml
<select id="getEveryQuestionNumber" resultType="java.lang.Integer">
    SELECT COUNT(*)
    FROM conversation_record
    WHERE user_role = #{role}
      AND DATE(create_time) = DATE(#{date})
</select>
```

### Performance bottleneck: no wonder it freezes with 10 million rows across 90 days. Let’s break it down step by step.

**Performance bottlenecks**

**1. Loops + one SQL query at a time**

```java
for (String role : roleSet) {
    for (LocalDateTime date : localDateTimes) {
        dataAnalysisMapper.getEveryQuestionNumber(role, LocalDate.from(date));
    }
}
```

- This results in `number of roles x number of days` queries.
- Assume there are 20 roles over 90 days -> `20 x 90 = 1800` SQL queries.
- Each SQL query scans a huge table with 10 million rows. Over 90 days, this is guaranteed to explode.

**2. SQL granularity is far too fine**

- It queries counts day by day and role by role, while databases are much better at doing aggregation in one shot.
- Right now, the aggregation logic is effectively pushed into Java loops, which is a performance disaster.

## Solution

**Replace many small queries with one large aggregation query and let the database do what it is good at.**

1. Query all roles and all dates at once, return the statistics directly, and then let Java fill in the missing values.

**SQL idea:**

```java
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

**2. Java changes:**

```java
@Override
public ResultSpecial<LineChartVO> newGetDataAnalysis(Integer day) {
    // 1. Date range
    LocalDate now = LocalDate.now();
    DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    List<String> dateList = new ArrayList<>();
    for (int i = day - 1; i >= 0; i--) {
        dateList.add(now.minusDays(i).format(formatter));
    }

    // 2. Aggregation query
    List<RoleDayCountDTO> dbResults = dataAnalysisMapper.getRoleDayCount(day);

    // 3. Convert to Map
    Map<String, Map<String, Integer>> roleDayCount = new HashMap<>();
    Set<String> roleSet = new HashSet<>();

    for (RoleDayCountDTO r : dbResults) {
        roleSet.add(r.getRole());
        roleDayCount
                .computeIfAbsent(r.getRole(), k -> new HashMap<>())
                .put(r.getDay(), r.getCnt());
    }

    // 4. Assemble series
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

    // 5. Return the VO
    return ResultSpecial.success(new LineChartVO(roleSet, dateList, seriesDataList));
}
```

**What changed:**

- SQL calls dropped from `N x M` times to just `1` time.
- The database performs the aggregation, which uses indexes more efficiently.
- Java only does in-memory mapping and reshaping.
- Looking up each role’s daily counts becomes fast in memory, much faster than repeatedly hitting the database.
- String dates can be used directly as Map keys, which reduces type conversion and is also more intuitive for the frontend.

**3. Then add an index to the table as well (the improvement here was modest, about 1 second):**

```sql
CREATE INDEX idx_role_create_day
ON conversation_record (user_role, date_trunc('day', create_time))
WHERE invalid = 0;
```

Filter conditions: `invalid = 0` and `create_time >= ...`

Grouping fields: `user_role + TO_CHAR(create_time, 'YYYY-MM-DD')`

`user_role`: a normal field that can be indexed directly.

`date_trunc('day', create_time)`: an expression index, not a direct field, but the value after applying a function.

`date_trunc('day', create_time)` truncates `create_time` to the day, for example `'2025-09-10 15:23:45' -> '2025-09-10 00:00:00'`.

The goal is to let queries such as `GROUP BY user_role, TO_CHAR(create_time, 'YYYY-MM-DD')` use the index directly. `WHERE invalid = 0`

-> This is a **partial index**
It creates the index only for rows where `invalid = 0`

**Advantages:**

1. Smaller indexes and faster queries
2. Less index maintenance during inserts because invalid data does not enter the index

## Measured result

The API went from **timing out** to returning data in **7 seconds** after the change.

If you want sub-second response times, you can add Redis caching.

You can also implement table sharding or maintain a unified counting table. For example, do a daily pre-aggregation at midnight and save the results into a `conversation_record_day_stat` table. Then the query only needs to read the aggregated table. Ten million rows can be condensed into just tens of thousands of rows, which can be returned in milliseconds.

## Performance optimization takeaways

1. Think about SQL aggregation first and reduce loop-based queries.
2. Fetch all required data in one shot whenever possible, then let Java handle the in-memory reshaping.
3. Optimize indexes around query fields and filter conditions.
4. Consider caching or precomputation to avoid repeated work.
5. For large tables in the long term, use sharding, partitioning, or statistics tables to keep response times stable.
