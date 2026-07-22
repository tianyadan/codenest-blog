---
title: 注解（持续更新）
summary: "@Autowired 按类型注入 Bean @AutoConfigureAfter 用来指定配置类的加载顺序，指定某个配置类加载后加载 @AutoConf..."
author: evan
category: learning
tags: [学习]
createdAt: 2026-04-04 08:34:39
updatedAt: 2026-04-04 08:34:39
readingMinutes: 5
topOrder: 0
---
# 注解（持续更新）

## A

- **@Autowired** 按类型注入 Bean

- **@AutoConfigureAfter** 用来指定配置类的加载顺序，指定某个配置类加载后加载

- **@AutoConfigureBefore** 用来指定配置类的加载顺序，指定某个配置类加载前加载

- **@AutoConfigureOrder** 也是确定加载顺序的，指定数字优先级，数字越小，加载越靠前。

## B

- **@Bean（autowiredCandidate = "false")** 让某个 Bean 在任何情况下都不被注入，不带参数代表把一个方法的返回值交给 Spring 管理。该注解标记在方法上，对象由 Spring 创建，生命周期由 Spring 管理。可以统一依赖注入，统一 AOP 增强，统一事务管理。常与@Configuration 配合使用，适用于引入第三方库无法使用@Component 注解让 Spring 管理的情况。

## C

- **@Component** 把一个类声明成 Spring 容器中的组件，让 Spring 自动创建并管理它。当 Spring 扫描到这个类时，反射创建对象，注册进 IoC 容器，变成一个 Bean，可以被 @Autowired 注入 

- **@ConditionalOnClass** 是判断路径下有没有某个类，通常用来检测某个依赖有没有引入

- **@ConditionalOnMissingBean** 是判断容器里有没有 某个 Bean，用来实现“用户没有自定义”就采用自动配置这种逻辑。 用户想自定义实现，就直接声明一个同类型的 Bean 就能覆盖

- **@ConfigurationProperties** 用来绑定属性，用户在 yml 里写同样的 key 就能覆盖默认值。

- **@Cacheable** 注解用来将方法执行过后的信息保存到缓存中。（value：命名空间，key 缓存键值，condition 什么情况下缓存，unless 什么时候不缓存）

- **@CacheEvict** 方法执行完毕后清除缓存（例如删用户，把缓存也删掉）

## D

- **@Deprecated** 这个类 / 方法 / 字段 已经不推荐使用了，以后可能会被删除

## L
- **@Lazy** 标注在 Bean 上代表延迟创建 Bean 的时机，标注在@Autowired 注入点上代表 Spring 会注入一个代理对象，真实对象的创建延迟到代理对象被调用时。

- **@LoadBlanced** Spring-Cloud-blanced 提供的负载均衡注解，声明在 RestTemplate 方法上会自动负载均衡。

## O

- **@Order** 解决多个 Bean 执行顺序问题

## P

- **@Primary** 是解决多个同类型 Bean 注入冲突问题

- **@PropertySource** 用来加载外部.Properties 配置文件的注解，需要配置文件路径，支持项目内路径，url，系统文件路径（不支持加载 yaml 文件）

## R

- **@Resource** 字段注入（名称注入），如果没有找到退到按类型注入。

- **@RestController** 是@Controller 和@ResponseBody 的组合注解，用于申明 REST 风格的接口，使方法返回值直接序列化为 JSON 写入 HTTP 响应体

## S

- **@Scope** 它决定了每次从 Spring 容器中获取的 Bean 是新创建的还是同一个共享对象，亦或者是根据 web 请求/会话来决定。

## T

- **@Transactional** 让方法在事务下运行，保证数据一致性。只要有异常，全部回滚。核心机制：AOP 代理+ThreadLocal+JDBC 事务控制。 大致流程：Spring 启动时发现@Transactional 注解 ，生成代理对象，方法调用时进入事务拦截器，开启事务（setAutoCommit（false）），执行业务代码，没异常就 commit ，有异常就 rollback。 默认只回滚运行时异常，如果想回滚其他异常可用 @Transactional(rollbackFor = "BussinessException.class") 。 事务不生效：1. 同类方法内部调用 2. 没有被 Spring 管理 3. 方法不是 public
