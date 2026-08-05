---
title: Python 7 天训练营 Day6｜数据清洗与爬虫入门（Java 对照详解版）
summary: 详细讲解 pandas 读表清洗导出，以及 requests + BeautifulSoup 合规爬虫入门；含本地可运行示例与练习题。
author: CodeNest
category: syntax
tags: [语法学习, Python专项, Python, 7天训练营, Day6, Java对比, pandas, 爬虫]
createdAt: 2026-08-05
updatedAt: 2026-08-05
readingMinutes: 60
topOrder: 7
slug: python-7day-bootcamp-day06
---

# Python 7 天训练营 Day6｜数据清洗与爬虫入门（Java 对照详解版）

> 系列总览：[Python 7 天训练营总览](/articles/python-7day-bootcamp-overview)  
> 上一篇：[Day5｜面向对象与文件读写](/articles/python-7day-bootcamp-day05)  
> 今天目标：会用 **pandas** 做基础清洗，会用 **requests + BeautifulSoup** 抓公开页面字段，并导出 CSV。

今天是「语法 → 实战」分界线。你会第一次把前五天的容器、函数、类、文件 I/O，接到真实数据流路上。

---

## 0. 今日地图

| 时段 | 内容 | 交付 |
|------|------|------|
| 1 | 环境安装与心智模型 | 虚拟环境装好三件套 |
| 2 | pandas 读表 / 观察 / 筛选 | 能读 CSV 并过滤行 |
| 3 | 缺失值、类型转换、去重、导出 | 完成一次「脏 → 干净」 |
| 4 | HTTP 与 requests | 能拿回网页 HTML 文本 |
| 5 | BeautifulSoup 解析 | 能抽出标题/价格等字段 |
| 6 | 合规爬取原则 | 知道什么能抓、怎么礼貌 |
| 7 | 综合项目 + 练习 | 抓取（或本地 HTML）→ 清洗 → CSV |

**今日关键词：DataFrame 像「带列名的表」；先观察再清洗；爬虫先合规；解析靠选择器，不靠硬编码整页字符串。**

推荐目录：

```text
python-bootcamp/day06/
├── requirements.txt
├── dirty_students.csv          # 清洗练习输入
├── clean_demo.py               # pandas 演示
├── local_books.html            # 本地 HTML（无网也能练解析）
├── scrape_local.py             # 解析本地 HTML
├── scrape_quotes.py            # 可选：抓公开练手站
└── out/                        # 输出目录
```

---

## 1. 先装环境（务必在 venv 里）

```bash
cd python-bootcamp/day06
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
python -m pip install --upgrade pip
python -m pip install pandas requests beautifulsoup4 lxml
```

`requirements.txt` 可写成：

```text
pandas>=2.0
requests>=2.31
beautifulsoup4>=4.12
lxml>=5.0
```

然后：

```bash
python -m pip install -r requirements.txt
```

对照 Java：

| Python | Java 感觉 |
|--------|-----------|
| `pip install pandas` | Maven 加依赖 |
| `import pandas as pd` | `import` 包 |
| DataFrame | 有点像内存里的 Excel / 结果集表 |

---

## 2. 数据清洗心智模型

```text
脏 CSV / 网页
   ↓ 读入
DataFrame / list[dict]
   ↓ 观察（shape / head / info / 缺测）
   ↓ 清洗（去空、转类型、去重、筛行、改列名）
   ↓ 导出
干净 CSV（给 Day7 Web API 用）
```

**清洗不是一次写完美，而是：看 → 改 → 再看。**

---

## 3. pandas 入门：把表装进 DataFrame

### 3.1 准备一份「脏数据」

保存为 `dirty_students.csv`：

```csv
name,score,city
Alice,88,Shanghai
Bob,,Beijing
Carol,95,Shanghai
  Dave ,73, Guangzhou
Erin,100,Beijing
Bob,55,Beijing
Frank,abc,Shenzhen
,80,Shanghai
Grace,120,Beijing
```

问题包括：空姓名、空分数、非数字分数、超范围分数、城市前后空格、重复行。

### 3.2 读入与观察

```python
"""pandas 观察脏数据。运行：python clean_demo.py"""
import pandas as pd
from pathlib import Path

path = Path("dirty_students.csv")
# 读 CSV；默认第一行当表头
df = pd.read_csv(path)

print("形状(行,列) =", df.shape)
print("列名 =", list(df.columns))
print("--- head ---")
print(df.head())          # 前 5 行
print("--- info ---")
print(df.info())          # 类型与非空数量
print("--- 缺失统计 ---")
print(df.isna().sum())    # 每列缺失个数
```

对照：

| 操作 | pandas | 接近感觉 |
|------|--------|----------|
| 读 CSV | `pd.read_csv` | 读成结果集 |
| 行数形状 | `df.shape` | `list.size` + 列数 |
| 预览 | `df.head()` | `LIMIT 5` |
| 列 | `df["score"]` | `row.get("score")` 的整列版 |

### 3.3 选列、筛行（SQL 感）

```python
# 选一列（Series）
print(df["name"])

# 选多列（仍然是 DataFrame）
print(df[["name", "score"]])

# 条件筛选：分数非空且能转成数字后 >= 80（下一步先清洗再筛）
# 这里先演示「城市包含 Shanghai」
shanghai = df[df["city"].astype(str).str.contains("Shanghai", na=False)]
print(shanghai)
```

**`df[条件]` 返回满足条件的行；条件是对整列做向量运算，不是手写 for（当然 for 也能用，只是慢且啰嗦）。**

---

## 4. 常见清洗动作（今天必须会）

把下面整段保存为 `clean_demo.py` 直接跑：

```python
"""
Day6 清洗演示：脏 CSV -> 干净 CSV
运行：python clean_demo.py
"""
from pathlib import Path
import pandas as pd

src = Path("dirty_students.csv")
out_dir = Path("out")
out_dir.mkdir(exist_ok=True)

df = pd.read_csv(src)
print("原始行数：", len(df))

# 1) 去掉列名/文本两端空白
df["name"] = df["name"].astype(str).str.strip()
df["city"] = df["city"].astype(str).str.strip()

# 2) 把空字符串姓名当成缺失
df.loc[df["name"].isin(["", "nan", "None"]), "name"] = pd.NA

# 3) 分数转数值：不能转的变成 NaN（errors='coerce'）
df["score"] = pd.to_numeric(df["score"], errors="coerce")

# 4) 删除关键字段缺失的行
df = df.dropna(subset=["name", "score"])

# 5) 分数范围校验：只保留 0~100
df = df[(df["score"] >= 0) & (df["score"] <= 100)]

# 6) 去重：按姓名保留第一次出现
df = df.drop_duplicates(subset=["name"], keep="first")

# 7) 派生列：等级（对照 Day5 的 level）
def to_level(score: float) -> str:
    if score >= 90:
        return "优秀"
    if score >= 80:
        return "良好"
    if score >= 60:
        return "及格"
    return "不及格"

df["level"] = df["score"].map(to_level)

# 8) 重置索引，导出
df = df.reset_index(drop=True)
dst = out_dir / "clean_students.csv"
df.to_csv(dst, index=False, encoding="utf-8")

print("清洗后行数：", len(df))
print(df)
print("已导出：", dst.resolve())
```

你会反复用到这些招：

| 目的 | API |
|------|-----|
| 去空白 | `str.strip()` |
| 转数字 | **`pd.to_numeric(..., errors="coerce")`** |
| 丢缺失 | `dropna(subset=[...])` |
| 条件过滤 | `df[(条件1) & (条件2)]` |
| 去重 | `drop_duplicates(...)` |
| 派生列 | `df["new"] = ...` / `map` |
| 导出 | **`to_csv(..., index=False)`** |

**`errors="coerce"` 会把脏值变成 `NaN`，比直接炸异常更适合清洗流水线。**

---

## 5. 再补几个高频清洗技巧

### 5.1 改列名

```python
df = df.rename(columns={"name": "student_name", "score": "exam_score"})
```

### 5.2 填充缺失（有时不该删，该填）

```python
# 城市缺失时填 Unknown（示例）
df["city"] = df["city"].fillna("Unknown")
```

### 5.3 分组聚合（预告，够用即可）

```python
# 按城市看平均分
print(df.groupby("city")["score"].mean())
```

对照 SQL：`GROUP BY city` + `AVG(score)`。

### 5.4 链式不要一次写太长

初学建议一步一步赋值并 `print(df.head())`，排错更快。  
熟练后再用链式（method chaining）。

---

## 6. 爬虫入门：HTTP 请求在干什么？

浏览器打开网页时，本质是：

```text
客户端 --GET URL--> 服务器
服务器 --HTML 文本--> 客户端
浏览器解析 HTML 并渲染
```

爬虫前半段和浏览器一样发请求；后半段自己解析 HTML，而不是给人看。

对照 Spring：

| 概念 | Java / Spring | Python 今天 |
|------|---------------|-------------|
| 发 HTTP GET | `RestTemplate` / `WebClient` | **`requests.get`** |
| 响应体 | `ResponseEntity.getBody()` | **`response.text`** |
| 解析 HTML | Jsoup | **BeautifulSoup** |

---

## 7. requests：把网页下载下来

```python
import requests

url = "https://quotes.toscrape.com/"
# timeout 必加，避免网络卡住一直挂起
resp = requests.get(url, timeout=10)
print(resp.status_code)     # 200 表示成功
print(resp.headers.get("content-type"))
html = resp.text            # 网页 HTML 字符串
print(html[:200])
```

常用注意：

```python
# 自定义请求头（有些站点会看 User-Agent）
headers = {
    "User-Agent": "CodeNestBootcamp/1.0 (learning; contact: example@example.com)"
}
resp = requests.get(url, headers=headers, timeout=10)
resp.raise_for_status()  # 非 2xx 直接抛异常
```

**永远加 `timeout`；需要时再 `raise_for_status()`。**

---

## 8. BeautifulSoup：从 HTML 里抠字段

### 8.1 先用本地 HTML（无网也能练）

保存为 `local_books.html`：

```html
<!doctype html>
<html>
  <body>
    <div class="book">
      <h3 class="title">Python Crash Course</h3>
      <span class="price">￥89.00</span>
      <span class="stock">In stock</span>
    </div>
    <div class="book">
      <h3 class="title">Clean Code</h3>
      <span class="price">￥79.00</span>
      <span class="stock">Out of stock</span>
    </div>
    <div class="book">
      <h3 class="title">Fluent Python</h3>
      <span class="price">￥128.00</span>
      <span class="stock">In stock</span>
    </div>
  </body>
</html>
```

解析脚本 `scrape_local.py`：

```python
"""解析本地 HTML，导出 CSV。运行：python scrape_local.py"""
from pathlib import Path
import re
import csv
from bs4 import BeautifulSoup

html = Path("local_books.html").read_text(encoding="utf-8")
# lxml 解析器更快更稳；没有 lxml 时可改 html.parser
soup = BeautifulSoup(html, "lxml")

rows = []
for book in soup.select("div.book"):
    title = book.select_one(".title").get_text(strip=True)
    price_text = book.select_one(".price").get_text(strip=True)
    stock = book.select_one(".stock").get_text(strip=True)

    # 从 ￥89.00 里抽出数字
    price = float(re.sub(r"[^\d.]", "", price_text))
    rows.append({
        "title": title,
        "price": price,
        "stock": stock,
        "in_stock": stock.lower() == "in stock",
    })

out = Path("out")
out.mkdir(exist_ok=True)
dst = out / "books_local.csv"
with dst.open("w", encoding="utf-8", newline="") as f:
    writer = csv.DictWriter(f, fieldnames=["title", "price", "stock", "in_stock"])
    writer.writeheader()
    writer.writerows(rows)

print("抓到", len(rows), "条")
for r in rows:
    print(r)
print("已导出：", dst.resolve())
```

选择器速记：

| 写法 | 含义 |
|------|------|
| `soup.select("div.book")` | 所有 class=book 的 div |
| `book.select_one(".title")` | 当前节点下第一个 title |
| `get_text(strip=True)` | 取文本并去空白 |

**先 `select` 列表，再在每个节点上 `select_one` 取字段。**

### 8.2 可选：抓公开练手站 quotes.toscrape.com

> 这是专门给爬虫练习的站点。仍请控制频率，仅用于学习。

```python
"""
可选联网示例：抓取名言站点第一页。
运行：python scrape_quotes.py
"""
import csv
import time
from pathlib import Path

import requests
from bs4 import BeautifulSoup

url = "https://quotes.toscrape.com/"
headers = {"User-Agent": "CodeNestBootcamp/1.0 (learning)"}

resp = requests.get(url, headers=headers, timeout=10)
resp.raise_for_status()
soup = BeautifulSoup(resp.text, "lxml")

rows = []
for q in soup.select("div.quote"):
    text = q.select_one("span.text").get_text(strip=True)
    author = q.select_one("small.author").get_text(strip=True)
    tags = [t.get_text(strip=True) for t in q.select("a.tag")]
    rows.append({
        "author": author,
        "text": text,
        "tags": ",".join(tags),
    })

# 礼貌：即使只抓一页，也养成 sleep 习惯
time.sleep(1)

out = Path("out")
out.mkdir(exist_ok=True)
dst = out / "quotes_page1.csv"
with dst.open("w", encoding="utf-8", newline="") as f:
    writer = csv.DictWriter(f, fieldnames=["author", "text", "tags"])
    writer.writeheader()
    writer.writerows(rows)

print("条数：", len(rows))
print("已导出：", dst)
```

---

## 9. 合规与礼貌（写进习惯，不是附录）

1. **只抓允许学习/公开的数据**；不碰登录后隐私数据、付费墙内容。  
2. **先看 `robots.txt`**（例如 `https://example.com/robots.txt`）。  
3. **降低频率**：请求之间 `time.sleep(1)` 或更久。  
4. **带上能识别的 User-Agent**，必要时留联系方式。  
5. **缓存结果**：同一页不要反复打。  
6. **网站结构一变，选择器就可能挂**：解析代码要能容错。  

**技术能抓到 ≠ 法律/道德上可以抓。今天练习只用本地 HTML 或明确练手站。**

---

## 10. 综合项目：解析 → pandas 清洗 → 导出

把「本地书店 HTML」解析后，再用 pandas 清洗一次。

```python
"""
综合：HTML -> DataFrame 清洗 -> CSV
运行：python pipeline_books.py
"""
from pathlib import Path
import re
import pandas as pd
from bs4 import BeautifulSoup

html = Path("local_books.html").read_text(encoding="utf-8")
soup = BeautifulSoup(html, "lxml")

records = []
for book in soup.select("div.book"):
    title_node = book.select_one(".title")
    price_node = book.select_one(".price")
    stock_node = book.select_one(".stock")
    if not title_node or not price_node or not stock_node:
        continue
    price_text = price_node.get_text(strip=True)
    records.append({
        "title": title_node.get_text(strip=True),
        "price": price_text,
        "stock": stock_node.get_text(strip=True),
    })

df = pd.DataFrame(records)
print("原始：\n", df)

# 清洗：价格转数字、统一库存布尔值、只保留有货
df["price"] = df["price"].map(lambda x: float(re.sub(r"[^\d.]", "", str(x))))
df["in_stock"] = df["stock"].str.lower().eq("in stock")
df = df[df["in_stock"]].copy()
df = df.drop(columns=["stock"]).reset_index(drop=True)

out = Path("out")
out.mkdir(exist_ok=True)
dst = out / "books_instock.csv"
df.to_csv(dst, index=False, encoding="utf-8")
print("清洗后：\n", df)
print("已导出：", dst.resolve())
```

这条流水线，就是 Day7 做 Web API 时的数据来源雏形。

---

## 11. 今日练习题（必须独立写）

### 题目 1｜pandas 基础筛选（easy）

**要求：**

- 读取 `dirty_students.csv`（可用文中那份）
- 将 `score` 转为数字（非法变 NaN）
- 删除 `score` 为空的行
- 筛选 `score >= 90`，导出 `out/excellent.csv`
- 打印导出行数

**参考答案：**

```python
# 练习1：优秀学生导出
from pathlib import Path
import pandas as pd

df = pd.read_csv("dirty_students.csv")
df["score"] = pd.to_numeric(df["score"], errors="coerce")
df = df.dropna(subset=["score"])
excellent = df[df["score"] >= 90].copy()

out = Path("out")
out.mkdir(exist_ok=True)
dst = out / "excellent.csv"
excellent.to_csv(dst, index=False, encoding="utf-8")
print("优秀人数：", len(excellent))
print("已导出：", dst)
```

### 题目 2｜城市分组平均分（easy/medium）

**要求：**

- 在题目 1 清洗思路上，先 `strip` 城市名
- 丢掉姓名或分数缺失
- 按 `city` 分组求平均分，保留 1 位小数
- 打印结果（可用 `groupby` + `mean`）

**参考答案：**

```python
# 练习2：城市平均分
import pandas as pd

df = pd.read_csv("dirty_students.csv")
df["name"] = df["name"].astype(str).str.strip()
df["city"] = df["city"].astype(str).str.strip()
df["score"] = pd.to_numeric(df["score"], errors="coerce")
df = df.dropna(subset=["name", "score", "city"])
df = df[(df["score"] >= 0) & (df["score"] <= 100)]

avg = df.groupby("city")["score"].mean().round(1)
print(avg)
```

### 题目 3｜解析本地 HTML（medium）

**要求：**

- 使用文中 `local_books.html`
- 解析出 `title/price/stock`
- 只保留有货商品，按价格升序排序
- 导出 `out/books_sorted.csv`

**参考答案：**

```python
# 练习3：本地 HTML 解析 + 排序导出
from pathlib import Path
import re
import pandas as pd
from bs4 import BeautifulSoup

html = Path("local_books.html").read_text(encoding="utf-8")
soup = BeautifulSoup(html, "lxml")

rows = []
for book in soup.select("div.book"):
    title = book.select_one(".title").get_text(strip=True)
    price_text = book.select_one(".price").get_text(strip=True)
    stock = book.select_one(".stock").get_text(strip=True)
    price = float(re.sub(r"[^\d.]", "", price_text))
    rows.append({"title": title, "price": price, "stock": stock})

df = pd.DataFrame(rows)
df = df[df["stock"].str.lower() == "in stock"].copy()
df = df.sort_values("price", ascending=True).reset_index(drop=True)

out = Path("out")
out.mkdir(exist_ok=True)
dst = out / "books_sorted.csv"
df.to_csv(dst, index=False, encoding="utf-8")
print(df)
print("已导出：", dst)
```

### 题目 4｜联网加餐（optional）

**要求：**

- 抓取 `https://quotes.toscrape.com/` 第一页
- 导出作者与名言到 CSV
- 请求间 `sleep(1)`
- 若无网络，可跳过，改做题目 3

---

## 12. 今日对照表

| 想做的事 | Java 感觉 | Python 今天 |
|----------|-----------|-------------|
| 读表 | EasyExcel / JDBC ResultSet | **`pd.read_csv`** |
| 过滤行 | Stream filter / SQL WHERE | **`df[条件]`** |
| 转数字 | `Integer.parseInt` | **`pd.to_numeric`** |
| 去重 | `distinct` / Set | **`drop_duplicates`** |
| 分组 | `GROUP BY` | **`groupby`** |
| HTTP GET | RestTemplate | **`requests.get`** |
| 解析 HTML | Jsoup | **BeautifulSoup** |
| CSS 选择 | Jsoup `select` | **`soup.select`** |

---

## 13. 打卡清单

- [ ] 虚拟环境装好 pandas / requests / bs4 / lxml
- [ ] 能解释 DataFrame 和「表」的关系
- [ ] 会 `to_numeric` / `dropna` / `drop_duplicates` / `to_csv`
- [ ] 会用 `select` / `select_one` / `get_text`
- [ ] 能口述 3 条爬虫合规原则
- [ ] 跑通 `clean_demo.py` 与 `scrape_local.py`
- [ ] 独立完成练习 1～3

---

## 14. 常见报错急救

| 报错 / 现象 | 常见原因 | 怎么处理 |
|-------------|----------|----------|
| `ModuleNotFoundError: pandas` | 没装包或装到别的环境 | 激活 venv 再 `pip install` |
| `ParserError` / 读 CSV 乱 | 分隔符/编码不对 | 检查文件，试 `encoding="utf-8"` |
| 筛选后全空 | 条件写错或先没转类型 | 先 `print(df.dtypes)` / `head` |
| `requests` 卡住 | 没设 timeout | 加 `timeout=10` |
| `AttributeError: NoneType` | `select_one` 没找到节点 | 先判空，检查选择器 |
| 联网失败 | 环境无外网/DNS | 改用本地 HTML 练习 |

---

## 15. 预习明天（Day7 收官）

明天用 **FastAPI** 把今天洗干净的 CSV 做成查询 API（对照 Spring `@RestController`）。  
可先安装：

```bash
python -m pip install fastapi uvicorn
```

- 上一篇：[Day5](/articles/python-7day-bootcamp-day05)  
- 返回总览：[总览](/articles/python-7day-bootcamp-overview)
