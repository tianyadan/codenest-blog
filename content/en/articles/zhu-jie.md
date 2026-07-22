---
title: Annotations (Ongoing Updates)
summary: A continuously updated glossary of common Spring and Java annotations, keeping the annotation names unchanged while explaining what each one does.
author: evan
category: learning
tags: [Learning]
createdAt: 2026-04-04 08:34:39
updatedAt: 2026-04-04 08:34:39
readingMinutes: 5
topOrder: 0
---
# Annotations (Ongoing Updates)

## A

- **@Autowired** Injects a Bean by type.

- **@AutoConfigureAfter** Used to specify the loading order of configuration classes, meaning one configuration class should load after another specified configuration class.

- **@AutoConfigureBefore** Used to specify the loading order of configuration classes, meaning one configuration class should load before another specified configuration class.

- **@AutoConfigureOrder** Also determines loading order. It sets a numeric priority, and smaller numbers load earlier.

## B

- **@Bean（autowiredCandidate = "false")** Makes a Bean unavailable for injection under any circumstances. Without parameters, it means handing the return value of a method over to Spring for management. This annotation is placed on methods. The object is created by Spring, and its lifecycle is managed by Spring. It enables unified dependency injection, unified AOP enhancement, and unified transaction management. It is often used with `@Configuration`, especially when introducing third-party libraries that cannot be managed by Spring through `@Component`.

## C

- **@Component** Declares a class as a component in the Spring container so Spring can automatically create and manage it. When Spring scans this class, it creates the object through reflection, registers it into the IoC container, turns it into a Bean, and allows it to be injected with `@Autowired`.

- **@ConditionalOnClass** Checks whether a certain class exists on the classpath. It is usually used to detect whether a dependency has been introduced.

- **@ConditionalOnMissingBean** Checks whether a certain Bean exists in the container. It is often used to implement the logic of "use auto-configuration if the user has not customized it." If the user wants a custom implementation, they can simply declare a Bean of the same type to override it.

- **@ConfigurationProperties** Used for property binding. If the user writes the same keys in `yml`, those values can override the defaults.

- **@Cacheable** Stores the result of a method execution in the cache. (`value`: namespace, `key`: cache key, `condition`: when to cache, `unless`: when not to cache)

- **@CacheEvict** Clears the cache after a method finishes executing (for example, when deleting a user, also delete the cache).

## D

- **@Deprecated** Indicates that this class / method / field is no longer recommended and may be removed in the future.

## L

- **@Lazy** When placed on a Bean, it means Bean creation is delayed. When placed on an `@Autowired` injection point, Spring injects a proxy object, and the real object is created only when the proxy is actually used.

- **@LoadBlanced** A load-balancing annotation provided by Spring Cloud. When declared on a `RestTemplate` method, it enables automatic load balancing.

## O

- **@Order** Solves execution-order issues when multiple Beans are involved.

## P

- **@Primary** Solves injection conflicts when there are multiple Beans of the same type.

- **@PropertySource** Loads external `.properties` configuration files. You need to provide the file path. It supports project paths, URLs, and system file paths, but it does not support loading YAML files.

## R

- **@Resource** Field injection by name. If no matching name is found, it falls back to injection by type.

- **@RestController** A composed annotation that combines `@Controller` and `@ResponseBody`. It is used to declare REST-style APIs so that method return values are serialized directly to JSON and written into the HTTP response body.

## S

- **@Scope** Decides whether the Bean obtained from the Spring container is newly created every time, the same shared object, or determined by the web request / session scope.

## T

- **@Transactional** Runs a method within a transaction to ensure data consistency. As long as an exception occurs, everything is rolled back. Core mechanism: AOP proxy + `ThreadLocal` + JDBC transaction control. Rough process: when Spring starts, it finds the `@Transactional` annotation and generates a proxy object. When the method is called, it enters the transaction interceptor, starts the transaction (`setAutoCommit(false)`), executes the business code, commits if there is no exception, and rolls back if there is an exception. By default, only runtime exceptions trigger rollback. If you want to roll back for other exceptions, you can use `@Transactional(rollbackFor = "BussinessException.class")`. Cases where transactions do not take effect: 1. Internal calls within the same class 2. Not managed by Spring 3. Method is not `public`
