# 图表示例（Archify 确定性 SVG 图表 + 步骤联动）

本文件是 `courseware-format.md` 图表语法的完整示例，供生成课程时参考。
所有图表统一使用 ```` ```archify ```` 代码块声明，首行写 `type=<图种> id=<唯一标识> title="<图表标题>"`，随后用 `|` 分隔的管道行声明元素。
推荐在关键图表下方紧跟一个 ```` ```study-steps ```` 代码块，播放器会自动生成可点击/悬停的步骤条，点击某一步时图表中对应的节点与连线会自动高亮聚光。

可用语义色类（Semantic Tone）：`frontend`（青）、`backend`（绿）、`database`（紫）、`cloud`（琥珀）、`security`（玫红）、`messagebus`（橙）、`external`（灰蓝）。
可用连线变体（Variant）：`default`、`emphasis`、`security`、`dashed`（时序图额外支持 `return`）。

---

## 1. Sequence 时序图（跨组件调用、协议握手、请求往返）

````markdown
首次 TLS 握手或缓存未命中时，请求会经历先查缓存、回源数据库再异步回填的三段交互：

```archify
type=sequence id=cache-miss-flow title="Cache Miss & Write-Back Sequence"
| actor client | Browser | frontend |
| actor api | Order API | backend |
| actor redis | Redis Cache | database |
| actor db | PostgreSQL | database |
| phase | 1. 缓存查询 |
| client | api | GET /orders/42 |
| api | redis | GET order:42 |
| redis | api | nil (Cache Miss) | return |
| phase | 2. 数据库回源与回填 |
| api | db | SELECT * FROM orders WHERE id=42 | emphasis |
| db | api | Row {id: 42, status: paid} | return |
| api | redis | SETEX order:42 300 payload | dashed |
| api | client | 200 OK (JSON) | return |
```

```study-steps
diagram=cache-miss-flow
| s1 | 先查 Redis | API 收到请求后优先按主键查缓存，未命中返回 nil | client,api,redis |
| s2 | 回源数据库 | 缓存未命中时走主库查询最新行数据 | api,db |
| s3 | 带 TTL 回填并返回 | 将查询结果写入 Redis（设置 300s 过期）并响应客户端 | redis,client |
```
````

---

## 2. Workflow 流程图（算法步骤、分支判断、异常处理、多泳道流程）

节点标签以 `?` 或 `？` 结尾时，渲染器会自动绘制为决策分支节点。

````markdown
```archify
type=workflow id=token-verify-flow title="JWT 鉴权与刷新流程"
| lane gateway | API 网关层 |
| lane auth | 认证服务层 |
| req | 收到请求 | frontend | gateway |
| has_token | 携带 Token? | decision | gateway |
| verify | 校验签名与过期 | security | auth |
| expired | 是否仅过期? | decision | auth |
| refresh | 检查 RefreshToken | backend | auth |
| pass | 放行并注入上下文 | backend | gateway |
| reject | 返回 401 未授权 | security | gateway |
| req > has_token | |
| has_token > verify | 是 |
| has_token > reject | 否 | security |
| verify > pass | 有效 | emphasis |
| verify > expired | 校验失败 |
| expired > refresh | 已过期 | dashed |
| expired > reject | 签名篡改 | security |
| refresh > pass | 刷新成功 | emphasis |
```

```study-steps
diagram=token-verify-flow
| w1 | 入口拦截 | 网关先检查 Header 是否携带 Bearer Token | req,has_token |
| w2 | 签名与时效核验 | 签名合法性优先于过期检查，防篡改直接拒绝 | verify,expired,reject |
| w3 | 无感续期放行 | 仅过期且 RefreshToken 有效时换发新令牌并放行 | refresh,pass |
```
````

---

## 3. Architecture 架构图（系统分层、模块职责、组件连接与分组边界）

````markdown
```archify
type=architecture id=rag-arch title="生产级 RAG 检索增强架构"
| group ingest | 离线知识入库管线 | cloud |
| group online | 在线检索与生成链路 | backend |
| loader | 文档解析与切片 | external | ingest |
| embed | Embedding 模型 | cloud | ingest |
| vecdb | 向量数据库 | database | ingest |
| user | 用户提问 | frontend | online |
| retriever | 混合检索器 | backend | online |
| reranker | Cross-Encoder 重排 | security | online |
| llm | LLM 推理生成 | cloud | online |
| loader > embed | 文本块 Chunks |
| embed > vecdb | 写入稠密向量 |
| user > retriever | Query | emphasis |
| retriever > vecdb | 向量 + BM25 召回 |
| retriever > reranker | Top-50 候选 |
| reranker > llm | Top-5 精排上下文 | emphasis |
```
````

---

## 4. Dataflow 数据流图（数据加工阶段、张量变换、流处理管线）

每行节点第 4 列可指定 `stage`（0~5 列），每条边必须写出传输的数据形态。

````markdown
```archify
type=dataflow id=tensor-pipeline title="Self-Attention 张量形状流转"
| input | 输入序列 X | frontend | 0 |
| proj | 线性投影 W_Q/W_K/W_V | backend | 1 |
| score | 缩放点积 QK^T / √d_k | cloud | 2 |
| mask | Softmax 归一化权重 | security | 3 |
| out | 加权求和输出 Z | database | 4 |
| input > proj | [B, L, d_model] |
| proj > score | Q, K: [B, h, L, d_k] | emphasis |
| score > mask | Logits: [B, h, L, L] |
| mask > out | Attention: [B, h, L, L] | emphasis |
```
````

---

## 5. Lifecycle 状态机图（生命周期、状态转移、并发状态与恢复路径）

使用 `main | s1 > s2 > ...` 声明主干状态路径，自动横向对齐主干、将异常与回退状态排布在侧翼走廊。

````markdown
```archify
type=lifecycle id=circuit-breaker title="熔断器（Circuit Breaker）状态机"
| main | closed > open > half_open > closed |
| closed | Closed（正常闭合） | start |
| open | Open（熔断打开） | failure |
| half_open | Half-Open（半开探测） | waiting |
| closed > open | 失败率达到阈值 | security |
| open > half_open | 冷却时间窗口到期 | dashed |
| half_open > closed | 探测请求连续成功 | emphasis |
| half_open > open | 探测请求再次失败 | security |
```
````

---

## 6. Tree 层级树图（概念分类、目录结构、AST 语法树、DOM 树）

第 3 列填父节点 ID，根节点填 `-`。

````markdown
```archify
type=tree id=index-taxonomy title="PostgreSQL 索引分类树"
| root | PostgreSQL 索引体系 | - | database |
| btree | B-Tree（默认等值与范围） | root | backend |
| hash | Hash（纯等值查询） | root | frontend |
| gin | GIN（倒排：JSONB/全文分词） | root | cloud |
| gist | GiST（几何/范围重叠） | root | messagebus |
| brin | BRIN（超大时序表块级索引） | root | external |
```
````

---

## 7. ERD 实体关系图（数据库表结构、主键外键引用、对象内存模型）

````markdown
```archify
type=erd id=order-schema title="电商核心订单表结构"
| entity users | users（用户表） | 账户域 |
| entity orders | orders（订单主表） | 交易域 |
| entity items | order_items（订单明细） | 交易域 |
| users.id | bigint | pk | |
| users.email | varchar(120) | | 唯一登录邮箱 |
| orders.id | bigint | pk | |
| orders.user_id | bigint | fk | users.id |
| orders.total_cents | int | | 订单总金额（分） |
| items.id | bigint | pk | |
| items.order_id | bigint | fk | orders.id |
| items.sku_code | varchar(64) | | 商品编码 |
| orders > users | many:one | 下单用户 |
| items > orders | many:one | 所属订单 |
```
````

---

## 8. Timeline 时间线图（版本演进、故障复盘时间线、阶段里程碑）

````markdown
```archify
type=timeline id=gc-evolution title="JVM 垃圾收集器演进脉络"
| lane throughput | 吞吐量优先 |
| lane lowlatency | 低延迟优先 |
| serial | JDK 1.3 | Serial / ParNew 单线程与多线程新生代收集 | throughput | default |
| cms | JDK 1.5 | CMS 首次实现并发标记清除，但存在内存碎片 | lowlatency | change |
| g1 | JDK 9 默认 | G1 Region 分区模型 + 可预测停顿模型 | throughput | action |
| zgc | JDK 15 正式 | ZGC 染色指针与读屏障，亚毫秒级停顿 | lowlatency | recovery |
```
````

---

## 9. Waterfall 耗时瀑布图（单次请求 Span 拆解、并发重叠、性能瓶颈定位）

格式：`<id> | <Span名称> | <startMs> | <durationMs> | <parentId或-> | <语义色类>?`

````markdown
```archify
type=waterfall id=checkout-trace title="结账接口 180ms 耗时拆解（单位：ms）"
| total | POST /api/checkout 总耗时 | 0 | 180 | - | frontend |
| auth | 1. JWT 验签与权限读取 | 0 | 15 | total | security |
| stock | 2. Redis 预扣库存 (Lua) | 15 | 20 | total | database |
| rpc_pay | 3a. 调支付网关预授权 (并发) | 35 | 95 | total | cloud |
| rpc_risk | 3b. 调风控引擎评分 (并发) | 35 | 45 | total | backend |
| db_tx | 4. 订单落库与发 Outbox 消息 | 130 | 50 | total | messagebus |
```
````

---

## 10. 结构化对比表徽章语法（Comparison Badges）

在普通 Markdown 表格的单元格末尾加上 `{good:标签}`、`{caution:标签}` 或 `{bad:标签}`，播放器会自动将其渲染为醒目的语义状态胶囊：

```markdown
| 对比维度 | 互斥锁 (Mutex) | 读写锁 (RWMutex) | 原子操作 (CAS) |
| --- | --- | --- | --- |
| 读多写少吞吐 | 读操作也互相阻塞 {bad:串行等待} | 允许多协程并发读 {good:高吞吐} | 无锁指令级并发 {good:极快} |
| 复杂临界区 | 支持任意多行状态修改 {good:通用} | 支持复杂结构读取 {good:通用} | 仅限单变量/指针更新 {caution:场景受限} |
| 饥饿与开销 | 实现简单，开销稳定 | 写锁可能饥饿 {caution:需注意} | 高竞争下自旋消耗 CPU {bad:ABA与自旋} |
```
````
