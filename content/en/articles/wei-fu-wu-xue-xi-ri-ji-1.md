---
title: Microservices Learning Diary 1
summary: "Microservices are an architectural style built around business capabilities and API communication. This note covers core ideas, trade-offs, service-splitting principles, and a practical technology stack."
author: evan
category: diary
tags: [Diary, Learning, Microservices]
createdAt: 2026-02-11 15:54:04
updatedAt: 2026-02-11 15:54:04
readingMinutes: 5
---
# Microservices Learning Diary 1

## 1. Microservice Concepts

- A microservice architecture is a software architecture style in which each service is built around a specific business capability and communicates through clearly defined APIs.
- Microservices are not a silver bullet, and they are not suitable for every situation.

#### What microservices are good for:

- Independent deployment and operation
- Business-oriented service boundaries
- Flexible technology choices
- Elastic scaling
- Fault isolation

#### Drawbacks of microservices

- Distributed-system complexity
- Higher operations and maintenance overhead
- Service-governance challenges
- Data-consistency problems

## 2. Microservice Architecture Design Approach

Questions to think through before converting a monolith to microservices:

1. Design: how should services be split? What principles should guide the decomposition of a monolithic application into multiple microservices?
2. Implementation: what technology should be used? Which stack should support the microservice architecture?
3. Governance: how should services be managed? How will service registration, discovery, configuration management, monitoring, and similar concerns be handled?

### (1) Service Splitting

**Service splitting is the most critical step in the entire migration process. If the split is poor, later development and maintenance become much more difficult.**

**Splitting principles**:

1. Business-domain driven: split by business capability so each service has a clear business boundary. For example, user management and application management belong to different domains and are relatively independent.
2. Data consistency: keep strongly related data in the same service to reduce cross-service dependencies. For example, user profiles and user permissions should stay in one service to avoid cross-service queries.
3. Performance considerations: isolate hot modules so they can be optimized and scaled independently.
4. Scalability needs: split by module characteristics. High-traffic modules can scale independently without affecting other services.

**Important note: do not force a split where one is unnecessary.**

**Shared modules:**

`common` module: contains code shared by all services, such as exception handling, utility classes, constants, and common response wrappers. It provides foundational infrastructure for other services.

`model`: defines unified data models, including entities, DTOs, VOs, enums, and similar types, so data formats stay consistent across services.

`client`: defines service interfaces for internal calls, acting as the contract for service-to-service communication and reducing coupling.

**Business services:**

- **User service**: the foundation of the whole system. It centrally manages user state and permissions and handles registration, login, logout, and authorization checks. Since nearly all business features depend on user information, the user service is a core dependency for other services.
- **Application service**: the core business service. It manages the full lifecycle of applications.
- Other services as needed.

**Finally, it is useful to prepare a microservice split table covering service responsibilities, port allocation, route planning, and dependencies to support later implementation.**

Example:

| Service Name | Port and Route Prefix | Main Function | Dependencies |
| --- | --- | --- | --- |
| Shared modules |  |  |  |
| `common` | - | Annotations, exception handling, utility classes, constants, common response types | - |
| `model` | - | Entities, DTOs, VOs, enums, AI model classes | `common` |
| `client` | - | Service interface definitions and internal-call contracts | `common\model` |
| Business services |  |  |  |
| `user` | Port 8124, `/api/user/**` | User management, authorization, user profile maintenance | Redis\Mysql |
| `app` | Port 8125, `/api/app/**` | Application management and related business flows | Redis\Mysql\user service, etc. |

### (2) Microservice Technology Choices

Microservices need to solve service decomposition, inter-service communication, service discovery, and unified gateway access. To support these needs, we should choose an appropriate stack, including the development framework, registry, service-call mechanism, and microservice gateway. A practical recommendation is the Spring Cloud Alibaba ecosystem with Nacos, Dubbo, and the Higress gateway.

**Service registry:**

The service registry is a core component of a microservice architecture because it solves service discovery. It works like a phone book: when a service starts, it reports its address to the registry; when another service needs to call it, it queries the registry for the target address.

**Microservice invocation**

- HTTP/REST: RESTful API calls over HTTP. Simple to use and language-friendly.
- RPC: remote procedure calls such as Dubbo and gRPC. Higher performance, but usually tied to a shared stack.
- Message queues: systems such as RocketMQ and Kafka that support asynchronous communication and work well for decoupling.

**Microservice gateways**

- Spring Cloud Gateway: officially provided by Spring and well integrated with the Spring Cloud ecosystem
- Higress: Alibaba's open-source cloud-native API gateway, based on Envoy, with strong performance
- Kong: an open-source gateway based on Nginx with a rich plugin ecosystem
- Zuul: open sourced by Netflix, with average performance
